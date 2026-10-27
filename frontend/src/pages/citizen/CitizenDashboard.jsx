import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { db } from '../../offline/db';
import axios from 'axios';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { StatusIndicator } from '../../components/common/StatusIndicator';
import { ShieldAlert, PlusCircle, Clock, CheckCircle2, PhoneCall, ArrowRight, LifeBuoy, AlertCircle, FileText } from 'lucide-react';

export function CitizenDashboard() {
  const { currentUser } = useAuth();
  const { isOnline } = useSync();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    let onlineList = [];
    let offlineList = [];

    // 1. Fetch online reports if connected
    if (isOnline) {
      try {
        const res = await axios.get('/api/emergency/reports/');
        onlineList = res.data.results || res.data || [];
      } catch (e) {
        console.log('Backend reports fetch offline fallback');
      }
    }

    // 2. Fetch local IndexedDB reports
    try {
      offlineList = await db.emergency_reports.orderBy('id').reverse().toArray();
    } catch (e) {
      console.error(e);
    }

    // Combine & deduplicate by client_uuid
    const combinedMap = new Map();
    offlineList.forEach(r => combinedMap.set(r.client_uuid, { ...r, isLocalOnly: true }));
    onlineList.forEach(r => combinedMap.set(r.client_uuid, { ...r, isLocalOnly: false, sync_status: 'SYNCED' }));

    const combinedList = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at || b.client_timestamp) - new Date(a.created_at || a.client_timestamp)
    );

    setReports(combinedList);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [isOnline]);

  const activeReportsCount = reports.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && r.status !== 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Prominent REPORT EMERGENCY CTA */}
      <div className="p-6 sm:p-8 bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <HeartPulseIcon className="w-4 h-4 text-teal-400" />
            <span>Citizen Emergency Desk</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            How can we help in an emergency?
          </h2>
          <p className="text-sm text-slate-300 font-normal leading-relaxed">
            Report an observed incident immediately. If internet connection is unavailable, your report is saved locally in IndexedDB and synchronized automatically when connection is restored.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link to="/citizen/report-emergency" className="w-full sm:w-auto">
              <Button size="lg" variant="danger" className="w-full shadow-lg text-base py-3.5 px-6 font-bold" icon={ShieldAlert}>
                REPORT EMERGENCY
              </Button>
            </Link>
            <Link to="/citizen/reports" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full border-slate-700 text-slate-200 bg-slate-900 hover:bg-slate-800" icon={FileText}>
                View My Reports ({reports.length})
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="My Active Incidents"
          value={activeReportsCount}
          label="Reports pending verification or response"
          icon={ShieldAlert}
          color="red"
        />
        <StatCard
          title="Total Submitted Reports"
          value={reports.length}
          label="Lifetime reported emergency cases"
          icon={FileText}
          color="teal"
          emptyMessage="No emergency reports yet"
        />
        <StatCard
          title="Connectivity Status"
          value={isOnline ? 'Online' : 'Offline Mode'}
          label={isOnline ? 'Direct MySQL API Connection' : 'Local IndexedDB Engine Active'}
          icon={StatusIndicatorIcon}
          color={isOnline ? 'emerald' : 'amber'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports List */}
        <Card title="My Recent Emergency Reports" className="lg:col-span-2">
          {loading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading reports...</p>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-slate-500 italic text-sm">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              No emergency reports yet.
              <p className="text-xs text-slate-400 not-italic mt-1">Press 'REPORT EMERGENCY' above if you observe an active incident.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.slice(0, 5).map((r) => (
                <div key={r.client_uuid || r.uuid} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{r.incident_type?.replace(/_/g, ' ')}</span>
                      <Badge variant={r.sync_status === 'SYNCED' ? 'synced' : 'pending'}>
                        {r.sync_status === 'SYNCED' ? 'Synced' : 'Saved Offline'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{r.description}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Affected: {r.affected_people_count || r.affected_count || 1} people • {new Date(r.created_at || r.client_timestamp).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={r.status === 'VERIFIED' ? 'critical' : 'info'}>
                      {r.status}
                    </Badge>
                    <Link to={`/citizen/reports/${r.uuid || r.client_uuid}`}>
                      <Button size="sm" variant="ghost" icon={ArrowRight}>
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Safety Guidelines & Help Section */}
        <Card title="Emergency Guidelines & Help">
          <div className="space-y-4 text-xs text-slate-600">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
              <p className="font-bold flex items-center gap-1.5 text-xs text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" /> Notice to Citizens
              </p>
              <p className="mt-1 leading-relaxed">
                Citizen input is for incident observation only (location, facts, photo). Initial reports are marked as <strong>UNVERIFIED</strong> until medical staff review them.
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-800">What to do in an emergency:</p>
              <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                <li>Ensure your personal safety first.</li>
                <li>Capture exact location landmark if GPS is unavailable.</li>
                <li>Submit clear description of what you observe.</li>
                <li>Keep phone reachable for staff verification call.</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
              <div className="p-2.5 bg-slate-900 text-teal-400 rounded-xl">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs">National Emergency Helpline</p>
                <p className="text-sm font-black text-teal-600">108 / 112</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function HeartPulseIcon(props) {
  return <ShieldAlert {...props} />;
}

function StatusIndicatorIcon(props) {
  return <CheckCircle2 {...props} />;
}
