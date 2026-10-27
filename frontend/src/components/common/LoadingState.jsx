import React from 'react';

export function LoadingState({ type = 'card', count = 3 }) {
  if (type === 'table') {
    return (
      <div className="w-full space-y-3 p-4 bg-white border border-slate-200 rounded-xl animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 rounded w-full"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 bg-white border border-slate-200 rounded-xl space-y-3 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          <div className="h-8 bg-slate-200 rounded w-1/2"></div>
          <div className="h-3 bg-slate-100 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  );
}
