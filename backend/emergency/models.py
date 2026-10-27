import uuid
from django.db import models
from django.conf import settings

class EmergencyReport(models.Model):
    STATUS_CHOICES = (
        ('UNVERIFIED', 'Unverified Citizen Report'),
        ('VERIFIED', 'Verified by Staff'),
        ('REJECTED', 'Rejected / Invalid'),
        ('ASSIGNED', 'Ambulance Assigned'),
        ('IN_PROGRESS', 'Response In Progress'),
        ('COMPLETED', 'Case Completed'),
        ('CANCELLED', 'Report Cancelled'),
    )

    INCIDENT_TYPES = (
        ('ROAD_ACCIDENT', 'Road Accident / Vehicle Crash'),
        ('MEDICAL_EMERGENCY', 'Medical Emergency / Acute Illness'),
        ('FIRE', 'Fire Emergency'),
        ('INJURY', 'Severe Physical Injury'),
        ('UNCONSCIOUS_PERSON', 'Unconscious / Unresponsive Person'),
        ('MULTIPLE_CASUALTIES', 'Multiple Casualties / Mass Disaster'),
        ('OTHER', 'Other Emergency'),
    )

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    client_uuid = models.CharField(max_length=64, unique=True, db_index=True)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submitted_reports'
    )

    incident_type = models.CharField(max_length=50, choices=INCIDENT_TYPES)
    other_incident_description = models.TextField(blank=True, null=True)
    affected_people_count = models.IntegerField(default=1)
    description = models.TextField()

    # Location Information
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_accuracy = models.FloatField(null=True, blank=True, help_text="Location accuracy in meters")
    location_captured_at = models.DateTimeField(null=True, blank=True)

    # Optional Attached Photo
    photo = models.ImageField(upload_to='emergency_photos/', null=True, blank=True)

    # Status Control
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='UNVERIFIED')
    priority = models.CharField(max_length=20, default='PENDING', choices=(
        ('PENDING', 'Pending Assessment'),
        ('LOW', 'Low Risk (Green)'),
        ('MEDIUM', 'Moderate Risk (Yellow)'),
        ('HIGH', 'High Risk (Orange)'),
        ('CRITICAL', 'Critical Emergency (Red)'),
    ))

    # Assigned Ambulance reference
    assigned_ambulance = models.ForeignKey(
        'ambulance.Ambulance',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergency_reports'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Report {str(self.uuid)[:8]} - {self.get_incident_type_display()} ({self.get_status_display()})"


class EmergencyCase(models.Model):
    CASE_STATUS_CHOICES = (
        ('UNVERIFIED', 'Unverified Report'),
        ('VERIFIED', 'Verified Emergency Case'),
        ('REJECTED', 'Rejected Report'),
        ('DISPATCHED', 'Ambulance Dispatched'),
        ('IN_PROGRESS', 'Response In Progress'),
        ('COMPLETED', 'Case Resolved'),
        ('CANCELLED', 'Case Cancelled'),
    )

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    source_report = models.OneToOneField(
        EmergencyReport,
        on_delete=models.CASCADE,
        related_name='operational_case'
    )
    hospital = models.ForeignKey(
        'hospitals.Hospital',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergency_cases'
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_cases'
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rejected_cases'
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)

    case_status = models.CharField(max_length=30, choices=CASE_STATUS_CHOICES, default='VERIFIED')
    priority = models.CharField(max_length=20, default='PENDING', choices=(
        ('PENDING', 'Pending Assessment'),
        ('LOW', 'Low Risk (Green)'),
        ('MEDIUM', 'Moderate Risk (Yellow)'),
        ('HIGH', 'High Risk (Orange)'),
        ('CRITICAL', 'Critical Emergency (Red)'),
    ))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Case {str(self.uuid)[:8]} (Source: {str(self.source_report.uuid)[:8]}) - {self.get_case_status_display()}"
