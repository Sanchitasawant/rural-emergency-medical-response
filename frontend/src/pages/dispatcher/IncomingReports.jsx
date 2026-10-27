import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import axios from 'axios';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Building2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  RefreshCw,
  ArrowRight,
  Users,
  MapPin,
  Calendar
} from 'lucide-react';

export function IncomingReports() {
  const { isOnline } = useSync();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('UNVERIFIED');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    let list = [];
    if (isOnline) {
      try {
        const res = await axios.get('/api/hospital/reports/');
        list = res.data.results || res.data || [];
      } catch (e) {
        console.log('Online report fetch error');
      }
    }
    setReports(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [isOnline]);

  const filteredReports = reports.filter(r => {
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const searchLower = searchQuery.toLowerCase();
    const typeStr = (r.incident_type || '').toLowerCase().replace(/_/g, ' ');
    const descStr = (r.description || '').toLowerCase();
    const matchesSearch = !searchQuery || typeStr.includes(searchLower) || descStr.includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Incoming Emergency Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review and verify citizen reported emergency incidents.
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
        </div>
      </div>

      {/* Filters & Search */}
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
          {['UNVERIFIED', 'VERIFIED', 'REJECTED', 'ALL'].map((st) => (
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

      {/* Report Cards / List */}
      <Card>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600" />
            <p>Loading incoming citizen reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No emergency reports found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No reports match your active filter criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReports.map((r) => {
              const displayUuid = r.uuid || `REP-${r.id}`;
              const createdDate = new Date(r.created_at).toLocaleString();
              const isUnverified = r.status === 'UNVERIFIED';

              return (
                <div key={r.uuid} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 p-3 rounded-2xl transition-colors">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {r.incident_type ? r.incident_type.replace(/_/g, ' ') : 'Emergency Incident'}
                      </span>
                      <Badge variant={isUnverified ? 'warning' : r.status === 'VERIFIED' ? 'success' : 'critical'}>
                        {isUnverified ? 'CITIZEN REPORT — UNVERIFIED' : r.status}
                      </Badge>
                      <Badge variant={r.priority === 'CRITICAL' ? 'critical' : r.priority === 'HIGH' ? 'warning' : 'info'}>
                        Priority: {r.priority || 'PENDING'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">{r.description}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> Affected: {r.affected_people_count || 1}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {r.latitude && r.longitude ? `${parseFloat(r.latitude).toFixed(4)}, ${parseFloat(r.longitude).toFixed(4)}` : 'Manual Location'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {createdDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/hospital/reports/${r.uuid}`}>
                      <Button size="sm" variant={isUnverified ? 'primary' : 'outline'} icon={ArrowRight}>
                        {isUnverified ? 'Review & Verify' : 'View Details'}
                      </Button>
                    </Link>
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
