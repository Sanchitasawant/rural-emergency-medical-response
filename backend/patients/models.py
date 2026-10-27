from django.db import models
from django.conf import settings
from emergency.models import EmergencyReport

class Patient(models.Model):
    GENDER_CHOICES = (
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
        ('OTHER', 'Other / Unknown'),
    )

    emergency_report = models.ForeignKey(EmergencyReport, on_delete=models.CASCADE, related_name='patients')
    name = models.CharField(max_length=150, blank=True, null=True)
    age = models.IntegerField(blank=True, null=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, default='OTHER')
    medical_history = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Patient: {self.name or 'Anonymous'} (Report {self.emergency_report.id})"
