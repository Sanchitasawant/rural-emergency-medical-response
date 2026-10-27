from rest_framework import serializers
from .models import TriageAssessment
from emergency.models import EmergencyReport

class TriageAssessmentSerializer(serializers.ModelSerializer):
    emergency_report_uuid = serializers.CharField(source='emergency_report.uuid', read_only=True)
    assessed_by_name = serializers.ReadOnlyField(source='assessed_by.full_name')
    client_uuid = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = TriageAssessment
        fields = (
            'id', 'uuid', 'client_uuid', 'emergency_report', 'emergency_report_uuid',
            'assessed_by', 'assessed_by_name', 'status',
            'patient_identifier', 'age', 'sex', 'chief_complaint', 'symptom_duration', 'injury_notes',
            'systolic_bp', 'diastolic_bp', 'heart_rate', 'respiratory_rate', 'spo2', 'temperature_c',
            'pain_present', 'pain_score', 'pain_description',
            'gcs_eye', 'gcs_verbal', 'gcs_motor', 'gcs_total',
            'has_uncontrolled_bleeding', 'has_severe_respiratory_distress',
            'has_altered_mental_status', 'has_unconsciousness', 'has_severe_injury',
            'rule_score', 'triggered_rules', 'ml_score', 'model_name', 'model_version',
            'rule_weight', 'ml_weight', 'fusion_score', 'priority_level', 'clinical_explanation',
            'created_at', 'updated_at', 'assessed_at'
        )
        read_only_fields = (
            'id', 'uuid', 'assessed_by', 'rule_score', 'triggered_rules', 'ml_score',
            'model_name', 'model_version', 'fusion_score', 'priority_level', 'clinical_explanation',
            'created_at', 'updated_at', 'assessed_at'
        )

    def validate_age(self, value):
        if value is not None and (value < 0 or value > 120):
            raise serializers.ValidationError("Age must be between 0 and 120 years.")
        return value

    def validate_systolic_bp(self, value):
        if value is not None and (value < 40 or value > 260):
            raise serializers.ValidationError("Systolic blood pressure must be between 40 and 260 mmHg.")
        return value

    def validate_diastolic_bp(self, value):
        if value is not None and (value < 20 or value > 160):
            raise serializers.ValidationError("Diastolic blood pressure must be between 20 and 160 mmHg.")
        return value

    def validate_heart_rate(self, value):
        if value is not None and (value < 20 or value > 240):
            raise serializers.ValidationError("Heart rate must be between 20 and 240 BPM.")
        return value

    def validate_respiratory_rate(self, value):
        if value is not None and (value < 5 or value > 60):
            raise serializers.ValidationError("Respiratory rate must be between 5 and 60 breaths/min.")
        return value

    def validate_spo2(self, value):
        if value is not None and (value < 50.0 or value > 100.0):
            raise serializers.ValidationError("Blood oxygen saturation (SpO2) must be between 50% and 100%.")
        return value

    def validate_temperature_c(self, value):
        if value is not None and (value < 30.0 or value > 45.0):
            raise serializers.ValidationError("Body temperature must be between 30°C and 45°C.")
        return value

    def validate_pain_score(self, value):
        if value is not None and (value < 0 or value > 10):
            raise serializers.ValidationError("Pain score must be on a 0 to 10 scale.")
        return value

    def validate_gcs_eye(self, value):
        if value is not None and (value < 1 or value > 4):
            raise serializers.ValidationError("GCS Eye response must be between 1 and 4.")
        return value

    def validate_gcs_verbal(self, value):
        if value is not None and (value < 1 or value > 5):
            raise serializers.ValidationError("GCS Verbal response must be between 1 and 5.")
        return value

    def validate_gcs_motor(self, value):
        if value is not None and (value < 1 or value > 6):
            raise serializers.ValidationError("GCS Motor response must be between 1 and 6.")
        return value

    def validate(self, attrs):
        # Auto-calculate GCS Total from eye, verbal, motor
        eye = attrs.get('gcs_eye', 4)
        verbal = attrs.get('gcs_verbal', 5)
        motor = attrs.get('gcs_motor', 6)
        attrs['gcs_total'] = eye + verbal + motor

        # Diastolic vs Systolic sanity check if both provided
        sys_bp = attrs.get('systolic_bp')
        dia_bp = attrs.get('diastolic_bp')
        if sys_bp is not None and dia_bp is not None and dia_bp >= sys_bp:
            raise serializers.ValidationError({"diastolic_bp": "Diastolic BP must be lower than Systolic BP."})

        return attrs
