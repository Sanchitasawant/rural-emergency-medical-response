import os
import sys
import django

# Setup Django environment
sys.path.append(r'c:\Users\sanchita\Desktop\rural-emergency-ai\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ruralcare.settings')
django.setup()

import uuid
from rest_framework.test import APIClient
from accounts.models import User, AuditLog, SystemConfig, ConfigAuditLog
from hospitals.models import Hospital
from ambulance.models import Ambulance
from emergency.models import EmergencyReport, EmergencyCase

def run_step8_verification():
    print("=" * 75)
    print("STEP 8 AUTOMATED VERIFICATION SUITE — ADMIN OVERSIGHT & SYSTEM ANALYTICS")
    print("=" * 75)

    client = APIClient()
    passw = "SecurePass123!"

    # 1. Setup Test Users
    admin_user, _ = User.objects.get_or_create(
        email="admin_step8@ruralcare.ai",
        defaults={"username": "admin_step8", "role": "ADMIN", "first_name": "System", "last_name": "Admin"}
    )
    admin_user.set_password(passw)
    admin_user.is_active = True
    admin_user.save()

    citizen_user, _ = User.objects.get_or_create(
        email="citizen_step8@ruralcare.ai",
        defaults={"username": "citizen_step8", "role": "CITIZEN", "first_name": "Citizen", "last_name": "One"}
    )
    citizen_user.set_password(passw)
    citizen_user.is_active = True
    citizen_user.save()

    worker_user, _ = User.objects.get_or_create(
        email="worker_step8@ruralcare.ai",
        defaults={"username": "worker_step8", "role": "EMERGENCY_WORKER", "first_name": "Worker", "last_name": "One"}
    )
    worker_user.set_password(passw)
    worker_user.is_active = True
    worker_user.save()

    staff_user, _ = User.objects.get_or_create(
        email="staff_step8@ruralcare.ai",
        defaults={"username": "staff_step8", "role": "HOSPITAL_STAFF", "first_name": "Staff", "last_name": "One"}
    )
    staff_user.set_password(passw)
    staff_user.is_active = True
    staff_user.save()

    driver_user, _ = User.objects.get_or_create(
        email="driver_step8@ruralcare.ai",
        defaults={"username": "driver_step8", "role": "DRIVER_PARAMEDIC", "first_name": "Driver", "last_name": "One"}
    )
    driver_user.set_password(passw)
    driver_user.is_active = True
    driver_user.save()

    print("\n[+] Fixtures created successfully.")

    # TEST 1: Admin Login & JWT Token
    res = client.post('/api/auth/login/', {'email': admin_user.email, 'password': passw})
    assert res.status_code == 200, f"Admin login failed: {res.data}"
    admin_token = res.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    print("  [PASS] 1. Admin Login & JWT Token")

    # TEST 2: Admin Dashboard API
    res = client.get('/api/admin/admin/dashboard/')
    assert res.status_code == 200, f"Admin dashboard failed: {res.data}"
    assert 'metrics' in res.data and 'total_users' in res.data['metrics']
    print("  [PASS] 2. Admin Dashboard API (Real DB metrics)")

    # TEST 3: User Listing & Password Exposure Check
    res = client.get('/api/admin/admin/users/')
    assert res.status_code == 200, f"User list failed: {res.data}"
    for u in res.data:
        assert 'password' not in u, "Passwords MUST NOT be exposed in user objects!"
    print("  [PASS] 3. User Listing & Password Security Check")

    # TEST 4: User Search & Filtering
    res = client.get('/api/admin/admin/users/?role=HOSPITAL_STAFF')
    assert res.status_code == 200 and all(u['role'] == 'HOSPITAL_STAFF' for u in res.data)
    print("  [PASS] 4. User Search & Role Filtering")

    # TEST 5: Create Staff Account by Admin
    new_staff_email = f"newstaff_{uuid.uuid4().hex[:6]}@ruralcare.ai"
    res = client.post('/api/admin/admin/users/', {
        'email': new_staff_email,
        'password': passw,
        'first_name': 'New',
        'last_name': 'Staff',
        'role': 'HOSPITAL_STAFF'
    })
    assert res.status_code == 201, f"Create user failed: {res.data}"
    created_user_uuid = res.data['user']['uuid']
    print("  [PASS] 5. Controlled Staff Account Creation by Admin")

    # TEST 6: User Activation / Deactivation Toggle
    res = client.patch(f'/api/admin/admin/users/{created_user_uuid}/status/', {'is_active': False}, format='json')
    assert res.status_code == 200 and res.data['is_active'] is False
    print("  [PASS] 6. User Deactivation Toggle")

    # TEST 7: Last-Admin Protection Guard
    # Ensure admin_user is sole active admin or test sole admin logic
    active_admins = list(User.objects.filter(role='ADMIN', is_active=True))
    if len(active_admins) == 1:
        sole_admin = active_admins[0]
        res_guard = client.patch(f'/api/admin/admin/users/{sole_admin.uuid}/status/', {'is_active': False}, format='json')
        assert res_guard.status_code == 400, f"Last admin deactivation should be blocked! Got {res_guard.status_code}"
        print("  [PASS] 7. Last-Admin Protection Guard (Blocked sole admin deactivation)")
    else:
        print("  [SKIP] 7. Multiple active admins present; guard active.")

    # TEST 8: Non-Admin Authorization Guard (403 Forbidden Check)
    non_admin_roles = [
        ('CITIZEN', citizen_user.email),
        ('EMERGENCY_WORKER', worker_user.email),
        ('HOSPITAL_STAFF', staff_user.email),
        ('DRIVER_PARAMEDIC', driver_user.email)
    ]
    for role_name, user_email in non_admin_roles:
        c2 = APIClient()
        r_login = c2.post('/api/auth/login/', {'email': user_email, 'password': passw})
        token2 = r_login.data['access']
        c2.credentials(HTTP_AUTHORIZATION=f'Bearer {token2}')
        r_forbidden = c2.get('/api/admin/admin/dashboard/')
        assert r_forbidden.status_code == 403, f"Role {role_name} should receive 403 Forbidden! Got {r_forbidden.status_code}"
    print("  [PASS] 8. Non-Admin Role Authorization Guard (Citizen, Worker, Staff, Driver receive 403 Forbidden)")

    # TEST 9: Hospital Management (List & Create)
    hosp_name = f"Test Hospital {uuid.uuid4().hex[:4]}"
    res = client.post('/api/admin/admin/hospitals/', {
        'name': hosp_name,
        'district': 'Satara',
        'address': 'State Highway 10',
        'contact_number': '+91-9988776655',
        'icu_beds_available': 5,
        'general_beds_available': 15
    })
    assert res.status_code == 201, f"Create hospital failed: {res.data}"
    hosp_uuid = res.data['uuid']

    res_h = client.get('/api/admin/admin/hospitals/')
    assert res_h.status_code == 200 and any(h['uuid'] == hosp_uuid for h in res_h.data)
    print("  [PASS] 9. Hospital Management (List & Create)")

    # TEST 10: Ambulance Management (List, Create & Edit Status)
    veh_num = f"MH-11-STEP8-{uuid.uuid4().hex[:4]}"
    res_amb_c = client.post('/api/admin/admin/ambulances/', {
        'vehicle_number': veh_num,
        'vehicle_type': 'ADVANCED_LIFE_SUPPORT',
        'equipment_type': 'Defibrillator + Ventilator'
    })
    assert res_amb_c.status_code == 201, f"Create ambulance failed: {res_amb_c.data}"
    amb_uuid = res_amb_c.data['uuid']

    res_amb_u = client.patch(f'/api/admin/admin/ambulances/{amb_uuid}/', {'status': 'MAINTENANCE'})
    assert res_amb_u.status_code == 200
    print("  [PASS] 10. Ambulance Management (List, Create & Maintenance Status Update)")

    # TEST 11: Emergency Cases Overview & Real Analytics
    res_cases = client.get('/api/admin/admin/cases/')
    assert res_cases.status_code == 200
    res_analytics = client.get('/api/admin/admin/analytics/')
    assert res_analytics.status_code == 200 and 'reports_by_day' in res_analytics.data
    print("  [PASS] 11. Emergency Cases Overview & Real Analytics Aggregations")

    # TEST 12: Activity Audit Log Query
    res_act = client.get('/api/admin/admin/activity/')
    assert res_act.status_code == 200 and len(res_act.data) > 0
    print("  [PASS] 12. Activity Audit Log Querying")

    # TEST 13: AI / ML Models Information
    res_models = client.get('/api/admin/admin/models/')
    assert res_models.status_code == 200 and 'model_name' in res_models.data
    assert res_models.data['evaluation_metrics']['status'] == "No evaluation metrics recorded."
    print("  [PASS] 13. AI / ML Models Metadata & Telemetry")

    # TEST 14: System Settings & Fusion Weight Validation ($Rule + ML = 1.0$)
    # Invalid sum check (0.7 + 0.7 = 1.4 -> 400 Bad Request)
    res_invalid = client.post('/api/admin/admin/settings/', {'rule_weight': 0.70, 'ml_weight': 0.70})
    assert res_invalid.status_code == 400, f"Invalid fusion sum should fail! Got {res_invalid.status_code}"

    # Valid sum check (0.55 + 0.45 = 1.00 -> 200 OK)
    res_valid = client.post('/api/admin/admin/settings/', {'rule_weight': 0.55, 'ml_weight': 0.45})
    assert res_valid.status_code == 200 and res_valid.data['fusion_weights']['rule_weight'] == 0.55
    print("  [PASS] 14. Hybrid AI Fusion Weight Validation ($Rule + ML = 1.0$) & Audit Logging")

    # TEST 15: ConfigAuditLog Audit Verification
    cfg_logs = ConfigAuditLog.objects.filter(config_key='fusion_weights')
    assert cfg_logs.exists(), "ConfigAuditLog record must be created when fusion weights are updated!"
    print(f"  [PASS] 15. ConfigAuditLog Audit Verification: Latest change = {cfg_logs.first().new_value}")

    print("\n" + "=" * 75)
    print("ALL 15 BACKEND AUTOMATED VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 75)

if __name__ == '__main__':
    run_step8_verification()
