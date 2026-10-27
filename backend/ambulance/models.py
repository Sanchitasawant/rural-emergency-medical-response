import uuid
from django.db import models
from django.conf import settings
from hospitals.models import Hospital

class Ambulance(models.Model):
    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('ASSIGNED', 'Assigned to Emergency Case'),
        ('ON_THE_WAY', 'En Route to Scene'),
        ('PATIENT_PICKED_UP', 'Patient Picked Up'),
        ('BUSY', 'Busy / Transporting'),
        ('MAINTENANCE', 'In Maintenance'),
    )

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    vehicle_number = models.CharField(max_length=50, unique=True)
    vehicle_type = models.CharField(max_length=50, default='Basic Life Support')
    equipment_type = models.CharField(max_length=100, default='Standard Life Support Equipment')
    hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True, related_name='ambulances')
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_vehicles'
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='AVAILABLE')
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.vehicle_number} ({self.vehicle_type}) - {self.get_status_display()}"


class AmbulanceAssignment(models.Model):
    ASSIGNMENT_STATUS = (
        ('ASSIGNED', 'Dispatched / Assigned'),
        ('ACCEPTED', 'Accepted by Driver'),
        ('ON_THE_WAY', 'En Route to Incident'),
        ('ARRIVED', 'Arrived on Scene'),
        ('PATIENT_PICKED_UP', 'Patient Picked Up'),
        ('REACHED_HOSPITAL', 'Reached Hospital'),
        ('COMPLETED', 'Mission Completed'),
        ('CANCELLED', 'Assignment Cancelled'),
    )

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    ambulance = models.ForeignKey(
        Ambulance,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    emergency_case = models.ForeignKey(
        'emergency.EmergencyCase',
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_dispatches'
    )
    driver_paramedic = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='driver_dispatches'
    )
    status = models.CharField(max_length=30, choices=ASSIGNMENT_STATUS, default='ASSIGNED')
    notes = models.TextField(blank=True, default='')

    # Audit Timestamps
    assigned_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    arrived_at = models.DateTimeField(null=True, blank=True)
    patient_picked_up_at = models.DateTimeField(null=True, blank=True)
    reached_hospital_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-assigned_at']

    def __str__(self):
        return f"Assignment {str(self.uuid)[:8]} - Vehicle {self.ambulance.vehicle_number} -> Case {str(self.emergency_case.uuid)[:8]} ({self.get_status_display()})"


class ResponseEvent(models.Model):
    EVENT_TYPES = (
        ('ACCEPTED', 'Assignment Accepted'),
        ('STARTED', 'En Route Started'),
        ('ARRIVED', 'Arrived On Scene'),
        ('PATIENT_PICKED_UP', 'Patient Picked Up'),
        ('REACHED_HOSPITAL', 'Reached Hospital'),
        ('COMPLETED', 'Mission Completed'),
        ('LOCATION_UPDATE', 'Live Location Update'),
        ('CANCELLED', 'Assignment Cancelled'),
    )

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    assignment = models.ForeignKey(
        AmbulanceAssignment,
        on_delete=models.CASCADE,
        related_name='events'
    )
    event_type = models.CharField(max_length=40, choices=EVENT_TYPES)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='response_events'
    )
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    accuracy = models.FloatField(null=True, blank=True)
    sync_status = models.CharField(max_length=20, default='SYNCED')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Event {self.get_event_type_display()} for Assignment {str(self.assignment.uuid)[:8]} at {self.created_at}"
