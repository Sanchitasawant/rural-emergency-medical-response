from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Ambulance, AmbulanceAssignment, ResponseEvent
from .serializers import (
    AmbulanceSerializer,
    AmbulanceAssignmentSerializer,
    DriverUserSerializer,
    ResponseEventSerializer
)
from .services import AmbulanceSelectionService
from accounts.models import User
from emergency.models import EmergencyCase, EmergencyReport


class AmbulanceViewSet(viewsets.ModelViewSet):
    serializer_class = AmbulanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or user.role not in ['HOSPITAL_STAFF', 'DRIVER_PARAMEDIC', 'ADMIN']:
            return Ambulance.objects.none()

        status_filter = self.request.query_params.get('status')
        qs = Ambulance.objects.select_related('hospital', 'driver').all()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=False, methods=['get'], url_path='drivers')
    def get_eligible_drivers(self, request):
        if request.user.role not in ['HOSPITAL_STAFF', 'ADMIN']:
            raise PermissionDenied("Only Hospital Staff can view driver directory.")

        drivers = User.objects.filter(role='DRIVER_PARAMEDIC', is_active=True)
        serializer = DriverUserSerializer(drivers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='eligible')
    def get_eligible_ambulances(self, request):
        case_uuid = request.query_params.get('case_uuid')
        emergency_case = None
        if case_uuid:
            emergency_case = EmergencyCase.objects.filter(uuid=case_uuid).first()

        eligible_list = AmbulanceSelectionService.get_eligible_ambulances(emergency_case)
        data = []
        for item in eligible_list:
            amb_data = AmbulanceSerializer(item['ambulance']).data
            data.append({
                "ambulance": amb_data,
                "distance_km": item['distance_km'],
                "has_gps": item['has_gps']
            })

        return Response(data)


class AmbulanceAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AmbulanceAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return AmbulanceAssignment.objects.none()

        if user.role == 'DRIVER_PARAMEDIC':
            return AmbulanceAssignment.objects.filter(
                driver_paramedic=user
            ).select_related('ambulance', 'emergency_case', 'assigned_by', 'driver_paramedic')

        if user.role in ['HOSPITAL_STAFF', 'ADMIN']:
            return AmbulanceAssignment.objects.select_related('ambulance', 'emergency_case', 'assigned_by', 'driver_paramedic').all()

        return AmbulanceAssignment.objects.none()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Atomic Dispatch Assignment by Hospital Staff.
        """
        user = request.user
        if user.role not in ['HOSPITAL_STAFF', 'ADMIN']:
            raise PermissionDenied("Only authorized Hospital Staff can dispatch ambulances.")

        amb_uuid = request.data.get('ambulance_uuid') or request.data.get('ambulance')
        case_uuid = request.data.get('case_uuid') or request.data.get('emergency_case')
        driver_id = request.data.get('driver_id') or request.data.get('driver_paramedic')
        notes = request.data.get('notes', '')

        if not amb_uuid or not case_uuid:
            return Response({"detail": "Both ambulance_uuid and case_uuid are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            emergency_case = EmergencyCase.objects.get(uuid=case_uuid)
        except EmergencyCase.DoesNotExist:
            return Response({"detail": "Target emergency case not found."}, status=status.HTTP_404_NOT_FOUND)

        if emergency_case.case_status == 'REJECTED':
            return Response({"detail": "Cannot dispatch an ambulance to a rejected emergency case."}, status=status.HTTP_400_BAD_REQUEST)

        driver_user = None
        if driver_id:
            try:
                driver_user = User.objects.get(id=driver_id, role='DRIVER_PARAMEDIC')
            except User.DoesNotExist:
                return Response({"detail": "Selected driver/paramedic user is invalid or not active."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ambulance = Ambulance.objects.select_for_update().get(uuid=amb_uuid)
        except Ambulance.DoesNotExist:
            return Response({"detail": "Target ambulance vehicle not found."}, status=status.HTTP_404_NOT_FOUND)

        if ambulance.status != 'AVAILABLE':
            return Response({
                "detail": f"Ambulance {ambulance.vehicle_number} is no longer available (Current status: {ambulance.get_status_display()})."
            }, status=status.HTTP_400_BAD_REQUEST)

        ambulance.status = 'ASSIGNED'
        if driver_user:
            ambulance.driver = driver_user
        ambulance.save()

        emergency_case.case_status = 'DISPATCHED'
        emergency_case.save()

        report = emergency_case.source_report
        report.status = 'ASSIGNED'
        report.assigned_ambulance = ambulance
        report.save()

        assignment = AmbulanceAssignment.objects.create(
            ambulance=ambulance,
            emergency_case=emergency_case,
            assigned_by=user,
            driver_paramedic=driver_user or ambulance.driver,
            status='ASSIGNED',
            notes=notes
        )

        serializer = self.get_serializer(assignment)
        return Response({
            "status": "success",
            "message": f"Ambulance {ambulance.vehicle_number} successfully dispatched.",
            "assignment": serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='assign')
    def assign_action(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    # --- Driver Response State Machine Actions ---

    def _get_driver_assignment(self, request, uuid):
        """Helper to lock and verify driver ownership of an assignment."""
        user = request.user
        if user.role not in ['DRIVER_PARAMEDIC', 'ADMIN']:
            raise PermissionDenied("Only authorized Drivers/Paramedics can manage response state transitions.")

        try:
            assignment = AmbulanceAssignment.objects.select_for_update().get(uuid=uuid)
        except AmbulanceAssignment.DoesNotExist:
            raise ValidationError({"detail": "Emergency assignment not found."})

        if user.role == 'DRIVER_PARAMEDIC' and assignment.driver_paramedic != user:
            raise PermissionDenied("You are not authorized to update another driver's emergency assignment.")

        return assignment

    @action(detail=True, methods=['post'], url_path='accept')
    @transaction.atomic
    def accept_assignment(self, request, uuid=None):
        assignment = self._get_driver_assignment(request, uuid)
        if assignment.status != 'ASSIGNED':
            return Response({
                "detail": f"Cannot accept assignment in status '{assignment.get_status_display()}'. Must be 'ASSIGNED'."
            }, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        assignment.status = 'ACCEPTED'
        assignment.accepted_at = now
        assignment.save()

        ambulance = assignment.ambulance
        ambulance.status = 'ASSIGNED'
        ambulance.save()

        ResponseEvent.objects.create(
            assignment=assignment,
            event_type='ACCEPTED',
            created_by=request.user,
            latitude=request.data.get('latitude'),
            longitude=request.data.get('longitude'),
            accuracy=request.data.get('accuracy')
        )

        serializer = self.get_serializer(assignment)
        return Response({"status": "success", "message": "Emergency assignment accepted.", "assignment": serializer.data})

    @action(detail=True, methods=['post'], url_path='start')
    @transaction.atomic
    def start_response(self, request, uuid=None):
        assignment = self._get_driver_assignment(request, uuid)
        if assignment.status not in ['ASSIGNED', 'ACCEPTED']:
            return Response({
                "detail": f"Cannot start response from status '{assignment.get_status_display()}'. Accept assignment first."
            }, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        assignment.status = 'ON_THE_WAY'
        if not assignment.accepted_at:
            assignment.accepted_at = now
        assignment.started_at = now
        assignment.save()

        ambulance = assignment.ambulance
        ambulance.status = 'ON_THE_WAY'
        if request.data.get('latitude') and request.data.get('longitude'):
            ambulance.latitude = float(request.data['latitude'])
            ambulance.longitude = float(request.data['longitude'])
        ambulance.save()

        ResponseEvent.objects.create(
            assignment=assignment,
            event_type='STARTED',
            created_by=request.user,
            latitude=request.data.get('latitude'),
            longitude=request.data.get('longitude'),
            accuracy=request.data.get('accuracy')
        )

        serializer = self.get_serializer(assignment)
        return Response({"status": "success", "message": "En route to emergency scene.", "assignment": serializer.data})

    @action(detail=True, methods=['post'], url_path='arrive')
    @transaction.atomic
    def mark_arrived(self, request, uuid=None):
        assignment = self._get_driver_assignment(request, uuid)
        if assignment.status != 'ON_THE_WAY':
            return Response({
                "detail": f"Cannot mark arrived from status '{assignment.get_status_display()}'. Must be 'ON_THE_WAY'."
            }, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        assignment.status = 'ARRIVED'
        assignment.arrived_at = now
        assignment.save()

        ResponseEvent.objects.create(
            assignment=assignment,
            event_type='ARRIVED',
            created_by=request.user,
            latitude=request.data.get('latitude'),
            longitude=request.data.get('longitude'),
            accuracy=request.data.get('accuracy')
        )

        serializer = self.get_serializer(assignment)
        return Response({"status": "success", "message": "Arrived on scene.", "assignment": serializer.data})

    @action(detail=True, methods=['post'], url_path='pickup')
    @transaction.atomic
    def mark_patient_pickup(self, request, uuid=None):
        assignment = self._get_driver_assignment(request, uuid)
        if assignment.status not in ['ARRIVED', 'ON_THE_WAY']:
            return Response({
                "detail": f"Cannot mark patient pickup from status '{assignment.get_status_display()}'."
            }, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        assignment.status = 'PATIENT_PICKED_UP'
        assignment.patient_picked_up_at = now
        assignment.save()

        ambulance = assignment.ambulance
        ambulance.status = 'PATIENT_PICKED_UP'
        ambulance.save()

        ResponseEvent.objects.create(
            assignment=assignment,
            event_type='PATIENT_PICKED_UP',
            created_by=request.user,
            latitude=request.data.get('latitude'),
            longitude=request.data.get('longitude'),
            accuracy=request.data.get('accuracy')
        )

        serializer = self.get_serializer(assignment)
        return Response({"status": "success", "message": "Patient picked up. Transporting to hospital.", "assignment": serializer.data})

    @action(detail=True, methods=['post'], url_path='hospital-arrival')
    @transaction.atomic
    def mark_hospital_arrival(self, request, uuid=None):
        assignment = self._get_driver_assignment(request, uuid)
        if assignment.status != 'PATIENT_PICKED_UP':
            return Response({
                "detail": f"Cannot mark hospital arrival from status '{assignment.get_status_display()}'. Must pick up patient first."
            }, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        assignment.status = 'REACHED_HOSPITAL'
        assignment.reached_hospital_at = now
        assignment.save()

        ambulance = assignment.ambulance
        ambulance.status = 'BUSY'
        ambulance.save()

        ResponseEvent.objects.create(
            assignment=assignment,
            event_type='REACHED_HOSPITAL',
            created_by=request.user,
            latitude=request.data.get('latitude'),
            longitude=request.data.get('longitude'),
            accuracy=request.data.get('accuracy')
        )

        serializer = self.get_serializer(assignment)
        return Response({"status": "success", "message": "Reached destination hospital.", "assignment": serializer.data})

    @action(detail=True, methods=['post'], url_path='complete')
    @transaction.atomic
    def complete_response(self, request, uuid=None):
        assignment = self._get_driver_assignment(request, uuid)
        if assignment.status not in ['REACHED_HOSPITAL', 'PATIENT_PICKED_UP']:
            return Response({
                "detail": f"Cannot complete response from status '{assignment.get_status_display()}'. Must reach hospital first."
            }, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        assignment.status = 'COMPLETED'
        assignment.completed_at = now
        assignment.save()

        ambulance = assignment.ambulance
        ambulance.status = 'AVAILABLE'
        ambulance.save()

        emergency_case = assignment.emergency_case
        emergency_case.case_status = 'COMPLETED'
        emergency_case.save()

        report = emergency_case.source_report
        report.status = 'COMPLETED'
        report.save()

        ResponseEvent.objects.create(
            assignment=assignment,
            event_type='COMPLETED',
            created_by=request.user,
            latitude=request.data.get('latitude'),
            longitude=request.data.get('longitude'),
            accuracy=request.data.get('accuracy')
        )

        serializer = self.get_serializer(assignment)
        return Response({"status": "success", "message": "Emergency response completed. Ambulance released to AVAILABLE.", "assignment": serializer.data})

    @action(detail=True, methods=['post'], url_path='location')
    def update_location(self, request, uuid=None):
        assignment = self._get_driver_assignment(request, uuid)
        lat = request.data.get('latitude')
        lon = request.data.get('longitude')
        acc = request.data.get('accuracy')

        if lat is not None and lon is not None:
            ambulance = assignment.ambulance
            ambulance.latitude = float(lat)
            ambulance.longitude = float(lon)
            ambulance.save()

            ResponseEvent.objects.create(
                assignment=assignment,
                event_type='LOCATION_UPDATE',
                created_by=request.user,
                latitude=float(lat),
                longitude=float(lon),
                accuracy=float(acc) if acc is not None else None
            )

        return Response({"status": "success", "message": "Location updated."})
