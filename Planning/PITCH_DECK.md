# Project ATAL — 12-Slide Pitch Deck Specification
**Source:** Repository scan (`CLAUDE.md`, `docker-compose.yml`, Django apps, Next.js routes, Planning docs)  
**Style:** Minimalist business deck — high-density phrases only

---

## SLIDE 1: Title & Deployment Identity

| Element | Specification |
|---|---|
| **Application name** | **Project ATAL** |
| **Primary subtitle** | Autonomous Troubleshooting, Asset Intelligence & Lifecycle Management |
| **Tagline** | Intelligent Maintenance Wizard for Tata Steel hot-rolling plant equipment |
| **Login gateway placeholder** | `ATAL_Project/frontend/src/app/login/page.tsx` — JWT demo roles (Technician / Supervisor / Admin) |
| **Local entry gateways** | `http://localhost:3000` (Next.js UI) · `http://localhost:8000` (Django API) · `http://localhost:80` (nginx reverse proxy) |
| **Operational ports** | **3000** ui-console · **8000** django-backend · **80** nginx · **5432** postgres-db · **6379** redis · **11434** ollama (internal) |
| **Container / image tags** | `atal-django-backend` · `atal-celery-worker` · `atal-celery-beat` · `atal-ui-console` · `timescale/timescaledb:latest-pg17` · `redis:8.0-alpine` · `ollama/ollama:latest` · `nginx:1.27-alpine` · `curlimages/curl:8.11.1` (warmup) · `alpine:latest` (atal meta-service) |
| **Launch command** | `docker compose up atal -d --build` (repo root) |
| **GPU profile** | Copy `ATAL_Project/backend/env/.env.gpu` → `.env` before compose up |

---

## SLIDE 2: Industrial Vulnerabilities & Operational Reality

| Element | Specification |
|---|---|
| **Problem domain** | Steel hot-rolling: capital-intensive, interdependent assets; unplanned downtime → production loss, safety risk, maintenance cost inflation |
| **Core pain** | Engineers triage fragmented manuals, SOPs, logs, sensor alerts, and failure reports manually — slow, inconsistent, expert-dependent |
| **Bottleneck 1 — Data fragmentation** | Knowledge scattered across OEM PDFs, ISO standards, maintenance logs, telemetry DB, and ML outputs with no unified decision surface |
| **Bottleneck 2 — Process friction** | Reactive diagnosis and work-order drafting depend on tribal knowledge; cross-stage defect propagation (SRF→HAGCC→FS) is hard to trace |
| **Bottleneck 3 — Cascading system faults** | Single asset anomaly can trip line buffers, inflate procurement urgency, and mask root cause without ranked prioritization |
| **Baseline evidence placeholder** | `ATAL_Project/frontend/src/app/sansad/hub/historical-logs/page.tsx` — historical maintenance event index |
| **Supporting index module** | `apps/maintenance/models.py` → `MaintenanceEvent`, `DelayLog`, `FaultMessage`; `apps/reports/models.py` → `MaintenanceReport` |

---

## SLIDE 3: Solution Architecture — The Dual Operational Engine

| Track | Code anchor | Function |
|---|---|---|
| **Reactive Core** | `apps/assets/anomaly_trip.py` · `apps/alerts/` · `apps/consolidation/` LangGraph runner · `POST /api/v1/simulate/trip/` | Fault injection, alarm triage, trip propagation, immediate consolidation, work-order drafting on anomaly |
| **Proactive Core** | `apps/synthetic/` (10s telemetry) · `apps/ml/` (5m inference) · `apps/maintenance/intelligence_report.py` · Celery Beat schedules | Continuous sensor simulation, RUL/anomaly scoring, threshold maintenance plans, scheduled drift checks |
| **Operational value 1** | Faster fault-to-action loop | Anomaly → synthetic batch + ML inference + inline intelligence regen (`regenerate_intelligence_on_anomaly_sync`) |
| **Operational value 2** | Ranked plant prioritization | Multi-constraint bottleneck scores drive maintenance queue and SANSAD hub risk views |
| **Operational value 3** | Explainable decision artifacts | Structured reports, cited chat answers, sensor-window summaries, spare procurement strategy |
| **Dashboard placeholder** | `ATAL_Project/frontend/src/app/sansad/hub/monitor/page.tsx` — live telemetry monitor · `hub/diagnostics/page.tsx` — asset health & RCA |

**Product surfaces:** **SANSAD** (telemetry / diagnostics / risk / actions hub) · **MANAS** (document-grounded maintenance chat wizard)

---

## SLIDE 4: Multi-Agent Swarm Orchestration Framework

| Element | Specification |
|---|---|
| **Orchestration engine** | LangGraph `StateGraph` — `apps/agents/graph/builder.py` |
| **Graph topology** | `context_injector` → `supervisor` → `{tool_node \| worker_node}` → `aggregator` (re-plan loop, `MAX_ITERATIONS` guard) |
| **Agent role 1 — Supervisor** | `supervisor_node` (`nodes.py`) — plans tool calls, dispatches worker tasks, emits final decision JSON via `qwen3.5:9b` |
| **Agent role 2 — Tool executor** | `tool_node` + `dispatch_tool()` (`tools.py`) — RAG retrieval, telemetry fetch, escalation; writes `AgentAuditLog` on every dispatch |
| **Agent role 3 — Specialist workers** | `WORKER_DISPATCH` (`agents.py`) — `WorkOrderDrafter`, `SensorWindowSummarizer`, `AlarmTriager`, `CitationFormatter`, `SpareStrategist` on `qwen3.5:0.8b` |
| **MANAS chat adjunct** | `chat_role_graph.py` — technician/supervisor 0.8b advisory bullets injected into 9b main answer (opt-in) |
| **Proof-of-concept placeholder** | `ATAL_Project/frontend/src/app/manas/chat/[[...sessionId]]/page.tsx` — streaming tokens, reasoning panel, citation cards |

---

## SLIDE 5: Deterministic Math Matrix — Prioritization Engine

| Element | Specification |
|---|---|
| **Primary formula (plant bottleneck)** | `composite = 0.20·PC + 0.22·DS + 0.28·HD + 0.18·(1−SA) + 0.12·PL` |
| **Variable — PC** | `process_criticality` — asset `criticality_level` mapped: critical=1.0, high=0.75, medium=0.45, low=0.2 |
| **Variable — DS** | `delay_severity` — max(recent unplanned downtime / 72h, live degradation proxy from health, anomaly, alerts, fault flag) |
| **Variable — HD** | `health_degradation` — `1 − health_score/100` from ML/twin payload |
| **Variable — SA** | `spares_availability` — fraction of required spare parts in stock |
| **Variable — PL** | `procurement_lead` — `min(max_lead_days / 60, 1.0)` across out-of-stock parts |
| **Constraint — label mapping** | `_composite_label()` maps composite + health_score → risk tier: low / medium / high / critical |
| **Secondary engine (asset plans)** | `score_asset()` — sklearn `LogisticRegression` (risk class) + `LinearRegression` (urgency) on feature vector `[health_norm, anomaly, rul_norm, spares_avail, criticality]` |
| **API endpoint** | `POST /api/v1/plant/bottleneck-score/` · `apps/consolidation/scoring.py` |
| **Layout proof asset** | `ATAL_Project/frontend/src/app/sansad/hub/risk/page.tsx` — ranked bottleneck table with procurement lead days |

---

## SLIDE 6: System Architecture & End-to-End Data Flow

| Stage | Path | Technology |
|---|---|---|
| **1 — Ingestion** | Corpus PDFs/MD → `download_corpus.sh` · live sensors → `synthetic.orchestrate_all` (10s) · fault messages → `POST /api/v1/maintenance/fault-messages/` · user uploads → MANAS chat attachments |
| **2 — Storage gateways** | TimescaleDB `SensorReading` · PostgreSQL transactional models · ChromaDB `chroma-data` volume · Redis broker/cache · `model-artifacts` volume |
| **3 — Processing core** | BGE-M3 embed + BM25 hybrid RRF (`apps/rag/retrieval.py`) · ML inference queue (`ml_inference`) · LangGraph consolidation · Ollama `qwen3.5:9b/0.8b` |
| **4 — Interface display** | Next.js 16 hub pages · Django Channels `/ws/telemetry` + chat stream · DRF JSON APIs under `/api/v1/` |
| **Sync vs async** | **Sync:** HTTP/WS chat turns, manual plan regen on django-backend thread, plant snapshot reads · **Async:** Celery queues (`default`, `telemetry`, `ml_inference`, `rag`, `alerts`), Beat schedules, WS broadcast |
| **Audit trail anchor** | `AgentAuditLog` (tool dispatch) · `users.AuditLog` · `MaintenanceReport` + `ChatMessage` persistence · `apps/maintenance/tasks.py` postgres/chroma backup tasks |
| **Visual output placeholder** | `ATAL_Project/frontend/src/app/sansad/hub/reports/page.tsx` — generated maintenance intelligence reports |

**Chronological flow (one line):** Sensors & docs in → TimescaleDB + Chroma + Postgres → ML + RAG + LangGraph → REST/WS → SANSAD/MANAS UI

---

## SLIDE 7: Secure, On-Premise Technology Stack Topology

### 2×2 Grid

| Layer | Stack components |
|---|---|
| **Client Presentation** | Next.js 16.2 · React 19 · TypeScript · Tailwind v4 · Framer Motion · react-markdown/remark-GFM · pdfjs-dist · Three.js/OGL factory canvas |
| **Service Async Orchestration** | Django 6 + DRF · Uvicorn ASGI · Django Channels · Celery 5.6 + Beat · Redis 8 · nginx 1.27 reverse proxy · JWT (`simplejwt`) |
| **Secure Intelligence Cell** | Ollama local LLM (`qwen3.5:9b`, `qwen3.5:0.8b`) · ChromaDB embedded · BAAI/bge-m3 (1024-dim) · bge-reranker-v2-m3 · LangChain/LangGraph · httpx to on-prem endpoints only |
| **Relational Master Ledger** | TimescaleDB PG17 (`atal_db`) · volumes: `postgres-data`, `chroma-data`, `redis-data`, `ollama-data`, `model-artifacts` |

| Element | Specification |
|---|---|
| **Network isolation** | `backend-net` internal bridge; frontend-net exposes UI/API ports only |
| **RAM/GPU shields** | Compose mem limits: django 4G · celery 6G · postgres 3G · redis 512mb maxmemory LRU · `OLLAMA_NUM_PARALLEL=1` · `OLLAMA_MAX_LOADED_MODELS=3` |
| **Screenshot placeholder** | `docker compose ps` / `scripts/verify-deploy.sh` terminal — health matrix for Django, Redis, Postgres, Celery, Ollama, Chroma |

---

## SLIDE 8: Bounded Grounding & Page-Boundary Traceability

| Element | Specification |
|---|---|
| **Document-mode guardrails** | `_MANAS_DOCUMENT_PROMPT` (`tasks.py`) — answer ONLY from numbered excerpts; forbid capability essays and fabricated thresholds |
| **Anti-hallucination rules** | No `[n]` citations without retrieved snippets · reject orphan citation markers (`stripOrphanCitationMarkers`) · `_is_gibberish()` filter on LLM polish output |
| **Retrieval boundary** | RAG opt-in only when user selects library/upload docs; hybrid BM25 + dense with `asset_id` / `asset_scope` metadata filters |
| **Intelligence polish constraint** | `_POLISH_SYSTEM` — "Do NOT invent assets, sensors, or numbers not in the draft"; `_merge_polish()` preserves base structured fields when LLM returns empties |
| **Citation mapping** | `_citation_from_chunk()` → `{index, title, section, excerpt}` · WS event `type: citations` · frontend `CitedMarkdown.tsx` `injectCitations()` / `[n]` markers |
| **Source trace UI** | `citation-preview.ts` · `DocumentPreviewModal.tsx` · `loadCitationPreview()` — links markers to manual/SOP/ISO chunk text |
| **Reranker gate** | Optional `RAG_USE_RERANKER` cross-encoder re-scores top hybrid hits before prompt injection |

---

## SLIDE 9: Human-in-the-Loop & Knowledge Capturing

| Element | Specification |
|---|---|
| **Chat thumbs feedback** | `ChatMessageFeedback` model · `POST` handlers in `agents/views.py` · `preference_profile.py` trait learning (concise, step-by-step, citation-heavy, etc.) |
| **Report expert overrides** | `Feedback` model — types: `confirm` / `correct` / `reject` with `corrected_values` JSON on `MaintenanceReport` |
| **Prompt patch loop** | `feedback/algorithms.py` → `build_prompt_patch()` aggregates corrections into runtime system addendum; weekly `export_training_dataset` → JSONL |
| **Session compaction** | `compaction.py` — auto-summarize history at 80% context budget; manual compact endpoint in `agents/views.py` |
| **Institutional memory storage** | Postgres: `feedback_feedback`, `agents_chat_message_feedback`, corrected report fields · `chroma_updated` flag on feedback rows for vector refresh pipeline |
| **UI capture points** | `MessageFeedback.tsx` (MANAS) · hub report feedback flows · role/advice toggles in `PromptInputWithActions.tsx` |

---

## SLIDE 10: Platform Resilience & Computation Performance

| Element | Specification |
|---|---|
| **Validated test gates** | `test_llm` (P2-042) · `test_rag_pipeline` (P2-043/044/045 ISO 4406) · `test_orchestration` · `test_manas_mode_matrix` · `test_intelligence_report` |
| **Deploy smoke suite** | `scripts/verify-deploy.sh` — Django `/health/`, Redis ping, Postgres ready, Celery ping, Ollama tags, Chroma collections populated |
| **Synthetic load fabric** | `apps/synthetic/` — 10s telemetry orchestration, fault-aware batch generation on trip, campaign hour advancement |
| **Caching layer** | Redis: Celery broker, regen status (`sansad:maintenance_plan_regen`), JWT/session-adjacent caches, prompt patch invalidation |
| **Model residency** | `OLLAMA_KEEP_ALIVE=-1` · `keep_ollama_warm` Beat task (15m) · BGE weights volume-mounted read-only |
| **Auto-resolution loops** | ML inference every 5m · drift check every 6h · telemetry WS broadcast 10s · anomaly-triggered intelligence regen thread · postgres/chroma scheduled backups (`maintenance/tasks.py`) |
| **Stress placeholder** | `apps/assets/anomaly_trip.py` simulated trip + `PlantSimulationView` / `AssetSimulationView` fault injection endpoints |

---

## SLIDE 11: Ingested Verification Matrix — System Datasets

### Unstructured Data Store

| Collection / path | Content |
|---|---|
| `data/corpus/equipment_manual/` | Danieli DANOIL, Parker HAGCC hydraulic cylinders, furnace/reheater OEM refs |
| `data/corpus/sop/` | Finishing stand roll-change SOPs, line walk-down procedures |
| `data/corpus/iso_standard/` | ISO 10816 vibration zones, ISO 4406 oil cleanliness |
| `data/corpus/safety_code/` | LOTO and plant safety reference codes |
| **Chroma collections** | `ISOStandard`, `SOP`, `SafetyCode`, `EquipmentManual`, `MaintenanceLog`, `ModelExplanation` |
| **RAG registry** | `rag.Document` — `doc_type`, `asset_scope`, `chroma_collection`, `local_path`, `indexed_at` |

### Structured Transactional Tables

| Domain | Models (PostgreSQL / Timescale) |
|---|---|
| **Plant topology** | `Factory`, `Asset`, `SensorDefinition`, `SparesPart`, `Organization`, `User` |
| **Telemetry & twins** | `SensorReading` (Timescale), `AssetTwinState`, `TwinStateHistory` |
| **ML** | `MLModel`, `MLPrediction` (RUL, anomaly, classifier outputs + SHAP) |
| **Maintenance ops** | `MaintenanceEvent`, `WorkOrder`, `DelayLog`, `FaultMessage`, `MaintenanceReport` |
| **Alerts & consolidation** | `AlarmEvent`, `ConsolidationResult` |
| **Agents & chat** | `ChatSession`, `ChatMessage`, `AgentAuditLog`, `ChatMessageFeedback` |
| **Feedback** | `Feedback` (report corrections) |
| **Synthetic provenance** | `SyntheticGenerationRun` |
| **Seeded demo users** | `create_demo_users` management command — tech_demo / supervisor_demo / admin_demo |

**Seed scripts:** `download_corpus.sh` · `download_models.sh` · `seed_spares` · `seed_intelligence_reports` · `setup_beat_schedules` · docker `entrypoint.sh` startup intelligence seed

---

## SLIDE 12: Final Submission Package & System Deliverables

| Deliverable | Completion state | Evidence |
|---|---|---|
| **Production frontend** | ✅ Live | Next.js SANSAD hub (diagnostics, risk, actions, reports, monitor, samvidhaan, factory canvases) + MANAS chat with streaming/citations |
| **Async backend core** | ✅ Live | Django 6 monolith: 15+ `/api/v1/` route groups, Channels WS, Celery worker/beat |
| **Distributed infrastructure** | ✅ Live | `docker-compose.yml` full stack: 10 services, GPU profile, nginx, healthchecks, volume persistence |
| **Automated DB seeders** | ✅ Live | Entrypoint migrate + demo users + spares catalog + intelligence reports on startup |
| **Configuration docs** | ✅ Present | `CLAUDE.md`, `Planning/Hand-Off/Hand-Off.md`, `Planning/Code Deets/master_tech_stack.md`, `MASTER_REQUIREMENTS.md`, `.env.gpu` template |
| **Presentation / walkthrough** | ✅ Present | This `Planning/PITCH_DECK.md` · Samvidhaan glossary (`GET /api/v1/glossary/`) · hub pillar pages §5.1–§5.4 |
| **Engineering verification checklist** | | |
| → LLM inference on-prem | ✅ | Ollama qwen3.5:9b + 0.8b |
| → RAG hybrid retrieval | ✅ | BGE-M3 + BM25 RRF + optional reranker |
| → Multi-agent orchestration | ✅ | LangGraph SANSAD + MANAS role graph |
| → Deterministic prioritization | ✅ | Bottleneck composite + sklearn threshold scorer |
| → Real-time telemetry UI | ✅ | `/ws/telemetry` + 10s synthetic + plant snapshot API |
| → Cited grounded answers | ✅ | Document-mode prompt + citation UI |
| → Feedback loop | ✅ | Chat thumbs + report correct/reject + training export |
| → On-prem deploy single command | ✅ | `docker compose up atal -d --build` |

**Submission bundle root:** `TATA_STEEL_AI_HACKATHON_26_ROUND_2/` — `ATAL_Project/{frontend,backend}` + `docker-compose.yml` + `Planning/`

---

*Generated from repository analysis — 2026-06-15*
