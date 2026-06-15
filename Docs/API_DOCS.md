# ATAL API Documentation

REST and WebSocket API reference for the Django backend (`django-backend`, default port **8000**).

**Base URL:** `http://localhost:8000`  
**API prefix:** `/api/v1/`  
**Health:** `GET /health/`, `GET /health/ready/`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Common Conventions](#2-common-conventions)
3. [Health](#3-health)
4. [Auth & Users](#4-auth--users)
5. [Factories, Assets, Sensors, Spares](#5-factories-assets-sensors-spares)
6. [Plant & KPIs](#6-plant--kpis)
7. [Diagnostics](#7-diagnostics)
8. [Telemetry & Twins](#8-telemetry--twins)
9. [ML & Predictions](#9-ml--predictions)
10. [Consolidation](#10-consolidation)
11. [Alerts & Notifications](#11-alerts--notifications)
12. [Maintenance](#12-maintenance)
13. [Reports & Feedback](#13-reports--feedback)
14. [RAG](#14-rag)
15. [Chat / MANAS](#15-chat--manas)
16. [Samvidhaan & Simulation](#16-samvidhaan--simulation)
17. [WebSockets](#17-websockets)
18. [Error Handling](#18-error-handling)

---

## 1. Authentication

Default DRF permission: **`IsAuthenticated`** (JWT required unless noted **Public**).

### Obtain tokens

```http
POST /api/v1/auth/token/
Content-Type: application/json

{
  "username": "tech_demo",
  "password": "TechDemo@123"
}
```

**Response 200:**
```json
{
  "access": "<jwt-access>",
  "refresh": "<jwt-refresh>",
  "role": "technician",
  "username": "tech_demo"
}
```

### Refresh access token

```http
POST /api/v1/auth/token/refresh/
Content-Type: application/json

{ "refresh": "<jwt-refresh>" }
```

### Logout (blacklist refresh)

```http
POST /api/v1/auth/logout/
Authorization: Bearer <access>
Content-Type: application/json

{ "refresh": "<jwt-refresh>" }
```

### Using JWT

```http
Authorization: Bearer <access-token>
```

WebSockets pass the token as a query parameter: `?token=<access-token>`.

---

## 2. Common Conventions

| Topic | Behavior |
|-------|----------|
| **Pagination** | List endpoints use page size **50** (`?page=2`) |
| **IDs** | UUID strings for assets, sessions, reports |
| **Timestamps** | ISO 8601 UTC |
| **Factory filter** | `?factory_id=<uuid>` on many plant-scoped endpoints |
| **Roles** | `technician`, `supervisor`, `admin` (JWT claim + server-side checks) |
| **CORS** | `http://localhost:3000`, `http://127.0.0.1:3000` by default |

---

## 3. Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health/` | Public | Liveness `{"status":"ok"}` |
| GET | `/health/ready/` | Public | Readiness (503 until bootstrap complete) |

---

## 4. Auth & Users

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/token/` | Public | Login |
| POST | `/api/v1/auth/token/refresh/` | Public | Refresh access |
| POST | `/api/v1/auth/logout/` | JWT | Blacklist refresh |

### Admin (role: admin)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/v1/admin/orgs/` | Organizations CRUD |
| GET/PUT/PATCH/DELETE | `/api/v1/admin/orgs/{pk}/` | Organization detail |
| GET/POST | `/api/v1/admin/users/` | Users CRUD |
| GET/PUT/PATCH/DELETE | `/api/v1/admin/users/{pk}/` | User detail |
| GET | `/api/v1/admin/model-registry/` | ML model registry list |
| GET | `/api/v1/admin/model-registry/{pk}/` | Registry entry |

---

## 5. Factories, Assets, Sensors, Spares

### Factories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/factories/` | List factories (scoped by user `factory_access`) |
| GET | `/api/v1/factories/{pk}/` | Factory detail |
| GET | `/api/v1/factories/{pk}/health/` | Weighted health aggregate |

### Assets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/assets/` | List assets (`?factory_id=`) |
| GET | `/api/v1/assets/{pk}/` | Asset detail |
| GET | `/api/v1/assets/{pk}/health/` | Health, RUL, alerts, twin summary |
| GET | `/api/v1/assets/{pk}/maintenance-plan/` | Generated maintenance plan |
| GET | `/api/v1/assets/{pk}/knowledge-base/` | Asset knowledge-base payload |

### Sensors & spares

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sensors/` | Sensor definitions (`?asset=`, `?sensor_type=`) |
| GET | `/api/v1/sensors/{pk}/` | Sensor definition detail |
| GET | `/api/v1/spares/` | Spare parts (`?asset=`) |
| GET | `/api/v1/spares/{pk}/` | Spare part detail |

### Glossary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/glossary/` | Maintenance glossary (`?category=`, `?q=`) |

---

## 6. Plant & KPIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/plant/snapshot/` | Unified plant snapshot for SANSAD UI (`?factory_id=`) |
| POST | `/api/v1/plant/bottleneck-score/` | Rank all assets by bottleneck composite score |
| POST | `/api/v1/plant/bottleneck-score/{asset_id}/insight/` | LLM bottleneck/risk narrative |
| GET | `/api/v1/plant/kpis/` | Plant KPIs (health, avg RUL, proactive rate, etc.) |
| GET | `/api/v1/plant/cost-analysis/` | Predictive cost per factory (`?factory_id=`) |

### Plant snapshot response (abbreviated)

```json
{
  "updated_at": "2026-06-15T10:00:00Z",
  "assets": [
    {
      "id": "...",
      "name": "High-Pressure Descaler",
      "factory": "Horizon Foundry",
      "stage": "Descaling",
      "health": 55,
      "rulHours": 48,
      "probableFault": "Header pressure envelope breach",
      "faultClass": 2,
      "sensors": [
        { "label": "Vibration RMS", "value": "4.2 mm/s", "status": "warning" }
      ],
      "anomalyActive": true,
      "faultInjected": false
    }
  ],
  "anomaly_flags": {
    "any_anomaly_active": true,
    "injected_asset_ids": []
  }
}
```

### Cost analysis response (abbreviated)

```json
{
  "factories": [
    {
      "factory_id": "...",
      "factory": "F1",
      "factory_label": "Factory F1",
      "predicted_loss_lakhs": 6.0,
      "pdm_savings_lakhs": 4.0,
      "net_benefit_lakhs": 4.0,
      "assets": [ { "asset_id": "...", "name": "SRF", "loss_lakhs": 5.0, "savings_lakhs": 4.0, "rul_hours": 98 } ]
    }
  ],
  "plant_totals": { "predicted_loss_lakhs": 12.0, "pdm_savings_lakhs": 8.0 }
}
```

---

## 7. Diagnostics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/diagnostics/` | List all asset diagnostics (`?factory_id=`) |
| GET | `/api/v1/diagnostics/{asset_id}/` | Full diagnostic payload |
| POST | `/api/v1/diagnostics/{asset_id}/refresh/` | Queue ML + consolidation refresh |
| POST | `/api/v1/diagnostics/{asset_id}/rca-insight/` | LLM RCA overview (inline, no session) |
| POST | `/api/v1/diagnostics/{asset_id}/defect-insight/` | LLM process-defect correlation |

Diagnostic objects include: `probableFault`, `faultClass`, `faultConfidence`, `rootCauses[]`, `earlyWarning`, `processDefects[]`, `sensors[]`, `rulHours`.

---

## 8. Telemetry & Twins

### Telemetry

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/telemetry/ingest/` | Ingest sensor readings (triggers twin + threshold eval) |
| GET | `/api/v1/telemetry/snapshot/` | Latest reading per sensor (`?factory=`) |
| GET | `/api/v1/telemetry/{asset_id}/` | Time series (`?sensor=`, `?from=`, `?to=`, `?limit=`) |

### Digital twins

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/twins/{asset_id}/` | Current twin state |
| GET | `/api/v1/twins/{asset_id}/history/` | State history (`?from=`, `?to=`, `?fields=`) |

---

## 9. ML & Predictions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/ml/{asset_id}/{model_type}/predict/` | JWT | Sync inference + SHAP |
| POST | `/api/v1/ml/{asset_id}/{model_type}/predict/async/` | JWT | Async inference task |
| GET | `/api/v1/ml/predictions/` | JWT | List predictions (`?asset_id=`, `?model_type=`) |
| GET | `/api/v1/ml/predictions/task/{task_id}/` | JWT | Poll async task |
| GET | `/api/v1/ml/predictions/{pk}/` | JWT | Prediction detail |
| GET | `/api/v1/ml/predictions/{pk}/explain/` | JWT | SHAP explanation |
| GET | `/api/v1/ml/models/status/` | JWT | Production model registry status |
| POST | `/api/v1/ml/retrain/` | Admin | Queue retrain pipeline |
| GET | `/api/v1/ml/retrain/{task_id}/` | Admin | Retrain task status |
| POST | `/api/v1/ml/competition/infer/` | Admin | CSV competition inference |
| GET | `/api/v1/ml/cross-stage/{asset_id}/` | JWT | Cross-stage correlation data |

**Model types** include anomaly detection, fault classification, and RUL estimators per asset type.

---

## 10. Consolidation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/consolidate/{asset_id}/` | Sync consolidation + SANSAD orchestration |
| POST | `/api/v1/consolidate/{asset_id}/async/` | Queue async consolidation |
| GET | `/api/v1/consolidate/result/{task_id}/` | Poll consolidation result |

Consolidation assembles twin state, ML outputs, 24h sensor stats, active alarms, spares, and maintenance history into a single payload for agent graphs and intelligence reports.

---

## 11. Alerts & Notifications

### Alerts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/alerts/` | List alarms (`?asset_id=`, `?severity=`, `?acknowledged=`) |
| PATCH | `/api/v1/alerts/{pk}/acknowledge/` | Acknowledge alarm |
| POST | `/api/v1/alerts/external/` | Ingest external/third-party alert |

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/notifications/feed/` | Unified feed: alerts, predictions, orchestration + ticker items (`?factory_id=`, `?limit=`) |

---

## 12. Maintenance

### Events, delay logs, work orders (ViewSets)

| Resource | Base path | Notes |
|----------|-----------|-------|
| Events | `/api/v1/maintenance/events/` | POST/PATCH/DELETE require **supervisor+** |
| Delay logs | `/api/v1/maintenance/delay-logs/` | Read-only list/detail |
| Work orders | `/api/v1/maintenance/work-orders/` | Full CRUD |

### Action plans & generation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maintenance/action-plans/` | List plans + regeneration status (`?factory_id=`) |
| GET | `/api/v1/maintenance/action-plans/regeneration-status/` | Regeneration status only |
| GET | `/api/v1/maintenance/action-plans/task-status/{task_id}/` | Legacy Celery poll |
| POST | `/api/v1/maintenance/action-plans/{asset_id}/regenerate/` | Regenerate plan (sync Ollama polish) |
| GET | `/api/v1/maintenance/action-plans/{asset_id}/` | Plan detail for asset |
| POST | `/api/v1/maintenance/work-orders/{asset_id}/generate/` | LLM work order from live feeds |

### Ingest

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/maintenance/fault-messages/` | Ingest PLC fault message → alarm |
| POST | `/api/v1/maintenance/failure-reports/` | Ingest failure report → RAG queue |

---

## 13. Reports & Feedback

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reports/` | List intelligence reports |
| GET | `/api/v1/reports/{pk}/` | Report detail |
| POST | `/api/v1/reports/{pk}/feedback/` | Confirm / reject / correct feedback |
| GET | `/api/v1/reports/{pk}/urgency/` | Urgency score + risk level |
| GET | `/api/v1/reports/{pk}/summary/` | Role-scoped summary |
| POST | `/api/v1/reports/alert-report/` | Create alert digest from active alarms |
| POST | `/api/v1/reports/{report_id}/feedback/` | Alternate feedback endpoint |

---

## 14. RAG

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/rag/documents/` | JWT | List ingested corpus documents |
| GET | `/api/v1/rag/documents/{document_id}/preview/` | JWT | Text excerpt preview |
| GET | `/api/v1/rag/documents/{document_id}/file/` | JWT | Raw file download |
| POST | `/api/v1/rag/extract-upload/` | JWT | OCR/text extract from upload |
| POST | `/api/v1/rag/ingest/` | Admin | Queue document ingestion into Chroma |
| POST | `/api/v1/rag/query/` | JWT | Hybrid retrieval query |

### RAG query example

```http
POST /api/v1/rag/query/
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "ISO 4406 cleanliness limit for hydraulic AGC",
  "type": "asset_intelligence",
  "asset_id": "<optional-asset-uuid>"
}
```

**Collections:** `manual`, `sop`, `iso`, `safety`, `maintenance_log`, `model_explanation` (mapped from document types).

**Pipeline:** BM25 keyword search + BGE-M3 dense vectors → reciprocal rank fusion → optional BGE reranker in chat path.

---

## 15. Chat / MANAS

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/chat/warmup/` | Pre-warm Ollama inference stack |
| POST | `/api/v1/chat/optimize-prompt/` | Rewrite user draft for maintenance context |
| POST | `/api/v1/chat/messages/{message_id}/feedback/` | Thumbs up/down preference signal |
| GET | `/api/v1/chat/sessions/` | List user sessions |
| POST | `/api/v1/chat/sessions/` | Create session |
| GET | `/api/v1/chat/sessions/{session_id}/` | Session + message history |
| DELETE | `/api/v1/chat/sessions/{session_id}/` | Delete session (cancels in-flight stream) |
| POST | `/api/v1/chat/sessions/{session_id}/cancel/` | Cancel generation |
| POST | `/api/v1/chat/sessions/{session_id}/message/` | Send message → **202** + Celery/stream |
| POST | `/api/v1/chat/sessions/{session_id}/compact/` | Compact/summarize history |

### Send message example

```http
POST /api/v1/chat/sessions/{session_id}/message/
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "What is the RUL trend for the descaler?",
  "rag_collections": ["manual", "sop"],
  "rag_document_titles": ["HHPD Maintenance Manual"],
  "custom_rag_context": "",
  "custom_documents": [],
  "user_role": "technician",
  "deep_thinking": false,
  "advice_mode": false
}
```

**Response 202:** `{ "status": "processing", "message_id": "..." }` — connect WebSocket for tokens.

---

## 16. Samvidhaan & Simulation

### Samvidhaan

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/samvidhaan/graphs/` | Maintenance graph snapshots (`?asset_id=`) |
| GET | `/api/v1/samvidhaan/historical-reports/` | Historical factory dossiers |
| POST | `/api/v1/samvidhaan/historical-reports/seed/` | Regenerate dossiers (idempotent) |

### Simulation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/simulate/plant/` | All assets' simulation state |
| POST | `/api/v1/simulate/plant/` | Bulk action (e.g. `reset_all`) |
| POST | `/api/v1/simulate/trip/` | Inject abnormality trip |
| POST | `/api/v1/simulate/trip/clear/` | Clear injected trips |
| GET | `/api/v1/simulate/{asset_id}/` | Per-asset simulation status |
| POST | `/api/v1/simulate/{asset_id}/` | Inject fault / reset / fast-degrade |

---

## 17. WebSockets

Connect to `ws://localhost:8000/ws/...?token=<access>` (or via Next.js rewrite proxy).

| Path | Consumer | Auth | Events |
|------|----------|------|--------|
| `/ws/telemetry` | `TelemetryConsumer` | Optional | Plant telemetry cell broadcasts |
| `/ws/twins/{asset_id}/` | `TwinStateConsumer` | Optional | Twin state changes |
| `/ws/alerts/` | `AlertConsumer` | **Required** | User-specific + broadcast alerts |
| `/ws/chat/{session_id}/` | `LLMStreamConsumer` | Optional | `started`, `token`, `reasoning`, `citation`, `done`, `error` |
| `/ws/llm/{session_id}/` | `LLMStreamConsumer` | Optional | Legacy alias for chat stream |
| `/ws/orchestration/{asset_id}/` | `OrchestrationConsumer` | Optional | SANSAD agent steps, tools, decisions |

### Chat stream message shapes (abbreviated)

```json
{ "type": "token", "content": "The " }
{ "type": "reasoning", "content": "Checking sensor envelope..." }
{ "type": "citation", "title": "HAGCC Manual §4.3", "excerpt": "..." }
{ "type": "done", "message_id": "..." }
{ "type": "error", "message": "Ollama timeout" }
```

---

## 18. Error Handling

| HTTP code | Meaning |
|-----------|---------|
| 400 | Validation error — check response body `detail` or field errors |
| 401 | Missing or expired JWT — refresh or re-login |
| 403 | Insufficient role (e.g. admin-only retrain) |
| 404 | Asset/session/report not found |
| 503 | `/health/ready/` — backend still bootstrapping |
| 202 | Chat message accepted — poll WS for result |

DRF returns JSON errors:

```json
{ "detail": "Authentication credentials were not provided." }
```

---

## OpenAPI / Future

An auto-generated OpenAPI schema is not yet published. This document is the canonical reference derived from Django URL routing and view permissions. For integration testing, use demo credentials and `scripts/verify-deploy.sh` as a smoke baseline.

---

*See [Custom_docs.md](./Custom_docs.md) for pipeline internals and [USER_GUIDE.md](./USER_GUIDE.md) for UI workflows.*
