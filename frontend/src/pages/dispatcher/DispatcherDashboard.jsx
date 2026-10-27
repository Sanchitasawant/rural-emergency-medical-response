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
  Building2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  ArrowRight,
  FileText,
  Activity,
  Users,
  MapPin,
  RefreshCw,
  Search,
  CheckSquare,
  XCircle,
  Radio
} from 'lucide-react';

export function DispatcherDashboard() {
  const { currentUser } = useAuth();
  const { isOnline } = useSync();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [cases, setCases] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    let repList = [];
    let caseList = [];
    let ambList = [];

    if (isOnline) {
      try {
        const [repRes, caseRes, ambRes] = await Promise.all([
          axios.get('/api/hospital/reports/'),
          axios.get('/api/hospital/cases/'),
          axios.get('/api/hospital/ambulances/')
        ]);
        repList = repRes.data.results || repRes.data || [];
        caseList = caseRes.data.results || caseRes.data || [];
        ambList = ambRes.data.results || ambRes.data || [];
      } catch (e) {
        console.log('Online fetch error for hospital dashboard');
      }
    }

    setReports(repList);
    setCases(caseList);
    setAmbulances(ambList);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [isOnline]);

  const unverifiedReports = reports.filter(r => r.status === 'UNVERIFIED');
  const availableAmbulances = ambulances.filter(a => a.status === 'AVAILABLE');
  const assignedAmbulances = ambulances.filter(a => a.status === 'ASSIGNED' || a.status === 'ON_THE_WAY' || a.status === 'PATIENT_PICKED_UP');
  const busyAmbulances = ambulances.filter(a => a.status === 'BUSY');
  const maintenanceAmbulances = ambulances.filter(a => a.status === 'MAINTENANCE');

  return (
    <div className="space-y-6">
      {/* Dispatcher Hero Banner */}
      <div className="p-6 sm:p-8 bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <Building2 className="w-4 h-4 text-teal-400" />
            <span>Hospital Dispatch & Resource Command</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Hospital Verification & Resource Dispatch
          </h1>
          <p className="text-sm text-slate-300 font-normal leading-relaxed">
            Verify citizen emergency reports, review clinical triage assessments, and execute atomic ambulance dispatching for emergency response units.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link to="/hospital/reports">
              <Button size="md" variant="primary" icon={CheckSquare}>
                Review Incoming Reports ({unverifiedReports.length})
              </Button>
            </Link>
            <Link to="/hospital/ambulances">
              <Button size="md" variant="outline" className="border-slate-700 text-slate-200 bg-slate-900 hover:bg-slate-800" icon={Truck}>
                Manage Fleet & Dispatch ({availableAmbulances.length} Available)
              </Button>
            </Link>
            <Button size="md" variant="ghost" className="text-slate-300" onClick={fetchData} icon={RefreshCw}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Fleet Availability Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Unverified Citizen Reports"
          value={unverifiedReports.length}
          label="Requires hospital verification"
          icon={Clock}
          color="amber"
          emptyMessage="No unverified reports"
        />
        <StatCard
          title="Available Vehicles"
          value={availableAmbulances.length}
          label="Ready for immediate dispatch"
          icon={Truck}
          color="teal"
        />
        <StatCard
          title="Active Dispatches"
          value={assignedAmbulances.length}
          label="En route or assigned"
          icon={Radio}
          color="emerald"
        />
        <StatCard
          title="Maintenance / Busy"
          value={busyAmbulances.length + maintenanceAmbulances.length}
          label="Unavailable for new dispatch"
          icon={AlertCircle}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unverified Incoming Reports */}
        <Card title="Incoming Citizen Reports (Awaiting Verification)" className="lg:col-span-2">
          {loading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading incoming reports...</p>
          ) : unverifiedReports.length === 0 ? (
            <div className="py-12 text-center text-slate-500 italic text-sm">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              No incoming unverified reports.
              <p className="text-xs text-slate-400 not-italic mt-1">All incoming reports have been verified or processed.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {unverifiedReports.slice(0, 5).map((r) => (
                <div key={r.uuid} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{r.incident_type?.replace(/_/g, ' ')}</span>
                      <Badge variant="warning">
                        CITIZEN REPORT — UNVERIFIED
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-1">{r.description}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Affected: {r.affected_people_count || 1} people • {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/hospital/reports/${r.uuid}`}>
                      <Button size="sm" variant="primary" icon={CheckSquare}>
                        Review & Verify
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Dispatch Panel */}
        <Card title="Ambulance Fleet Status">
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-700">Available Vehicles:</span>
                <span className="font-mono text-teal-600 font-extrabold text-sm">{availableAmbulances.length}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 text-[11px]">
                <span>Assigned / En Route:</span>
                <span className="font-mono font-bold">{assignedAmbulances.length}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 text-[11px]">
                <span>Maintenance:</span>
                <span className="font-mono font-bold">{maintenanceAmbulances.length}</span>
              </div>
            </div>

            <div className="pt-2">
              <Link to="/hospital/ambulances">
                <Button size="sm" variant="outline" className="w-full" icon={Truck}>
                  View All Vehicles & Dispatch
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
