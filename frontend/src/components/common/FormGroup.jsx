import React from 'react';

export function FormGroup({ label, error, helpText, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-800">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] font-semibold text-red-600 mt-0.5">{error}</p>
      ) : helpText ? (
        <p className="text-[10px] text-slate-400 mt-0.5">{helpText}</p>
      ) : null}
    </div>
  );
}
