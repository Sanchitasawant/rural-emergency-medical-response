import uuid
from rest_framework import serializers
from .models import EmergencyReport

class EmergencyReportSerializer(serializers.ModelSerializer):
    client_uuid = serializers.CharField(required=False, allow_blank=True)
    reporter_email = serializers.ReadOnlyField(source='reporter.email')
    reporter_name = serializers.ReadOnlyField(source='reporter.full_name')

    class Meta:
        model = EmergencyReport
        fields = (
            'id', 'uuid', 'client_uuid', 'reporter', 'reporter_email', 'reporter_name',
            'incident_type', 'other_incident_description', 'affected_people_count',
            'description', 'latitude', 'longitude', 'location_accuracy', 'location_captured_at',
            'photo', 'status', 'priority', 'assigned_ambulance', 'created_at', 'updated_at', 'synced_at'
        )
        read_only_fields = ('id', 'uuid', 'reporter', 'status', 'priority', 'assigned_ambulance', 'created_at', 'updated_at', 'synced_at')

    def validate_affected_people_count(self, value):
        if value < 1:
            raise serializers.ValidationError("Number of affected people must be at least 1.")
        return value

    def validate_latitude(self, value):
        if value is not None and (value < -90.0 or value > 90.0):
            raise serializers.ValidationError("Latitude must be between -90 and +90 degrees.")
        return value

    def validate_longitude(self, value):
        if value is not None and (value < -180.0 or value > 180.0):
            raise serializers.ValidationError("Longitude must be between -180 and +180 degrees.")
        return value

    def validate_photo(self, value):
        if value:
            # 5MB limit
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("Image file size exceeds the allowed limit of 5MB.")
            ext = value.name.split('.')[-1].lower()
            if ext not in ['jpg', 'jpeg', 'png', 'webp']:
                raise serializers.ValidationError("Unsupported image format. Allowed formats: JPG, PNG, WEBP.")
        return value

    def validate(self, attrs):
        incident_type = attrs.get('incident_type')
        other_desc = attrs.get('other_incident_description')

        if incident_type == 'OTHER' and not other_desc:
            raise serializers.ValidationError({"other_incident_description": "Please describe the incident when 'Other' is selected."})

        description = attrs.get('description', '')
        if len(description.strip()) < 5:
            raise serializers.ValidationError({"description": "Please provide a detailed description of what you observed (at least 5 characters)."})

        return attrs
