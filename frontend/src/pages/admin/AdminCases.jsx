import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminNav } from './AdminNav';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Toast } from '../../components/common/Toast';
import { FileText, Filter, RefreshCw, AlertCircle, Building2, UserCheck, Clock } from 'lucide-react';

export function AdminCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await adminService.getCases({ status: statusFilter });
      setCases(data);
    } catch (err) {
      showToast('Failed to fetch emergency case records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Emergency Cases Oversight
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete audit record of incoming emergency calls, staff verification, triage levels, and case resolutions.
          </p>
        </div>

        <Button size="sm" variant="ghost" onClick={fetchCases} disabled={loading} icon={RefreshCw} className={loading ? 'animate-spin' : ''}>
          Refresh
        </Button>
      </div>

      <AdminNav />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Filter by Case Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Cases Directory Table */}
      <Card title={`Emergency Cases Audit Log (${cases.length})`}>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading case records...</div>
        ) : cases.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">No emergency cases found matching query filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                  <th className="py-3 px-4">Case ID</th>
                  <th className="py-3 px-4">Incident Type</th>
                  <th className="py-3 px-4">Priority Level</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Hospital Facility</th>
                  <th className="py-3 px-4">Verified By</th>
                  <th className="py-3 px-4">Logged Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => (
                  <tr key={c.uuid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-900 text-xs">
                      #{c.uuid.substring(0, 8)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {c.incident_type?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={c.priority === 'CRITICAL' ? 'critical' : c.priority === 'HIGH' ? 'warning' : 'info'}>
                        {c.priority} PRIORITY
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={c.case_status === 'COMPLETED' ? 'success' : c.case_status === 'REJECTED' ? 'critical' : 'info'}>
                        {c.case_status?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {c.hospital_name || 'Central Hospital'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">
                      {c.verified_by || 'Staff Dispatcher'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(c.created_at).toLocaleString()}
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
