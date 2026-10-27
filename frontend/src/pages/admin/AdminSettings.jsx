import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminNav } from './AdminNav';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FormGroup } from '../../components/common/FormGroup';
import { Toast } from '../../components/common/Toast';
import { Settings, Sliders, ShieldAlert, History, RefreshCw, Save } from 'lucide-react';

export function AdminSettings() {
  const [settingsData, setSettingsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [ruleWeight, setRuleWeight] = useState(0.60);
  const [mlWeight, setMlWeight] = useState(0.40);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await adminService.getSettings();
      setSettingsData(res);
      if (res.fusion_weights) {
        setRuleWeight(res.fusion_weights.rule_weight);
        setMlWeight(res.fusion_weights.ml_weight);
      }
    } catch (err) {
      showToast('Failed to load system settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleRuleChange = (val) => {
    const rw = parseFloat(val) || 0;
    setRuleWeight(rw);
    setMlWeight(Math.round((1.0 - rw) * 100) / 100);
  };

  const handleMlChange = (val) => {
    const mw = parseFloat(val) || 0;
    setMlWeight(mw);
    setRuleWeight(Math.round((1.0 - mw) * 100) / 100);
  };

  const handleSaveFusionWeights = async (e) => {
    e.preventDefault();
    const sum = Math.round((ruleWeight + mlWeight) * 100) / 100;
    if (sum !== 1.0) {
      showToast(`Validation Failed: Rule Weight (${ruleWeight}) + ML Weight (${mlWeight}) = ${sum}. Sum must equal exactly 1.0.`, 'error');
      return;
    }

    setFormLoading(true);
    try {
      const res = await adminService.updateFusionWeights({
        rule_weight: ruleWeight,
        ml_weight: mlWeight
      });
      showToast(res.message || 'Fusion weights updated and logged in audit history.', 'success');
      fetchSettings();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update fusion weights.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const currentSum = Math.round((ruleWeight + mlWeight) * 100) / 100;
  const isValidSum = currentSum === 1.0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            System Configuration & AI Governance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage operational parameters, hybrid decision weights, and view configuration audit logs.
          </p>
        </div>

        <Button size="sm" variant="ghost" onClick={fetchSettings} disabled={loading} icon={RefreshCw} className={loading ? 'animate-spin' : ''}>
          Refresh
        </Button>
      </div>

      <AdminNav />

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading configuration parameters...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fusion Weights Configuration Form */}
          <Card title="Hybrid AI Fusion Weight Management" className="lg:col-span-2">
            <form onSubmit={handleSaveFusionWeights} className="space-y-4 text-xs">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-[11px]">
                  <ShieldAlert className="w-4 h-4 text-amber-600" /> Mandatory Audit Governance:
                </p>
                <p className="text-xs">
                  Modifying fusion weights directly influences the clinical decision support fusion formula. Every change is recorded in the immutable configuration audit history with your user ID and timestamp.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <FormGroup label="Rule Engine Weight (0.00 – 1.00)">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={ruleWeight}
                    onChange={(e) => handleRuleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-teal-500 bg-slate-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Weight assigned to deterministic clinical triage rules.</p>
                </FormGroup>

                <FormGroup label="ML Classifier Weight (0.00 – 1.00)">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={mlWeight}
                    onChange={(e) => handleMlChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-teal-500 bg-slate-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Weight assigned to Random Forest risk prediction scorer.</p>
                </FormGroup>
              </div>

              {/* Live Weight Validation Indicator */}
              <div className={`p-3 rounded-xl border flex items-center justify-between font-bold text-xs ${isValidSum ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
                <span>Rule ({ruleWeight.toFixed(2)}) + ML ({mlWeight.toFixed(2)}) = {currentSum.toFixed(2)}</span>
                <span>{isValidSum ? 'Valid (Equals 1.0)' : 'Invalid (Must sum to 1.0)'}</span>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="primary" size="md" type="submit" disabled={formLoading || !isValidSum} icon={Save}>
                  Save Fusion Weights & Log Audit
                </Button>
              </div>
            </form>
          </Card>

          {/* Fusion Audit History Stream */}
          <Card title="Configuration Audit History">
            <div className="space-y-3 text-xs">
              {(!settingsData?.audit_history || settingsData.audit_history.length === 0) ? (
                <div className="py-8 text-center text-slate-400 italic">No configuration changes logged yet.</div>
              ) : (
                <div className="space-y-2">
                  {settingsData.audit_history.map((h) => (
                    <div key={h.uuid} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-slate-700 font-bold">
                        <span>{h.new_value}</span>
                        <span className="font-mono text-slate-400 text-[10px]">
                          {new Date(h.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-500">
                        Previous: <span className="font-mono">{h.old_value || 'Initial'}</span>
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        Changed by: <strong className="text-slate-700">{h.changed_by}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
