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
  ShieldAlert,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Info,
  XCircle,
  HelpCircle
} from 'lucide-react';

export function ReportDetails() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useSync();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadReportDetails = async () => {
      setLoading(true);
      setError(null);
      let foundReport = null;

      // 1. Check local IndexedDB first
      try {
        const localList = await db.emergency_reports.toArray();
        foundReport = localList.find(
          r => r.uuid === uuid || r.client_uuid === uuid || r.id === parseInt(uuid, 10)
        );
      } catch (e) {
        console.error('IndexedDB query error:', e);
      }

      // 2. If online, attempt API fetch to get latest status
      if (isOnline) {
        try {
          const res = await axios.get(`/api/emergency/reports/${uuid}/`);
          if (res.data) {
            foundReport = {
              ...res.data,
              sync_status: 'SYNCED',
              isLocalOnly: false
            };
          }
        } catch (apiErr) {
          // If 404 or backend lookup failed, but we found a local item, keep local item
          if (!foundReport) {
            if (apiErr.response?.status === 403) {
              setError('You do not have authorization to view this report.');
            } else if (apiErr.response?.status === 404) {
              setError('Emergency report not found.');
            } else {
              setError('Failed to fetch emergency report details.');
            }
          }
        }
      }

      if (isMounted) {
        if (foundReport) {
          setReport(foundReport);
        } else if (!error) {
          setError('Emergency report not found in local storage or server.');
        }
        setLoading(false);
      }
    };

    loadReportDetails();

    return () => {
      isMounted = false;
    };
  }, [uuid, isOnline]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Loading incident report details...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 inline-block">
          <XCircle className="w-10 h-10 mx-auto text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{error || 'Report Not Found'}</h2>
        <p className="text-xs text-slate-500">
          The requested emergency report could not be found or you do not have permission to view it.
        </p>
        <div>
          <Link to="/citizen/reports">
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              Back to My Reports
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Derive status timeline stages based on report.status
  // Status options: UNVERIFIED, VERIFIED, REJECTED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
  const currentStatus = report.status || 'UNVERIFIED';

  const stages = [
    {
      id: 'submitted',
      label: 'Report Submitted',
      description: 'Incident report recorded locally & backend',
      completed: true,
      current: false
    },
    {
      id: 'verification_pending',
      label: 'Verification Pending',
      description: 'Awaiting triage by hospital staff',
      completed: currentStatus !== 'UNVERIFIED',
      current: currentStatus === 'UNVERIFIED'
    },
    {
      id: 'verified',
      label: 'Verified',
      description: 'Hospital staff validated reported incident',
      completed: ['VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(currentStatus),
      current: currentStatus === 'VERIFIED',
      isRejected: currentStatus === 'REJECTED'
    },
    {
      id: 'emergency_response',
      label: 'Emergency Response',
      description: 'Responder/ambulance unit active',
      completed: ['IN_PROGRESS', 'COMPLETED'].includes(currentStatus),
      current: ['ASSIGNED', 'IN_PROGRESS'].includes(currentStatus)
    },
    {
      id: 'completed',
      label: 'Completed',
      description: 'Emergency incident resolved',
      completed: currentStatus === 'COMPLETED',
      current: currentStatus === 'COMPLETED'
    }
  ];

  const reportDate = new Date(report.created_at || report.client_timestamp || Date.now()).toLocaleString();
  const reportUuid = report.uuid || report.client_uuid || `REP-${report.id}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link to="/citizen/reports" className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Reports
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Emergency Report
            </h1>
            <Badge variant={report.sync_status === 'SYNCED' ? 'synced' : 'pending'}>
              {report.sync_status === 'SYNCED' ? 'Synced Backend' : 'Saved Offline'}
            </Badge>
          </div>
          <p className="text-xs font-mono text-slate-500">UUID: {reportUuid}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={report.status === 'VERIFIED' ? 'critical' : report.status === 'COMPLETED' ? 'success' : 'info'} size="lg">
            Status: {report.status}
          </Badge>
        </div>
      </div>

      {/* Rejection Warning if applicable */}
      {currentStatus === 'REJECTED' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900 text-xs">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-red-950">Report Status: Rejected</p>
            <p className="mt-1 leading-relaxed">
              Hospital staff evaluated this report and marked it as rejected or duplicate. Contact local dispatch if immediate help is required.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Incident Observation Details">
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Incident Type
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                    {report.incident_type ? report.incident_type.replace(/_/g, ' ') : 'Medical Emergency'}
                  </span>
                  {report.incident_type === 'OTHER' && report.other_incident_description && (
                    <span className="text-slate-600 italic block mt-0.5">
                      "{report.other_incident_description}"
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    People Affected
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm mt-0.5 inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-500" />
                    {report.affected_people_count || report.affected_count || 1} Person(s)
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Reported Description (Citizen Witness Observation)
                </span>
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 leading-relaxed font-normal">
                  {report.description || 'No detailed description provided.'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Location Coordinates
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                      {report.latitude && report.longitude
                        ? `${parseFloat(report.latitude).toFixed(6)}, ${parseFloat(report.longitude).toFixed(6)}`
                        : 'Manual Location Recorded'}
                    </p>
                    {report.location_accuracy && (
                      <p className="text-[11px] text-slate-500">
                        Accuracy: ±{Math.round(report.location_accuracy)} meters
                      </p>
                    )}
                    {report.latitude && report.longitude && (
                      <a
                        href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline pt-1"
                      >
                        Open in Google Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Timestamp
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                      {reportDate}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Sync Status: {report.sync_status || 'PENDING'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Photo Attachment if present */}
              {report.photo && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Attached Incident Photo
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-w-md">
                    <img
                      src={
                        typeof report.photo === 'string'
                          ? report.photo
                          : URL.createObjectURL(report.photo)
                      }
                      alt="Incident attachment"
                      className="w-full h-auto rounded-xl object-cover max-h-64 border border-slate-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Status Timeline Column */}
        <div className="space-y-6">
          <Card title="Status Timeline">
            <div className="space-y-6 py-2">
              {stages.map((stage, idx) => {
                const isLast = idx === stages.length - 1;
                return (
                  <div key={stage.id} className="relative flex items-start gap-3">
                    {!isLast && (
                      <div
                        className={`absolute left-3.5 top-7 bottom-0 w-0.5 ${
                          stage.completed ? 'bg-teal-500' : 'bg-slate-200'
                        }`}
                      />
                    )}

                    <div
                      className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                        stage.completed
                          ? 'bg-teal-600 text-white ring-4 ring-teal-50'
                          : stage.current
                          ? 'bg-amber-500 text-white ring-4 ring-amber-50 animate-pulse'
                          : stage.isRejected
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-300'
                      }`}
                    >
                      {stage.completed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : stage.current ? (
                        <Clock className="w-4 h-4" />
                      ) : stage.isRejected ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <p
                        className={`text-xs font-extrabold ${
                          stage.completed || stage.current ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {stage.label}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {stage.description}
                      </p>
                      {stage.current && (
                        <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mt-1">
                          Current Stage
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Safety disclaimer */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-teal-400">
              <Info className="w-4 h-4" /> Medical Disclaimer
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              This report is recorded as witness observation. Verification and medical dispatch are conducted strictly by authorized healthcare professionals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
