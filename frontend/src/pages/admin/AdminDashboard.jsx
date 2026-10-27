import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminNav } from './AdminNav';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  Users,
  Building2,
  Truck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Activity,
  RefreshCw,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await adminService.getDashboardMetrics();
      setData(res);
    } catch (e) {
      console.error('Failed to load admin dashboard metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const metrics = data?.metrics || {};
  const recentCases = data?.recent_cases || [];
  const recentLogs = data?.recent_logs || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            System Administration & Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time oversight of system metrics, staff users, hospital network, and active emergency operations.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchMetrics}
          disabled={loading}
          icon={RefreshCw}
          className={loading ? 'animate-spin' : ''}
        >
          Refresh Data
        </Button>
      </div>

      {/* Navigation Tab Bar */}
      <AdminNav />

      {/* Primary Metrics Grid (Derived strictly from database) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-slate-900 text-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Users</p>
              <p className="text-2xl font-black text-teal-400 mt-0.5">{loading ? '...' : (metrics.total_users ?? 0)}</p>
            </div>
            <Users className="w-5 h-5 text-slate-700" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Active: {metrics.active_users ?? 0}</p>
        </Card>

        <Card className="bg-slate-900 text-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reports</p>
              <p className="text-2xl font-black text-amber-400 mt-0.5">{loading ? '...' : (metrics.total_reports ?? 0)}</p>
            </div>
            <FileText className="w-5 h-5 text-slate-700" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Unverified: {metrics.unverified_reports ?? 0}</p>
        </Card>

        <Card className="bg-slate-900 text-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Cases</p>
              <p className="text-2xl font-black text-blue-400 mt-0.5">{loading ? '...' : (metrics.active_cases ?? 0)}</p>
            </div>
            <Activity className="w-5 h-5 text-slate-700" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Completed: {metrics.completed_cases ?? 0}</p>
        </Card>

        <Card className="bg-slate-900 text-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ambulances</p>
              <p className="text-2xl font-black text-emerald-400 mt-0.5">{loading ? '...' : (metrics.available_ambulances ?? 0)}</p>
            </div>
            <Truck className="w-5 h-5 text-slate-700" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Assigned: {metrics.assigned_ambulances ?? 0}</p>
        </Card>

        <Card className="bg-slate-900 text-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hospitals</p>
              <p className="text-2xl font-black text-purple-400 mt-0.5">{loading ? '...' : (metrics.registered_hospitals ?? 0)}</p>
            </div>
            <Building2 className="w-5 h-5 text-slate-700" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Network Enabled</p>
        </Card>

        <Card className="bg-slate-900 text-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Drivers</p>
              <p className="text-2xl font-black text-indigo-400 mt-0.5">{loading ? '...' : (metrics.active_drivers ?? 0)}</p>
            </div>
            <UserCheck className="w-5 h-5 text-slate-700" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Paramedic Staff</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases Table */}
        <Card title="Recent Emergency Cases" className="lg:col-span-2">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading cases...</div>
          ) : recentCases.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 italic">No emergency cases recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentCases.map((c) => (
                <div key={c.uuid} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">#{c.uuid.substring(0, 8)}</span>
                      <Badge variant={c.status === 'COMPLETED' ? 'success' : 'info'} size="sm">
                        {c.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-slate-600 mt-0.5">{c.incident_type?.replace(/_/g, ' ')} • Hospital: {c.hospital_name || 'Unassigned'}</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* System Activity Stream */}
        <Card title="System Activity Log">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading activity...</div>
          ) : recentLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 italic">No recent system activity.</div>
          ) : (
            <div className="space-y-3 text-xs">
              {recentLogs.map((l) => (
                <div key={l.uuid} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{l.action}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    User: <strong className="text-slate-700">{l.user_email || 'System'}</strong> ({l.role})
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
