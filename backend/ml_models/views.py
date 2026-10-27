from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

class PredictRiskView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        vitals = request.data.get('vitals', {})
        danger_signs = request.data.get('danger_signs', {})

        systolic = int(vitals.get('systolic_bp', 120))
        spo2 = float(vitals.get('spo2', 98.0))
        heart_rate = int(vitals.get('heart_rate', 75))
        gcs = int(vitals.get('gcs_score', 15))
        resp_rate = int(vitals.get('respiratory_rate', 16))

        # 1. Rule-Based Triage Engine (WHO / Emergency Triage standard)
        rule_score = 0.0
        reasons = []

        if spo2 < 90.0:
            rule_score += 40.0
            reasons.append("Severe Hypoxia (SpO2 < 90%)")
        elif spo2 < 94.0:
            rule_score += 20.0
            reasons.append("Moderate Hypoxia (SpO2 90-93%)")

        if systolic < 90:
            rule_score += 35.0
            reasons.append("Severe Hypotension / Shock (Systolic BP < 90 mmHg)")
        elif systolic > 180:
            rule_score += 25.0
            reasons.append("Hypertensive Crisis (Systolic BP > 180 mmHg)")

        if gcs < 9:
            rule_score += 40.0
            reasons.append("Severe Altered Consciousness (GCS < 9)")
        elif gcs < 13:
            rule_score += 20.0
            reasons.append("Moderate Altered Consciousness (GCS 9-12)")

        if danger_signs.get('has_uncontrolled_bleeding'):
            rule_score += 30.0
            reasons.append("Uncontrolled Hemorrhage")
        if danger_signs.get('has_severe_respiratory_distress'):
            rule_score += 30.0
            reasons.append("Severe Respiratory Distress")

        rule_score = min(100.0, rule_score)

        # 2. Heuristic ML Risk Model Scoring
        ml_score = 15.0
        if heart_rate > 120 or heart_rate < 50:
            ml_score += 25.0
        if resp_rate > 28 or resp_rate < 10:
            ml_score += 25.0
        if rule_score > 30:
            ml_score += (rule_score * 0.5)

        ml_score = min(100.0, ml_score)

        # 3. Decision Fusion Layer (60% Rule + 40% ML)
        fusion_score = round((0.6 * rule_score) + (0.4 * ml_score), 1)

        # Priority Level Mapping
        if fusion_score >= 70 or rule_score >= 70:
            priority = 'CRITICAL'
        elif fusion_score >= 45:
            priority = 'HIGH'
        elif fusion_score >= 25:
            priority = 'MEDIUM'
        else:
            priority = 'LOW'

        return Response({
            "status": "success",
            "rule_score": rule_score,
            "ml_score": round(ml_score, 1),
            "fusion_score": fusion_score,
            "priority": priority,
            "clinical_reasons": reasons,
            "ai_disclaimer": "AI-assisted clinical decision support only. Clinical judgment must take precedence."
        }, status=status.HTTP_200_OK)
