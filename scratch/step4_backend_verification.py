import os
import sys
import django

# Setup Django configuration environment
sys.path.insert(0, r'c:\Users\sanchita\Desktop\rural-emergency-ai\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ruralcare.settings')
django.setup()

from django.test import Client
from accounts.models import User
from emergency.models import EmergencyReport
import json

def run_step4_backend_tests():
  print("=" * 60)
  print("STARTING STEP 4 COMPREHENSIVE BACKEND VERIFICATION SUITE")
  print("=" * 60)

  client = Client()

  # 1. Clean test data
  User.objects.filter(email__in=['citizen_step4_a@test.com', 'citizen_step4_b@test.com', 'worker_step4@test.com']).delete()
  EmergencyReport.objects.filter(description__icontains='Step 4 test').delete()

  # Create users
  cit_a = User.objects.create_user(
    username='citizen_step4_a@test.com',
    email='citizen_step4_a@test.com',
    password='Password123!',
    first_name='Citizen',
    last_name='Alpha',
    phone_number='+919876543210',
    role='CITIZEN'
  )

  cit_b = User.objects.create_user(
    username='citizen_step4_b@test.com',
    email='citizen_step4_b@test.com',
    password='Password123!',
    first_name='Citizen',
    last_name='Beta',
    phone_number='+919876543211',
    role='CITIZEN'
  )

  worker = User.objects.create_user(
    username='worker_step4@test.com',
    email='worker_step4@test.com',
    password='Password123!',
    first_name='Worker',
    last_name='Gamma',
    phone_number='+919876543212',
    role='EMERGENCY_WORKER'
  )

  # Authenticate Citizen A
  res_login = client.post('/api/auth/login/', {
    'email': 'citizen_step4_a@test.com',
    'password': 'Password123!'
  }, content_type='application/json')
  assert res_login.status_code == 200, f"Login failed for Citizen A: {res_login.content}"
  token_a = res_login.json()['access']
  headers_a = {'HTTP_AUTHORIZATION': f'Bearer {token_a}'}
  print("[PASS] Citizen A logged in & obtained JWT")

  # 2. Test Invalid Report Submissions
  print("\n--- Testing Backend Validation Rules ---")

  # A. Missing incident_type
  res = client.post('/api/emergency/reports/', {
    'affected_people_count': 2,
    'description': 'Step 4 test accident',
    'latitude': 18.5204,
    'longitude': 73.8567
  }, content_type='application/json', **headers_a)
  assert res.status_code == 400, f"Expected 400 for missing incident_type, got {res.status_code}"
  print("[PASS] Rejected missing incident_type")

  # B. Invalid affected_people_count <= 0
  res = client.post('/api/emergency/reports/', {
    'incident_type': 'ROAD_ACCIDENT',
    'affected_people_count': 0,
    'description': 'Step 4 test accident',
    'latitude': 18.5204,
    'longitude': 73.8567
  }, content_type='application/json', **headers_a)
  assert res.status_code == 400, f"Expected 400 for invalid count, got {res.status_code}"
  print("[PASS] Rejected affected_people_count <= 0")

  # C. Invalid coordinates out of range
  res = client.post('/api/emergency/reports/', {
    'incident_type': 'ROAD_ACCIDENT',
    'affected_people_count': 1,
    'description': 'Step 4 test accident',
    'latitude': 195.0,  # Invalid latitude > 90
    'longitude': 73.8567
  }, content_type='application/json', **headers_a)
  assert res.status_code == 400, f"Expected 400 for out-of-bounds latitude, got {res.status_code}"
  print("[PASS] Rejected invalid latitude (> 90)")

  # D. Missing other_incident_description when incident_type == OTHER
  res = client.post('/api/emergency/reports/', {
    'incident_type': 'OTHER',
    'affected_people_count': 1,
    'description': 'Step 4 test accident',
    'latitude': 18.5204,
    'longitude': 73.8567
  }, content_type='application/json', **headers_a)
  assert res.status_code == 400, f"Expected 400 for missing other description, got {res.status_code}"
  print("[PASS] Rejected OTHER incident type without other_incident_description")

  # 3. Test Valid Submission & Forced Status Safety
  print("\n--- Testing Valid Citizen Report Creation ---")
  res = client.post('/api/emergency/reports/', {
    'incident_type': 'ROAD_ACCIDENT',
    'affected_people_count': 3,
    'description': 'Step 4 test major highway collision observed near milestone 14',
    'latitude': 18.520432,
    'longitude': 73.856745,
    'location_accuracy': 12.5,
    'status': 'VERIFIED',  # Citizen attempting to self-verify! Must be ignored/overridden to UNVERIFIED
    'priority': 'HIGH'     # Citizen attempting to self-set priority! Must be overridden to PENDING
  }, content_type='application/json', **headers_a)

  assert res.status_code == 210 or res.status_code == 201, f"Expected 201, got {res.status_code}: {res.content}"
  data_report_a = res.json()
  uuid_a = data_report_a['uuid']

  assert data_report_a['status'] == 'UNVERIFIED', f"Citizen report status must be forced to UNVERIFIED, got {data_report_a['status']}"
  assert data_report_a['priority'] == 'PENDING', f"Citizen report priority must be forced to PENDING, got {data_report_a['priority']}"
  print(f"[PASS] Citizen report created successfully with UUID {uuid_a}")
  print(f"[PASS] Status successfully locked to UNVERIFIED and Priority locked to PENDING")

  # 4. Test User Isolation / Object-Level Security
  print("\n--- Testing Object-Level Security & Isolation ---")

  # Authenticate Citizen B
  res_login_b = client.post('/api/auth/login/', {
    'email': 'citizen_step4_b@test.com',
    'password': 'Password123!'
  }, content_type='application/json')
  assert res_login_b.status_code == 200
  token_b = res_login_b.json()['access']
  headers_b = {'HTTP_AUTHORIZATION': f'Bearer {token_b}'}

  # Citizen B lists reports -> should NOT see Citizen A's report
  res_list_b = client.get('/api/emergency/reports/', **headers_b)
  assert res_list_b.status_code == 200
  data_b = res_list_b.json()
  list_b_results = data_b['results'] if isinstance(data_b, dict) and 'results' in data_b else data_b
  b_report_uuids = [r['uuid'] for r in list_b_results]
  assert uuid_a not in b_report_uuids, f"Citizen B should NOT see Citizen A's report in list!"
  print("[PASS] Citizen B list endpoint returned 0 reports (isolated from Citizen A)")

  # Citizen B attempts to access Citizen A's report directly by UUID -> should return 404
  res_detail_b = client.get(f'/api/emergency/reports/{uuid_a}/', **headers_b)
  assert res_detail_b.status_code == 404, f"Expected 404 for unauthorized report retrieval, got {res_detail_b.status_code}"
  print("[PASS] Citizen B cannot retrieve Citizen A's report by URL UUID (HTTP 404 returned)")

  # Citizen B attempts to update/verify Citizen A's report -> should return 404 / 403
  res_patch_b = client.patch(f'/api/emergency/reports/{uuid_a}/', {
    'status': 'VERIFIED'
  }, content_type='application/json', **headers_b)
  assert res_patch_b.status_code in [403, 404], f"Expected 403 or 404, got {res_patch_b.status_code}"
  print("[PASS] Citizen B cannot mutate status of Citizen A's report")

  print("\n" + "=" * 60)
  print("ALL STEP 4 BACKEND VERIFICATION TESTS PASSED PERFECTLY!")
  print("=" * 60)

if __name__ == '__main__':
  run_step4_backend_tests()
