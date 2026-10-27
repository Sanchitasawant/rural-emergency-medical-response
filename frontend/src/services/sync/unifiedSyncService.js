import { db } from '../../offline/db';
import { syncLock } from './syncLock';
import { connectivityService } from './connectivityService';
import { syncProcessor } from './syncProcessor';
import { generateUUID } from '../../utils/uuid';

export const unifiedSyncService = {
  /**
   * Enqueue a new item into the unified sync_queue
   */
  async enqueueRecord(entityType, operation, payload, priority = 'NORMAL', dependencyIds = []) {
    const clientUuid = payload.client_uuid || payload.event_uuid || generateUUID();
    const timestamp = new Date().toISOString();

    const record = {
      client_uuid: clientUuid,
      entity_type: entityType,
      operation: operation,
      payload: { ...payload, client_uuid: clientUuid },
      priority: priority,
      dependency_ids: dependencyIds,
      created_at: timestamp,
      updated_at: timestamp,
      retry_count: 0,
      last_attempt_at: null,
      last_error: null,
      status: 'PENDING'
    };

    await db.sync_queue.put(record);

    // Also write to local entity table if applicable
    if (entityType === 'EMERGENCY_REPORT') {
      await db.emergency_reports.put({
        ...payload,
        client_uuid: clientUuid,
        sync_status: 'PENDING_SYNC',
        client_timestamp: timestamp
      }).catch(() => {});
    } else if (entityType === 'CLINICAL_ASSESSMENT') {
      await db.triage_assessments.put({
        ...payload,
        client_uuid: clientUuid,
        sync_status: 'PENDING_SYNC',
        client_timestamp: timestamp
      }).catch(() => {});
    } else if (entityType === 'DRIVER_RESPONSE_EVENT') {
      await db.driver_events.put({
        ...payload,
        event_uuid: clientUuid,
        sync_status: 'PENDING',
        timestamp: timestamp
      }).catch(() => {});
    }

    return record;
  },

  /**
   * Execute multi-tab locked synchronization
   */
  async triggerSync() {
    const connState = await connectivityService.checkConnectivity();
    if (connState !== 'ONLINE_REACHABLE') {
      return { success: false, state: connState, reason: 'Backend unreachable or offline' };
    }

    return await syncLock.acquireAndExecute(async () => {
      return await syncProcessor.processBatchQueue();
    });
  },

  /**
   * Retry all FAILED records
   */
  async retryFailed() {
    await db.sync_queue.where('status').equals('FAILED').modify({ status: 'PENDING', retry_count: 0 });
    return await this.triggerSync();
  },

  /**
   * Resolve conflict record
   */
  async resolveConflict(clientUuid, resolutionStrategy) {
    const record = await db.sync_queue.where('client_uuid').equals(clientUuid).first();
    if (!record) return;

    if (resolutionStrategy === 'USE_SERVER') {
      await db.sync_queue.where('client_uuid').equals(clientUuid).modify({ status: 'SYNCED' });
    } else if (resolutionStrategy === 'FORCE_LOCAL') {
      await db.sync_queue.where('client_uuid').equals(clientUuid).modify({ status: 'PENDING', retry_count: 0 });
      await this.triggerSync();
    }
  },

  /**
   * Get queue counts
   */
  async getQueueCounts() {
    const pending = await db.sync_queue.where('status').equals('PENDING').count();
    const syncing = await db.sync_queue.where('status').equals('SYNCING').count();
    const synced = await db.sync_queue.where('status').equals('SYNCED').count();
    const failed = await db.sync_queue.where('status').equals('FAILED').count();
    const conflict = await db.sync_queue.where('status').equals('CONFLICT').count();

    return {
      pending,
      syncing,
      synced,
      failed,
      conflict,
      totalPending: pending + syncing + failed + conflict
    };
  }
};
