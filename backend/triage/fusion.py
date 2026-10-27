"""
Hybrid Decision Fusion Layer for RuralCare AI.
Fuses deterministic clinical Rule-Based score (R) and Scikit-Learn ML Risk score (M)
using a weighted fusion formula: HybridScore = α·R + (1-α)·M.
"""

class DecisionFusionEngine:
    DEFAULT_RULE_WEIGHT = 0.60
    DEFAULT_ML_WEIGHT = 0.40

    @classmethod
    def fuse(cls, rule_result, ml_result, rule_weight=None, ml_weight=None):
        """
        Combines rule_score and ml_score into a unified Hybrid Assessment Score.
        Returns:
            dict containing fusion_score, rule_weight, ml_weight, priority_level, and clinical_explanation.
        """
        if rule_weight is None or ml_weight is None:
            rule_w = cls.DEFAULT_RULE_WEIGHT
            ml_w = cls.DEFAULT_ML_WEIGHT
        else:
            rule_w = float(rule_weight)
            ml_w = float(ml_weight)

        # Ensure weights normalize to 1.0
        total_w = rule_w + ml_w
        if total_w > 0:
            rule_w = round(rule_w / total_w, 2)
            ml_w = round(ml_w / total_w, 2)

        rule_score = float(rule_result.get('rule_score', 0.0))
        ml_score = float(ml_result.get('ml_score', 0.0))

        # Hybrid Decision Formula: HybridScore = α·R + (1-α)·M
        fusion_score = round((rule_w * rule_score) + (ml_w * ml_score), 1)

        # Priority Level Mapping
        # Hard Rule Safety Override: If rule_score >= 70 (Critical clinical danger sign), override priority to CRITICAL
        if rule_score >= 70.0 or fusion_score >= 70.0:
            priority_level = 'CRITICAL'
            priority_label = 'Critical Emergency (Red)'
        elif fusion_score >= 45.0:
            priority_level = 'HIGH'
            priority_label = 'High Risk (Orange)'
        elif fusion_score >= 25.0:
            priority_level = 'MEDIUM'
            priority_label = 'Moderate Risk (Yellow)'
        else:
            priority_level = 'LOW'
            priority_label = 'Low Risk (Green)'

        # Synthesize Clinical Explanation
        triggered_rules = rule_result.get('triggered_rules', [])
        explanations = rule_result.get('explanations', [])
        
        explanation_lines = []
        explanation_lines.append(f"Decision Fusion Weighting: Rule-based triage ({int(rule_w*100)}%) + Scikit-Learn ML risk model ({int(ml_w*100)}%).")
        explanation_lines.append(f"Computed Hybrid Score: {fusion_score}/100 -> Recommended Priority: {priority_label}.")

        if triggered_rules:
            rule_names = [f"• {r['rule_name']} ({r['condition']})" for r in triggered_rules]
            explanation_lines.append("Triggered Clinical Rules:\n" + "\n".join(rule_names))
        else:
            explanation_lines.append("No critical clinical rule thresholds were breached.")

        if ml_result.get('missing_imputations'):
            imputed_names = [imp['feature'] for imp in ml_result['missing_imputations']]
            explanation_lines.append(f"Note: ML prediction imputed defaults for missing parameters: {', '.join(imputed_names)}.")

        clinical_explanation = "\n\n".join(explanation_lines)

        return {
            "rule_score": rule_score,
            "ml_score": ml_score,
            "rule_weight": rule_w,
            "ml_weight": ml_w,
            "fusion_score": fusion_score,
            "priority_level": priority_level,
            "clinical_explanation": clinical_explanation
        }
