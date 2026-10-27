import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { db } from '../../offline/db';
import axios from 'axios';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { FormGroup } from '../../components/common/FormGroup';
import {
  Stethoscope,
  ArrowLeft,
  Activity,
  HeartPulse,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Save,
  Play,
  MapPin,
  Calendar,
  Users,
  Info,
  ShieldAlert,
  Loader2
} from 'lucide-react';

export function ClinicalAssessment() {
  const { caseUuid } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isOnline } = useSync();

  const [report, setReport] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAI, setRunningAI] = useState(false);
  const [errors, setErrors] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    patient_identifier: '',
    age: '',
    sex: 'OTHER',
    chief_complaint: '',
    symptom_duration: '',
    injury_notes: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    respiratory_rate: '',
    spo2: '',
    temperature_c: '37.0',
    pain_present: false,
    pain_score: 0,
    pain_description: '',
    gcs_eye: 4,
    gcs_verbal: 5,
    gcs_motor: 6,
    has_uncontrolled_bleeding: false,
    has_severe_respiratory_distress: false,
    has_altered_mental_status: false,
    has_unconsciousness: false,
    has_severe_injury: false,
  });

  // Calculate dynamic GCS Total
  const gcsTotal = (parseInt(formData.gcs_eye) || 4) + (parseInt(formData.gcs_verbal) || 5) + (parseInt(formData.gcs_motor) || 6);

  useEffect(() => {
    let isMounted = true;

    const fetchCaseData = async () => {
      setLoading(true);
      let foundReport = null;
      let foundAss = null;

      // Fetch report details
      if (isOnline) {
        try {
          const repRes = await axios.get(`/api/emergency/reports/${caseUuid}/`);
          foundReport = repRes.data;
        } catch (e) {
          console.log('Online report lookup error / offline fallback');
        }
      }

      // Local IndexedDB fallback for report
      if (!foundReport) {
        try {
          const localReports = await db.emergency_reports.toArray();
          foundReport = localReports.find(r => r.uuid === caseUuid || r.client_uuid === caseUuid);
        } catch (e) {
          console.error(e);
        }
      }

      // Fetch existing assessment if available
      if (isOnline && foundReport) {
        try {
          const assRes = await axios.get('/api/triage/assessments/');
          const assList = assRes.data.results || assRes.data || [];
          foundAss = assList.find(a => a.emergency_report === foundReport.id || a.emergency_report_uuid === foundReport.uuid);
        } catch (e) {
          console.log('Assessment lookup error');
        }
      }

      if (isMounted) {
        setReport(foundReport);
        if (foundAss) {
          setAssessment(foundAss);
          setFormData({
            patient_identifier: foundAss.patient_identifier || '',
            age: foundAss.age !== null ? String(foundAss.age) : '',
            sex: foundAss.sex || 'OTHER',
            chief_complaint: foundAss.chief_complaint || '',
            symptom_duration: foundAss.symptom_duration || '',
            injury_notes: foundAss.injury_notes || '',
            systolic_bp: foundAss.systolic_bp !== null ? String(foundAss.systolic_bp) : '',
            diastolic_bp: foundAss.diastolic_bp !== null ? String(foundAss.diastolic_bp) : '',
            heart_rate: foundAss.heart_rate !== null ? String(foundAss.heart_rate) : '',
            respiratory_rate: foundAss.respiratory_rate !== null ? String(foundAss.respiratory_rate) : '',
            spo2: foundAss.spo2 !== null ? String(foundAss.spo2) : '',
            temperature_c: foundAss.temperature_c !== null ? String(foundAss.temperature_c) : '37.0',
            pain_present: !!foundAss.pain_present,
            pain_score: foundAss.pain_score || 0,
            pain_description: foundAss.pain_description || '',
            gcs_eye: foundAss.gcs_eye || 4,
            gcs_verbal: foundAss.gcs_verbal || 5,
            gcs_motor: foundAss.gcs_motor || 6,
            has_uncontrolled_bleeding: !!foundAss.has_uncontrolled_bleeding,
            has_severe_respiratory_distress: !!foundAss.has_severe_respiratory_distress,
            has_altered_mental_status: !!foundAss.has_altered_mental_status,
            has_unconsciousness: !!foundAss.has_unconsciousness,
            has_severe_injury: !!foundAss.has_severe_injury,
          });
        }
        setLoading(false);
      }
    };

    fetchCaseData();
    return () => { isMounted = false; };
  }, [caseUuid, isOnline]);

  const validateForm = () => {
    const errs = {};
    if (formData.age !== '' && (isNaN(formData.age) || parseInt(formData.age) < 0 || parseInt(formData.age) > 120)) {
      errs.age = 'Age must be between 0 and 120 years.';
    }
    if (formData.systolic_bp !== '' && (isNaN(formData.systolic_bp) || parseInt(formData.systolic_bp) < 40 || parseInt(formData.systolic_bp) > 260)) {
      errs.systolic_bp = 'Systolic BP must be between 40 and 260 mmHg.';
    }
    if (formData.diastolic_bp !== '' && (isNaN(formData.diastolic_bp) || parseInt(formData.diastolic_bp) < 20 || parseInt(formData.diastolic_bp) > 160)) {
      errs.diastolic_bp = 'Diastolic BP must be between 20 and 160 mmHg.';
    }
    if (formData.systolic_bp !== '' && formData.diastolic_bp !== '' && parseInt(formData.diastolic_bp) >= parseInt(formData.systolic_bp)) {
      errs.diastolic_bp = 'Diastolic BP must be lower than Systolic BP.';
    }
    if (formData.heart_rate !== '' && (isNaN(formData.heart_rate) || parseInt(formData.heart_rate) < 20 || parseInt(formData.heart_rate) > 240)) {
      errs.heart_rate = 'Heart rate must be between 20 and 240 BPM.';
    }
    if (formData.respiratory_rate !== '' && (isNaN(formData.respiratory_rate) || parseInt(formData.respiratory_rate) < 5 || parseInt(formData.respiratory_rate) > 60)) {
      errs.respiratory_rate = 'Respiratory rate must be between 5 and 60 breaths/min.';
    }
    if (formData.spo2 !== '' && (isNaN(formData.spo2) || parseFloat(formData.spo2) < 50.0 || parseFloat(formData.spo2) > 100.0)) {
      errs.spo2 = 'SpO2 must be between 50% and 100%.';
    }
    if (formData.temperature_c !== '' && (isNaN(formData.temperature_c) || parseFloat(formData.temperature_c) < 30.0 || parseFloat(formData.temperature_c) > 45.0)) {
      errs.temperature_c = 'Temperature must be between 30°C and 45°C.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const saveAssessment = async (runAI = false) => {
    if (!validateForm()) return null;

    if (runAI) setRunningAI(true);
    else setSaving(true);

    const payload = {
      emergency_report: report ? report.id : null,
      patient_identifier: formData.patient_identifier,
      age: formData.age !== '' ? parseInt(formData.age) : null,
      sex: formData.sex,
      chief_complaint: formData.chief_complaint,
      symptom_duration: formData.symptom_duration,
      injury_notes: formData.injury_notes,
      systolic_bp: formData.systolic_bp !== '' ? parseInt(formData.systolic_bp) : null,
      diastolic_bp: formData.diastolic_bp !== '' ? parseInt(formData.diastolic_bp) : null,
      heart_rate: formData.heart_rate !== '' ? parseInt(formData.heart_rate) : null,
      respiratory_rate: formData.respiratory_rate !== '' ? parseInt(formData.respiratory_rate) : null,
      spo2: formData.spo2 !== '' ? parseFloat(formData.spo2) : null,
      temperature_c: formData.temperature_c !== '' ? parseFloat(formData.temperature_c) : 37.0,
      pain_present: formData.pain_present,
      pain_score: formData.pain_present ? parseInt(formData.pain_score) : 0,
      pain_description: formData.pain_description,
      gcs_eye: parseInt(formData.gcs_eye),
      gcs_verbal: parseInt(formData.gcs_verbal),
      gcs_motor: parseInt(formData.gcs_motor),
      gcs_total: gcsTotal,
      has_uncontrolled_bleeding: formData.has_uncontrolled_bleeding,
      has_severe_respiratory_distress: formData.has_severe_respiratory_distress,
      has_altered_mental_status: formData.has_altered_mental_status,
      has_unconsciousness: formData.has_unconsciousness,
      has_severe_injury: formData.has_severe_injury,
      client_uuid: assessment ? assessment.client_uuid : `ASS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    let targetAssUuid = assessment ? assessment.uuid : null;

    try {
      if (isOnline) {
        let res;
        if (assessment && assessment.uuid) {
          res = await axios.put(`/api/triage/assessments/${assessment.uuid}/`, payload);
        } else {
          res = await axios.post('/api/triage/assessments/', payload);
        }
        targetAssUuid = res.data.uuid;
        setAssessment(res.data);
      } else {
        // Local IndexedDB Save
        await db.triage_assessments.put({
          ...payload,
          id: assessment ? assessment.id : undefined,
          status: 'IN_PROGRESS',
          sync_status: 'PENDING',
          client_timestamp: new Date().toISOString()
        });
      }

      if (runAI && targetAssUuid) {
        // Execute AI API trigger
        const aiRes = await axios.post(`/api/triage/assessments/${targetAssUuid}/run-ai/`, {});
        navigate(`/emergency-worker/assessment/${caseUuid}/result`);
      } else if (!runAI) {
        alert('Assessment draft saved successfully.');
      }
    } catch (err) {
      console.error('Save assessment error:', err);
      const apiErrs = err.response?.data || {};
      setErrors(apiErrs);
      alert(err.response?.data?.detail || 'Failed to save clinical assessment.');
    } finally {
      setSaving(false);
      setRunningAI(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <Loader2 className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3 text-teal-600" />
        <p className="text-xs font-semibold text-slate-600">Loading emergency case & assessment form...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/emergency-worker/dashboard" className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Worker Dashboard
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Clinical Assessment Form
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Emergency Worker Physical Examination & Vital Signs Measurement
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="md"
            variant="outline"
            onClick={() => saveAssessment(false)}
            disabled={saving || runningAI}
            icon={Save}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            size="md"
            variant="primary"
            onClick={() => saveAssessment(true)}
            disabled={saving || runningAI}
            icon={Play}
          >
            {runningAI ? 'Analyzing AI...' : 'Run AI Assessment'}
          </Button>
        </div>
      </div>

      {/* Background Context Notice */}
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-start gap-3 text-xs text-teal-900">
        <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-teal-950">Clinical Workflow Notice</p>
          <p className="leading-relaxed text-teal-900">
            Citizen reports below provide witness background context only. Clinical vitals and Glasgow Coma Scale must be directly observed and measured by the responder.
          </p>
        </div>
      </div>

      {/* Citizen Report Background Card */}
      {report && (
        <Card title="Citizen Initial Witness Context" className="bg-slate-50/70 border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Incident Type</span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                {report.incident_type ? report.incident_type.replace(/_/g, ' ') : 'Medical Emergency'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">People Affected</span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                {report.affected_people_count || 1} Person(s)
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Location Coordinates</span>
              <span className="font-mono text-slate-800 font-bold text-xs mt-0.5 block">
                {report.latitude && report.longitude ? `${parseFloat(report.latitude).toFixed(4)}, ${parseFloat(report.longitude).toFixed(4)}` : 'Manual Location'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs text-slate-700">
            <span className="font-bold text-slate-900 block mb-0.5">Witness Description:</span>
            <p className="italic text-slate-600">"{report.description}"</p>
          </div>
        </Card>
      )}

      {/* Form Section 1: Patient Information */}
      <Card title="Section 1 — Patient Information & Complaint">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <FormGroup label="Patient Identifier / Name" helpText="Optional name or temporary ID tag">
            <input
              type="text"
              placeholder="e.g. PAT-9042 or John Doe"
              value={formData.patient_identifier}
              onChange={(e) => handleInputChange('patient_identifier', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
            />
          </FormGroup>

          <FormGroup label="Patient Age (Years)" error={errors.age}>
            <input
              type="number"
              min="0"
              max="120"
              placeholder="e.g. 45"
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
            />
          </FormGroup>

          <FormGroup label="Biological Sex">
            <select
              value={formData.sex}
              onChange={(e) => handleInputChange('sex', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other / Unknown</option>
            </select>
          </FormGroup>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-4">
          <FormGroup label="Chief Complaint" helpText="Primary symptom reported by patient">
            <input
              type="text"
              placeholder="e.g. Severe chest pain, shortness of breath"
              value={formData.chief_complaint}
              onChange={(e) => handleInputChange('chief_complaint', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
            />
          </FormGroup>

          <FormGroup label="Symptom Duration">
            <input
              type="text"
              placeholder="e.g. 30 minutes, 2 hours"
              value={formData.symptom_duration}
              onChange={(e) => handleInputChange('symptom_duration', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
            />
          </FormGroup>
        </div>
      </Card>

      {/* Form Section 2: Physiological Vital Signs */}
      <Card title="Section 2 — Physiological Vital Signs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <FormGroup label="Systolic BP (mmHg)" error={errors.systolic_bp} helpText="Normal: 90 - 120">
            <input
              type="number"
              placeholder="120"
              value={formData.systolic_bp}
              onChange={(e) => handleInputChange('systolic_bp', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 font-mono font-bold"
            />
          </FormGroup>

          <FormGroup label="Diastolic BP (mmHg)" error={errors.diastolic_bp} helpText="Normal: 60 - 80">
            <input
              type="number"
              placeholder="80"
              value={formData.diastolic_bp}
              onChange={(e) => handleInputChange('diastolic_bp', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 font-mono font-bold"
            />
          </FormGroup>

          <FormGroup label="Heart Rate (BPM)" error={errors.heart_rate} helpText="Normal: 60 - 100">
            <input
              type="number"
              placeholder="75"
              value={formData.heart_rate}
              onChange={(e) => handleInputChange('heart_rate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 font-mono font-bold"
            />
          </FormGroup>

          <FormGroup label="Respiratory Rate (breaths/min)" error={errors.respiratory_rate} helpText="Normal: 12 - 20">
            <input
              type="number"
              placeholder="16"
              value={formData.respiratory_rate}
              onChange={(e) => handleInputChange('respiratory_rate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 font-mono font-bold"
            />
          </FormGroup>

          <FormGroup label="Oxygen Saturation SpO2 (%)" error={errors.spo2} helpText="Normal: 95% - 100%">
            <input
              type="number"
              step="0.1"
              placeholder="98.0"
              value={formData.spo2}
              onChange={(e) => handleInputChange('spo2', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 font-mono font-bold"
            />
          </FormGroup>

          <FormGroup label="Body Temperature (°C)" error={errors.temperature_c} helpText="Normal: 36.5°C - 37.5°C">
            <input
              type="number"
              step="0.1"
              placeholder="37.0"
              value={formData.temperature_c}
              onChange={(e) => handleInputChange('temperature_c', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 font-mono font-bold"
            />
          </FormGroup>
        </div>

        {/* Pain Assessment Sub-Section */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pain_present"
              checked={formData.pain_present}
              onChange={(e) => handleInputChange('pain_present', e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="pain_present" className="text-xs font-bold text-slate-800 cursor-pointer">
              Patient reports active pain
            </label>
          </div>

          {formData.pain_present && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <FormGroup label={`Pain Score Scale: ${formData.pain_score}/10`}>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.pain_score}
                  onChange={(e) => handleInputChange('pain_score', e.target.value)}
                  className="w-full accent-teal-600"
                />
              </FormGroup>

              <FormGroup label="Pain Description">
                <input
                  type="text"
                  placeholder="e.g. Sharp radiating chest pain, dull abdominal ache"
                  value={formData.pain_description}
                  onChange={(e) => handleInputChange('pain_description', e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                />
              </FormGroup>
            </div>
          )}
        </div>
      </Card>

      {/* Form Section 3: Glasgow Coma Scale (GCS) */}
      <Card title="Section 3 — Glasgow Coma Scale (GCS) Calculator">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <FormGroup label="Eye Response (E)">
            <select
              value={formData.gcs_eye}
              onChange={(e) => handleInputChange('gcs_eye', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
            >
              <option value={4}>4 — Spontaneous open</option>
              <option value={3}>3 — Open to verbal command</option>
              <option value={2}>2 — Open to painful stimulus</option>
              <option value={1}>1 — No eye opening</option>
            </select>
          </FormGroup>

          <FormGroup label="Verbal Response (V)">
            <select
              value={formData.gcs_verbal}
              onChange={(e) => handleInputChange('gcs_verbal', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
            >
              <option value={5}>5 — Oriented & converses</option>
              <option value={4}>4 — Confused speech</option>
              <option value={3}>3 — Inappropriate words</option>
              <option value={2}>2 — Incomprehensible sounds</option>
              <option value={1}>1 — No verbal response</option>
            </select>
          </FormGroup>

          <FormGroup label="Motor Response (M)">
            <select
              value={formData.gcs_motor}
              onChange={(e) => handleInputChange('gcs_motor', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
            >
              <option value={6}>6 — Obeys commands</option>
              <option value={5}>5 — Localizes pain</option>
              <option value={4}>4 — Flexion withdrawal from pain</option>
              <option value={3}>3 — Abnormal decorticate flexion</option>
              <option value={2}>2 — Extensor decerebrate response</option>
              <option value={1}>1 — No motor response</option>
            </select>
          </FormGroup>
        </div>

        <div className="mt-4 p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Calculated GCS Score</span>
            <p className="text-xl font-black text-white">
              GCS {gcsTotal} / 15
            </p>
          </div>
          <Badge variant={gcsTotal <= 8 ? 'critical' : gcsTotal <= 12 ? 'warning' : 'success'} size="lg">
            {gcsTotal <= 8 ? 'Severe Coma (GCS <= 8)' : gcsTotal <= 12 ? 'Moderate Impairment (GCS 9-12)' : 'Minor / Normal Consciousness'}
          </Badge>
        </div>
      </Card>

      {/* Form Section 4: Danger Signs */}
      <Card title="Section 4 — Observable Danger Signs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            { id: 'has_uncontrolled_bleeding', label: 'Uncontrolled Hemorrhage / Major Bleeding', desc: 'Active severe external or internal bleeding' },
            { id: 'has_severe_respiratory_distress', label: 'Severe Respiratory Distress', desc: 'Stridor, grunting, or severe intercostal retractions' },
            { id: 'has_altered_mental_status', label: 'Acute Altered Mental Status', desc: 'Confusion, disorientation, or abnormal lethargy' },
            { id: 'has_unconsciousness', label: 'Unconsciousness / Unresponsiveness', desc: 'Patient does not respond to verbal/tactile cues' },
            { id: 'has_severe_injury', label: 'Major Structural Trauma / Fracture', desc: 'Deformed extremity, chest wall instability, or spinal injury' },
          ].map((item) => (
            <label
              key={item.id}
              htmlFor={item.id}
              className={`p-3.5 border rounded-2xl flex items-start gap-3 cursor-pointer transition-colors ${
                formData[item.id]
                  ? 'bg-red-50/70 border-red-300 ring-2 ring-red-200'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <input
                type="checkbox"
                id={item.id}
                checked={formData[item.id]}
                onChange={(e) => handleInputChange(item.id, e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 mt-0.5 shrink-0"
              />
              <div>
                <span className={`font-bold block ${formData[item.id] ? 'text-red-950' : 'text-slate-900'}`}>
                  {item.label}
                </span>
                <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                  {item.desc}
                </span>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Bottom Action Footer */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
        <Link to="/emergency-worker/dashboard">
          <Button variant="ghost" size="sm" icon={ArrowLeft}>
            Cancel
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            size="md"
            variant="outline"
            onClick={() => saveAssessment(false)}
            disabled={saving || runningAI}
            icon={Save}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            size="md"
            variant="primary"
            onClick={() => saveAssessment(true)}
            disabled={saving || runningAI}
            icon={Play}
          >
            {runningAI ? 'Analyzing AI...' : 'Run AI Assessment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
