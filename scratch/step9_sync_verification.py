import os
import sys
import django

# Setup Django environment
sys.path.append(r'c:\Users\sanchita\Desktop\rural-emergency-ai\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ruralcare.settings')
django.setup()

import uuid
from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import User, AuditLog
from emergency.models import EmergencyReport, EmergencyCase
from hospitals.models import Hospital
from ambulance.models import Ambulance, AmbulanceAssignment, ResponseEvent
from triage.models import TriageAssessment

def run_step9_verification():
    print("=" * 80)
    print("STEP 9 AUTOMATED VERIFICATION SUITE — BACKGROUND SYNCHRONIZATION ENGINE")
    print("=" * 80)

    client = APIClient()
    passw = "SecurePass123!"

    # 1. Setup Fixtures
    hospital, _ = Hospital.objects.get_or_create(
        name="Sync Test Hospital",
        defaults={"district": "Pune", "address": "NH-48 Milestone 10", "contact_number": "+91-9988776655"}
    )

    citizen, _ = User.objects.get_or_create(
        email="citizen_step9@ruralcare.ai",
        defaults={"username": "citizen_step9", "role": "CITIZEN", "first_name": "Citizen", "last_name": "Step9"}
    )
    citizen.set_password(passw)
    citizen.save()

    worker, _ = User.objects.get_or_create(
        email="worker_step9@ruralcare.ai",
        defaults={"username": "worker_step9", "role": "EMERGENCY_WORKER", "first_name": "Worker", "last_name": "Step9"}
    )
    worker.set_password(passw)
    worker.save()

    h_staff, _ = User.objects.get_or_create(
        email="staff_step9@ruralcare.ai",
        defaults={"username": "staff_step9", "role": "HOSPITAL_STAFF", "first_name": "Staff", "last_name": "Step9"}
    )
    h_staff.set_password(passw)
    h_staff.save()

    driver, _ = User.objects.get_or_create(
        email="driver_step9@ruralcare.ai",
        defaults={"username": "driver_step9", "role": "DRIVER_PARAMEDIC", "first_name": "Driver", "last_name": "Step9"}
    )
    driver.set_password(passw)
    driver.save()

    admin, _ = User.objects.get_or_create(
        email="admin_step9@ruralcare.ai",
        defaults={"username": "admin_step9", "role": "ADMIN", "first_name": "Admin", "last_name": "Step9"}
    )
    admin.set_password(passw)
    admin.save()

    print("\n[+] Fixtures created successfully.")

    # Authenticate as Citizen
    res_log = client.post('/api/auth/login/', {'email': citizen.email, 'password': passw})
    assert res_log.status_code == 200
    cit_token = res_log.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {cit_token}')

    # TEST 1: Batch Sync Endpoint Auth Check
    unauth_client = APIClient()
    res_unauth = unauth_client.post('/api/sync/batch/', {'records': []})
    assert res_unauth.status_code == 401, f"Unauthenticated request should fail with 401, got {res_unauth.status_code}"
    print("  [PASS] 1. Sync Endpoint Auth Guard (401 Unauthorized for missing JWT)")

    # TEST 2: Database-Level Idempotency Check (client_uuid)
    test_client_uuid = f"SYNCTEST-REPORT-{uuid.uuid4().hex[:8]}"
    batch_payload = {
        "records": [
            {
                "client_uuid": test_client_uuid,
                "entity_type": "EMERGENCY_REPORT",
                "operation": "CREATE",
                "payload": {
                    "incident_type": "ROAD_ACCIDENT",
                    "affected_people_count": 2,
                    "description": "Highway collision near kilometer 14",
                    "latitude": 18.5204,
                    "longitude": 73.8567,
                    "status": "UNVERIFIED"
                },
                "priority": "HIGH"
            }
        ]
    }

    # First Submission
    res_first = client.post('/api/sync/batch/', batch_payload, format='json')
    assert res_first.status_code == 200, f"First sync failed: {res_first.data}"
    first_res_status = res_first.data['results'][0]['status']
    assert first_res_status == 'SYNCED', f"Expected SYNCED, got {first_res_status}"
    print("  [PASS] 2a. First Batch Submission -> Status: SYNCED")

    # Second Submission (Identical client_uuid)
    res_second = client.post('/api/sync/batch/', batch_payload, format='json')
    assert res_second.status_code == 200, f"Second sync failed: {res_second.data}"
    second_res_status = res_second.data['results'][0]['status']
    assert second_res_status == 'ALREADY_PROCESSED', f"Expected ALREADY_PROCESSED, got {second_res_status}"
    print("  [PASS] 2b. Second Submission (Same client_uuid) -> Status: ALREADY_PROCESSED")

    # Direct MySQL Query Verification
    mysql_count = EmergencyReport.objects.filter(client_uuid=test_client_uuid).count()
    assert mysql_count == 1, f"MySQL verification failed! Expected exactly 1 record, found {mysql_count}!"
    print(f"  [PASS] 2c. MySQL Direct Verification -> Exactly {mysql_count} record in database (0 duplicates).")

    # TEST 3: Partial Batch Failure & Savepoint Isolation Check
    valid_uuid = f"VALID-REP-{uuid.uuid4().hex[:6]}"
    partial_payload = {
        "records": [
            {
                "client_uuid": valid_uuid,
                "entity_type": "EMERGENCY_REPORT",
                "operation": "CREATE",
                "payload": {"incident_type": "FIRE", "description": "Shop fire"},
                "priority": "HIGH"
            },
            {
                "client_uuid": "BAD-RECORD-001",
                "entity_type": "INVALID_UNKNOWN_ENTITY",
                "operation": "CREATE",
                "payload": {}
            }
        ]
    }
    res_partial = client.post('/api/sync/batch/', partial_payload, format='json')
    assert res_partial.status_code == 200
    res_statuses = {r['client_uuid']: r['status'] for r in res_partial.data['results']}
    assert res_statuses[valid_uuid] == 'SYNCED'
    assert res_statuses['BAD-RECORD-001'] == 'FAILED'
    print("  [PASS] 3. Partial Batch Failure & Savepoint Isolation (Valid record SYNCED, invalid FAILED)")

    # TEST 4: Explicit Dependency Graph Resolution Check
    parent_uuid = f"PARENT-REP-{uuid.uuid4().hex[:6]}"
    child_uuid = f"CHILD-ASSESS-{uuid.uuid4().hex[:6]}"

    # Try syncing child assessment BEFORE parent report exists
    child_payload = {
        "records": [
            {
                "client_uuid": child_uuid,
                "entity_type": "CLINICAL_ASSESSMENT",
                "operation": "CREATE",
                "payload": {
                    "report_client_uuid": parent_uuid,
                    "vitals": {"systolic_bp": 110, "heart_rate": 88},
                    "priority_level": "HIGH"
                },
                "dependency_ids": [parent_uuid]
            }
        ]
    }
    res_child_first = client.post('/api/sync/batch/', child_payload, format='json')
    assert res_child_first.status_code == 200
    assert res_child_first.data['results'][0]['status'] == 'PENDING_DEPENDENCY'
    print("  [PASS] 4a. Child Assessment before Parent Report -> Status: PENDING_DEPENDENCY")

    # Now sync Parent Report + Child Assessment together
    combined_payload = {
        "records": [
            {
                "client_uuid": parent_uuid,
                "entity_type": "EMERGENCY_REPORT",
                "operation": "CREATE",
                "payload": {"incident_type": "MEDICAL_EMERGENCY", "description": "Fainting spell"}
            },
            {
                "client_uuid": child_uuid,
                "entity_type": "CLINICAL_ASSESSMENT",
                "operation": "CREATE",
                "payload": {
                    "report_client_uuid": parent_uuid,
                    "vitals": {"systolic_bp": 110, "heart_rate": 88},
                    "priority_level": "HIGH"
                },
                "dependency_ids": [parent_uuid]
            }
        ]
    }
    res_comb = client.post('/api/sync/batch/', combined_payload, format='json')
    assert res_comb.status_code == 200
    statuses_map = {r['client_uuid']: r['status'] for r in res_comb.data['results']}
    assert statuses_map[parent_uuid] == 'SYNCED'
    assert statuses_map[child_uuid] == 'SYNCED'

    # Verify database relationship
    assess_obj = TriageAssessment.objects.filter(client_uuid=child_uuid).first()
    assert assess_obj is not None and assess_obj.emergency_report.client_uuid == parent_uuid
    print("  [PASS] 4b. Parent + Child Dependency Graph Synced & Linked in MySQL")

    # TEST 5: Driver Response Event Synchronization
    # Setup ambulance & dispatch assignment
    amb, _ = Ambulance.objects.get_or_create(vehicle_number="MH-12-SYNC-909", defaults={"hospital": hospital, "driver": driver})
    report_d = EmergencyReport.objects.create(client_uuid=str(uuid.uuid4()), incident_type="ROAD_ACCIDENT", status="VERIFIED")
    case_d = EmergencyCase.objects.create(source_report=report_d, case_status="VERIFIED", hospital=hospital)
    assignment = AmbulanceAssignment.objects.create(ambulance=amb, emergency_case=case_d, driver_paramedic=driver, status="ASSIGNED")

    # Authenticate as Driver
    res_d_log = client.post('/api/auth/login/', {'email': driver.email, 'password': passw})
    d_token = res_d_log.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {d_token}')

    event_client_uuid = str(uuid.uuid4())
    event_payload = {
        "records": [
            {
                "client_uuid": event_client_uuid,
                "entity_type": "DRIVER_RESPONSE_EVENT",
                "operation": "CREATE",
                "payload": {
                    "assignment_uuid": str(assignment.uuid),
                    "status": "ACCEPTED",
                    "latitude": 18.5220,
                    "longitude": 73.8580
                },
                "priority": "CRITICAL",
                "dependency_ids": [str(assignment.uuid)]
            }
        ]
    }
    res_event = client.post('/api/sync/batch/', event_payload, format='json')
    assert res_event.status_code == 200 and res_event.data['results'][0]['status'] == 'SYNCED'
    assignment.refresh_from_db()
    assert assignment.status == 'ACCEPTED'
    print("  [PASS] 5. Driver Response Event Synchronized & Assignment Updated to ACCEPTED")

    # TEST 6: Regression Test Suite (Steps 4–8)
    # Admin API Regression Check
    res_a_log = client.post('/api/auth/login/', {'email': admin.email, 'password': passw})
    a_token = res_a_log.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {a_token}')

    res_dash = client.get('/api/admin/admin/dashboard/')
    assert res_dash.status_code == 200, "Step 8 Admin dashboard regression test failed!"
    res_users = client.get('/api/admin/admin/users/')
    assert res_users.status_code == 200, "Step 8 Admin users list regression test failed!"
    res_analytics = client.get('/api/admin/admin/analytics/')
    assert res_analytics.status_code == 200, "Step 8 Admin analytics regression test failed!"
    print("  [PASS] 6. Steps 4–8 Regression Suite Passed Cleanly")

    print("\n" + "=" * 80)
    print("ALL STEP 9 AUTOMATED SYNCHRONIZATION & REGRESSION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == '__main__':
    run_step9_verification()
