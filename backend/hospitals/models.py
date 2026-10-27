import uuid
from django.db import models

class Hospital(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    district = models.CharField(max_length=100)
    address = models.TextField()
    contact_number = models.CharField(max_length=20)
    icu_beds_available = models.IntegerField(default=0)
    general_beds_available = models.IntegerField(default=0)
    has_trauma_center = models.BooleanField(default=False)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.district})"
