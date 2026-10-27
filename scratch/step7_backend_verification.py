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
from accounts.models import User
from emergency.models import EmergencyReport, EmergencyCase
from hospitals.models import Hospital
from ambulance.models import Ambulance, AmbulanceAssignment, ResponseEvent

def run_step7_verification():
    print("=" * 70)
    print("STEP 7 AUTOMATED VERIFICATION SUITE — DRIVER / PARAMEDIC & FLEET TRACKING")
    print("=" * 70)

    client = APIClient()

    # 1. Setup Test Users & Fixtures
    passw = "SecurePass123!"

    # Create Hospital
    hospital, _ = Hospital.objects.get_or_create(
        name="Test District Hospital",
        defaults={"district": "Pune", "address": "NH-48 Khed Shivapur", "contact_number": "+91-9876543210", "icu_beds_available": 10, "general_beds_available": 25}
    )

    # Create Hospital Staff User
    h_staff, _ = User.objects.get_or_create(
        email="hstaff_step7@ruralcare.ai",
        defaults={"username": "hstaff_step7", "role": "HOSPITAL_STAFF", "first_name": "Hospital", "last_name": "Staff"}
    )
    h_staff.set_password(passw)
    h_staff.save()

    # Create Driver 1 User
    driver1, _ = User.objects.get_or_create(
        email="driver1_step7@ruralcare.ai",
        defaults={"username": "driver1_step7", "role": "DRIVER_PARAMEDIC", "first_name": "Ramesh", "last_name": "Driver"}
    )
    driver1.set_password(passw)
    driver1.save()

    # Create Driver 2 User
    driver2, _ = User.objects.get_or_create(
        email="driver2_step7@ruralcare.ai",
        defaults={"username": "driver2_step7", "role": "DRIVER_PARAMEDIC", "first_name": "Suresh", "last_name": "Driver"}
    )
    driver2.set_password(passw)
    driver2.save()

    # Create Citizen User
    citizen, _ = User.objects.get_or_create(
        email="citizen_step7@ruralcare.ai",
        defaults={"username": "citizen_step7", "role": "CITIZEN", "first_name": "Citizen", "last_name": "One"}
    )
    citizen.set_password(passw)
    citizen.save()

    # Create Emergency Worker User
    worker, _ = User.objects.get_or_create(
        email="worker_step7@ruralcare.ai",
        defaults={"username": "worker_step7", "role": "EMERGENCY_WORKER", "first_name": "Worker", "last_name": "One"}
    )
    worker.set_password(passw)
    worker.save()

    # Create Ambulance
    amb, _ = Ambulance.objects.get_or_create(
        vehicle_number="MH-12-STEP7-101",
        defaults={"hospital": hospital, "driver": driver1, "vehicle_type": "ADVANCED_LIFE_SUPPORT", "status": "AVAILABLE"}
    )
    amb.status = 'AVAILABLE'
    amb.driver = driver1
    amb.save()

    # Create Emergency Report & Case
    report = EmergencyReport.objects.create(
        client_uuid=str(uuid.uuid4()),
        reporter=citizen,
        incident_type="ROAD_ACCIDENT",
        description="Collision near milestone 32",
        status="VERIFIED"
    )
    case = EmergencyCase.objects.create(
        source_report=report,
        case_status="VERIFIED",
        priority="HIGH",
        hospital=hospital
    )

    print("\n[+] Fixtures created successfully.")

    # TEST 1: Driver Login & JWT Token
    res = client.post('/api/auth/login/', {'email': driver1.email, 'password': passw})
    assert res.status_code == 200, f"Driver login failed: {res.data}"
    driver1_token = res.data['access']
    print("  [PASS] 1. Driver Login & JWT Token")

    # TEST 2: No Assignment State
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {driver1_token}')
    res = client.get('/api/driver/assignments/')
    assert res.status_code == 200, f"Get driver assignments failed: {res.data}"
    assert len(res.data) == 0 or all(a['status'] == 'COMPLETED' for a in res.data), "Driver should have no active assignment initially."
    print("  [PASS] 2. No Assignment State verified")

    # TEST 3: Hospital Staff Dispatches Ambulance
    res_hlogin = client.post('/api/auth/login/', {'email': h_staff.email, 'password': passw})
    hstaff_token = res_hlogin.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {hstaff_token}')

    res_dispatch = client.post('/api/hospital/dispatch/assign/', {
        'ambulance_uuid': str(amb.uuid),
        'case_uuid': str(case.uuid),
        'driver_id': driver1.id,
        'notes': 'Proceed immediately with siren'
    })
    assert res_dispatch.status_code == 201, f"Dispatch failed: {res_dispatch.data}"
    assignment_uuid = res_dispatch.data['assignment']['uuid']
    print("  [PASS] 3. Hospital Staff Dispatches Ambulance")

    # TEST 4: Assigned Case Display for Driver
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {driver1_token}')
    res = client.get(f'/api/driver/assignments/{assignment_uuid}/')
    assert res.status_code == 200, f"Driver view assignment failed: {res.data}"
    assert res.data['status'] == 'ASSIGNED'
    print("  [PASS] 4. Assigned Case Display for Driver")

    # TEST 5: Accept Assignment
    res = client.post(f'/api/driver/assignments/{assignment_uuid}/accept/')
    assert res.status_code == 200, f"Accept assignment failed: {res.data}"
    assert res.data['assignment']['status'] == 'ACCEPTED'
    print("  [PASS] 5. Accept Assignment")

    # TEST 6: Duplicate Accept Prevention
    res_dup = client.post(f'/api/driver/assignments/{assignment_uuid}/accept/')
    assert res_dup.status_code == 400, f"Duplicate accept should be rejected but got {res_dup.status_code}"
    print("  [PASS] 6. Duplicate Accept Prevention")

    # TEST 7: Start Response
    res = client.post(f'/api/driver/assignments/{assignment_uuid}/start/', {'latitude': 18.5204, 'longitude': 73.8567})
    assert res.status_code == 200, f"Start response failed: {res.data}"
    assert res.data['assignment']['status'] == 'ON_THE_WAY'
    print("  [PASS] 7. Start Response (ACCEPTED -> ON_THE_WAY)")

    # TEST 8: Arrived at Scene
    res = client.post(f'/api/driver/assignments/{assignment_uuid}/arrive/', {'latitude': 18.5210, 'longitude': 73.8570})
    assert res.status_code == 200, f"Mark arrived failed: {res.data}"
    assert res.data['assignment']['status'] == 'ARRIVED'
    print("  [PASS] 8. Arrived at Scene (ON_THE_WAY -> ARRIVED)")

    # TEST 9: Patient Picked Up
    res = client.post(f'/api/driver/assignments/{assignment_uuid}/pickup/', {'latitude': 18.5210, 'longitude': 73.8570})
    assert res.status_code == 200, f"Patient pickup failed: {res.data}"
    assert res.data['assignment']['status'] == 'PATIENT_PICKED_UP'
    print("  [PASS] 9. Patient Picked Up (ARRIVED -> PATIENT_PICKED_UP)")

    # TEST 10: Reached Hospital
    res = client.post(f'/api/driver/assignments/{assignment_uuid}/hospital-arrival/', {'latitude': 18.5250, 'longitude': 73.8590})
    assert res.status_code == 200, f"Hospital arrival failed: {res.data}"
    assert res.data['assignment']['status'] == 'REACHED_HOSPITAL'
    print("  [PASS] 10. Reached Hospital (PATIENT_PICKED_UP -> REACHED_HOSPITAL)")

    # TEST 11: Complete Response & Ambulance Availability Reset
    res = client.post(f'/api/driver/assignments/{assignment_uuid}/complete/')
    assert res.status_code == 200, f"Complete response failed: {res.data}"
    assert res.data['assignment']['status'] == 'COMPLETED'
    amb.refresh_from_db()
    assert amb.status == 'AVAILABLE', f"Ambulance status should be AVAILABLE, but is {amb.status}"
    print("  [PASS] 11. Complete Response & Ambulance Status Reset to AVAILABLE")

    # TEST 12: Invalid Status Transition (Cannot complete again)
    res_inv = client.post(f'/api/driver/assignments/{assignment_uuid}/complete/')
    assert res_inv.status_code == 400, f"Invalid transition should return 400, got {res_inv.status_code}"
    print("  [PASS] 12. Invalid Status Transition Guard")

    # TEST 13: Driver Accessing Another Driver's Assignment Authorization Guard
    # Create new assignment for Driver 2
    report2 = EmergencyReport.objects.create(
        client_uuid=str(uuid.uuid4()),
        reporter=citizen,
        incident_type="MEDICAL_EMERGENCY",
        description="Cardiac distress call",
        status="VERIFIED"
    )
    case2 = EmergencyCase.objects.create(source_report=report2, case_status="VERIFIED", priority="CRITICAL")
    assignment2 = AmbulanceAssignment.objects.create(
        ambulance=amb,
        emergency_case=case2,
        assigned_by=h_staff,
        driver_paramedic=driver2,
        status='ASSIGNED'
    )

    # Driver 1 tries to access/accept Driver 2's assignment
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {driver1_token}')
    res_unauth = client.post(f'/api/driver/assignments/{assignment2.uuid}/accept/')
    assert res_unauth.status_code in [403, 400], f"Unauthorized driver should be blocked, got {res_unauth.status_code}"
    print("  [PASS] 13. Driver Accessing Another Driver's Assignment Blocked")

    # TEST 14: Citizen Accessing Driver Endpoint
    res_cit_login = client.post('/api/auth/login/', {'email': citizen.email, 'password': passw})
    cit_token = res_cit_login.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {cit_token}')
    res_cit_acc = client.get('/api/driver/assignments/')
    assert res_cit_acc.status_code == 200 and len(res_cit_acc.data) == 0, "Citizen should not view driver assignments"
    print("  [PASS] 14. Citizen Accessing Driver Endpoint Guard")

    # TEST 15: Emergency Worker Accessing Driver Endpoint
    res_wrk_login = client.post('/api/auth/login/', {'email': worker.email, 'password': passw})
    wrk_token = res_wrk_login.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {wrk_token}')
    res_wrk_acc = client.get('/api/driver/assignments/')
    assert res_wrk_acc.status_code == 200 and len(res_wrk_acc.data) == 0, "Worker should not view driver assignments"
    print("  [PASS] 15. Emergency Worker Accessing Driver Endpoint Guard")

    # TEST 16: Hospital Staff Fleet View
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {hstaff_token}')
    res_fleet = client.get('/api/hospital/ambulances/')
    assert res_fleet.status_code == 200, f"Fleet view failed: {res_fleet.data}"
    print("  [PASS] 16. Hospital Staff Fleet View")

    # TEST 17: Auditability & ResponseEvent History
    events = ResponseEvent.objects.filter(assignment__uuid=assignment_uuid).order_by('created_at')
    event_types = [e.event_type for e in events]
    assert 'ACCEPTED' in event_types and 'STARTED' in event_types and 'ARRIVED' in event_types and 'COMPLETED' in event_types
    print(f"  [PASS] 17. ResponseEvent Audit History Verified: {event_types}")

    print("\n" + "=" * 70)
    print("ALL 17 BACKEND AUTOMATED VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == '__main__':
    run_step7_verification()
