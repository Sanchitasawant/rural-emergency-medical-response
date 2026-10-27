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
import {
  Stethoscope,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Activity,
  Users,
  MapPin,
  RefreshCw,
  Search,
  Plus
} from 'lucide-react';

export function WorkerDashboard() {
  const { currentUser } = useAuth();
  const { isOnline } = useSync();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    let reportsList = [];
    let assessmentsList = [];

    if (isOnline) {
      try {
        const [repRes, assRes] = await Promise.all([
          axios.get('/api/emergency/reports/'),
          axios.get('/api/triage/assessments/')
        ]);
        reportsList = repRes.data.results || repRes.data || [];
        assessmentsList = assRes.data.results || assRes.data || [];
      } catch (e) {
        console.log('Online fetch fallback for worker dashboard');
      }
    }

    // Combine local IndexedDB cases if offline
    try {
      const localAssessments = await db.triage_assessments.toArray();
      if (localAssessments.length > 0 && assessmentsList.length === 0) {
        assessmentsList = localAssessments;
      }
    } catch (e) {
      console.error('Dexie fetch error:', e);
    }

    setCases(reportsList);
    setAssessments(assessmentsList);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [isOnline]);

  // Map reports to include assessment info if available
  const mergedCases = cases.map((c) => {
    const existingAss = assessments.find(
      (a) => a.emergency_report === c.id || a.emergency_report_uuid === c.uuid
    );
    return {
      ...c,
      assessment: existingAss || null
    };
  });

  const awaitingCount = mergedCases.filter((c) => !c.assessment || c.assessment.status === 'IN_PROGRESS' || c.assessment.status === 'DRAFT').length;
  const completedCount = mergedCases.filter((c) => c.assessment && c.assessment.status === 'ASSESSED').length;

  const filteredCases = mergedCases.filter((c) => {
    const searchLower = searchQuery.toLowerCase();
    const incidentStr = (c.incident_type || '').replace(/_/g, ' ').toLowerCase();
    const descStr = (c.description || '').toLowerCase();
    const matchesSearch = !searchQuery || incidentStr.includes(searchLower) || descStr.includes(searchLower);

    if (filterStatus === 'AWAITING') {
      return matchesSearch && (!c.assessment || c.assessment.status !== 'ASSESSED');
    }
    if (filterStatus === 'ASSESSED') {
      return matchesSearch && c.assessment && c.assessment.status === 'ASSESSED';
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Worker Hero Banner */}
      <div className="p-6 sm:p-8 bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <Stethoscope className="w-4 h-4 text-teal-400" />
            <span>Emergency Worker Clinical Desk</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Clinical Assessment & AI Decision Support
          </h1>
          <p className="text-sm text-slate-300 font-normal leading-relaxed">
            Record physiological vitals, danger indicators, and GCS parameters. Execute local Rule-Based Triage & Scikit-Learn ML Risk Scoring to evaluate hybrid emergency priority recommendations.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <Button
              size="md"
              variant="primary"
              onClick={() => {
                const nextCase = mergedCases.find(c => !c.assessment || c.assessment.status !== 'ASSESSED');
                if (nextCase) {
                  navigate(`/emergency-worker/assessment/${nextCase.uuid}`);
                } else if (mergedCases.length > 0) {
                  navigate(`/emergency-worker/assessment/${mergedCases[0].uuid}`);
                }
              }}
              disabled={mergedCases.length === 0}
              icon={Activity}
            >
              Start Clinical Assessment
            </Button>
            <Button size="md" variant="ghost" className="text-slate-300" onClick={fetchData} icon={RefreshCw}>
              Refresh Cases
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Emergency Cases"
          value={mergedCases.length}
          label="Total active citizen reported cases"
          icon={ShieldAlert}
          color="teal"
          emptyMessage="No emergency cases assigned"
        />
        <StatCard
          title="Awaiting Assessment"
          value={awaitingCount}
          label="Pending clinical vitals & triage"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="AI Triage Assessed"
          value={completedCount}
          label="Decision fusion complete"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Engine Mode"
          value={isOnline ? 'Online Engine' : 'Offline Local AI'}
          label={isOnline ? 'MySQL API Active' : 'IndexedDB Local Execution'}
          icon={Activity}
          color={isOnline ? 'emerald' : 'indigo'}
        />
      </div>

      {/* Main Cases Table / Card Grid */}
      <Card
        title="Emergency Cases Awaiting Clinical Triage"
        subtitle="Select a case to conduct physical assessment, enter vitals, and run AI prediction."
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by incident type or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            {['ALL', 'AWAITING', 'ASSESSED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterStatus === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Cases' : st === 'AWAITING' ? 'Awaiting Triage' : 'Assessed'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600" />
            <p>Loading emergency cases...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No emergency cases assigned</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no active emergency cases requiring clinical assessment.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCases.map((c) => {
              const hasAss = !!c.assessment;
              const isAssessed = hasAss && c.assessment.status === 'ASSESSED';
              const createdTime = new Date(c.created_at || c.client_timestamp || Date.now()).toLocaleString();
              
              return (
                <div key={c.uuid || c.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 p-3 rounded-2xl transition-colors">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {c.incident_type ? c.incident_type.replace(/_/g, ' ') : 'Emergency Case'}
                      </span>
                      <Badge variant={c.priority === 'CRITICAL' ? 'critical' : c.priority === 'HIGH' ? 'warning' : 'info'}>
                        Priority: {c.priority || 'PENDING'}
                      </Badge>
                      <Badge variant={isAssessed ? 'success' : 'pending'}>
                        {isAssessed ? 'Triage Complete' : 'Awaiting Assessment'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> Affected: {c.affected_people_count || 1}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {c.latitude && c.longitude ? `${parseFloat(c.latitude).toFixed(4)}, ${parseFloat(c.longitude).toFixed(4)}` : 'Manual Location'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {createdTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isAssessed ? (
                      <Link to={`/emergency-worker/assessment/${c.uuid}/result`}>
                        <Button size="sm" variant="outline" icon={Activity}>
                          View AI Triage Result
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/emergency-worker/assessment/${c.uuid}`}>
                        <Button size="sm" variant="primary" icon={Stethoscope}>
                          Conduct Assessment
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
