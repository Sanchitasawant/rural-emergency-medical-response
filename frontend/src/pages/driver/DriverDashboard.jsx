import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { driverService } from '../../services/driverService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Truck,
  MapPin,
  CheckCircle,
  Navigation,
  Clock,
  Building2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';

export function DriverDashboard() {
  const { currentUser } = useAuth();
  const { isOnline } = useSync();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const data = await driverService.getMyAssignments();
      setAssignments(data);
    } catch (err) {
      console.error('Failed to load active driver assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [isOnline]);

  // Active assignment is the first non-completed, non-cancelled assignment
  const activeAssignment = assignments.find(
    (a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED'
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Driver & Paramedic Emergency Response Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, <span className="font-bold text-slate-800">{currentUser?.full_name || 'Driver / Paramedic'}</span>. Manage assigned emergency calls and update response status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200">
              <Wifi className="w-3.5 h-3.5" /> Online Network
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-amber-200">
              <WifiOff className="w-3.5 h-3.5" /> Saved Offline — Pending Sync
            </span>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={fetchAssignments}
            disabled={loading}
            icon={RefreshCw}
            className={loading ? 'animate-spin' : ''}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Emergency Case Main Card */}
        <Card title="Current Emergency Response Assignment" className="lg:col-span-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600" />
              <p>Loading current assignment data...</p>
            </div>
          ) : activeAssignment ? (
            <div className="space-y-5">
              {/* Highlighted Assignment Banner */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-mono text-teal-400 font-bold">
                    Assignment #{activeAssignment.uuid?.substring(0, 8)}
                  </span>
                  <Badge variant={activeAssignment.status === 'COMPLETED' ? 'success' : 'info'} size="md">
                    {activeAssignment.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white">
                    {activeAssignment.emergency_case?.incident_type?.replace(/_/g, ' ') || 'Emergency Dispatch'}
                  </h3>
                  <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    {activeAssignment.emergency_case?.location_address || 'Location provided by hospital staff'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-400 block font-semibold">Vehicle</span>
                    <span className="font-bold text-white font-mono">{activeAssignment.ambulance?.vehicle_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Destination</span>
                    <span className="font-bold text-teal-300">{activeAssignment.ambulance?.hospital_name || 'Central Hospital'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Assigned At</span>
                    <span className="font-mono text-slate-300">
                      {activeAssignment.assigned_at ? new Date(activeAssignment.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button to Open Full Control Hub */}
              <div className="pt-2">
                <Link to={`/driver/assignment/${activeAssignment.uuid}`}>
                  <Button variant="primary" size="lg" icon={ArrowRight} className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold">
                    Open Response Control Hub
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <Truck className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">No active emergency assignment</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You currently have no pending or active ambulance response orders. When Hospital Staff dispatches a unit, it will appear here immediately.
              </p>
            </div>
          )}
        </Card>

        {/* Driver Unit Overview Card */}
        <Card title="Unit & Driver Info">
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <span className="text-slate-400 font-semibold block text-[11px]">REGISTERED PARAMEDIC</span>
              <p className="font-bold text-slate-900 text-sm">{currentUser?.full_name || 'Authorized Driver'}</p>
              <p className="text-slate-500 font-mono">{currentUser?.email}</p>
            </div>

            <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-100 space-y-1">
              <span className="text-teal-800 font-bold block text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Operational Scoping:
              </span>
              <ul className="text-teal-900 space-y-1 pl-4 list-disc text-[11px]">
                <li>Driver cannot self-assign emergency calls.</li>
                <li>Driver cannot modify AI risk scores or verify citizen reports.</li>
                <li>Updates response stage in real-time.</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* History of Past Assignments */}
      {assignments.length > 0 && (
        <Card title="Assignment History">
          <div className="divide-y divide-slate-100">
            {assignments.map((item) => (
              <div key={item.uuid} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs font-mono">
                      #{item.uuid.substring(0, 8)}
                    </span>
                    <Badge variant={item.status === 'COMPLETED' ? 'success' : 'info'} size="sm">
                      {item.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    {item.emergency_case?.incident_type?.replace(/_/g, ' ')} • {item.ambulance?.vehicle_number}
                  </p>
                </div>
                <Link to={`/driver/assignment/${item.uuid}`}>
                  <Button variant="ghost" size="sm" icon={ArrowRight}>
                    View
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
