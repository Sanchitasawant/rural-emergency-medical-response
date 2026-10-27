import os
import sys
import django

sys.path.insert(0, r'c:\Users\sanchita\Desktop\rural-emergency-ai\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ruralcare.settings')
django.setup()

from django.test import Client
from accounts.models import User
from hospitals.models import Hospital
from emergency.models import EmergencyReport, EmergencyCase
from ambulance.models import Ambulance, AmbulanceAssignment
from ambulance.services import AmbulanceSelectionService

def run_step6_backend_tests():
  print("=" * 60)
  print("STARTING STEP 6 COMPREHENSIVE BACKEND VERIFICATION SUITE")
  print("=" * 60)

  client = Client()

  # Clean test data
  User.objects.filter(email__in=['staff_step6@test.com', 'citizen_step6@test.com', 'worker_step6@test.com', 'driver_step6@test.com']).delete()
  EmergencyReport.objects.filter(description__icontains='Step 6 test').delete()
  Ambulance.objects.filter(vehicle_number__in=['AMB-STEP6-01', 'AMB-STEP6-02']).delete()
  Hospital.objects.filter(name='Step 6 Test Hospital').delete()

  # Create users
  staff = User.objects.create_user(
    username='staff_step6@test.com',
    email='staff_step6@test.com',
    password='Password123!',
    first_name='Hospital',
    last_name='Dispatcher',
    phone_number='+919876543400',
    role='HOSPITAL_STAFF'
  )

  citizen = User.objects.create_user(
    username='citizen_step6@test.com',
    email='citizen_step6@test.com',
    password='Password123!',
    first_name='Citizen',
    last_name='Reporter',
    phone_number='+919876543401',
    role='CITIZEN'
  )

  worker = User.objects.create_user(
    username='worker_step6@test.com',
    email='worker_step6@test.com',
    password='Password123!',
    first_name='Emergency',
    last_name='Worker',
    phone_number='+919876543402',
    role='EMERGENCY_WORKER'
  )

  driver = User.objects.create_user(
    username='driver_step6@test.com',
    email='driver_step6@test.com',
    password='Password123!',
    first_name='Paramedic',
    last_name='Driver',
    phone_number='+919876543403',
    role='DRIVER_PARAMEDIC'
  )

  # Create Hospital & Ambulance vehicles
  hospital = Hospital.objects.create(
    name='Step 6 Test Hospital',
    district='Central District',
    address='123 Healthcare Way',
    contact_number='+919876540000',
    latitude=18.5204,
    longitude=73.8567
  )

  amb_avail = Ambulance.objects.create(
    vehicle_number='AMB-STEP6-01',
    vehicle_type='Advanced Life Support',
    equipment_type='Ventilator + Defibrillator',
    hospital=hospital,
    driver=driver,
    status='AVAILABLE',
    latitude=18.5210,
    longitude=73.8570
  )

  amb_busy = Ambulance.objects.create(
    vehicle_number='AMB-STEP6-02',
    vehicle_type='Basic Life Support',
    hospital=hospital,
    status='MAINTENANCE'
  )

  # Create Citizen Reports
  report_a = EmergencyReport.objects.create(
    reporter=citizen,
    client_uuid='client-step6-001',
    incident_type='ROAD_ACCIDENT',
    affected_people_count=3,
    description='Step 6 test severe collision observed near crossroad',
    latitude=18.5220,
    longitude=73.8580,
    status='UNVERIFIED'
  )

  report_b = EmergencyReport.objects.create(
    reporter=citizen,
    client_uuid='client-step6-002',
    incident_type='OTHER',
    other_incident_description='Prank report test',
    affected_people_count=1,
    description='Step 6 test prank false alarm',
    status='UNVERIFIED'
  )

  # Logins
  res_staff_login = client.post('/api/auth/login/', {'email': 'staff_step6@test.com', 'password': 'Password123!'}, content_type='application/json')
  assert res_staff_login.status_code == 200
  token_staff = res_staff_login.json()['access']
  headers_staff = {'HTTP_AUTHORIZATION': f'Bearer {token_staff}'}
  print("[PASS] Hospital Staff logged in & obtained JWT")

  res_cit_login = client.post('/api/auth/login/', {'email': 'citizen_step6@test.com', 'password': 'Password123!'}, content_type='application/json')
  assert res_cit_login.status_code == 200
  headers_cit = {'HTTP_AUTHORIZATION': f"Bearer {res_cit_login.json()['access']}"}

  res_wrk_login = client.post('/api/auth/login/', {'email': 'worker_step6@test.com', 'password': 'Password123!'}, content_type='application/json')
  assert res_wrk_login.status_code == 200
  headers_wrk = {'HTTP_AUTHORIZATION': f"Bearer {res_wrk_login.json()['access']}"}

  # 1. Test Report Verification
  print("\n--- Testing Hospital Report Verification ---")
  res_verify = client.post(f'/api/hospital/reports/{report_a.uuid}/verify/', {}, content_type='application/json', **headers_staff)
  assert res_verify.status_code == 200, f"Expected 200, got {res_verify.status_code}: {res_verify.content}"
  case_data_a = res_verify.json()['emergency_case']
  case_uuid_a = case_data_a['uuid']

  report_a.refresh_from_db()
  assert report_a.status == 'VERIFIED'
  assert case_data_a['case_status'] == 'VERIFIED'
  print(f"[PASS] Report A verified successfully. Operational EmergencyCase created with UUID {case_uuid_a}")

  # 2. Test Report Rejection Validation & Processing
  print("\n--- Testing Report Rejection & Validation ---")
  # Missing rejection_reason -> 400
  res_rej_err = client.post(f'/api/hospital/reports/{report_b.uuid}/reject/', {}, content_type='application/json', **headers_staff)
  assert res_rej_err.status_code == 400
  print("[PASS] Rejection without reason rejected (HTTP 400)")

  res_reject = client.post(f'/api/hospital/reports/{report_b.uuid}/reject/', {
    'rejection_reason': 'Prank false alarm confirmed by local dispatch'
  }, content_type='application/json', **headers_staff)
  assert res_reject.status_code == 200
  report_b.refresh_from_db()
  assert report_b.status == 'REJECTED'
  print("[PASS] Report B rejected with reason recorded")

  # 3. Test Ambulance Selection Service Distance Calculation
  print("\n--- Testing Ambulance Selection Service ---")
  case_a_obj = EmergencyCase.objects.get(uuid=case_uuid_a)
  eligible_vehicles = AmbulanceSelectionService.get_eligible_ambulances(case_a_obj)
  vehicle_numbers = [v['ambulance'].vehicle_number for v in eligible_vehicles]
  assert 'AMB-STEP6-01' in vehicle_numbers
  assert 'AMB-STEP6-02' not in vehicle_numbers
  amb_step6_info = next(v for v in eligible_vehicles if v['ambulance'].vehicle_number == 'AMB-STEP6-01')
  assert amb_step6_info['distance_km'] is not None
  print(f"[PASS] Selection service calculated Haversine distance: {amb_step6_info['distance_km']} km to scene")

  # 4. Test Atomic Ambulance Dispatch
  print("\n--- Testing Atomic Ambulance Dispatching ---")
  res_dispatch = client.post('/api/hospital/dispatch/assign/', {
    'ambulance_uuid': str(amb_avail.uuid),
    'case_uuid': case_uuid_a,
    'driver_id': driver.id,
    'notes': 'Priority response via main highway'
  }, content_type='application/json', **headers_staff)

  assert res_dispatch.status_code == 201, f"Expected 201, got {res_dispatch.status_code}: {res_dispatch.content}"
  assign_data = res_dispatch.json()['assignment']

  amb_avail.refresh_from_db()
  case_a_obj.refresh_from_db()
  report_a.refresh_from_db()

  assert amb_avail.status == 'ASSIGNED'
  assert case_a_obj.case_status == 'DISPATCHED'
  assert report_a.status == 'ASSIGNED'
  assert report_a.assigned_ambulance == amb_avail
  print(f"[PASS] Ambulance {amb_avail.vehicle_number} successfully dispatched! Case status -> DISPATCHED, Vehicle status -> ASSIGNED")

  # 5. Test Race Condition / Duplicate Assignment Rejection
  print("\n--- Testing Duplicate / Unavailable Dispatch Protection ---")
  # Attempting to assign the same (now ASSIGNED) ambulance again
  res_dup = client.post('/api/hospital/dispatch/assign/', {
    'ambulance_uuid': str(amb_avail.uuid),
    'case_uuid': case_uuid_a,
    'driver_id': driver.id
  }, content_type='application/json', **headers_staff)
  assert res_dup.status_code == 400, f"Expected 400 for assigning busy vehicle, got {res_dup.status_code}"
  print("[PASS] Rejected double-dispatch attempt on non-AVAILABLE ambulance (HTTP 400 Bad Request)")

  # Attempting to assign MAINTENANCE ambulance
  res_maint = client.post('/api/hospital/dispatch/assign/', {
    'ambulance_uuid': str(amb_busy.uuid),
    'case_uuid': case_uuid_a
  }, content_type='application/json', **headers_staff)
  assert res_maint.status_code == 400
  print("[PASS] Rejected dispatch attempt on MAINTENANCE ambulance (HTTP 400 Bad Request)")

  # 6. Test Security & Role Authorization
  print("\n--- Testing Security & Role Access Controls ---")
  # Citizen attempts dispatch -> 403
  res_cit_disp = client.post('/api/hospital/dispatch/assign/', {
    'ambulance_uuid': str(amb_avail.uuid),
    'case_uuid': case_uuid_a
  }, content_type='application/json', **headers_cit)
  assert res_cit_disp.status_code == 403
  print("[PASS] Citizen blocked from dispatch API (HTTP 403 Forbidden)")

  # Emergency Worker attempts dispatch -> 403
  res_wrk_disp = client.post('/api/hospital/dispatch/assign/', {
    'ambulance_uuid': str(amb_avail.uuid),
    'case_uuid': case_uuid_a
  }, content_type='application/json', **headers_wrk)
  assert res_wrk_disp.status_code == 403
  print("[PASS] Emergency Worker blocked from dispatch API (HTTP 403 Forbidden)")

  print("\n" + "=" * 60)
  print("ALL STEP 6 BACKEND VERIFICATION TESTS PASSED PERFECTLY!")
  print("=" * 60)

if __name__ == '__main__':
  run_step6_backend_tests()
