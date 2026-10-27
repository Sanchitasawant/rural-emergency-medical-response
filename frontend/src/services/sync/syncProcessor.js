import axios from 'axios';
import { db } from '../../offline/db';

export const syncProcessor = {
  /**
   * Package, sort, and process batches of offline records
   */
  async processBatchQueue() {
    // 1. Gather all queued records from sync_queue
    const queuedItems = await db.sync_queue
      .where('status')
      .anyOf(['PENDING', 'FAILED', 'CONFLICT'])
      .toArray();

    // 2. Also gather legacy records if any exist and convert to sync_queue
    const pendingReports = await db.emergency_reports.where('sync_status').equals('PENDING_SYNC').toArray();
    for (const r of pendingReports) {
      const exists = queuedItems.find(q => q.client_uuid === r.client_uuid);
      if (!exists) {
        const queueItem = {
          client_uuid: r.client_uuid,
          entity_type: 'EMERGENCY_REPORT',
          operation: 'CREATE',
          payload: r,
          priority: r.priority || 'NORMAL',
          dependency_ids: [],
          created_at: r.client_timestamp || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          retry_count: 0,
          last_attempt_at: null,
          last_error: null,
          status: 'PENDING'
        };
        await db.sync_queue.put(queueItem);
        queuedItems.push(queueItem);
      }
    }

    const pendingAssessments = await db.triage_assessments.where('sync_status').equals('PENDING_SYNC').toArray();
    for (const a of pendingAssessments) {
      const exists = queuedItems.find(q => q.client_uuid === a.client_uuid);
      if (!exists) {
        const queueItem = {
          client_uuid: a.client_uuid,
          entity_type: 'CLINICAL_ASSESSMENT',
          operation: 'CREATE',
          payload: a,
          priority: 'HIGH',
          dependency_ids: [a.report_client_uuid],
          created_at: a.client_timestamp || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          retry_count: 0,
          last_attempt_at: null,
          last_error: null,
          status: 'PENDING'
        };
        await db.sync_queue.put(queueItem);
        queuedItems.push(queueItem);
      }
    }

    const pendingEvents = await db.driver_events.where('sync_status').equals('PENDING').toArray();
    for (const e of pendingEvents) {
      const exists = queuedItems.find(q => q.client_uuid === e.event_uuid);
      if (!exists) {
        const queueItem = {
          client_uuid: e.event_uuid,
          entity_type: 'DRIVER_RESPONSE_EVENT',
          operation: 'CREATE',
          payload: e,
          priority: 'CRITICAL',
          dependency_ids: [e.assignment_uuid],
          created_at: e.timestamp || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          retry_count: 0,
          last_attempt_at: null,
          last_error: null,
          status: 'PENDING'
        };
        await db.sync_queue.put(queueItem);
        queuedItems.push(queueItem);
      }
    }

    if (queuedItems.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    // 3. Priority & Dependency Graph Sorting
    const priorityRank = { CRITICAL: 1, HIGH: 2, NORMAL: 3, LOW: 4 };
    const entityRank = {
      EMERGENCY_REPORT: 1,
      CLINICAL_ASSESSMENT: 2,
      REPORT_VERIFICATION: 3,
      AMBULANCE_DISPATCH: 4,
      DRIVER_RESPONSE_EVENT: 5,
      LOCATION_TELEMETRY: 6
    };

    const sortedQueue = [...queuedItems].sort((a, b) => {
      const eDiff = (entityRank[a.entity_type] || 99) - (entityRank[b.entity_type] || 99);
      if (eDiff !== 0) return eDiff;
      return (priorityRank[a.priority] || 3) - (priorityRank[b.priority] || 3);
    });

    // 4. Batch payload packaging (Up to 20 records)
    const batchBatch = sortedQueue.slice(0, 20);
    const payload = {
      records: batchBatch.map(item => ({
        client_uuid: item.client_uuid,
        entity_type: item.entity_type,
        operation: item.operation,
        payload: item.payload,
        priority: item.priority,
        dependency_ids: item.dependency_ids || []
      }))
    };

    // 5. Post to API with Token Refresh Handling
    let response;
    try {
      response = await axios.post('/api/sync/batch/', payload);
    } catch (err) {
      if (err.response?.status === 401) {
        // Attempt JWT token refresh
        try {
          const refreshRes = await axios.post('/api/auth/refresh/', {
            refresh: localStorage.getItem('refresh_token')
          });
          const newAccess = refreshRes.data.access;
          localStorage.setItem('access_token', newAccess);
          axios.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
          // Retry request with refreshed token
          response = await axios.post('/api/sync/batch/', payload);
        } catch (refreshErr) {
          console.warn('[SyncProcessor] JWT Refresh failed. Pausing sync.');
          return { success: false, reason: 'AUTH_REQUIRED' };
        }
      } else {
        throw err;
      }
    }

    const { results, server_timestamp } = response.data;
    let syncedCount = 0;

    // 6. Process per-record results
    for (const res of (results || [])) {
      const qItem = await db.sync_queue.where('client_uuid').equals(res.client_uuid).first();
      if (!qItem) continue;

      if (res.status === 'SYNCED' || res.status === 'ALREADY_PROCESSED') {
        syncedCount++;
        await db.sync_queue.where('client_uuid').equals(res.client_uuid).modify({
          status: 'SYNCED',
          updated_at: server_timestamp || new Date().toISOString()
        });

        if (res.server_id) {
          await db.id_mappings.put({
            client_uuid: res.client_uuid,
            server_id: res.server_id,
            entity_type: qItem.entity_type
          });
        }

        // Sync legacy tables if applicable
        if (qItem.entity_type === 'EMERGENCY_REPORT') {
          await db.emergency_reports.where('client_uuid').equals(res.client_uuid).modify({ sync_status: 'SYNCED' });
        } else if (qItem.entity_type === 'CLINICAL_ASSESSMENT') {
          await db.triage_assessments.where('client_uuid').equals(res.client_uuid).modify({ sync_status: 'SYNCED' });
        } else if (qItem.entity_type === 'DRIVER_RESPONSE_EVENT') {
          await db.driver_events.where('event_uuid').equals(res.client_uuid).modify({ sync_status: 'SYNCED' });
        }
      } else if (res.status === 'PENDING_DEPENDENCY') {
        // Parent dependency not ready; keep in PENDING status for next pass
        await db.sync_queue.where('client_uuid').equals(res.client_uuid).modify({
          status: 'PENDING',
          last_error: res.message
        });
      } else if (res.status === 'CONFLICT') {
        await db.sync_queue.where('client_uuid').equals(res.client_uuid).modify({
          status: 'CONFLICT',
          last_error: res.message,
          server_data: res.server_data
        });
      } else {
        // FAILED
        await db.sync_queue.where('client_uuid').equals(res.client_uuid).modify({
          status: 'FAILED',
          retry_count: (qItem.retry_count || 0) + 1,
          last_attempt_at: new Date().toISOString(),
          last_error: res.message || 'Synchronization failed on server.'
        });
      }
    }

    await db.sync_logs.add({
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      details: `Processed batch: ${syncedCount} synced/already processed.`
    });

    return {
      success: true,
      syncedCount,
      totalBatchSize: batchBatch.length
    };
  }
};
