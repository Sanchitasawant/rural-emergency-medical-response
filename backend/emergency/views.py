from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import EmergencyReport
from .serializers import EmergencyReportSerializer

class EmergencyReportViewSet(viewsets.ModelViewSet):
    serializer_class = EmergencyReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return EmergencyReport.objects.none()

        # Citizens only see their own submitted reports
        if user.role == 'CITIZEN':
            return EmergencyReport.objects.filter(reporter=user)

        # Staff, Workers, Drivers, and Admins can access reports for triage & dispatch
        return EmergencyReport.objects.all()

    def perform_create(self, serializer):
        import uuid
        client_uuid = serializer.validated_data.get('client_uuid')
        if not client_uuid:
            client_uuid = str(uuid.uuid4())
        # Force initial security defaults: reporter = authenticated user, status = UNVERIFIED
        serializer.save(
            reporter=self.request.user,
            client_uuid=client_uuid,
            status='UNVERIFIED',
            priority='PENDING'
        )
