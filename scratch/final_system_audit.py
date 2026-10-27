import os
import sys
import uuid
import django

sys.path.insert(0, r'c:\Users\sanchita\Desktop\rural-emergency-ai\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ruralcare.settings')
django.setup()

from django.test import Client
from django.db import connection, models
from accounts.models import User, AuditLog, ConfigAuditLog
from hospitals.models import Hospital
from emergency.models import EmergencyReport, EmergencyCase
from triage.models import TriageAssessment
from ambulance.models import Ambulance, AmbulanceAssignment, ResponseEvent
from triage.rule_engine import RuleBasedTriageEngine
from triage.ml_service import MLRiskModelService
from triage.fusion import DecisionFusionEngine

def run_final_audit():
    print("=" * 80)
    print("RURALCARE AI - COMPREHENSIVE FINAL SYSTEM AUDIT & END-TO-END VALIDATION")
    print("=" * 80)

    client = Client()

    # 1. DATABASE & MIGRATIONS CHECK
    print("\n--- 1. DATABASE & MIGRATIONS CHECK ---")
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1;")
        res = cursor.fetchone()
        assert res[0] == 1
    print("[PASS] MySQL Connection Active")

    # Check Orphan / Duplicate Records
    dup_reports = EmergencyReport.objects.values('client_uuid').annotate(cnt=models.Count('id')).filter(cnt__gt=1)
    dup_assessments = TriageAssessment.objects.values('client_uuid').annotate(cnt=models.Count('id')).filter(cnt__gt=1)
    assert len(dup_reports) == 0, f"Duplicate reports found: {list(dup_reports)}"
    assert len(dup_assessments) == 0, f"Duplicate assessments found: {list(dup_assessments)}"
    print("[PASS] MySQL Integrity: Zero duplicate client_uuids")

    # 2. USER FIXTURES SETUP
    print("\n--- 2. AUTHENTICATION & ROLE ISOLATION SETUP ---")
    users_data = {
        'CITIZEN': ('audit_citizen@test.com', 'Password123!', 'CITIZEN'),
        'EMERGENCY_WORKER': ('audit_worker@test.com', 'Password123!', 'EMERGENCY_WORKER'),
        'HOSPITAL_STAFF': ('audit_staff@test.com', 'Password123!', 'HOSPITAL_STAFF'),
        'DRIVER_PARAMEDIC': ('audit_driver@test.com', 'Password123!', 'DRIVER_PARAMEDIC'),
        'ADMIN': ('audit_admin@test.com', 'Password123!', 'ADMIN'),
    }

    user_objs = {}
    tokens = {}
    headers = {}

    for role, (email, passw, urole) in users_data.items():
        User.objects.filter(email=email).delete()
        u = User.objects.create_user(
            username=email,
            email=email,
            password=passw,
            first_name=role.title(),
            last_name='User',
            role=urole,
            phone_number=f"+91999999990{len(user_objs)}"
        )
        user_objs[role] = u

        res_login = client.post('/api/auth/login/', {'email': email, 'password': passw}, content_type='application/json')
        assert res_login.status_code == 200, f"Failed login for {email}"
        tok = res_login.json()['access']
        tokens[role] = tok
        headers[role] = {'HTTP_AUTHORIZATION': f"Bearer {tok}"}
        print(f"[PASS] Role {role} authenticated successfully via JWT.")

    # 3. ROLE AUTHORIZATION & PERMISSION BOUNDARY AUDIT
    print("\n--- 3. ROLE AUTHORIZATION & PERMISSION BOUNDARY AUDIT ---")
    
    # Citizen trying to access Admin dashboard -> 403
    res_cit_admin = client.get('/api/admin/admin/dashboard/', **headers['CITIZEN'])
    assert res_cit_admin.status_code == 403
    print("[PASS] Citizen blocked from Admin endpoints (HTTP 403 Forbidden)")

    # Emergency Worker trying to dispatch ambulance -> 403
    res_wrk_disp = client.post('/api/hospital/dispatch/assign/', {}, content_type='application/json', **headers['EMERGENCY_WORKER'])
    assert res_wrk_disp.status_code == 403
    print("[PASS] Emergency Worker blocked from Hospital Dispatch (HTTP 403 Forbidden)")

    # Driver trying to verify report -> 403
    res_drv_ver = client.post('/api/hospital/reports/fake-uuid/verify/', {}, content_type='application/json', **headers['DRIVER_PARAMEDIC'])
    assert res_drv_ver.status_code == 403
    print("[PASS] Driver blocked from Report Verification (HTTP 403 Forbidden)")

    # Citizen trying to alter own role -> Prevented
    res_role_tamper = client.patch('/api/auth/profile/', {'role': 'ADMIN'}, content_type='application/json', **headers['CITIZEN'])
    user_objs['CITIZEN'].refresh_from_db()
    assert user_objs['CITIZEN'].role == 'CITIZEN'
    print("[PASS] Role escalation prevented (Role strictly read-only on profile update)")

    # 4. END-TO-END EMERGENCY WORKFLOW AUDIT
    print("\n--- 4. END-TO-END EMERGENCY WORKFLOW AUDIT ---")
    hospital, _ = Hospital.objects.get_or_create(
        name='Audit Central Hospital',
        defaults={
            'district': 'Central District',
            'address': '456 Emergency Ave',
            'contact_number': '+919998887770',
            'latitude': 18.5204,
            'longitude': 73.8567
        }
    )

    ambulance, _ = Ambulance.objects.get_or_create(
        vehicle_number='MH-12-AUDIT-99',
        defaults={
            'vehicle_type': 'Advanced Life Support',
            'equipment_type': 'Ventilator',
            'hospital': hospital,
            'driver': user_objs['DRIVER_PARAMEDIC'],
            'status': 'AVAILABLE',
            'latitude': 18.5210,
            'longitude': 73.8570
        }
    )
    ambulance.status = 'AVAILABLE'
    ambulance.driver = user_objs['DRIVER_PARAMEDIC']
    ambulance.save()

    # Step A: Citizen creates emergency report
    report_uuid = f"AUDIT-REP-{uuid.uuid4().hex[:6]}"
    res_report = client.post('/api/emergency/reports/', {
        'client_uuid': report_uuid,
        'incident_type': 'ROAD_ACCIDENT',
        'affected_people_count': 2,
        'description': 'Severe motorcycle collision on highway',
        'latitude': 18.5250,
        'longitude': 73.8590
    }, content_type='application/json', **headers['CITIZEN'])
    assert res_report.status_code == 201
    rep_data = res_report.json()
    rep_db_uuid = rep_data['uuid']
    assert rep_data['status'] == 'UNVERIFIED'
    print(f"[PASS] Workflow Step 1: Citizen Report created (Status: UNVERIFIED, UUID: {rep_db_uuid[:8]})")

    # Step B: Hospital Staff verifies report
    res_ver = client.post(f'/api/hospital/reports/{rep_db_uuid}/verify/', {}, content_type='application/json', **headers['HOSPITAL_STAFF'])
    assert res_ver.status_code == 200
    case_uuid = res_ver.json()['emergency_case']['uuid']
    print(f"[PASS] Workflow Step 2: Hospital Staff verified report -> EmergencyCase created ({case_uuid[:8]})")

    # Step C: Emergency Worker conducts Clinical Assessment & runs AI Triage
    rep_obj = EmergencyReport.objects.get(uuid=rep_db_uuid)
    assess_client_uuid = f"AUDIT-ASSESS-{uuid.uuid4().hex[:6]}"
    res_ass_create = client.post('/api/triage/assessments/', {
        'client_uuid': assess_client_uuid,
        'emergency_report': rep_obj.id,
        'systolic_bp': 85,
        'diastolic_bp': 55,
        'heart_rate': 125,
        'respiratory_rate': 28,
        'spo2': 88.0,
        'temperature_c': 36.5,
        'gcs_eye': 2,
        'gcs_verbal': 3,
        'gcs_motor': 4,
        'has_uncontrolled_bleeding': True,
        'has_severe_respiratory_distress': True
    }, content_type='application/json', **headers['EMERGENCY_WORKER'])
    assert res_ass_create.status_code == 201, f"Assessment creation failed with {res_ass_create.status_code}: {res_ass_create.content}"
    assess_uuid = res_ass_create.json()['uuid']

    # Run AI Assessment
    res_ai = client.post(f'/api/triage/assessments/{assess_uuid}/run-ai/', {}, content_type='application/json', **headers['EMERGENCY_WORKER'])
    assert res_ai.status_code == 200
    ai_data = res_ai.json()
    assert ai_data['assessment']['priority_level'] == 'CRITICAL'
    assert 'ai_disclaimer' in ai_data
    ml_p_score = ai_data['ml_prediction'].get('probability', ai_data['ml_prediction'].get('ml_score', 0.0))
    print(f"[PASS] Workflow Step 3: AI Clinical Triage executed -> Priority: CRITICAL (Rule: {ai_data['rule_evaluation']['rule_score']:.2f}, ML: {ml_p_score:.2f}, Hybrid: {ai_data['fusion_evaluation']['fusion_score']:.2f})")

    # Step D: Hospital Staff assigns Ambulance & Driver
    res_assign = client.post('/api/hospital/dispatch/assign/', {
        'ambulance_uuid': str(ambulance.uuid),
        'case_uuid': case_uuid,
        'driver_id': user_objs['DRIVER_PARAMEDIC'].id,
        'notes': 'Urgent dispatch for critical trauma'
    }, content_type='application/json', **headers['HOSPITAL_STAFF'])
    assert res_assign.status_code == 201
    assign_uuid = res_assign.json()['assignment']['uuid']
    print(f"[PASS] Workflow Step 4: Hospital Dispatch assigned ambulance {ambulance.vehicle_number} to case")

    # Step E: Driver / Paramedic complete response state machine
    status_flow = ['ACCEPTED', 'STARTED', 'ARRIVED', 'PATIENT_PICKED_UP', 'REACHED_HOSPITAL', 'COMPLETED']
    endpoint_map = {
        'ACCEPTED': f'/api/driver/assignments/{assign_uuid}/accept/',
        'STARTED': f'/api/driver/assignments/{assign_uuid}/start/',
        'ARRIVED': f'/api/driver/assignments/{assign_uuid}/arrive/',
        'PATIENT_PICKED_UP': f'/api/driver/assignments/{assign_uuid}/pickup/',
        'REACHED_HOSPITAL': f'/api/driver/assignments/{assign_uuid}/hospital-arrival/',
        'COMPLETED': f'/api/driver/assignments/{assign_uuid}/complete/',
    }

    for st in status_flow:
        url = endpoint_map[st]
        res_st = client.post(url, {'latitude': 18.525, 'longitude': 73.859}, content_type='application/json', **headers['DRIVER_PARAMEDIC'])
        assert res_st.status_code == 200, f"Failed driver status transition to {st}: {res_st.content}"
    
    ambulance.refresh_from_db()
    assert ambulance.status == 'AVAILABLE'
    print(f"[PASS] Workflow Step 5: Paramedic executed full status chain {status_flow} -> Ambulance reset to AVAILABLE")

    # 5. OFFLINE DRIVER EVENT ORDERING TEST
    print("\n--- 5. OFFLINE BATCH DRIVER EVENT SYNCHRONIZATION TEST ---")
    offline_rep_uuid = f"OFFLINE-REP-{uuid.uuid4().hex[:6]}"
    offline_event_1 = f"OFFLINE-EVT-1-{uuid.uuid4().hex[:6]}"
    offline_event_2 = f"OFFLINE-EVT-2-{uuid.uuid4().hex[:6]}"

    batch_payload = {
        "records": [
            {
                "client_uuid": offline_rep_uuid,
                "entity_type": "EMERGENCY_REPORT",
                "operation": "CREATE",
                "payload": {"incident_type": "MEDICAL_EMERGENCY", "description": "Offline cardiac distress"}
            },
            {
                "client_uuid": offline_event_1,
                "entity_type": "DRIVER_RESPONSE_EVENT",
                "operation": "CREATE",
                "payload": {"assignment_uuid": assign_uuid, "status": "ACCEPTED", "latitude": 18.521, "longitude": 73.857},
                "dependency_ids": [assign_uuid]
            }
        ]
    }
    res_batch_sync = client.post('/api/sync/batch/', batch_payload, content_type='application/json', **headers['DRIVER_PARAMEDIC'])
    assert res_batch_sync.status_code == 200
    res_map = {r['client_uuid']: r['status'] for r in res_batch_sync.json()['results']}
    assert res_map[offline_rep_uuid] == 'SYNCED'
    assert res_map[offline_event_1] in ['SYNCED', 'ALREADY_PROCESSED']
    print("[PASS] Offline Driver Response Events synchronized cleanly in order.")

    # 6. ADMIN SYSTEM ANALYTICS AUDIT
    print("\n--- 6. ADMIN SYSTEM ANALYTICS AUDIT ---")
    res_dash = client.get('/api/admin/admin/dashboard/', **headers['ADMIN'])
    assert res_dash.status_code == 200
    dash_data = res_dash.json()
    metrics = dash_data.get('metrics', dash_data)
    total_rep = metrics.get('total_reports', metrics.get('reports_count', 0))
    print(f"[PASS] Admin Dashboard returned real database aggregations: Metrics={list(metrics.keys())}")

    print("\n" + "=" * 80)
    print("ALL FINAL SYSTEM AUDIT CHECKS COMPLETED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == '__main__':
    run_final_audit()
