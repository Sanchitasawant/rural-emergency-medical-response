export function evaluateClinicalRules(vitals, dangerSigns) {
  let ruleScore = 0;
  const reasons = [];

  const systolic = parseInt(vitals.systolic_bp || 120, 10);
  const spo2 = parseFloat(vitals.spo2 || 98.0);
  const heartRate = parseInt(vitals.heart_rate || 75, 10);
  const gcs = parseInt(vitals.gcs_score || 15, 10);
  const respRate = parseInt(vitals.respiratory_rate || 16, 10);

  // SpO2 Hypoxia thresholds
  if (spo2 < 90.0) {
    ruleScore += 40;
    reasons.push('Severe Hypoxia (SpO2 < 90%)');
  } else if (spo2 < 94.0) {
    ruleScore += 20;
    reasons.push('Moderate Hypoxia (SpO2 90-93%)');
  }

  // Blood pressure thresholds
  if (systolic < 90) {
    ruleScore += 35;
    reasons.push('Severe Hypotension / Shock (Systolic BP < 90 mmHg)');
  } else if (systolic > 180) {
    ruleScore += 25;
    reasons.push('Hypertensive Crisis (Systolic BP > 180 mmHg)');
  }

  // GCS altered mental status
  if (gcs < 9) {
    ruleScore += 40;
    reasons.push('Severe Altered Consciousness (GCS < 9)');
  } else if (gcs < 13) {
    ruleScore += 20;
    reasons.push('Moderate Altered Consciousness (GCS 9-12)');
  }

  // Danger signs
  if (dangerSigns.has_uncontrolled_bleeding) {
    ruleScore += 30;
    reasons.push('Uncontrolled Hemorrhage');
  }
  if (dangerSigns.has_severe_respiratory_distress) {
    ruleScore += 30;
    reasons.push('Severe Respiratory Distress');
  }

  return {
    ruleScore: Math.min(100, ruleScore),
    reasons
  };
}

export function evaluateLocalFusionRisk(vitals, dangerSigns) {
  const { ruleScore, reasons } = evaluateClinicalRules(vitals, dangerSigns);

  // Heuristic offline ML score calculation matching backend formula
  const heartRate = parseInt(vitals.heart_rate || 75, 10);
  const respRate = parseInt(vitals.respiratory_rate || 16, 10);

  let mlScore = 15.0;
  if (heartRate > 120 || heartRate < 50) mlScore += 25.0;
  if (respRate > 28 || respRate < 10) mlScore += 25.0;
  if (ruleScore > 30) mlScore += (ruleScore * 0.5);

  mlScore = Math.min(100.0, mlScore);

  // Decision Fusion Layer: 60% Rule + 40% ML
  const fusionScore = Math.round((0.6 * ruleScore + 0.4 * mlScore) * 10) / 10;

  let priority = 'LOW';
  if (fusionScore >= 70 || ruleScore >= 70) {
    priority = 'CRITICAL';
  } else if (fusionScore >= 45) {
    priority = 'HIGH';
  } else if (fusionScore >= 25) {
    priority = 'MEDIUM';
  }

  return {
    ruleScore,
    mlScore: Math.round(mlScore * 10) / 10,
    fusionScore,
    priority,
    clinicalReasons: reasons,
    isOfflineInference: true
  };
}
