"""
Rule-Based Emergency Triage Engine for RuralCare AI.
Based on WHO and Emergency Triage Standards (South African Triage Scale / ESI adaptation).
Deterministic, transparent, and explainable clinical evaluation rules.
"""

class RuleBasedTriageEngine:
    @staticmethod
    def evaluate(vitals_data, danger_signs, pain_data=None, gcs_total=15):
        """
        Evaluates clinical vitals, danger signs, GCS, and pain to produce a transparent rule-based triage score.
        Returns:
            dict containing rule_score (0-100), triggered_rules list, explanations, and recommendation.
        """
        rule_score = 0.0
        triggered_rules = []
        explanations = []

        # Extract Vitals
        spo2 = vitals_data.get('spo2')
        systolic_bp = vitals_data.get('systolic_bp')
        diastolic_bp = vitals_data.get('diastolic_bp')
        heart_rate = vitals_data.get('heart_rate')
        respiratory_rate = vitals_data.get('respiratory_rate')
        temp_c = vitals_data.get('temperature_c')

        # Extract Danger Signs
        has_bleeding = danger_signs.get('has_uncontrolled_bleeding', False)
        has_resp_distress = danger_signs.get('has_severe_respiratory_distress', False)
        has_altered_mental = danger_signs.get('has_altered_mental_status', False)
        has_unconsciousness = danger_signs.get('has_unconsciousness', False)
        has_severe_injury = danger_signs.get('has_severe_injury', False)

        # Extract Pain
        pain_score = pain_data.get('pain_score', 0) if pain_data else 0

        # --- Rule 1: Oxygen Saturation (SpO2) ---
        if spo2 is not None:
            if spo2 < 90.0:
                score_add = 40.0
                rule_score += score_add
                triggered_rules.append({
                    "rule_id": "RULE_HYPOXIA_CRITICAL",
                    "rule_name": "Critical Hypoxia",
                    "condition": "SpO2 < 90%",
                    "severity": "CRITICAL",
                    "score_contribution": score_add,
                    "explanation": f"Severe hypoxemia detected (SpO2: {spo2}%). Risk of tissue hypoxia and organ failure."
                })
                explanations.append(f"Critical Hypoxia (SpO2 = {spo2}%)")
            elif spo2 < 94.0:
                score_add = 20.0
                rule_score += score_add
                triggered_rules.append({
                    "rule_id": "RULE_HYPOXIA_MODERATE",
                    "rule_name": "Moderate Hypoxia",
                    "condition": "SpO2 90%-93%",
                    "severity": "HIGH",
                    "score_contribution": score_add,
                    "explanation": f"Moderate oxygen saturation impairment (SpO2: {spo2}%). Supplemental oxygen indicated."
                })
                explanations.append(f"Moderate Hypoxia (SpO2 = {spo2}%)")

        # --- Rule 2: Systolic Blood Pressure ---
        if systolic_bp is not None:
            if systolic_bp < 90:
                score_add = 35.0
                rule_score += score_add
                triggered_rules.append({
                    "rule_id": "RULE_HYPOTENSION_SHOCK",
                    "rule_name": "Severe Hypotension / Shock",
                    "condition": "Systolic BP < 90 mmHg",
                    "severity": "CRITICAL",
                    "score_contribution": score_add,
                    "explanation": f"Systolic BP is critically low ({systolic_bp} mmHg). High risk of circulatory collapse or shock."
                })
                explanations.append(f"Severe Hypotension (Systolic BP = {systolic_bp} mmHg)")
            elif systolic_bp > 180:
                score_add = 25.0
                rule_score += score_add
                triggered_rules.append({
                    "rule_id": "RULE_HYPERTENSIVE_CRISIS",
                    "rule_name": "Hypertensive Crisis",
                    "condition": "Systolic BP > 180 mmHg",
                    "severity": "HIGH",
                    "score_contribution": score_add,
                    "explanation": f"Severely elevated systolic BP ({systolic_bp} mmHg). Risk of end-organ damage or stroke."
                })
                explanations.append(f"Hypertensive Crisis (Systolic BP = {systolic_bp} mmHg)")

        # --- Rule 3: Glasgow Coma Scale (GCS) ---
        if gcs_total is not None:
            if gcs_total <= 8:
                score_add = 45.0
                rule_score += score_add
                triggered_rules.append({
                    "rule_id": "RULE_GCS_SEVERE",
                    "rule_name": "Severe Neurological Impairment",
                    "condition": "GCS Total <= 8",
                    "severity": "CRITICAL",
                    "score_contribution": score_add,
                    "explanation": f"Comatose state / severe mental impairment (GCS: {gcs_total}/15). Airway protection required."
                })
                explanations.append(f"Severe Neurological Impairment (GCS = {gcs_total}/15)")
            elif gcs_total <= 12:
                score_add = 20.0
                rule_score += score_add
                triggered_rules.append({
                    "rule_id": "RULE_GCS_MODERATE",
                    "rule_name": "Moderate Altered Mental Status",
                    "condition": "GCS Total 9-12",
                    "severity": "HIGH",
                    "score_contribution": score_add,
                    "explanation": f"Moderate alteration in consciousness (GCS: {gcs_total}/15)."
                })
                explanations.append(f"Moderate Altered Mental Status (GCS = {gcs_total}/15)")

        # --- Rule 4: Heart Rate ---
        if heart_rate is not None:
            if heart_rate > 130 or heart_rate < 45:
                score_add = 25.0
                rule_score += score_add
                triggered_rules.append({
                    "rule_id": "RULE_DYSRHYTHMIA_EXTREME",
                    "rule_name": "Extreme Dysrhythmia",
                    "condition": "HR > 130 or HR < 45 BPM",
                    "severity": "HIGH",
                    "score_contribution": score_add,
                    "explanation": f"Abnormal heart rate observed ({heart_rate} BPM). Hemodynamic monitoring required."
                })
                explanations.append(f"Extreme Heart Rate ({heart_rate} BPM)")

        # --- Rule 5: Respiratory Rate ---
        if respiratory_rate is not None:
            if respiratory_rate > 30 or respiratory_rate < 10:
                score_add = 25.0
                rule_score += score_add
                triggered_rules.append({
                    "rule_id": "RULE_RESP_RATE_EXTREME",
                    "rule_name": "Extreme Tachypnea / Bradypnea",
                    "condition": "RR > 30 or RR < 10 breaths/min",
                    "severity": "HIGH",
                    "score_contribution": score_add,
                    "explanation": f"Abnormal respiratory frequency ({respiratory_rate} breaths/min). Potential respiratory exhaustion."
                })
                explanations.append(f"Extreme Respiratory Rate ({respiratory_rate} breaths/min)")

        # --- Rule 6: Uncontrolled Hemorrhage ---
        if has_bleeding:
            score_add = 35.0
            rule_score += score_add
            triggered_rules.append({
                "rule_id": "RULE_UNCONTROLLED_BLEEDING",
                "rule_name": "Uncontrolled Hemorrhage",
                "condition": "Active major bleeding reported",
                "severity": "CRITICAL",
                "score_contribution": score_add,
                "explanation": "Active severe bleeding present. Immediate hemostatic intervention and fluid resuscitation required."
            })
            explanations.append("Uncontrolled Hemorrhage Present")

        # --- Rule 7: Severe Respiratory Distress ---
        if has_resp_distress:
            score_add = 35.0
            rule_score += score_add
            triggered_rules.append({
                "rule_id": "RULE_RESPIRATORY_DISTRESS",
                "rule_name": "Severe Respiratory Distress",
                "condition": "Severe breathing struggle observed",
                "severity": "CRITICAL",
                "score_contribution": score_add,
                "explanation": "Acute respiratory distress noted (stridor, grunting, or severe chest retractions)."
            })
            explanations.append("Severe Respiratory Distress Present")

        # --- Rule 8: Unconsciousness / Altered Mental Status ---
        if has_unconsciousness:
            score_add = 40.0
            rule_score += score_add
            triggered_rules.append({
                "rule_id": "RULE_UNCONSCIOUSNESS",
                "rule_name": "Unresponsive Patient",
                "condition": "Unconsciousness confirmed",
                "severity": "CRITICAL",
                "score_contribution": score_add,
                "explanation": "Patient is unresponsive. High risk of airway compromise."
            })
            explanations.append("Unconscious Patient")
        elif has_altered_mental:
            score_add = 25.0
            rule_score += score_add
            triggered_rules.append({
                "rule_id": "RULE_ALTERED_MENTAL",
                "rule_name": "Acute Altered Consciousness",
                "condition": "Confusion or lethargy observed",
                "severity": "HIGH",
                "score_contribution": score_add,
                "explanation": "Confusion, disorientation, or abnormal lethargy present."
            })
            explanations.append("Altered Mental Status")

        # --- Rule 9: Severe Injury ---
        if has_severe_injury:
            score_add = 20.0
            rule_score += score_add
            triggered_rules.append({
                "rule_id": "RULE_SEVERE_INJURY",
                "rule_name": "Major Trauma / Fracture",
                "condition": "Severe structural trauma reported",
                "severity": "HIGH",
                "score_contribution": score_add,
                "explanation": "Severe traumatic mechanism or limb deformity present."
            })
            explanations.append("Major Trauma / Fracture")

        # --- Rule 10: Severe Pain ---
        if pain_score >= 8:
            score_add = 15.0
            rule_score += score_add
            triggered_rules.append({
                "rule_id": "RULE_SEVERE_PAIN",
                "rule_name": "Intolerable Severe Pain",
                "condition": "Pain Score >= 8/10",
                "severity": "MEDIUM",
                "score_contribution": score_add,
                "explanation": f"Patient reports severe pain ({pain_score}/10)."
            })
            explanations.append(f"Severe Pain ({pain_score}/10)")

        # Cap rule score at 100.0
        final_rule_score = round(min(100.0, rule_score), 1)

        # Recommendation
        if final_rule_score >= 70.0:
            recommendation = "CRITICAL RISK: Immediate resuscitation and priority emergency dispatch required."
        elif final_rule_score >= 45.0:
            recommendation = "HIGH RISK: Urgent medical evaluation and close clinical monitoring recommended."
        elif final_rule_score >= 25.0:
            recommendation = "MODERATE RISK: Standard emergency evaluation and vitals re-check indicated."
        else:
            recommendation = "LOW RISK: Stable vital signs observed. Routine clinical management recommended."

        return {
            "rule_score": final_rule_score,
            "triggered_rules": triggered_rules,
            "explanations": explanations,
            "recommendation": recommendation
        }
