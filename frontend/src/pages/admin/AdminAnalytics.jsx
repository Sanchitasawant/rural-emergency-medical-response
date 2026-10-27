import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminNav } from './AdminNav';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { BarChart3, RefreshCw, Clock, AlertCircle } from 'lucide-react';

const COLORS = ['#0d9488', '#2563eb', '#f59e0b', '#dc2626', '#8b5cf6', '#10b981', '#64748b'];

export function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAnalyticsData();
      setData(res);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const reportsByDay = data?.reports_by_day || [];
  const incidentTypes = data?.incident_types || [];
  const caseStatuses = data?.case_statuses || [];
  const ambulanceStatuses = data?.ambulance_statuses || [];
  const stageTiming = data?.stage_timing || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            System Analytics & Workflow Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real database analytics of incident trends, emergency response bottlenecks, and fleet utilization.
          </p>
        </div>

        <Button size="sm" variant="ghost" onClick={fetchAnalytics} disabled={loading} icon={RefreshCw} className={loading ? 'animate-spin' : ''}>
          Refresh Analytics
        </Button>
      </div>

      <AdminNav />

      {loading ? (
        <div className="py-16 text-center space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Calculating real database analytics...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart Row 1: Reports per day & Incident Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Line Chart: Emergency Reports Over Time */}
            <Card title="Emergency Reports Volume (Daily Trend)">
              {reportsByDay.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">No report history recorded yet.</div>
              ) : (
                <div className="h-64 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportsByDay}>
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                      <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} />
                      <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, fill: '#0d9488' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Bar Chart: Incident Types */}
            <Card title="Incident Types Distribution">
              {incidentTypes.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">No incident data available.</div>
              ) : (
                <div className="h-64 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incidentTypes}>
                      <XAxis dataKey="type" stroke="#94a3b8" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                      <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} />
                      <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          {/* Chart Row 2: Status Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart: Case Status Distribution */}
            <Card title="Operational Case Status Breakdown">
              {caseStatuses.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">No case status data available.</div>
              ) : (
                <div className="h-64 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={caseStatuses} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                        {caseStatuses.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Bar Chart: Ambulance Fleet Status */}
            <Card title="Ambulance Fleet Status Distribution">
              {ambulanceStatuses.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">No ambulance fleet data available.</div>
              ) : (
                <div className="h-64 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ambulanceStatuses}>
                      <XAxis dataKey="status" stroke="#94a3b8" fontSize={10} />
                      <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} />
                      <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          {/* Workflow Stage Timing Performance Metrics */}
          <Card title="Average Response Stage Transition Time (Minutes)">
            {!stageTiming.sufficient_data ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="text-xs font-bold text-slate-700">No sufficient data for this metric</h3>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Calculating stage transition durations requires at least two fully completed response workflows with verified timestamps.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3 bg-slate-900 text-white rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Dispatch → Accept</span>
                  <span className="text-lg font-black text-teal-400 font-mono mt-1 block">
                    {stageTiming.dispatch_to_accept_min} m
                  </span>
                </div>
                <div className="p-3 bg-slate-900 text-white rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Accept → Start</span>
                  <span className="text-lg font-black text-blue-400 font-mono mt-1 block">
                    {stageTiming.accept_to_start_min} m
                  </span>
                </div>
                <div className="p-3 bg-slate-900 text-white rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Start → Arrive</span>
                  <span className="text-lg font-black text-indigo-400 font-mono mt-1 block">
                    {stageTiming.start_to_arrive_min} m
                  </span>
                </div>
                <div className="p-3 bg-slate-900 text-white rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Arrive → Pickup</span>
                  <span className="text-lg font-black text-amber-400 font-mono mt-1 block">
                    {stageTiming.arrive_to_pickup_min} m
                  </span>
                </div>
                <div className="p-3 bg-slate-900 text-white rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Pickup → Hospital</span>
                  <span className="text-lg font-black text-emerald-400 font-mono mt-1 block">
                    {stageTiming.pickup_to_hospital_min} m
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
