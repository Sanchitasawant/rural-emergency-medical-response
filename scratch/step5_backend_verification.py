import os
import sys
import django

sys.path.insert(0, r'c:\Users\sanchita\Desktop\rural-emergency-ai\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ruralcare.settings')
django.setup()

from django.test import Client
from accounts.models import User
from emergency.models import EmergencyReport
from triage.models import TriageAssessment
from triage.rule_engine import RuleBasedTriageEngine
from triage.ml_service import MLRiskModelService
from triage.fusion import DecisionFusionEngine
import json

def run_step5_backend_tests():
  print("=" * 60)
  print("STARTING STEP 5 COMPREHENSIVE BACKEND VERIFICATION SUITE")
  print("=" * 60)

  client = Client()

  # 1. Clean test data
  User.objects.filter(email__in=['worker_step5@test.com', 'citizen_step5@test.com']).delete()
  EmergencyReport.objects.filter(description__icontains='Step 5 test').delete()

  worker = User.objects.create_user(
    username='worker_step5@test.com',
    email='worker_step5@test.com',
    password='Password123!',
    first_name='Emergency',
    last_name='Worker',
    phone_number='+919876543300',
    role='EMERGENCY_WORKER'
  )

  citizen = User.objects.create_user(
    username='citizen_step5@test.com',
    email='citizen_step5@test.com',
    password='Password123!',
    first_name='Citizen',
    last_name='User',
    phone_number='+919876543301',
    role='CITIZEN'
  )

  # Create an EmergencyReport
  report = EmergencyReport.objects.create(
    reporter=citizen,
    client_uuid='client-rep-step5-001',
    incident_type='ROAD_ACCIDENT',
    affected_people_count=2,
    description='Step 5 test highway collision observed',
    latitude=18.5204,
    longitude=73.8567,
    status='UNVERIFIED',
    priority='PENDING'
  )

  # Login Emergency Worker
  res_login = client.post('/api/auth/login/', {
    'email': 'worker_step5@test.com',
    'password': 'Password123!'
  }, content_type='application/json')
  assert res_login.status_code == 200
  token_w = res_login.json()['access']
  headers_w = {'HTTP_AUTHORIZATION': f'Bearer {token_w}'}
  print("[PASS] Emergency Worker logged in & obtained JWT")

  # Login Citizen
  res_login_c = client.post('/api/auth/login/', {
    'email': 'citizen_step5@test.com',
    'password': 'Password123!'
  }, content_type='application/json')
  assert res_login_c.status_code == 200
  token_c = res_login_c.json()['access']
  headers_c = {'HTTP_AUTHORIZATION': f'Bearer {token_c}'}

  # 2. Test Rule Engine Direct Unit Evaluation
  print("\n--- Testing Rule-Based Triage Engine ---")
  rule_eval = RuleBasedTriageEngine.evaluate(
    vitals_data={'spo2': 88.0, 'systolic_bp': 85, 'heart_rate': 135, 'respiratory_rate': 32, 'temperature_c': 37.5},
    danger_signs={'has_uncontrolled_bleeding': True, 'has_severe_respiratory_distress': True},
    pain_data={'pain_score': 9},
    gcs_total=8
  )
  assert rule_eval['rule_score'] == 100.0, f"Expected capped rule score 100.0, got {rule_eval['rule_score']}"
  assert len(rule_eval['triggered_rules']) >= 4, f"Expected multiple triggered rules, got {len(rule_eval['triggered_rules'])}"
  print("[PASS] Rule Triage Engine correctly identified critical hypoxia, hypotension, bleeding, respiratory distress & severe GCS")

  # 3. Test Scikit-Learn ML Risk Model Service
  print("\n--- Testing Scikit-Learn ML Risk Model Service ---")
  ml_service = MLRiskModelService.get_instance()
  ml_eval = ml_service.predict_risk(
    patient_info={'age': 55},
    vitals_data={'spo2': 88.0, 'systolic_bp': 85, 'heart_rate': 135, 'respiratory_rate': 32},
    danger_signs={'has_uncontrolled_bleeding': True, 'has_severe_respiratory_distress': True},
    gcs_total=8
  )
  assert 'ml_score' in ml_eval and 0.0 <= ml_eval['ml_score'] <= 100.0
  assert ml_eval['model_name'] == "RandomForest-Clinical-Triage"
  print(f"[PASS] Scikit-Learn ML Risk Model returned probability score: {ml_eval['ml_score']}%")

  # 4. Test Decision Fusion Layer
  print("\n--- Testing Decision Fusion Layer ---")
  fusion_eval = DecisionFusionEngine.fuse(rule_eval, ml_eval, rule_weight=0.6, ml_weight=0.4)
  assert fusion_eval['priority_level'] == 'CRITICAL'
  expected_fusion = round(0.6 * rule_eval['rule_score'] + 0.4 * ml_eval['ml_score'], 1)
  assert fusion_eval['fusion_score'] == expected_fusion, f"Expected {expected_fusion}, got {fusion_eval['fusion_score']}"
  print(f"[PASS] Decision Fusion calculated Hybrid Score: {fusion_eval['fusion_score']} -> Priority: {fusion_eval['priority_level']}")

  # 5. Test REST API Validation
  print("\n--- Testing API Field Validation Rules ---")
  # A. Invalid BP (Diastolic >= Systolic)
  res = client.post('/api/triage/assessments/', {
    'emergency_report': report.id,
    'systolic_bp': 100,
    'diastolic_bp': 110,
    'heart_rate': 80
  }, content_type='application/json', **headers_w)
  assert res.status_code == 400, f"Expected 400 for Diastolic >= Systolic, got {res.status_code}"
  print("[PASS] Rejected Diastolic BP >= Systolic BP")

  # B. Invalid SpO2 (> 100)
  res = client.post('/api/triage/assessments/', {
    'emergency_report': report.id,
    'spo2': 115.0
  }, content_type='application/json', **headers_w)
  assert res.status_code == 400
  print("[PASS] Rejected out-of-range SpO2 (> 100%)")

  # 6. Valid Assessment Creation & AI Triage Trigger
  print("\n--- Testing Valid Assessment & Run AI Execution ---")
  res_create = client.post('/api/triage/assessments/', {
    'emergency_report': report.id,
    'patient_identifier': 'PAT-TEST-STEP5',
    'age': 48,
    'sex': 'MALE',
    'chief_complaint': 'Severe trauma and difficulty breathing',
    'systolic_bp': 85,
    'diastolic_bp': 55,
    'heart_rate': 130,
    'respiratory_rate': 34,
    'spo2': 88.5,
    'temperature_c': 37.2,
    'pain_present': True,
    'pain_score': 9,
    'gcs_eye': 2,
    'gcs_verbal': 3,
    'gcs_motor': 4,
    'has_uncontrolled_bleeding': True,
    'has_severe_respiratory_distress': True
  }, content_type='application/json', **headers_w)

  assert res_create.status_code == 201, f"Expected 201, got {res_create.status_code}: {res_create.content}"
  ass_data = res_create.json()
  ass_uuid = ass_data['uuid']
  assert ass_data['gcs_total'] == 9, f"Calculated GCS total should be 2+3+4=9, got {ass_data['gcs_total']}"
  print(f"[PASS] Assessment created with UUID {ass_uuid} and GCS Total = 9")

  # Trigger Run-AI
  res_ai = client.post(f'/api/triage/assessments/{ass_uuid}/run-ai/', {}, content_type='application/json', **headers_w)
  assert res_ai.status_code == 200, f"Expected 200, got {res_ai.status_code}: {res_ai.content}"
  ai_data = res_ai.json()
  assert ai_data['assessment']['status'] == 'ASSESSED'
  assert ai_data['assessment']['priority_level'] == 'CRITICAL'
  print(f"[PASS] Run AI executed successfully! Status updated to ASSESSED, Priority: {ai_data['assessment']['priority_level']}")

  # Check parent report priority synchronization
  report.refresh_from_db()
  assert report.priority == 'CRITICAL', f"Parent report priority should be CRITICAL, got {report.priority}"
  print("[PASS] EmergencyReport priority synchronized to CRITICAL")

  # 7. Test Security & Role Permissions
  print("\n--- Testing Security & Role Access Controls ---")
  # Citizen attempts to call run-ai -> 403 Forbidden
  res_cit_ai = client.post(f'/api/triage/assessments/{ass_uuid}/run-ai/', {}, content_type='application/json', **headers_c)
  assert res_cit_ai.status_code == 403, f"Expected 403 for citizen AI trigger, got {res_cit_ai.status_code}"
  print("[PASS] Citizen blocked from running AI triage (HTTP 403 Forbidden)")

  # Citizen attempts to list assessments -> 0 records
  res_cit_list = client.get('/api/triage/assessments/', **headers_c)
  assert res_cit_list.status_code == 200
  data_cit_list = res_cit_list.json()
  cit_records = data_cit_list['results'] if isinstance(data_cit_list, dict) and 'results' in data_cit_list else data_cit_list
  assert len(cit_records) == 0
  print("[PASS] Citizen list assessments returned 0 records (Role isolated)")

  print("\n" + "=" * 60)
  print("ALL STEP 5 BACKEND VERIFICATION TESTS PASSED PERFECTLY!")
  print("=" * 60)

if __name__ == '__main__':
  run_step5_backend_tests()
