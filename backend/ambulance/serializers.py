from rest_framework import serializers
from .models import Ambulance, AmbulanceAssignment, ResponseEvent
from accounts.models import User

class DriverUserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ('id', 'uuid', 'email', 'full_name', 'phone_number', 'role')


class AmbulanceSerializer(serializers.ModelSerializer):
    hospital_name = serializers.ReadOnlyField(source='hospital.name')
    driver_name = serializers.ReadOnlyField(source='driver.full_name')

    class Meta:
        model = Ambulance
        fields = (
            'id', 'uuid', 'vehicle_number', 'vehicle_type', 'equipment_type',
            'hospital', 'hospital_name', 'driver', 'driver_name', 'status',
            'latitude', 'longitude', 'updated_at'
        )


class ResponseEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.full_name')

    class Meta:
        model = ResponseEvent
        fields = (
            'id', 'uuid', 'assignment', 'event_type', 'created_by',
            'created_by_name', 'latitude', 'longitude', 'accuracy',
            'sync_status', 'created_at'
        )
        read_only_fields = ('id', 'uuid', 'created_by', 'created_at')


class AmbulanceAssignmentSerializer(serializers.ModelSerializer):
    ambulance_vehicle_number = serializers.ReadOnlyField(source='ambulance.vehicle_number')
    ambulance_type = serializers.ReadOnlyField(source='ambulance.vehicle_type')
    case_uuid = serializers.CharField(source='emergency_case.uuid', read_only=True)
    incident_type = serializers.CharField(source='emergency_case.source_report.incident_type', read_only=True)
    description = serializers.CharField(source='emergency_case.source_report.description', read_only=True)
    affected_people_count = serializers.IntegerField(source='emergency_case.source_report.affected_people_count', read_only=True)
    latitude = serializers.FloatField(source='emergency_case.source_report.latitude', read_only=True)
    longitude = serializers.FloatField(source='emergency_case.source_report.longitude', read_only=True)
    priority = serializers.CharField(source='emergency_case.priority', read_only=True)
    hospital_name = serializers.ReadOnlyField(source='emergency_case.hospital.name')
    assigned_by_name = serializers.ReadOnlyField(source='assigned_by.full_name')
    driver_name = serializers.ReadOnlyField(source='driver_paramedic.full_name')
    events = ResponseEventSerializer(many=True, read_only=True)

    class Meta:
        model = AmbulanceAssignment
        fields = (
            'id', 'uuid', 'ambulance', 'ambulance_vehicle_number', 'ambulance_type',
            'emergency_case', 'case_uuid', 'incident_type', 'description', 'affected_people_count',
            'latitude', 'longitude', 'priority', 'hospital_name', 'assigned_by', 'assigned_by_name',
            'driver_paramedic', 'driver_name', 'assigned_at', 'accepted_at', 'started_at',
            'arrived_at', 'patient_picked_up_at', 'reached_hospital_at', 'completed_at',
            'status', 'notes', 'events', 'updated_at'
        )
        read_only_fields = (
            'id', 'uuid', 'assigned_by', 'assigned_at', 'accepted_at', 'started_at',
            'arrived_at', 'patient_picked_up_at', 'reached_hospital_at', 'completed_at', 'updated_at'
        )
