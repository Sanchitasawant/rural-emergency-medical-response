import uuid
from django.db import models
from django.conf import settings
from emergency.models import EmergencyReport

class TriageAssessment(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft Assessment'),
        ('IN_PROGRESS', 'Assessment In Progress'),
        ('ASSESSED', 'AI Assessed & Priority Assigned'),
        ('REVIEW_REQUIRED', 'Doctor Review Required'),
        ('COMPLETED', 'Clinical Workflow Completed'),
    )

    PRIORITY_CHOICES = (
        ('LOW', 'Low Risk (Green)'),
        ('MEDIUM', 'Moderate Risk (Yellow)'),
        ('HIGH', 'High Risk (Orange)'),
        ('CRITICAL', 'Critical Emergency (Red)'),
    )

    SEX_CHOICES = (
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
        ('OTHER', 'Other / Unknown'),
    )

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    client_uuid = models.CharField(max_length=64, unique=True, db_index=True)
    emergency_report = models.ForeignKey(
        EmergencyReport,
        on_delete=models.CASCADE,
        related_name='assessments'
    )
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conducted_assessments'
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='IN_PROGRESS')

    # Patient Information
    patient_identifier = models.CharField(max_length=100, blank=True, default='')
    age = models.IntegerField(null=True, blank=True)
    sex = models.CharField(max_length=10, choices=SEX_CHOICES, default='OTHER')
    chief_complaint = models.TextField(blank=True, default='')
    symptom_duration = models.CharField(max_length=100, blank=True, default='')
    injury_notes = models.TextField(blank=True, default='')

    # Vital Signs
    systolic_bp = models.IntegerField(null=True, blank=True, help_text="Systolic Blood Pressure (mmHg)")
    diastolic_bp = models.IntegerField(null=True, blank=True, help_text="Diastolic Blood Pressure (mmHg)")
    heart_rate = models.IntegerField(null=True, blank=True, help_text="Heart Rate (BPM)")
    respiratory_rate = models.IntegerField(null=True, blank=True, help_text="Breaths per minute")
    spo2 = models.FloatField(null=True, blank=True, help_text="Blood Oxygen Saturation (%)")
    temperature_c = models.FloatField(null=True, blank=True, default=37.0, help_text="Body Temperature (°C)")

    # Pain Assessment
    pain_present = models.BooleanField(default=False)
    pain_score = models.IntegerField(default=0, help_text="Pain score (0-10)")
    pain_description = models.CharField(max_length=255, blank=True, default='')

    # Glasgow Coma Scale (GCS) Components
    gcs_eye = models.IntegerField(default=4, help_text="Eye response (1-4)")
    gcs_verbal = models.IntegerField(default=5, help_text="Verbal response (1-5)")
    gcs_motor = models.IntegerField(default=6, help_text="Motor response (1-6)")
    gcs_total = models.IntegerField(default=15, help_text="Calculated GCS total (3-15)")

    # Danger Signs / Clinical Indicators
    has_uncontrolled_bleeding = models.BooleanField(default=False)
    has_severe_respiratory_distress = models.BooleanField(default=False)
    has_altered_mental_status = models.BooleanField(default=False)
    has_unconsciousness = models.BooleanField(default=False)
    has_severe_injury = models.BooleanField(default=False)

    # AI Triage & Rule Engine Scores
    rule_score = models.FloatField(default=0.0)
    triggered_rules = models.JSONField(default=list, blank=True)
    ml_score = models.FloatField(default=0.0)
    model_name = models.CharField(max_length=100, default="RandomForest-Clinical-Triage")
    model_version = models.CharField(max_length=50, default="v1.0")

    # Decision Fusion Weights & Output
    rule_weight = models.FloatField(default=0.60)
    ml_weight = models.FloatField(default=0.40)
    fusion_score = models.FloatField(default=0.0)
    priority_level = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    clinical_explanation = models.TextField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    assessed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Assessment {str(self.uuid)[:8]} for Report {self.emergency_report.uuid} - {self.get_priority_level_display()}"
