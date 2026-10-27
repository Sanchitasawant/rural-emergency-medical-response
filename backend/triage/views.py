import uuid
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import TriageAssessment
from .serializers import TriageAssessmentSerializer
from .rule_engine import RuleBasedTriageEngine
from .ml_service import MLRiskModelService
from .fusion import DecisionFusionEngine
from emergency.models import EmergencyReport

class TriageAssessmentViewSet(viewsets.ModelViewSet):
    serializer_class = TriageAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return TriageAssessment.objects.none()

        # Citizen users are forbidden from worker clinical assessment APIs
        if user.role == 'CITIZEN':
            return TriageAssessment.objects.none()

        # Emergency Workers, Hospital Staff, and Admins can access assessments
        return TriageAssessment.objects.select_related('emergency_report', 'assessed_by').all()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'CITIZEN':
            raise PermissionDenied("Citizens are not authorized to create clinical assessments.")

        client_uuid = serializer.validated_data.get('client_uuid')
        if not client_uuid:
            client_uuid = str(uuid.uuid4())

        serializer.save(
            assessed_by=user,
            client_uuid=client_uuid
        )

    @action(detail=True, methods=['post'], url_path='run-ai')
    def run_ai_assessment(self, request, uuid=None):
        """
        Executes Rule-Based Engine + Scikit-Learn ML Risk Service + Decision Fusion Layer.
        Updates assessment and corresponding EmergencyReport priority level.
        """
        user = request.user
        if user.role == 'CITIZEN':
            raise PermissionDenied("Citizens are not authorized to run AI clinical triage.")

        assessment = self.get_object()

        # Extract Vitals & Clinical Data
        vitals_data = {
            'systolic_bp': assessment.systolic_bp,
            'diastolic_bp': assessment.diastolic_bp,
            'heart_rate': assessment.heart_rate,
            'respiratory_rate': assessment.respiratory_rate,
            'spo2': assessment.spo2,
            'temperature_c': assessment.temperature_c,
        }

        danger_signs = {
            'has_uncontrolled_bleeding': assessment.has_uncontrolled_bleeding,
            'has_severe_respiratory_distress': assessment.has_severe_respiratory_distress,
            'has_altered_mental_status': assessment.has_altered_mental_status,
            'has_unconsciousness': assessment.has_unconsciousness,
            'has_severe_injury': assessment.has_severe_injury,
        }

        pain_data = {
            'pain_present': assessment.pain_present,
            'pain_score': assessment.pain_score,
            'pain_description': assessment.pain_description
        }

        patient_info = {
            'age': assessment.age,
            'sex': assessment.sex,
            'chief_complaint': assessment.chief_complaint,
            'symptom_duration': assessment.symptom_duration,
            'injury_notes': assessment.injury_notes
        }

        gcs_total = assessment.gcs_total or (assessment.gcs_eye + assessment.gcs_verbal + assessment.gcs_motor)

        # 1. Run Rule-Based Triage Engine
        rule_result = RuleBasedTriageEngine.evaluate(
            vitals_data=vitals_data,
            danger_signs=danger_signs,
            pain_data=pain_data,
            gcs_total=gcs_total
        )

        # 2. Run Local ML Risk Model Service
        ml_service = MLRiskModelService.get_instance()
        ml_result = ml_service.predict_risk(
            patient_info=patient_info,
            vitals_data=vitals_data,
            danger_signs=danger_signs,
            pain_data=pain_data,
            gcs_total=gcs_total
        )

        # 3. Perform Decision Fusion Layer
        fusion_result = DecisionFusionEngine.fuse(
            rule_result=rule_result,
            ml_result=ml_result,
            rule_weight=request.data.get('rule_weight', assessment.rule_weight),
            ml_weight=request.data.get('ml_weight', assessment.ml_weight)
        )

        # 4. Update TriageAssessment Record
        assessment.rule_score = fusion_result['rule_score']
        assessment.triggered_rules = rule_result['triggered_rules']
        assessment.ml_score = fusion_result['ml_score']
        assessment.model_name = ml_result['model_name']
        assessment.model_version = ml_result['model_version']
        assessment.rule_weight = fusion_result['rule_weight']
        assessment.ml_weight = fusion_result['ml_weight']
        assessment.fusion_score = fusion_result['fusion_score']
        assessment.priority_level = fusion_result['priority_level']
        assessment.clinical_explanation = fusion_result['clinical_explanation']
        assessment.status = 'ASSESSED'
        assessment.assessed_at = timezone.now()
        assessment.save()

        # Synchronize Priority Level on parent EmergencyReport
        report = assessment.emergency_report
        report.priority = fusion_result['priority_level']
        report.save()

        serializer = self.get_serializer(assessment)
        return Response({
            "status": "success",
            "message": "AI Clinical Assessment & Triage executed successfully.",
            "assessment": serializer.data,
            "rule_evaluation": rule_result,
            "ml_prediction": ml_result,
            "fusion_evaluation": fusion_result,
            "ai_disclaimer": "AI-generated risk assessment is provided for clinical decision support only. Final clinical decisions remain with qualified medical professionals."
        }, status=status.HTTP_200_OK)
