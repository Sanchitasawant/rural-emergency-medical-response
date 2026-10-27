import { db } from '../../offline/db';

export const syncLock = {
  /**
   * Acquire multi-tab lock and execute callback cleanly
   */
  async acquireAndExecute(callback) {
    if ('locks' in navigator) {
      return await navigator.locks.request('ruralcare_sync_lock', { ifAvailable: true }, async (lock) => {
        if (!lock) {
          console.log('[SyncLock] Web lock unavailable — another tab is synchronizing.');
          return { success: false, reason: 'LOCKED_BY_OTHER_TAB' };
        }
        try {
          return await callback();
        } finally {
          // Lock released automatically by Web Locks API when callback completes
        }
      });
    }

    // Fallback IndexedDB timestamp lease lock
    const now = Date.now();
    const leaseTimeMs = 10000; // 10 seconds lease

    try {
      const lockRecord = await db.sync_logs.where('status').equals('ACTIVE_LOCK').first();
      if (lockRecord && (now - lockRecord.timestamp_ms < leaseTimeMs)) {
        console.log('[SyncLock] IndexedDB lock active — another tab is synchronizing.');
        return { success: false, reason: 'LOCKED_BY_OTHER_TAB' };
      }

      // Claim lock
      const lockId = await db.sync_logs.add({
        timestamp: new Date().toISOString(),
        timestamp_ms: now,
        status: 'ACTIVE_LOCK',
        details: 'Acquired multi-tab sync lock'
      });

      try {
        return await callback();
      } finally {
        // Release lock in finally block
        await db.sync_logs.delete(lockId).catch(() => {});
      }
    } catch (err) {
      console.warn('[SyncLock] Fallback lock error:', err);
      // Run callback safely if lock check fails
      return await callback();
    }
  }
};
