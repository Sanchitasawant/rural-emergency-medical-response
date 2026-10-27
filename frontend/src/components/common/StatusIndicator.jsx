import React from 'react';
import { useSync } from '../../context/SyncContext';
import { RefreshCw, AlertTriangle, AlertCircle } from 'lucide-react';

export function StatusIndicator({ showPending = true, className = '' }) {
  const { connState, queueCounts, isSyncing, openDrawer } = useSync();

  const isReachable = connState === 'ONLINE_REACHABLE';
  const isUnreachable = connState === 'ONLINE_UNREACHABLE';

  return (
    <button
      onClick={openDrawer}
      type="button"
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-colors cursor-pointer ${className}`}
      title="Click to open Synchronization Hub"
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isReachable
            ? 'bg-emerald-500 animate-pulse'
            : isUnreachable
            ? 'bg-amber-400'
            : 'bg-slate-400'
        }`}
      />

      <span className={isReachable ? 'text-slate-200' : isUnreachable ? 'text-amber-300' : 'text-slate-400'}>
        {isSyncing
          ? 'Syncing...'
          : isReachable
          ? 'Online'
          : isUnreachable
          ? 'Server Unreachable'
          : 'Offline Mode'}
      </span>

      {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-teal-400" />}

      {showPending && queueCounts.pending > 0 && (
        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
          {queueCounts.pending} Pending
        </span>
      )}

      {showPending && queueCounts.failed > 0 && (
        <span className="px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300 text-[10px] font-mono font-bold flex items-center gap-0.5">
          <AlertCircle className="w-3 h-3 text-red-400" /> {queueCounts.failed} Failed
        </span>
      )}

      {showPending && queueCounts.conflict > 0 && (
        <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold flex items-center gap-0.5">
          <AlertTriangle className="w-3 h-3 text-purple-400" /> {queueCounts.conflict} Conflict
        </span>
      )}
    </button>
  );
}
