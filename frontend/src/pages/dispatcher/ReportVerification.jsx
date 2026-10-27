import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import axios from 'axios';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { Modal } from '../../components/common/Modal';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  MapPin,
  Calendar,
  Users,
  Activity,
  Stethoscope,
  ExternalLink,
  Info,
  Truck,
  AlertTriangle
} from 'lucide-react';

export function ReportVerification() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useSync();

  const [report, setReport] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [caseRecord, setCaseRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReportData = async () => {
    setLoading(true);
    let foundRep = null;
    let foundAss = null;
    let foundCase = null;

    if (isOnline) {
      try {
        const [repRes, assRes, caseRes] = await Promise.all([
          axios.get(`/api/hospital/reports/${uuid}/`),
          axios.get('/api/triage/assessments/'),
          axios.get('/api/hospital/cases/')
        ]);
        foundRep = repRes.data;

        const assList = assRes.data.results || assRes.data || [];
        foundAss = assList.find(a => a.emergency_report === foundRep.id || a.emergency_report_uuid === foundRep.uuid);

        const caseList = caseRes.data.results || caseRes.data || [];
        foundCase = caseList.find(c => c.source_report === foundRep.id || c.source_report_uuid === foundRep.uuid);
      } catch (e) {
        console.log('Fetch error for report verification view');
      }
    }

    setReport(foundRep);
    setAssessment(foundAss);
    setCaseRecord(foundCase);
    setLoading(false);
  };

  useEffect(() => {
    fetchReportData();
  }, [uuid, isOnline]);

  const handleVerify = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/hospital/reports/${uuid}/verify/`, {});
      setShowVerifyModal(false);
      setReport(prev => ({ ...prev, status: 'VERIFIED' }));
      setCaseRecord(res.data.emergency_case);
      alert('Emergency report verified successfully. Operational case created.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to verify emergency report.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      alert('Please enter a valid rejection reason.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/hospital/reports/${uuid}/reject/`, {
        rejection_reason: rejectionReason
      });
      setShowRejectModal(false);
      setReport(prev => ({ ...prev, status: 'REJECTED' }));
      setCaseRecord(res.data.emergency_case);
      alert('Emergency report rejected.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to reject emergency report.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Loading citizen report & verification data...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
        <h2 className="text-lg font-bold text-slate-900">Report Not Found</h2>
        <div>
          <Link to="/hospital/reports">
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              Back to Incoming Reports
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isUnverified = report.status === 'UNVERIFIED';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/hospital/reports" className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Incoming Reports
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Emergency Report Verification
            </h1>
            <Badge variant={isUnverified ? 'warning' : report.status === 'VERIFIED' ? 'success' : 'critical'} size="lg">
              {isUnverified ? 'CITIZEN REPORT — UNVERIFIED' : report.status}
            </Badge>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-0.5">UUID: {report.uuid}</p>
        </div>

        {/* Verification Action Buttons */}
        {isUnverified && (
          <div className="flex items-center gap-2">
            <Button
              size="md"
              variant="danger"
              onClick={() => setShowRejectModal(true)}
              icon={XCircle}
            >
              Reject Report
            </Button>
            <Button
              size="md"
              variant="primary"
              onClick={() => setShowVerifyModal(true)}
              icon={CheckCircle2}
            >
              Verify Report
            </Button>
          </div>
        )}

        {report.status === 'VERIFIED' && (
          <Link to="/hospital/ambulances">
            <Button size="md" variant="primary" icon={Truck}>
              Dispatch Ambulance
            </Button>
          </Link>
        )}
      </div>

      {/* Prominent Citizen Unverified Warning Banner */}
      {isUnverified && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-950 text-xs shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-amber-950">CITIZEN REPORT — UNVERIFIED</p>
            <p className="leading-relaxed text-amber-900">
              This report was submitted by an ordinary witness. Hospital Staff must verify the report before an operational emergency case is created and dispatched.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Incident Details">
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Incident Type</span>
                  <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                    {report.incident_type ? report.incident_type.replace(/_/g, ' ') : 'Medical Incident'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Affected People</span>
                  <span className="font-extrabold text-slate-900 text-sm mt-0.5 inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-500" />
                    {report.affected_people_count || 1} Person(s)
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Witness Description</span>
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 leading-relaxed font-normal">
                  {report.description || 'No description provided.'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Location Coordinates</span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                      {report.latitude && report.longitude ? `${parseFloat(report.latitude).toFixed(6)}, ${parseFloat(report.longitude).toFixed(6)}` : 'Manual Location'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Timestamp</span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Photo attachment if available */}
              {report.photo && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Attached Photo</span>
                  <img
                    src={report.photo}
                    alt="Report attachment"
                    className="w-full max-w-md h-auto rounded-xl border border-slate-200 max-h-64 object-cover"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Step 5 Emergency Worker Assessment Card (Read-Only) */}
          <Card title="Emergency Worker Clinical Assessment (Step 5)">
            {!assessment ? (
              <div className="py-6 text-center text-xs text-slate-500 italic">
                <Stethoscope className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                Clinical assessment not yet conducted by Emergency Worker.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">AI Hybrid Risk Score</span>
                    <span className="text-xl font-mono font-black">{assessment.fusion_score?.toFixed(1)} / 100</span>
                  </div>
                  <Badge variant={assessment.priority_level === 'CRITICAL' ? 'critical' : 'warning'}>
                    Priority: {assessment.priority_level}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Blood Pressure</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {assessment.systolic_bp && assessment.diastolic_bp ? `${assessment.systolic_bp}/${assessment.diastolic_bp}` : 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Heart Rate</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {assessment.heart_rate ? `${assessment.heart_rate} BPM` : 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">SpO2</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {assessment.spo2 ? `${assessment.spo2}%` : 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">GCS Total</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {assessment.gcs_total ? `${assessment.gcs_total}/15` : '15/15'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Operational Case Info Column */}
        <div className="space-y-6">
          <Card title="Operational Case Record">
            {caseRecord ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Case Status</span>
                  <Badge variant={caseRecord.case_status === 'VERIFIED' ? 'success' : caseRecord.case_status === 'DISPATCHED' ? 'info' : 'critical'}>
                    {caseRecord.case_status}
                  </Badge>
                </div>

                {caseRecord.verified_by_name && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verified By</span>
                    <p className="font-bold text-slate-900">{caseRecord.verified_by_name}</p>
                    <p className="text-[11px] text-slate-500">{new Date(caseRecord.verified_at).toLocaleString()}</p>
                  </div>
                )}

                {caseRecord.rejection_reason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-red-900">
                    <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block">Rejection Reason</span>
                    <p className="font-semibold">{caseRecord.rejection_reason}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No operational case record created yet.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog for Verification */}
      <ConfirmationDialog
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        onConfirm={handleVerify}
        title="Confirm Report Verification"
        message="Are you sure you want to verify this emergency report? This will create an operational Emergency Case for dispatching."
        confirmText="Verify Report"
        variant="primary"
      />

      {/* Modal for Rejection Reason */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Emergency Report"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Please state a valid reason for rejecting this emergency report (e.g. duplicate submission, invalid/fake report).
          </p>
          <textarea
            rows={4}
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleReject} disabled={actionLoading}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
