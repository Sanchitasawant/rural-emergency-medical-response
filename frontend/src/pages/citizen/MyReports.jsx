import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { db } from '../../offline/db';
import axios from 'axios';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ShieldAlert, PlusCircle, ArrowRight, AlertCircle, RefreshCw, Filter, Calendar, Users, MapPin, Search } from 'lucide-react';

export function MyReports() {
  const { currentUser } = useAuth();
  const { isOnline } = useSync();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    let onlineList = [];
    let offlineList = [];

    // 1. Online API fetch
    if (isOnline) {
      try {
        const res = await axios.get('/api/emergency/reports/');
        onlineList = res.data.results || res.data || [];
      } catch (e) {
        console.log('Online report list fetch error / fallback');
      }
    }

    // 2. Offline IndexedDB fetch
    try {
      offlineList = await db.emergency_reports.orderBy('id').reverse().toArray();
    } catch (e) {
      console.error(e);
    }

    // Combine & deduplicate by client_uuid
    const combinedMap = new Map();
    // First insert local IndexedDB items (mark as local-only unless synced)
    offlineList.forEach(r => {
      combinedMap.set(r.client_uuid, { ...r, isLocalOnly: true });
    });
    // Override with backend synced data
    onlineList.forEach(r => {
      combinedMap.set(r.client_uuid || r.uuid, {
        ...r,
        isLocalOnly: false,
        sync_status: 'SYNCED'
      });
    });

    const combinedList = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at || b.client_timestamp) - new Date(a.created_at || a.client_timestamp)
    );

    setReports(combinedList);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [isOnline]);

  const filteredReports = reports.filter(report => {
    const matchesStatus = filterStatus === 'ALL' || report.status === filterStatus;
    const searchLower = searchQuery.toLowerCase();
    const typeStr = (report.incident_type || '').toLowerCase().replace(/_/g, ' ');
    const descStr = (report.description || '').toLowerCase();
    const matchesSearch = !searchQuery || typeStr.includes(searchLower) || descStr.includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Emergency Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track and inspect your reported emergency incidents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchReports}
            disabled={loading}
            icon={RefreshCw}
            className={loading ? 'animate-spin' : ''}
          >
            Refresh
          </Button>
          <Link to="/citizen/report-emergency">
            <Button size="md" variant="danger" icon={ShieldAlert}>
              REPORT EMERGENCY
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
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
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Status:
          </span>
          {['ALL', 'UNVERIFIED', 'VERIFIED', 'COMPLETED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterStatus === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <Card>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600" />
            <p>Loading your emergency reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No emergency reports found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || filterStatus !== 'ALL'
                ? 'No reports match your search criteria. Try clearing filters.'
                : 'You have not submitted any emergency reports yet.'}
            </p>
            {!(searchQuery || filterStatus !== 'ALL') && (
              <div className="pt-2">
                <Link to="/citizen/report-emergency">
                  <Button variant="danger" size="sm" icon={ShieldAlert}>
                    Submit First Report
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="py-3 px-4">Report ID</th>
                    <th className="py-3 px-4">Incident Type</th>
                    <th className="py-3 px-4">Affected</th>
                    <th className="py-3 px-4">Submitted Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Sync State</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredReports.map((r) => {
                    const displayUuid = r.uuid || r.client_uuid || `REP-${r.id}`;
                    const createdDate = new Date(r.created_at || r.client_timestamp || Date.now()).toLocaleString();
                    return (
                      <tr key={r.client_uuid || r.uuid} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-[11px]">
                          {displayUuid.substring(0, 8)}...
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {r.incident_type ? r.incident_type.replace(/_/g, ' ') : 'Medical Incident'}
                          {r.incident_type === 'OTHER' && r.other_incident_description && (
                            <span className="block text-[11px] font-normal text-slate-500 italic truncate max-w-xs">
                              "{r.other_incident_description}"
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {r.affected_people_count || r.affected_count || 1}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {createdDate}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={r.status === 'VERIFIED' ? 'critical' : r.status === 'COMPLETED' ? 'success' : 'info'}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={r.sync_status === 'SYNCED' ? 'synced' : 'pending'}>
                            {r.sync_status === 'SYNCED' ? 'Synced' : 'Saved Offline'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link to={`/citizen/reports/${r.uuid || r.client_uuid}`}>
                            <Button size="sm" variant="ghost" icon={ArrowRight}>
                              View Details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Layout */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filteredReports.map((r) => {
                const displayUuid = r.uuid || r.client_uuid || `REP-${r.id}`;
                const createdDate = new Date(r.created_at || r.client_timestamp || Date.now()).toLocaleString();
                return (
                  <div
                    key={r.client_uuid || r.uuid}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                          ID: {displayUuid.substring(0, 13)}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">
                          {r.incident_type ? r.incident_type.replace(/_/g, ' ') : 'Medical Incident'}
                        </h4>
                      </div>
                      <Badge variant={r.status === 'VERIFIED' ? 'critical' : r.status === 'COMPLETED' ? 'success' : 'info'}>
                        {r.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {r.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> Affected: {r.affected_people_count || r.affected_count || 1}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {createdDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Badge variant={r.sync_status === 'SYNCED' ? 'synced' : 'pending'}>
                        {r.sync_status === 'SYNCED' ? 'Synced Backend' : 'Saved Offline'}
                      </Badge>

                      <Link to={`/citizen/reports/${r.uuid || r.client_uuid}`}>
                        <Button size="sm" variant="outline" icon={ArrowRight}>
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
