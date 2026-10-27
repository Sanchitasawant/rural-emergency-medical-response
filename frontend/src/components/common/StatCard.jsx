import React from 'react';
import { Card } from './Card';

export function StatCard({ title, value, label, icon: Icon, trend, color = 'teal', emptyMessage }) {
  const colorMap = {
    teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    blue: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <Card className="bg-slate-900 text-white border-slate-800 hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          {value !== undefined && value !== null ? (
            <p className="text-3xl font-black text-white mt-1.5">{value}</p>
          ) : (
            <p className="text-sm font-semibold text-slate-400 italic mt-2">{emptyMessage || 'No data available'}</p>
          )}
          {label && <p className="text-xs text-slate-400 mt-1">{label}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border ${colorMap[color] || colorMap.teal}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1">
          <span>{trend}</span>
        </div>
      )}
    </Card>
  );
}
