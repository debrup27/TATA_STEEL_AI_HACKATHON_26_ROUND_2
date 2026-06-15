# ATAL — API Reference

REST base URL: `http://localhost:8000` · all data endpoints are under `/api/v1/`.
WebSocket base: `ws://localhost:8000/ws/`. Nginx also proxies both on `http://localhost/`.

Auth: JWT (SimpleJWT). Obtain a token at `POST /api/v1/auth/token/`, then send
`Authorization: Bearer <access>`. Demo login: `tech_demo` / `TechDemo@123`.

---

## 1. Conventions

- All request/response bodies are JSON unless noted.
- IDs are UUIDs.
- Time-series timestamps are ISO-8601 UTC.
- List endpoints follow DRF router conventions (`GET` list, `POST` create, `GET/PUT/PATCH/DELETE
  /<id>/` detail) for ViewSet-backed resources (`factories`, `assets`, `sensors`, `spares`).

---

## 2. Health & System

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health/` | Liveness — process is up |
| GET | `/health/ready/` | Readiness — migrations/seed pipeline complete (`{status, boot_id}`) |

---

## 3. Authentication & Users

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/auth/token/` | Obtain access + refresh JWT |
| POST | `/api/v1/auth/token/refresh/` | Refresh access token |
| POST | `/api/v1/auth/logout/` | Blacklist refresh token |
| — | `/api/v1/admin/…` | Admin user management |

---

## 4. Assets, Factories, Sensors, Spares (DRF ViewSets)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/factories/` · `/<id>/` | Factory list / detail |
| GET | `/api/v1/assets/` · `/<id>/` | Asset list / detail |
| GET | `/api/v1/sensors/` · `/<id>/` | Sensor definitions |
| GET | `/api/v1/spares/` · `/<id>/` | Spare-parts catalog (stock qty, reorder level, order decision) |
| GET | `/api/v1/glossary/` | Domain glossary terms |

---

## 5. Plant Intelligence (consolidation)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/plant/snapshot/` | Plant-wide snapshot — all assets' health, RUL, anomaly, risk, flags |
| POST | `/api/v1/plant/bottleneck-score/` | Ranked bottleneck scoring across assets |
| GET | `/api/v1/plant/bottleneck-score/<asset_id>/insight/` | MANAS insight for a bottleneck asset |
| GET | `/api/v1/plant/kpis/` | Plant KPIs (proactive rate, plant health, alarms) |
| GET | `/api/v1/plant/cost-analysis/?factory_id=` | Predicted loss vs PdM savings (₹ lakhs) + methodology |

Cost analysis returns per-asset `{name, loss, savings, recovery_pct, failure_probability,
downtime_h, hourly_loss_lakh, rul_hours, risk_level}` plus a `methodology` block with the exact
loss / savings / p-fail formulas and inputs (powers the MANAS "How?" cost explainer).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/consolidate/<asset_id>/` | Synchronous cross-stage consolidation for an asset |
| POST | `/api/v1/consolidate/<asset_id>/async/` | Queue consolidation (returns task id) |
| GET | `/api/v1/consolidate/result/<task_id>/` | Consolidation task result |

---

## 6. Diagnostics

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/diagnostics/<asset_id>/` | Asset diagnostics — probable fault, health, RUL, sensors |
| POST | `/api/v1/diagnostics/<asset_id>/refresh/` | Recompute diagnostics now |
| GET | `/api/v1/diagnostics/<asset_id>/rca-insight/` | Root-cause-analysis MANAS insight |
| GET | `/api/v1/diagnostics/<asset_id>/defect-insight/` | Defect-detail MANAS insight |

---

## 7. Telemetry & Twins

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/telemetry/ingest/` | Ingest telemetry frame(s) |
| GET | `/api/v1/telemetry/snapshot/` | Latest telemetry snapshot (all assets) |
| GET | `/api/v1/telemetry/<asset_id>/` | Time-series for one asset |
| GET | `/api/v1/twins/<asset_id>/` | Current twin state (health, campaign, fault flags) |
| GET | `/api/v1/twins/<asset_id>/history/` | Twin state history |

---

## 8. ML / Predictions

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/ml/<asset_id>/<model_type>/predict/` | Run inference (sync) |
| POST | `/api/v1/ml/<asset_id>/<model_type>/predict/async/` | Queue inference |
| GET | `/api/v1/ml/predictions/` | List predictions |
| GET | `/api/v1/ml/predictions/task/<task_id>/` | Async prediction result |
| GET | `/api/v1/ml/predictions/<pk>/` | Prediction detail |
| GET | `/api/v1/ml/predictions/<pk>/explain/` | SHAP feature attribution for a prediction |
| GET | `/api/v1/ml/models/status/` | Model registry status |
| POST | `/api/v1/ml/retrain/` · `/retrain/<task_id>/` | Trigger / poll retrain |
| POST | `/api/v1/ml/competition/infer/` | Competition inference endpoint |
| GET | `/api/v1/ml/cross-stage/<asset_id>/` | Cross-stage propagation view |

`model_type` ∈ {`rul`, `anomaly`, `health`, …}. Outputs are reconciled through the deterministic
engine (see Architecture §4).

---

## 9. Simulation (abnormality toggle)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/simulate/trip/` | Inject a fault/trip (drives 5 s rapid-degrade loop) |
| POST | `/api/v1/simulate/trip/clear/` | Clear fault, ack alarms, recover asset |
| POST | `/api/v1/simulate/plant/` | Plant-level simulation control |
| GET/POST | `/api/v1/simulate/<asset_id>/` | Per-asset simulation control |

---

## 10. Alerts, Notifications, Reports

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/alerts/` | Alarm events |
| GET | `/api/v1/alerts/log-insight/` | MANAS insight on an alarm log |
| POST | `/api/v1/alerts/<pk>/acknowledge/` | Acknowledge an alarm |
| POST | `/api/v1/alerts/external/` | Ingest external alert |
| GET | `/api/v1/notifications/feed/` | Per-page notification feed |
| POST | `/api/v1/reports/alert-report/` | Generate an alert report |
| POST | `/api/v1/feedback/reports/<report_id>/feedback/` | Submit report feedback |

---

## 11. Maintenance & Lifecycle

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/maintenance/action-plans/` | List action plans (priority order) |
| GET | `/api/v1/maintenance/action-plans/<asset_id>/` | Action plan for an asset (spares incl. stock qty + order decision) |
| POST | `/api/v1/maintenance/action-plans/<asset_id>/regenerate/` | Regenerate plan via qwen (replaces stale plan) |
| GET | `/api/v1/maintenance/action-plans/regeneration-status/` | Regeneration status |
| GET | `/api/v1/maintenance/action-plans/task-status/<task_id>/` | Plan task status |
| POST | `/api/v1/maintenance/work-orders/<asset_id>/generate/` | AI work-order generation from SANSAD feeds |
| GET | `/api/v1/maintenance/fault-messages/` | Fault message catalog |
| GET | `/api/v1/maintenance/failure-reports/` | Failure reports |

---

## 12. Samvidhaan (historical analytics)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/samvidhaan/graphs/` | Predictive-maintenance analytics graphs |
| GET | `/api/v1/samvidhaan/historical-reports/` | 90-day historical factory dossiers |
| POST | `/api/v1/samvidhaan/historical-reports/seed/` | Seed historical reports |

---

## 13. RAG (document grounding)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/rag/documents/` | List ingested documents (MANAS doc selector) |
| GET | `/api/v1/rag/documents/<document_id>/preview/` | Document preview |
| GET | `/api/v1/rag/documents/<document_id>/file/` | Raw document file |
| POST | `/api/v1/rag/extract-upload/` | Extract text from an uploaded file |
| POST | `/api/v1/rag/ingest/` | Ingest a document into ChromaDB |
| POST | `/api/v1/rag/query/` | Hybrid retrieval query (dense + BM25 + optional rerank) |

---

## 14. MANAS Chat (agents)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/chat/warmup/` | Warm the LLM stack |
| POST | `/api/v1/chat/optimize-prompt/` | Prompt optimizer (0.8b, serialised) |
| GET/POST | `/api/v1/chat/sessions/` | List / create chat sessions |
| GET/DELETE | `/api/v1/chat/sessions/<session_id>/` | Session detail / delete |
| POST | `/api/v1/chat/sessions/<session_id>/message/` | Send a message (streams over WebSocket) |
| POST | `/api/v1/chat/sessions/<session_id>/cancel/` | Cancel an in-flight generation |
| POST | `/api/v1/chat/sessions/<session_id>/compact/` | Compact session history |
| POST | `/api/v1/chat/sessions/<session_id>/sansad-mode/activate/` | Link live plant context (`/sansad`) |
| POST | `/api/v1/chat/sessions/<session_id>/sansad-mode/deactivate/` | Unlink plant context |
| POST | `/api/v1/chat/sessions/<session_id>/sansad-mode/update/` | Re-harvest & replace plant briefing |
| POST | `/api/v1/chat/messages/<message_id>/feedback/` | Thumbs up/down on an assistant message |

### Chat flow
1. `POST …/sessions/` → session id.
2. Open `ws://…/ws/chat/<session_id>/`.
3. `POST …/sessions/<session_id>/message/` with `{content, rag_document_ids?, deep_thinking?,
   user_role?, advice_mode?}`.
4. Receive streamed events on the socket: `started` → `phase` → `token` / `think_token` → `done`
   (with final `content`, `citations`, `message_id`).

---

## 15. WebSocket Channels

| Endpoint | Streamed events |
|----------|-----------------|
| `/ws/telemetry` | Live sensor frames; `PLANT_SNAPSHOT_REFRESH` on fault toggle |
| `/ws/twins/<asset_id>/` | Twin health / RUL / anomaly updates |
| `/ws/alerts/` | Alarm create / acknowledge |
| `/ws/chat/<session_id>/` (alias `/ws/llm/<session_id>/`) | `started`, `phase`, `token`, `think_token`, `sansad_syncing`, `sansad_synced`, `blocked`, `done` |
| `/ws/orchestration/<asset_id>/` | LangGraph orchestration step events |
