import React, { createContext, useContext, useState, useEffect } from 'react';
import { connectivityService } from '../services/sync/connectivityService';
import { unifiedSyncService } from '../services/sync/unifiedSyncService';

const SyncContext = createContext();

export function SyncProvider({ children }) {
  const [connState, setConnState] = useState('ONLINE_REACHABLE');
  const [queueCounts, setQueueCounts] = useState({ pending: 0, syncing: 0, synced: 0, failed: 0, conflict: 0, totalPending: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const checkConnectivity = async () => {
    const state = await connectivityService.checkConnectivity();
    setConnState(state);
    return state;
  };

  const refreshCounts = async () => {
    try {
      const counts = await unifiedSyncService.getQueueCounts();
      setQueueCounts(counts);
    } catch (e) {
      console.warn('Error refreshing queue counts:', e);
    }
  };

  // Poll connectivity & queue counts every 5 seconds
  useEffect(() => {
    checkConnectivity();
    refreshCounts();

    const interval = setInterval(async () => {
      await checkConnectivity();
      await refreshCounts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Auto sync when state transitions to ONLINE_REACHABLE and pending items exist
  useEffect(() => {
    if (connState === 'ONLINE_REACHABLE' && queueCounts.totalPending > 0 && !isSyncing) {
      triggerSync();
    }
  }, [connState, queueCounts.totalPending]);

  const triggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    let result;
    try {
      result = await unifiedSyncService.triggerSync();
      setLastSyncResult(result);
    } catch (err) {
      console.error('Trigger sync error:', err);
      result = { success: false, error: err.message };
    } finally {
      await refreshCounts();
      setIsSyncing(false);
    }
    return result;
  };

  const retryFailed = async () => {
    setIsSyncing(true);
    try {
      await unifiedSyncService.retryFailed();
    } finally {
      await refreshCounts();
      setIsSyncing(false);
    }
  };

  const resolveConflict = async (clientUuid, strategy) => {
    await unifiedSyncService.resolveConflict(clientUuid, strategy);
    await refreshCounts();
  };

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <SyncContext.Provider
      value={{
        connState,
        isOnline: connState === 'ONLINE_REACHABLE',
        queueCounts,
        pendingCount: queueCounts.totalPending,
        isSyncing,
        isDrawerOpen,
        lastSyncResult,
        triggerSync,
        retryFailed,
        resolveConflict,
        refreshCounts,
        openDrawer,
        closeDrawer
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => useContext(SyncContext);
