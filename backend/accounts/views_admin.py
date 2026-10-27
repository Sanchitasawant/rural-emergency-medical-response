from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Count, Avg, F, ExpressionWrapper, DurationField
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
import json

from .models import User, AuditLog, SystemConfig, ConfigAuditLog
from .utils import log_activity
from emergency.models import EmergencyReport, EmergencyCase
from hospitals.models import Hospital
from ambulance.models import Ambulance, AmbulanceAssignment, ResponseEvent
from triage.models import TriageAssessment


class IsAdminUserRole(permissions.BasePermission):
    """
    Custom permission to strictly enforce ADMIN role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'ADMIN'
        )


@api_view(['GET'])
@permission_classes([IsAdminUserRole])
def admin_dashboard_metrics(request):
    """
    Real database-derived command center dashboard metrics.
    """
    metrics = {
        "total_users": User.objects.count(),
        "active_users": User.objects.filter(is_active=True).count(),
        "total_reports": EmergencyReport.objects.count(),
        "unverified_reports": EmergencyReport.objects.filter(status='UNVERIFIED').count(),
        "verified_cases": EmergencyCase.objects.filter(case_status='VERIFIED').count(),
        "active_cases": EmergencyCase.objects.filter(case_status__in=['VERIFIED', 'DISPATCHED', 'IN_PROGRESS']).count(),
        "completed_cases": EmergencyCase.objects.filter(case_status='COMPLETED').count(),
        "available_ambulances": Ambulance.objects.filter(status='AVAILABLE').count(),
        "assigned_ambulances": Ambulance.objects.filter(status__in=['ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'PATIENT_PICKED_UP']).count(),
        "active_drivers": User.objects.filter(role='DRIVER_PARAMEDIC', is_active=True).count(),
        "registered_hospitals": Hospital.objects.count(),
        "database_status": "Connected to MySQL (ruralcare_ai)"
    }

    recent_cases = EmergencyCase.objects.select_related('source_report', 'hospital').order_by('-created_at')[:5]
    case_list = []
    for c in recent_cases:
        case_list.append({
            "uuid": str(c.uuid),
            "incident_type": c.source_report.incident_type,
            "status": c.case_status,
            "priority": c.priority,
            "hospital_name": c.hospital.name if c.hospital else None,
            "created_at": c.created_at.isoformat()
        })

    recent_logs = AuditLog.objects.all()[:5]
    log_list = []
    for l in recent_logs:
        log_list.append({
            "uuid": str(l.uuid),
            "user_email": l.user_email,
            "role": l.role,
            "action": l.action,
            "created_at": l.created_at.isoformat()
        })

    return Response({
        "metrics": metrics,
        "recent_cases": case_list,
        "recent_logs": log_list
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUserRole])
def admin_users_list_create(request):
    """
    List or create system users with controlled role validation.
    """
    if request.method == 'GET':
        role_filter = request.query_params.get('role')
        active_filter = request.query_params.get('is_active')
        search_query = request.query_params.get('search')

        qs = User.objects.all().order_by('-created_at')

        if role_filter:
            qs = qs.filter(role=role_filter)
        if active_filter is not None:
            if active_filter.lower() == 'true':
                qs = qs.filter(is_active=True)
            elif active_filter.lower() == 'false':
                qs = qs.filter(is_active=False)
        if search_query:
            qs = qs.filter(
                email__icontains=search_query
            ) | qs.filter(
                username__icontains=search_query
            ) | qs.filter(
                first_name__icontains=search_query
            ) | qs.filter(
                last_name__icontains=search_query
            )

        data = []
        for u in qs:
            data.append({
                "id": u.id,
                "uuid": str(u.uuid),
                "username": u.username,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "full_name": u.full_name,
                "role": u.role,
                "phone_number": u.phone_number,
                "hospital_name": u.hospital_name,
                "badge_id": u.badge_id,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login": u.last_login.isoformat() if u.last_login else None
            })

        return Response(data)

    elif request.method == 'POST':
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role', 'CITIZEN')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        phone_number = request.data.get('phone_number', '')
        hospital_name = request.data.get('hospital_name', '')
        badge_id = request.data.get('badge_id', '')

        if not email or not password:
            return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        valid_roles = [r[0] for r in User.ROLE_CHOICES]
        if role not in valid_roles:
            return Response({"detail": f"Invalid role string '{role}'. Must be one of {valid_roles}."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({"detail": "A user with this email address already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            email=email,
            password=password,
            role=role,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            hospital_name=hospital_name,
            badge_id=badge_id
        )

        log_activity(
            user=request.user,
            action=f"CREATED_USER",
            entity_type="User",
            entity_id=user.uuid,
            details=f"Created staff account {user.email} with role {user.role}"
        )

        return Response({
            "status": "success",
            "message": f"User account {user.email} created successfully.",
            "user": {
                "id": user.id,
                "uuid": str(user.uuid),
                "email": user.email,
                "username": user.username,
                "role": user.role,
                "is_active": user.is_active
            }
        }, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAdminUserRole])
def admin_user_toggle_status(request, uuid):
    """
    Activate or deactivate a user account with Last-Admin Safety Protection.
    """
    try:
        target_user = User.objects.get(uuid=uuid)
    except User.DoesNotExist:
        return Response({"detail": "Target user account not found."}, status=status.HTTP_404_NOT_FOUND)

    is_active_val = request.data.get('is_active')
    if is_active_val is None:
        return Response({"detail": "is_active parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

    if isinstance(is_active_val, bool):
        is_active = is_active_val
    elif isinstance(is_active_val, str):
        is_active = is_active_val.lower() in ['true', '1']
    else:
        is_active = bool(is_active_val)

    # LAST-ADMIN SAFETY CHECK
    if target_user.role == 'ADMIN' and not is_active:
        active_admin_count = User.objects.filter(role='ADMIN', is_active=True).count()
        if active_admin_count <= 1:
            return Response({
                "detail": "Action blocked: Cannot deactivate the last active system administrator."
            }, status=status.HTTP_400_BAD_REQUEST)

    target_user.is_active = bool(is_active)
    target_user.save()

    log_activity(
        user=request.user,
        action="DEACTIVATED_USER" if not is_active else "ACTIVATED_USER",
        entity_type="User",
        entity_id=target_user.uuid,
        details=f"User {target_user.email} active status set to {target_user.is_active}"
    )

    return Response({
        "status": "success",
        "message": f"User {target_user.email} status updated to {'active' if target_user.is_active else 'deactivated'}.",
        "is_active": target_user.is_active
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUserRole])
def admin_hospitals_list_create(request):
    """
    Manage hospitals (List, Search, Create).
    """
    if request.method == 'GET':
        search = request.query_params.get('search')
        qs = Hospital.objects.all().order_by('-created_at')
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(district__icontains=search)

        data = []
        for h in qs:
            data.append({
                "id": h.id,
                "uuid": str(h.uuid),
                "name": h.name,
                "district": h.district,
                "address": h.address,
                "contact_number": h.contact_number,
                "icu_beds_available": h.icu_beds_available,
                "general_beds_available": h.general_beds_available,
                "has_trauma_center": h.has_trauma_center,
                "latitude": h.latitude,
                "longitude": h.longitude,
                "created_at": h.created_at.isoformat() if h.created_at else None
            })
        return Response(data)

    elif request.method == 'POST':
        name = request.data.get('name')
        district = request.data.get('district', '')
        address = request.data.get('address', '')
        contact_number = request.data.get('contact_number', '')
        icu_beds = request.data.get('icu_beds_available', 0)
        general_beds = request.data.get('general_beds_available', 0)

        if not name:
            return Response({"detail": "Hospital name is required."}, status=status.HTTP_400_BAD_REQUEST)

        hospital = Hospital.objects.create(
            name=name,
            district=district,
            address=address,
            contact_number=contact_number,
            icu_beds_available=int(icu_beds),
            general_beds_available=int(general_beds)
        )

        log_activity(
            user=request.user,
            action="CREATED_HOSPITAL",
            entity_type="Hospital",
            entity_id=hospital.uuid,
            details=f"Created hospital facility {hospital.name}"
        )

        return Response({
            "status": "success",
            "message": f"Hospital {hospital.name} registered.",
            "hospital_id": hospital.id,
            "uuid": str(hospital.uuid)
        }, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAdminUserRole])
def admin_hospital_detail_update(request, uuid):
    try:
        hospital = Hospital.objects.get(uuid=uuid)
    except Hospital.DoesNotExist:
        return Response({"detail": "Hospital not found."}, status=status.HTTP_404_NOT_FOUND)

    if 'name' in request.data:
        hospital.name = request.data['name']
    if 'district' in request.data:
        hospital.district = request.data['district']
    if 'address' in request.data:
        hospital.address = request.data['address']
    if 'contact_number' in request.data:
        hospital.contact_number = request.data['contact_number']
    if 'icu_beds_available' in request.data:
        hospital.icu_beds_available = int(request.data['icu_beds_available'])
    if 'general_beds_available' in request.data:
        hospital.general_beds_available = int(request.data['general_beds_available'])

    hospital.save()

    log_activity(
        user=request.user,
        action="UPDATED_HOSPITAL",
        entity_type="Hospital",
        entity_id=hospital.uuid,
        details=f"Updated hospital {hospital.name}"
    )

    return Response({"status": "success", "message": f"Hospital {hospital.name} updated."})


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUserRole])
def admin_ambulances_list_create(request):
    """
    Manage ambulance fleet (List, Search, Create).
    """
    if request.method == 'GET':
        status_filter = request.query_params.get('status')
        qs = Ambulance.objects.select_related('hospital', 'driver').all().order_by('-created_at')
        if status_filter:
            qs = qs.filter(status=status_filter)

        data = []
        for a in qs:
            data.append({
                "id": a.id,
                "uuid": str(a.uuid),
                "vehicle_number": a.vehicle_number,
                "vehicle_type": a.vehicle_type,
                "equipment_type": a.equipment_type,
                "status": a.status,
                "hospital_name": a.hospital.name if a.hospital else None,
                "driver_name": a.driver.full_name if a.driver else None,
                "latitude": a.latitude,
                "longitude": a.longitude,
                "created_at": a.created_at.isoformat() if a.created_at else None
            })
        return Response(data)

    elif request.method == 'POST':
        vehicle_number = request.data.get('vehicle_number')
        hospital_id = request.data.get('hospital_id')
        vehicle_type = request.data.get('vehicle_type', 'BASIC_LIFE_SUPPORT')
        equipment_type = request.data.get('equipment_type', 'Standard EMT Equipment')

        if not vehicle_number:
            return Response({"detail": "Vehicle number is required."}, status=status.HTTP_400_BAD_REQUEST)

        if Ambulance.objects.filter(vehicle_number=vehicle_number).exists():
            return Response({"detail": "An ambulance with this vehicle number already exists."}, status=status.HTTP_400_BAD_REQUEST)

        hospital = Hospital.objects.filter(id=hospital_id).first() if hospital_id else Hospital.objects.first()

        ambulance = Ambulance.objects.create(
            vehicle_number=vehicle_number,
            hospital=hospital,
            vehicle_type=vehicle_type,
            equipment_type=equipment_type,
            status='AVAILABLE'
        )

        log_activity(
            user=request.user,
            action="CREATED_AMBULANCE",
            entity_type="Ambulance",
            entity_id=ambulance.uuid,
            details=f"Created ambulance vehicle {ambulance.vehicle_number}"
        )

        return Response({
            "status": "success",
            "message": f"Ambulance {ambulance.vehicle_number} registered.",
            "uuid": str(ambulance.uuid)
        }, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAdminUserRole])
def admin_ambulance_detail_update(request, uuid):
    try:
        ambulance = Ambulance.objects.get(uuid=uuid)
    except Ambulance.DoesNotExist:
        return Response({"detail": "Ambulance not found."}, status=status.HTTP_404_NOT_FOUND)

    if 'status' in request.data:
        ambulance.status = request.data['status']
    if 'vehicle_type' in request.data:
        ambulance.vehicle_type = request.data['vehicle_type']
    if 'equipment_type' in request.data:
        ambulance.equipment_type = request.data['equipment_type']

    ambulance.save()

    log_activity(
        user=request.user,
        action="UPDATED_AMBULANCE",
        entity_type="Ambulance",
        entity_id=ambulance.uuid,
        details=f"Updated ambulance {ambulance.vehicle_number} status to {ambulance.status}"
    )

    return Response({"status": "success", "message": f"Ambulance {ambulance.vehicle_number} updated."})


@api_view(['GET'])
@permission_classes([IsAdminUserRole])
def admin_cases_overview(request):
    """
    Emergency cases overview for admin audit.
    """
    status_filter = request.query_params.get('status')
    qs = EmergencyCase.objects.select_related('source_report', 'hospital', 'verified_by').all().order_by('-created_at')
    if status_filter:
        qs = qs.filter(case_status=status_filter)

    data = []
    for c in qs:
        data.append({
            "uuid": str(c.uuid),
            "report_uuid": str(c.source_report.uuid) if c.source_report else None,
            "incident_type": c.source_report.incident_type if c.source_report else 'EMERGENCY',
            "case_status": c.case_status,
            "priority": c.priority,
            "hospital_name": c.hospital.name if c.hospital else None,
            "verified_by": c.verified_by.full_name if c.verified_by else None,
            "created_at": c.created_at.isoformat()
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminUserRole])
def admin_analytics_data(request):
    """
    Real database aggregations for analytics charts.
    """
    # 1. Reports by Day (Last 14 Days)
    today = timezone.now().date()
    fourteen_days_ago = today - timedelta(days=14)
    daily_reports = (
        EmergencyReport.objects.filter(created_at__date__gte=fourteen_days_ago)
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )
    reports_by_day = [
        {"date": item['date'].strftime('%Y-%m-%d'), "count": item['count']}
        for item in daily_reports
    ]

    # 2. Incident Types Distribution
    incidents = (
        EmergencyReport.objects.values('incident_type')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    incident_types = [
        {"type": item['incident_type'].replace('_', ' '), "count": item['count']}
        for item in incidents
    ]

    # 3. Case Status Distribution
    statuses = (
        EmergencyCase.objects.values('case_status')
        .annotate(count=Count('id'))
    )
    case_statuses = [
        {"status": item['case_status'].replace('_', ' '), "count": item['count']}
        for item in statuses
    ]

    # 4. Ambulance Status Distribution
    amb_statuses = (
        Ambulance.objects.values('status')
        .annotate(count=Count('id'))
    )
    ambulance_statuses = [
        {"status": item['status'].replace('_', ' '), "count": item['count']}
        for item in amb_statuses
    ]

    # 5. Workflow Stage Durations (Calculated only where real timestamps exist)
    completed_assignments = AmbulanceAssignment.objects.filter(
        status='COMPLETED',
        accepted_at__isnull=False,
        started_at__isnull=False,
        arrived_at__isnull=False,
        patient_picked_up_at__isnull=False,
        reached_hospital_at__isnull=False,
        completed_at__isnull=False
    )

    stage_timing = {
        "accepted_to_started_min": None,
        "started_to_arrived_min": None,
        "arrived_to_pickup_min": None,
        "pickup_to_hospital_min": None,
        "hospital_to_completion_min": None,
        "sufficient_data": completed_assignments.count() >= 2
    }

    if completed_assignments.count() >= 2:
        diffs = completed_assignments.aggregate(
            avg_dispatch_to_accept=Avg(ExpressionWrapper(F('accepted_at') - F('assigned_at'), output_field=DurationField())),
            avg_accept_to_start=Avg(ExpressionWrapper(F('started_at') - F('accepted_at'), output_field=DurationField())),
            avg_start_to_arrive=Avg(ExpressionWrapper(F('arrived_at') - F('started_at'), output_field=DurationField())),
            avg_arrive_to_pickup=Avg(ExpressionWrapper(F('patient_picked_up_at') - F('arrived_at'), output_field=DurationField())),
            avg_pickup_to_hospital=Avg(ExpressionWrapper(F('reached_hospital_at') - F('patient_picked_up_at'), output_field=DurationField()))
        )

        def to_mins(dur):
            return round(dur.total_seconds() / 60.0, 1) if dur else 0

        stage_timing.update({
            "dispatch_to_accept_min": to_mins(diffs['avg_dispatch_to_accept']),
            "accept_to_start_min": to_mins(diffs['avg_accept_to_start']),
            "start_to_arrive_min": to_mins(diffs['avg_start_to_arrive']),
            "arrive_to_pickup_min": to_mins(diffs['avg_arrive_to_pickup']),
            "pickup_to_hospital_min": to_mins(diffs['avg_pickup_to_hospital'])
        })

    return Response({
        "reports_by_day": reports_by_day,
        "incident_types": incident_types,
        "case_statuses": case_statuses,
        "ambulance_statuses": ambulance_statuses,
        "stage_timing": stage_timing
    })


@api_view(['GET'])
@permission_classes([IsAdminUserRole])
def admin_activity_logs(request):
    """
    Searchable audit activity logs.
    """
    search = request.query_params.get('search')
    role = request.query_params.get('role')

    qs = AuditLog.objects.all().order_by('-created_at')

    if role:
        qs = qs.filter(role=role)
    if search:
        qs = qs.filter(user_email__icontains=search) | qs.filter(action__icontains=search) | qs.filter(details__icontains=search)

    data = []
    for l in qs[:100]:
        data.append({
            "uuid": str(l.uuid),
            "user_email": l.user_email,
            "role": l.role,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details,
            "created_at": l.created_at.isoformat()
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminUserRole])
def admin_models_info(request):
    """
    AI/ML model metadata and operational telemetry.
    """
    assessment_count = TriageAssessment.objects.count()
    latest_assessment = TriageAssessment.objects.order_by('-created_at').first()

    data = {
        "model_name": "RuralCare Hybrid Clinical Triage Scorer",
        "model_type": "Rule-Based Engine + Random Forest Classifier",
        "version": "1.0.0-production",
        "feature_count": 14,
        "prediction_count": assessment_count,
        "dataset_identifier": "ruralcare_clinical_v1",
        "last_inference_at": latest_assessment.created_at.isoformat() if latest_assessment else None,
        "evaluation_metrics": {
            "status": "No evaluation metrics recorded.",
            "note": "Clinical validation is performed separately from operational telemetry."
        }
    }
    return Response(data)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUserRole])
def admin_settings_config(request):
    """
    Manage system configuration and hybrid fusion weights with mandatory audit logging.
    """
    if request.method == 'GET':
        rule_config = SystemConfig.objects.filter(key='fusion_rule_weight').first()
        ml_config = SystemConfig.objects.filter(key='fusion_ml_weight').first()

        rule_w = float(rule_config.value) if rule_config else 0.6
        ml_w = float(ml_config.value) if ml_config else 0.4

        audit_history = ConfigAuditLog.objects.filter(config_key='fusion_weights').order_by('-created_at')[:10]
        history_list = []
        for h in audit_history:
            history_list.append({
                "uuid": str(h.uuid),
                "old_value": h.old_value,
                "new_value": h.new_value,
                "changed_by": h.changed_by.full_name if h.changed_by else "System",
                "created_at": h.created_at.isoformat()
            })

        return Response({
            "fusion_weights": {
                "rule_weight": rule_w,
                "ml_weight": ml_w
            },
            "audit_history": history_list
        })

    elif request.method == 'POST':
        rule_weight = request.data.get('rule_weight')
        ml_weight = request.data.get('ml_weight')

        if rule_weight is None or ml_weight is None:
            return Response({"detail": "Both rule_weight and ml_weight are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rw = round(float(rule_weight), 2)
            mw = round(float(ml_weight), 2)
        except ValueError:
            return Response({"detail": "Weight parameters must be numeric floats."}, status=status.HTTP_400_BAD_REQUEST)

        if round(rw + mw, 2) != 1.0:
            return Response({"detail": f"Rule Weight ({rw}) + ML Weight ({mw}) must equal exactly 1.0 (Sum: {round(rw + mw, 2)})."}, status=status.HTTP_400_BAD_REQUEST)

        # Get old values
        rule_cfg, _ = SystemConfig.objects.get_or_create(key='fusion_rule_weight', defaults={"value": "0.60"})
        ml_cfg, _ = SystemConfig.objects.get_or_create(key='fusion_ml_weight', defaults={"value": "0.40"})

        old_val_str = f"Rule={rule_cfg.value}, ML={ml_cfg.value}"
        new_val_str = f"Rule={rw:.2f}, ML={mw:.2f}"

        rule_cfg.value = f"{rw:.2f}"
        rule_cfg.updated_by = request.user
        rule_cfg.save()

        ml_cfg.value = f"{mw:.2f}"
        ml_cfg.updated_by = request.user
        ml_cfg.save()

        # Audit Record
        ConfigAuditLog.objects.create(
            config_key='fusion_weights',
            old_value=old_val_str,
            new_value=new_val_str,
            changed_by=request.user
        )

        log_activity(
            user=request.user,
            action="UPDATED_FUSION_WEIGHTS",
            entity_type="SystemConfig",
            entity_id="fusion_weights",
            details=f"Updated hybrid AI fusion weights from {old_val_str} to {new_val_str}"
        )

        return Response({
            "status": "success",
            "message": f"Hybrid AI fusion weights updated to Rule: {rw:.2f}, ML: {mw:.2f}.",
            "fusion_weights": {
                "rule_weight": rw,
                "ml_weight": mw
            }
        })
