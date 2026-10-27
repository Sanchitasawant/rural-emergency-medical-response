import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminNav } from './AdminNav';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Cpu, ShieldCheck, RefreshCw, AlertCircle, Database, GitBranch } from 'lucide-react';

export function AdminModels() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchModelInfo = async () => {
    setLoading(true);
    try {
      const res = await adminService.getModelsInfo();
      setData(res);
    } catch (err) {
      console.error('Failed to load AI model metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            AI / ML Model Telemetry & Metadata
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Inspection of local ML classifiers, rule engine parameters, and operational inference count.
          </p>
        </div>

        <Button size="sm" variant="ghost" onClick={fetchModelInfo} disabled={loading} icon={RefreshCw} className={loading ? 'animate-spin' : ''}>
          Refresh
        </Button>
      </div>

      <AdminNav />

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading AI model specifications...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Primary Model Architecture Card */}
          <Card title="Clinical Triage Model Specifications" className="lg:col-span-2">
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-teal-400 font-bold text-xs">
                    {data?.version || '1.0.0'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                    Active Production Model
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">{data?.model_name}</h3>
                <p className="text-xs text-slate-300">{data?.model_type}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[10px]">TOTAL INFERENCES</span>
                  <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                    {data?.prediction_count ?? 0}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[10px]">FEATURE VECTOR COUNT</span>
                  <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                    {data?.feature_count ?? 14} Features
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[10px]">DATASET IDENTIFIER</span>
                  <span className="text-xs font-bold text-slate-800 font-mono mt-1 block">
                    {data?.dataset_identifier}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-[11px]">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Evaluation Metrics Status:
                </p>
                <p className="text-xs font-semibold">{data?.evaluation_metrics?.status}</p>
                <p className="text-[11px] text-amber-800 italic">{data?.evaluation_metrics?.note}</p>
              </div>
            </div>
          </Card>

          {/* Operational Guidance Card */}
          <Card title="Decision Support Governance">
            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="font-bold text-slate-900 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-teal-600" /> Clinical Decision Scoping
                </p>
                <p className="text-[11px]">
                  The AI model functions exclusively as a decision support recommendation engine for qualified emergency workers.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-800">Model Telemetry Rules:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>Prediction logs are immutable.</li>
                  <li>Historical predictions cannot be altered by Admin.</li>
                  <li>Operational counts track real database assessments.</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
