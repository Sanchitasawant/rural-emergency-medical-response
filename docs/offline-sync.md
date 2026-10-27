# RuralCare AI — Unified Background Synchronization & Offline-First Engine Architecture

## 1. Overview
RuralCare AI is designed as a production-grade, offline-first clinical decision-support and emergency response coordination system. In rural settings where network connectivity is intermittent or unavailable, the application allows citizens, emergency workers, hospital staff, and ambulance paramedics to capture critical emergency data locally without interruption. When internet connectivity is restored, the unified background synchronization engine automatically pushes pending data to the Django REST API backend while guaranteeing database-level idempotency, zero data loss, explicit dependency graph resolution, and multi-tab coordination.

> **Clinical Governance Disclaimer**: RuralCare AI is an offline-first clinical decision-support and emergency coordination system. AI outputs serve as decision support recommendations and do not replace qualified medical judgment.

---

## 2. IndexedDB Schema (Dexie.js v3)

Database Name: `RuralCareAI_OfflineDB`

### Stores:
- `sync_queue`: `++id, &client_uuid, entity_type, operation, status, priority, retry_count, created_at`
  - Preserves complete payload: `client_uuid`, `entity_type`, `operation`, `payload`, `priority`, `dependency_ids`, `created_at`, `updated_at`, `retry_count`, `last_attempt_at`, `last_error`, `status`.
- `id_mappings`: `&client_uuid, server_id, entity_type`
  - Maps local client UUIDs to server-generated primary keys.
- `emergency_reports`: `++id, &client_uuid, incident_type, status, priority, sync_status, client_timestamp`
- `triage_assessments`: `++id, &client_uuid, report_client_uuid, priority_level, sync_status, client_timestamp`
- `driver_events`: `++id, &event_uuid, assignment_uuid, status, sync_status, timestamp`
- `sync_logs`: `++id, timestamp, status, details`

---

## 3. Clear Sync State Semantics

### Network / Connectivity States:
- `OFFLINE`: `!navigator.onLine` (Browser network interface disconnected).
- `ONLINE_UNREACHABLE`: `navigator.onLine === true`, but `/api/health/` ping fails or times out (Server offline/unreachable).
- `ONLINE_REACHABLE`: `navigator.onLine === true` and `/api/health/` ping returns HTTP 200 (Active connection to backend).

### Record / Process States:
- `PENDING`: Record queued locally, awaiting transmission.
- `SYNCING`: Record currently packaging/transmitting in active batch.
- `SYNCED`: Record successfully committed on server.
- `ALREADY_PROCESSED`: Server recognized duplicate `client_uuid` and returned existing record data without creating duplicate rows.
- `FAILED`: Record encountered a server/validation error; retained locally for manual retry.
- `CONFLICT`: Server state conflicts with local offline payload; preserved for user review.

---

## 4. Server-Side Idempotency & Batch API (`POST /api/sync/batch/`)

### Database Constraints:
All emergency models (`EmergencyReport`, `TriageAssessment`, `EmergencyCase`, `AmbulanceAssignment`, `ResponseEvent`) enforce database-level uniqueness on `client_uuid` / `uuid`.

### Idempotency Guarantee:
When a batch is received at `POST /api/sync/batch/`:
1. For each record, the server queries the database for existing records with matching `client_uuid`.
2. If found, the server immediately returns the existing record details with `status: "ALREADY_PROCESSED"` (HTTP 200/208).
3. No duplicate database rows are created, even if network disconnects mid-batch or the user clicks "Sync Now" repeatedly.

### Per-Record Savepoint Isolation:
Each item in the batch is processed inside an isolated sub-transaction (`transaction.atomic(savepoint=True)`). If 1 record out of 20 fails due to an invalid payload, valid records commit as `SYNCED`, and the batch returns per-record status results without rolling back successful items.

---

## 5. Dependency Graph Resolution & Priority Processing

### Dependency Order:
1. `EMERGENCY_REPORT` (Parent report)
2. `CLINICAL_ASSESSMENT` (Child assessment requiring `EMERGENCY_REPORT` `client_uuid`)
3. `REPORT_VERIFICATION` (Staff verification & `EmergencyCase` creation)
4. `AMBULANCE_DISPATCH` (Dispatch & `AmbulanceAssignment` creation)
5. `DRIVER_RESPONSE_EVENT` (Driver response state transition)
6. `LOCATION_TELEMETRY` (Vehicle GPS telemetry)

### Dependency Safety:
If a child record is queued while its parent `client_uuid` is not yet synchronized on the server, the server returns `status: "PENDING_DEPENDENCY"`. The sync processor keeps the child record in `PENDING` status (does NOT mark it `FAILED`) and re-attempts synchronization automatically after the parent succeeds.

### Priority Queueing:
Records are processed in priority order: `CRITICAL` > `HIGH` > `NORMAL` > `LOW`, while strictly respecting parent-child dependency constraints.

---

## 6. Multi-Tab Web Lock & Retry Engine

### Multi-Tab Coordination:
Synchronization operations use the Web Locks API (`navigator.locks.request('ruralcare_sync_lock', ...)`). If Web Locks API is unavailable in older browsers, an IndexedDB lease lock with heartbeat expiration (10s) prevents multiple tabs from processing the queue simultaneously. Lock release is guaranteed inside a `finally` block.

### Retry & Exponential Backoff:
- 1st Retry: 2-second delay
- 2nd Retry: 5-second delay
- 3rd Retry: 15-second delay
- Retries pause on HTTP 401 to attempt JWT token refresh via `/api/auth/refresh/`. If refresh fails, sync pauses without deleting local IndexedDB offline data.

---

## 7. Testing & Verification Procedure

1. **Unit & Integration Tests**: Executed via `scratch/step9_sync_verification.py`.
2. **Database Verification**: Direct SQL/ORM checks verifying zero duplicate `client_uuid` rows in MySQL `ruralcare_ai`.
3. **E2E Offline Flow**: Offline creation $\rightarrow$ browser restart $\rightarrow$ reconnect $\rightarrow$ auto-sync $\rightarrow$ MySQL 1 record check $\rightarrow$ duplicate submission check.
