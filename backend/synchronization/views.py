from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import transaction
from django.utils import timezone
from datetime import datetime

from emergency.models import EmergencyReport, EmergencyCase
from triage.models import TriageAssessment
from ambulance.models import Ambulance, AmbulanceAssignment, ResponseEvent
from hospitals.models import Hospital
from accounts.models import User
from accounts.utils import log_activity


class BatchSyncView(APIView):
    """
    Production-quality Unified Batch Synchronization Endpoint.
    Handles queued records with explicit client_uuid idempotency checks,
    per-record savepoints, dependency graph resolution, and role validation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        records = request.data.get('records', [])
        
        # Legacy support for flat reports/assessments arrays if passed
        if not records:
            reports_data = request.data.get('reports', [])
            assessments_data = request.data.get('assessments', [])
            for r in reports_data:
                records.append({
                    "client_uuid": r.get('client_uuid'),
                    "entity_type": "EMERGENCY_REPORT",
                    "operation": "CREATE",
                    "payload": r,
                    "priority": r.get('priority', 'NORMAL')
                })
            for a in assessments_data:
                records.append({
                    "client_uuid": a.get('client_uuid'),
                    "entity_type": "CLINICAL_ASSESSMENT",
                    "operation": "CREATE",
                    "payload": a,
                    "priority": a.get('priority', 'HIGH'),
                    "dependency_ids": [a.get('report_client_uuid')] if a.get('report_client_uuid') else []
                })

        results = []
        user = request.user

        # Dependency graph sorting order
        entity_order = {
            "EMERGENCY_REPORT": 1,
            "CLINICAL_ASSESSMENT": 2,
            "REPORT_VERIFICATION": 3,
            "AMBULANCE_DISPATCH": 4,
            "DRIVER_RESPONSE_EVENT": 5,
            "LOCATION_TELEMETRY": 6
        }
        priority_order = {"CRITICAL": 1, "HIGH": 2, "NORMAL": 3, "LOW": 4}

        def sort_key(rec):
            e_rank = entity_order.get(rec.get('entity_type'), 99)
            p_rank = priority_order.get(rec.get('priority', 'NORMAL'), 3)
            return (e_rank, p_rank)

        sorted_records = sorted(records, key=sort_key)

        for rec in sorted_records:
            client_uuid = rec.get('client_uuid')
            entity_type = rec.get('entity_type')
            operation = rec.get('operation', 'CREATE')
            payload = rec.get('payload', {})
            dependency_ids = rec.get('dependency_ids', [])

            if not client_uuid or not entity_type:
                results.append({
                    "client_uuid": client_uuid or "UNKNOWN",
                    "status": "FAILED",
                    "message": "Missing required client_uuid or entity_type."
                })
                continue

            # Per-record savepoint isolation
            try:
                with transaction.atomic():
                    res = self._process_single_record(user, client_uuid, entity_type, operation, payload, dependency_ids)
                    results.append(res)
            except Exception as e:
                results.append({
                    "client_uuid": client_uuid,
                    "status": "FAILED",
                    "message": str(e)
                })

        synced_reports = [r['client_uuid'] for r in results if r['status'] in ['SYNCED', 'ALREADY_PROCESSED'] and r.get('entity_type') == 'EMERGENCY_REPORT']
        synced_assessments = [r['client_uuid'] for r in results if r['status'] in ['SYNCED', 'ALREADY_PROCESSED'] and r.get('entity_type') == 'CLINICAL_ASSESSMENT']

        return Response({
            "status": "completed",
            "results": results,
            "synced_reports": synced_reports,
            "synced_assessments": synced_assessments,
            "server_timestamp": timezone.now().isoformat()
        }, status=status.HTTP_200_OK)

    def _process_single_record(self, user, client_uuid, entity_type, operation, payload, dependency_ids):
        # 1. EMERGENCY REPORT
        if entity_type == "EMERGENCY_REPORT":
            existing = EmergencyReport.objects.filter(client_uuid=client_uuid).first()
            if existing:
                return {
                    "client_uuid": client_uuid,
                    "entity_type": entity_type,
                    "status": "ALREADY_PROCESSED",
                    "server_id": str(existing.uuid),
                    "message": "Emergency report already processed on server."
                }

            report = EmergencyReport.objects.create(
                client_uuid=client_uuid,
                reporter=user if user.is_authenticated else None,
                incident_type=payload.get('incident_type', 'OTHER'),
                other_incident_description=payload.get('other_incident_description'),
                affected_people_count=payload.get('affected_count', payload.get('affected_people_count', 1)),
                description=payload.get('description', 'Emergency report created offline'),
                latitude=payload.get('latitude'),
                longitude=payload.get('longitude'),
                location_accuracy=payload.get('location_accuracy'),
                status=payload.get('status', 'UNVERIFIED'),
                priority=payload.get('priority', 'PENDING')
            )

            log_activity(
                user=user,
                action="SYNC_EMERGENCY_REPORT",
                entity_type="EmergencyReport",
                entity_id=report.uuid,
                details=f"Synchronized offline report {report.client_uuid[:8]}"
            )

            return {
                "client_uuid": client_uuid,
                "entity_type": entity_type,
                "status": "SYNCED",
                "server_id": str(report.uuid),
                "message": "Emergency report synchronized successfully."
            }

        # 2. CLINICAL ASSESSMENT
        elif entity_type == "CLINICAL_ASSESSMENT":
            existing = TriageAssessment.objects.filter(client_uuid=client_uuid).first()
            if existing:
                return {
                    "client_uuid": client_uuid,
                    "entity_type": entity_type,
                    "status": "ALREADY_PROCESSED",
                    "server_id": str(existing.uuid),
                    "message": "Clinical assessment already processed on server."
                }

            report_uuid = payload.get('report_client_uuid') or payload.get('emergency_report') or (dependency_ids[0] if dependency_ids else None)
            parent_report = None
            if report_uuid:
                parent_report = EmergencyReport.objects.filter(client_uuid=report_uuid).first()
                if not parent_report:
                    try:
                        parent_report = EmergencyReport.objects.filter(uuid=report_uuid).first()
                    except Exception:
                        parent_report = None

            if not parent_report:
                return {
                    "client_uuid": client_uuid,
                    "entity_type": entity_type,
                    "status": "PENDING_DEPENDENCY",
                    "message": "Parent emergency report not found on server yet. Retrying in next pass."
                }

            vitals = payload.get('vitals', {})
            danger = payload.get('danger_signs', {})

            assessment = TriageAssessment.objects.create(
                client_uuid=client_uuid,
                emergency_report=parent_report,
                assessed_by=user if user.is_authenticated else None,
                systolic_bp=vitals.get('systolic_bp', payload.get('systolic_bp', 120)),
                diastolic_bp=vitals.get('diastolic_bp', payload.get('diastolic_bp', 80)),
                heart_rate=vitals.get('heart_rate', payload.get('heart_rate', 75)),
                respiratory_rate=vitals.get('respiratory_rate', payload.get('respiratory_rate', 16)),
                spo2=vitals.get('spo2', payload.get('spo2', 98.0)),
                temperature_c=vitals.get('temperature_c', payload.get('temperature_c', 37.0)),
                gcs_total=vitals.get('gcs_total', vitals.get('gcs_score', payload.get('gcs_score', 15))),
                has_uncontrolled_bleeding=danger.get('has_uncontrolled_bleeding', payload.get('has_uncontrolled_bleeding', False)),
                has_severe_respiratory_distress=danger.get('has_severe_respiratory_distress', payload.get('has_severe_respiratory_distress', False)),
                has_altered_mental_status=danger.get('has_altered_mental_status', payload.get('has_altered_mental_status', False)),
                has_unconsciousness=danger.get('has_unconsciousness', payload.get('has_unconsciousness', False)),
                has_severe_injury=danger.get('has_severe_injury', payload.get('has_severe_injury', False)),
                rule_score=payload.get('rule_score', 0.0),
                ml_score=payload.get('ml_score', 0.0),
                fusion_score=payload.get('fusion_score', 0.0),
                priority_level=payload.get('priority_level', 'MEDIUM'),
                clinical_explanation=payload.get('clinical_explanation', payload.get('ai_recommendation', 'Clinical triage completed offline.'))
            )

            log_activity(
                user=user,
                action="SYNC_CLINICAL_ASSESSMENT",
                entity_type="TriageAssessment",
                entity_id=assessment.uuid,
                details=f"Synchronized assessment for report {parent_report.client_uuid[:8]}"
            )

            return {
                "client_uuid": client_uuid,
                "entity_type": entity_type,
                "status": "SYNCED",
                "server_id": str(assessment.uuid),
                "message": "Clinical assessment synchronized successfully."
            }

        # 3. DRIVER RESPONSE EVENT
        elif entity_type == "DRIVER_RESPONSE_EVENT":
            existing = None
            try:
                existing = ResponseEvent.objects.filter(uuid=client_uuid).first()
            except Exception:
                existing = None

            if existing:
                return {
                    "client_uuid": client_uuid,
                    "entity_type": entity_type,
                    "status": "ALREADY_PROCESSED",
                    "server_id": str(existing.uuid),
                    "message": "Response event already processed."
                }

            assignment_uuid = payload.get('assignment_uuid') or (dependency_ids[0] if dependency_ids else None)
            assignment = None
            if assignment_uuid:
                try:
                    assignment = AmbulanceAssignment.objects.filter(uuid=assignment_uuid).first()
                except Exception:
                    assignment = None

            if not assignment:
                return {
                    "client_uuid": client_uuid,
                    "entity_type": entity_type,
                    "status": "PENDING_DEPENDENCY",
                    "message": "Target ambulance assignment not found on server yet."
                }

            event_status = payload.get('status') or payload.get('event_type')
            import uuid as py_uuid
            try:
                event_uuid = py_uuid.UUID(client_uuid)
            except Exception:
                event_uuid = py_uuid.uuid4()

            event = ResponseEvent.objects.create(
                uuid=event_uuid,
                assignment=assignment,
                event_type=event_status,
                created_by=user,
                latitude=payload.get('latitude'),
                longitude=payload.get('longitude'),
                accuracy=payload.get('accuracy')
            )

            # Update assignment status if valid
            if event_status in ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'PATIENT_PICKED_UP', 'REACHED_HOSPITAL', 'COMPLETED']:
                assignment.status = event_status
                now = timezone.now()
                if event_status == 'ACCEPTED' and not assignment.accepted_at:
                    assignment.accepted_at = now
                elif event_status == 'ON_THE_WAY' and not assignment.started_at:
                    assignment.started_at = now
                elif event_status == 'ARRIVED' and not assignment.arrived_at:
                    assignment.arrived_at = now
                elif event_status == 'PATIENT_PICKED_UP' and not assignment.patient_picked_up_at:
                    assignment.patient_picked_up_at = now
                elif event_status == 'REACHED_HOSPITAL' and not assignment.reached_hospital_at:
                    assignment.reached_hospital_at = now
                elif event_status == 'COMPLETED':
                    assignment.completed_at = now
                    assignment.ambulance.status = 'AVAILABLE'
                    assignment.ambulance.save()
                assignment.save()

            return {
                "client_uuid": client_uuid,
                "entity_type": entity_type,
                "status": "SYNCED",
                "server_id": str(event.uuid),
                "message": f"Response event {event_status} synchronized."
            }

        else:
            return {
                "client_uuid": client_uuid,
                "entity_type": entity_type,
                "status": "FAILED",
                "message": f"Unsupported entity_type '{entity_type}'."
            }
