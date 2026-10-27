import Dexie from 'dexie';

export const db = new Dexie('RuralCareAI_OfflineDB');

db.version(3).stores({
  sync_queue: '++id, &client_uuid, entity_type, operation, status, priority, retry_count, created_at',
  id_mappings: '&client_uuid, server_id, entity_type',
  emergency_reports: '++id, &client_uuid, incident_type, status, priority, sync_status, client_timestamp',
  triage_assessments: '++id, &client_uuid, report_client_uuid, priority_level, sync_status, client_timestamp',
  driver_events: '++id, &event_uuid, assignment_uuid, status, sync_status, timestamp',
  sync_logs: '++id, timestamp, status, details'
});
