import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminNav } from './AdminNav';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Toast } from '../../components/common/Toast';
import { History, Search, Filter, RefreshCw, User, Shield, Clock } from 'lucide-react';

export function AdminActivity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [toast, setToast] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getActivityLogs({ search, role: roleFilter });
      setLogs(data);
    } catch (err) {
      showToast('Failed to fetch system audit logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, roleFilter]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            System Audit Trail & Activity Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of user actions, authorization events, emergency report changes, and system configuration updates.
          </p>
        </div>

        <Button size="sm" variant="ghost" onClick={fetchLogs} disabled={loading} icon={RefreshCw} className={loading ? 'animate-spin' : ''}>
          Refresh Logs
        </Button>
      </div>

      <AdminNav />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit logs by user email, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Filter by Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Roles</option>
            <option value="CITIZEN">Citizen</option>
            <option value="EMERGENCY_WORKER">Emergency Worker</option>
            <option value="HOSPITAL_STAFF">Hospital Staff</option>
            <option value="DRIVER_PARAMEDIC">Driver / Paramedic</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card title={`Audit Activity Log Stream (${logs.length})`}>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading audit history...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">No audit logs recorded for this query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action Executed</th>
                  <th className="py-3 px-4">Entity Type / ID</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((l) => (
                  <tr key={l.uuid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {l.user_email || 'System'}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <Badge variant={l.role === 'ADMIN' ? 'critical' : 'info'} size="sm">
                        {l.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-teal-700">
                      {l.action}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {l.entity_type} {l.entity_id ? `(#${l.entity_id.substring(0, 8)})` : ''}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-xs">
                      {l.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
