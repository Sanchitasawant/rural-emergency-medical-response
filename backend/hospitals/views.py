from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import Hospital
from .serializers import HospitalSerializer, EmergencyCaseSerializer
from emergency.models import EmergencyReport, EmergencyCase
from emergency.serializers import EmergencyReportSerializer
from triage.models import TriageAssessment
from triage.serializers import TriageAssessmentSerializer

class HospitalViewSet(viewsets.ModelViewSet):
    queryset = Hospital.objects.all()
    serializer_class = HospitalSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'uuid'


class HospitalReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EmergencyReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or user.role not in ['HOSPITAL_STAFF', 'ADMIN']:
            return EmergencyReport.objects.none()

        return EmergencyReport.objects.all()

    @action(detail=True, methods=['post'], url_path='verify')
    def verify_report(self, request, uuid=None):
        """
        Hospital Staff verification of a citizen emergency report.
        Creates an operational EmergencyCase record and sets status = VERIFIED.
        """
        user = request.user
        if user.role not in ['HOSPITAL_STAFF', 'ADMIN']:
            raise PermissionDenied("Only authorized Hospital Staff can verify emergency reports.")

        report = self.get_object()
        if report.status == 'REJECTED':
            return Response({"detail": "Cannot verify a report that has already been rejected."}, status=status.HTTP_400_BAD_REQUEST)

        # Update EmergencyReport status
        report.status = 'VERIFIED'
        report.save()

        # Create or update operational EmergencyCase
        emergency_case, created = EmergencyCase.objects.get_or_create(
            source_report=report,
            defaults={
                'case_status': 'VERIFIED',
                'priority': report.priority,
                'verified_by': user,
                'verified_at': timezone.now()
            }
        )

        if not created:
            emergency_case.case_status = 'VERIFIED'
            emergency_case.verified_by = user
            emergency_case.verified_at = timezone.now()
            emergency_case.save()

        case_serializer = EmergencyCaseSerializer(emergency_case)
        return Response({
            "status": "success",
            "message": "Emergency report verified successfully.",
            "emergency_case": case_serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject_report(self, request, uuid=None):
        """
        Hospital Staff rejection of an invalid/duplicate citizen report.
        Requires a valid rejection_reason.
        """
        user = request.user
        if user.role not in ['HOSPITAL_STAFF', 'ADMIN']:
            raise PermissionDenied("Only authorized Hospital Staff can reject emergency reports.")

        reason = request.data.get('rejection_reason', '').strip()
        if not reason or len(reason) < 3:
            return Response({"rejection_reason": "A valid rejection reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        report = self.get_object()
        report.status = 'REJECTED'
        report.save()

        emergency_case, created = EmergencyCase.objects.get_or_create(
            source_report=report,
            defaults={
                'case_status': 'REJECTED',
                'rejected_by': user,
                'rejected_at': timezone.now(),
                'rejection_reason': reason
            }
        )

        if not created:
            emergency_case.case_status = 'REJECTED'
            emergency_case.rejected_by = user
            emergency_case.rejected_at = timezone.now()
            emergency_case.rejection_reason = reason
            emergency_case.save()

        case_serializer = EmergencyCaseSerializer(emergency_case)
        return Response({
            "status": "success",
            "message": "Emergency report rejected successfully.",
            "emergency_case": case_serializer.data
        }, status=status.HTTP_200_OK)


class EmergencyCaseViewSet(viewsets.ModelViewSet):
    serializer_class = EmergencyCaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or user.role not in ['HOSPITAL_STAFF', 'ADMIN']:
            return EmergencyCase.objects.none()

        return EmergencyCase.objects.select_related('source_report', 'hospital', 'verified_by').all()
