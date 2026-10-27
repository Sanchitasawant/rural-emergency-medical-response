import { db } from './db';
import axios from 'axios';

export async function syncPendingData() {
  if (!navigator.onLine) {
    return { success: false, reason: 'Offline mode active' };
  }

  try {
    const pendingReports = await db.emergency_reports
      .where('sync_status')
      .equals('PENDING_SYNC')
      .toArray();

    const pendingAssessments = await db.triage_assessments
      .where('sync_status')
      .equals('PENDING_SYNC')
      .toArray();

    if (pendingReports.length === 0 && pendingAssessments.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    const payload = {
      reports: pendingReports,
      assessments: pendingAssessments
    };

    const response = await axios.post('/api/sync/batch/', payload);
    const { synced_reports, synced_assessments, server_timestamp } = response.data;

    if (synced_reports && synced_reports.length > 0) {
      await db.emergency_reports
        .where('client_uuid')
        .anyOf(synced_reports)
        .modify({ sync_status: 'SYNCED', last_synced_at: server_timestamp });
    }

    if (synced_assessments && synced_assessments.length > 0) {
      await db.triage_assessments
        .where('client_uuid')
        .anyOf(synced_assessments)
        .modify({ sync_status: 'SYNCED', last_synced_at: server_timestamp });
    }

    await db.sync_logs.add({
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      details: `Synced ${synced_reports?.length || 0} reports, ${synced_assessments?.length || 0} assessments`
    });

    return {
      success: true,
      syncedReports: synced_reports?.length || 0,
      syncedAssessments: synced_assessments?.length || 0
    };
  } catch (error) {
    console.error('Offline synchronization failed:', error);
    await db.sync_logs.add({
      timestamp: new Date().toISOString(),
      status: 'FAILED',
      details: error.message || 'Network error during sync'
    });
    return { success: false, error: error.message };
  }
}
