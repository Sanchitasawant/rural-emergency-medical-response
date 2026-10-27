import React from 'react';

export function Badge({ children, variant = 'info', size = 'sm', className = '' }) {
  const variants = {
    critical: 'bg-red-100 text-red-800 border-red-200 font-bold animate-pulse-red',
    high: 'bg-orange-100 text-orange-800 border-orange-200 font-semibold',
    medium: 'bg-amber-100 text-amber-800 border-amber-200 font-medium',
    low: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-medium',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    synced: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    pending: 'bg-amber-100 text-amber-900 border-amber-300',
    offline: 'bg-slate-200 text-slate-800 border-slate-300',
  };

  const sizes = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${variants[variant] || variants.info} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
