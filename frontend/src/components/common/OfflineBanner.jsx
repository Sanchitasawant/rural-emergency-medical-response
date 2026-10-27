import React from 'react';
import { useSync } from '../../context/SyncContext';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Badge } from './Badge';

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, triggerSync } = useSync();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`w-full py-2 px-4 text-xs font-semibold flex items-center justify-between shadow-xs ${
        !isOnline
          ? 'bg-slate-900 text-amber-300 border-b border-slate-700'
          : 'bg-amber-500 text-slate-950 border-b border-amber-600'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>OFFLINE MODE: Local triage & reports saved locally in IndexedDB</span>
          </>
        ) : (
          <>
            <RefreshCw className={`w-4 h-4 text-slate-900 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>ONLINE: {pendingCount} offline records pending database synchronization</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!isOnline ? (
          <Badge variant="offline">Offline Storage Ready</Badge>
        ) : (
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="px-2.5 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded font-medium transition-colors disabled:opacity-50"
          >
            {isSyncing ? 'Synchronizing...' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  );
}
