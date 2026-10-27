from rest_framework import serializers
from .models import Hospital
from emergency.models import EmergencyReport, EmergencyCase
from triage.models import TriageAssessment

class HospitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = '__all__'

class EmergencyCaseSerializer(serializers.ModelSerializer):
    source_report_uuid = serializers.CharField(source='source_report.uuid', read_only=True)
    incident_type = serializers.CharField(source='source_report.incident_type', read_only=True)
    description = serializers.CharField(source='source_report.description', read_only=True)
    affected_people_count = serializers.IntegerField(source='source_report.affected_people_count', read_only=True)
    latitude = serializers.FloatField(source='source_report.latitude', read_only=True)
    longitude = serializers.FloatField(source='source_report.longitude', read_only=True)
    reporter_email = serializers.ReadOnlyField(source='source_report.reporter.email')
    verified_by_name = serializers.ReadOnlyField(source='verified_by.full_name')
    rejected_by_name = serializers.ReadOnlyField(source='rejected_by.full_name')

    class Meta:
        model = EmergencyCase
        fields = (
            'id', 'uuid', 'source_report', 'source_report_uuid', 'hospital', 'incident_type',
            'description', 'affected_people_count', 'latitude', 'longitude', 'reporter_email',
            'verified_by', 'verified_by_name', 'verified_at',
            'rejected_by', 'rejected_by_name', 'rejected_at', 'rejection_reason',
            'case_status', 'priority', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'uuid', 'source_report', 'created_at', 'updated_at')
