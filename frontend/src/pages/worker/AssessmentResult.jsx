import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { db } from '../../offline/db';
import axios from 'axios';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  ArrowLeft,
  Activity,
  ShieldAlert,
  Brain,
  CheckCircle2,
  AlertTriangle,
  FileText,
  HelpCircle,
  Info,
  Stethoscope,
  ChevronRight,
  Sparkles,
  Layers,
  HeartPulse
} from 'lucide-react';

export function AssessmentResult() {
  const { caseUuid } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useSync();

  const [assessment, setAssessment] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchResultData = async () => {
      setLoading(true);
      let foundAss = null;
      let foundRep = null;

      if (isOnline) {
        try {
          const [repRes, assRes] = await Promise.all([
            axios.get(`/api/emergency/reports/${caseUuid}/`),
            axios.get('/api/triage/assessments/')
          ]);
          foundRep = repRes.data;
          const assList = assRes.data.results || assRes.data || [];
          foundAss = assList.find(a => a.emergency_report === foundRep.id || a.emergency_report_uuid === foundRep.uuid);
        } catch (e) {
          console.log('Online fetch error / fallback');
        }
      }

      // Local IndexedDB fallback
      if (!foundAss) {
        try {
          const localAss = await db.triage_assessments.toArray();
          foundAss = localAss.find(a => a.emergency_report_uuid === caseUuid || a.client_uuid === caseUuid);
        } catch (e) {
          console.error(e);
        }
      }

      if (isMounted) {
        setAssessment(foundAss);
        setReport(foundRep);
        setLoading(false);
      }
    };

    fetchResultData();
    return () => { isMounted = false; };
  }, [caseUuid, isOnline]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Loading AI Clinical Assessment result...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
        <h2 className="text-lg font-bold text-slate-900">Assessment Not Found</h2>
        <p className="text-xs text-slate-500">
          No clinical assessment has been completed for this case yet. Please complete the physical assessment form first.
        </p>
        <div className="pt-2">
          <Link to={`/emergency-worker/assessment/${caseUuid}`}>
            <Button variant="primary" size="sm" icon={Stethoscope}>
              Start Assessment Form
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const priority = assessment.priority_level || 'MEDIUM';
  const ruleScore = assessment.rule_score || 0;
  const mlScore = assessment.ml_score || 0;
  const fusionScore = assessment.fusion_score || 0;
  const triggeredRules = assessment.triggered_rules || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/emergency-worker/dashboard" className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              AI Triage Assessment Results
            </h1>
            <Badge variant={priority === 'CRITICAL' ? 'critical' : priority === 'HIGH' ? 'warning' : 'info'} size="lg">
              Priority: {priority}
            </Badge>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            Assessment UUID: {assessment.uuid || assessment.client_uuid}
          </p>
        </div>

        <div>
          <Link to={`/emergency-worker/assessment/${caseUuid}`}>
            <Button size="sm" variant="outline" icon={Stethoscope}>
              Edit Assessment Vitals
            </Button>
          </Link>
        </div>
      </div>

      {/* Prominent Clinical Disclaimer Banner */}
      <div className="p-4 bg-slate-950 text-white rounded-2xl border border-slate-800 flex items-start gap-3 shadow-lg">
        <Sparkles className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-teal-300">Clinical Decision Support Notice</p>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            This AI-generated risk score and priority recommendation are provided for decision support only. Final clinical priority decisions remain with qualified medical professionals.
          </p>
        </div>
      </div>

      {/* Decision Fusion Visual Pipeline Diagram */}
      <Card title="Decision Fusion Pipeline Overview">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center py-2">
          {/* Rule Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Rule-Based Engine (60%)
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {ruleScore.toFixed(1)} / 100
            </div>
            <p className="text-[11px] text-slate-500">WHO / Emergency Triage Rules</p>
          </div>

          <div className="hidden md:flex justify-center text-slate-300">
            <ChevronRight className="w-6 h-6" />
          </div>

          {/* ML Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Scikit-Learn ML Model (40%)
            </span>
            <div className="text-2xl font-black text-teal-700 font-mono">
              {mlScore.toFixed(1)}%
            </div>
            <p className="text-[11px] text-slate-500">{assessment.model_name || 'RandomForest'} ({assessment.model_version || 'v1.0'})</p>
          </div>

          <div className="hidden md:flex justify-center text-slate-300">
            <ChevronRight className="w-6 h-6" />
          </div>

          {/* Fusion Result Card */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl text-center space-y-2 col-span-1 md:col-span-1 border border-slate-800 shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
              Decision Fusion Output
            </span>
            <div className="text-3xl font-black text-white font-mono">
              {fusionScore.toFixed(1)}
            </div>
            <Badge variant={priority === 'CRITICAL' ? 'critical' : priority === 'HIGH' ? 'warning' : 'info'} size="sm">
              {priority}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Main Grid: Rule vs ML Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rule-Based Triage Assessment Card */}
        <Card title="1. Rule-Based Triage Assessment">
          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>Deterministic Rule Score</span>
                <span className="font-mono text-sm">{ruleScore.toFixed(1)} / 100</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    ruleScore >= 70 ? 'bg-red-600' : ruleScore >= 45 ? 'bg-amber-500' : 'bg-teal-600'
                  }`}
                  style={{ width: `${Math.min(100, ruleScore)}%` }}
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Triggered Clinical Indicators ({triggeredRules.length})
              </span>

              {triggeredRules.length === 0 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  No high-risk physiological rule thresholds breached.
                </div>
              ) : (
                <div className="space-y-2">
                  {triggeredRules.map((rule, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900 text-xs">
                          {rule.rule_name}
                        </span>
                        <Badge variant={rule.severity === 'CRITICAL' ? 'critical' : 'warning'}>
                          +{rule.score_contribution} pts
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {rule.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ML Risk Model Card */}
        <Card title="2. Scikit-Learn ML Risk Assessment">
          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>ML Predicted Emergency Probability</span>
                <span className="font-mono text-sm text-teal-700">{mlScore.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 transition-all"
                  style={{ width: `${Math.min(100, mlScore)}%` }}
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Model Name:</span>
                <span className="font-mono font-bold text-slate-900">{assessment.model_name || 'RandomForest-Clinical-Triage'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Model Version:</span>
                <span className="font-mono font-bold text-slate-900">{assessment.model_version || 'v1.0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Fusion Weights:</span>
                <span className="font-mono text-slate-700">Rule 60% / ML 40%</span>
              </div>
            </div>

            {/* Imputation Tracking */}
            <div className="pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Clinical Preprocessing & Feature Imputation
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Features standardized via `StandardScaler`. Missing optional inputs explicitly populated with standard physiological median defaults.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Patient & Measured Vitals Summary */}
      <Card title="3. Patient Demographics & Measured Vitals Summary">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] font-bold block uppercase">Blood Pressure</span>
            <span className="text-slate-900 font-extrabold text-sm font-mono mt-0.5 block">
              {assessment.systolic_bp && assessment.diastolic_bp ? `${assessment.systolic_bp}/${assessment.diastolic_bp} mmHg` : 'Not Measured'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] font-bold block uppercase">Heart Rate</span>
            <span className="text-slate-900 font-extrabold text-sm font-mono mt-0.5 block">
              {assessment.heart_rate ? `${assessment.heart_rate} BPM` : 'Not Measured'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] font-bold block uppercase">SpO2 Oxygen</span>
            <span className="text-slate-900 font-extrabold text-sm font-mono mt-0.5 block">
              {assessment.spo2 ? `${assessment.spo2}%` : 'Not Measured'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] font-bold block uppercase">GCS Coma Score</span>
            <span className="text-slate-900 font-extrabold text-sm font-mono mt-0.5 block">
              {assessment.gcs_total ? `${assessment.gcs_total} / 15` : '15 / 15'}
            </span>
          </div>
        </div>
      </Card>

      {/* Section 4: Explainability Panel */}
      <Card title="4. AI Explainability Panel ('Why did the system produce this assessment?')">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs leading-relaxed text-slate-800">
          <p className="whitespace-pre-line font-medium">
            {assessment.clinical_explanation || "Evaluation complete. Hybrid decision fusion combined deterministic WHO triage rules with RandomForest risk predictions."}
          </p>
        </div>
      </Card>
    </div>
  );
}
