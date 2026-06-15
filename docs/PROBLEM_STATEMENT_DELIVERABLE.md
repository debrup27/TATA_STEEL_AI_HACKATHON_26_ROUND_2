# ATAL — Custom Technical Documentation

**Tata Steel AI Hackathon 2026 · Round 2 · Agentic AI Challenge**

This document satisfies the problem statement **§9 Deliverables**: system architecture, technology stack, data and system flows, model design and reasoning pipeline, alerting and prediction logic, plus assumptions and limitations.

> **Expanded reference:** [SYSTEM_ARCHITECTURE.md](../SYSTEM_ARCHITECTURE.md) in the repository root contains additional Mermaid diagrams and component-level detail.

---

## Document Control

| Field | Value |
|-------|-------|
| **Project** | ATAL — Autonomous Troubleshooting, Asset Intelligence & Lifecycle Management |
| **Submission** | TATA_STEEL_AI_HACKATHON_26_ROUND_2 |
| **Plant model** | 2 factories (Horizon F1, Zephyr F2), 8 assets, simulated telemetry |
| **Primary users** | Maintenance engineers, reliability supervisors, plant managers |

---

## 1. Executive Summary

ATAL is an intelligent **Maintenance Wizard** for steel manufacturing equipment. It addresses fragmented maintenance information (manuals, SOPs, logs, sensor alerts) by providing:

1. **SANSAD** — A real-time plant dashboard with ML-driven diagnostics, risk prioritization, action plans, and intelligence reports.
2. **MANAS** — A conversational agent with RAG-grounded answers, multi-turn context, role-aware reasoning, and streaming citations.
3. **Unified data plane** — Digital twins, TimescaleDB telemetry, consolidation orchestration, and feedback loops for continuous improvement.

The solution supports both **reactive troubleshooting** (fault messages, RCA, MANAS chat) and **proactive maintenance** (RUL, anomaly detection, PdM cost analysis, scheduled action plans).

---

## 2. Problem Statement Traceability

### 2.1 Expected inputs (§4)

| Input type | ATAL implementation |
|------------|---------------------|
| **Operational / failure** | `POST /maintenance/fault-messages/`, `POST /maintenance/failure-reports/`, delay logs, system log stream |
| **Condition monitoring** | Telemetry ingest, twin state, threshold alarms, anomaly trip simulation |
| **Knowledge docs** | RAG corpus: equipment manuals, SOPs, ISO standards, safety codes, maintenance logs |
| **User interaction** | MANAS multi-turn chat, slash commands, SANSAD inline insights, glossary deep-links |

### 2.2 Expected outputs (§5)

| Output (§5) | Primary surface | Backend modules |
|-------------|-----------------|-----------------|
| **§5.1 Diagnostics & Prediction** | `/sansad/hub/diagnostics` | `diagnostics_service`, `fault_diagnosis`, `ml.inference`, `rul_calculator` |
| **§5.2 Risk & Priority** | `/sansad/hub/risk` | `bottleneck_score`, `prediction` services, spares model |
| **§5.3 Maintenance Actions** | `/sansad/hub/actions` | `action_plans`, `intelligence_report`, `work_orders` |
| **§5.4 Reporting** | `/sansad/hub/reports` | `reports`, alert reports, digital logbook tasks |

### 2.3 Functional requirements (§6)

| Requirement | How ATAL meets it |
|-------------|-------------------|
| **LLM/SLM contextual reasoning** | Ollama `qwen3.5:9b` + `0.8b` role workers; prompts in `agents/prompts` |
| **Knowledge integration** | ChromaDB RAG + hybrid BM25/BGE retrieval |
| **Natural language interaction** | MANAS chat sessions, compaction, preference feedback |
| **Explainable recommendations** | Citations, RCA weights, SHAP (ML), structured report fields |
| **Abnormality & failure prediction** | Isolation Forest / XGBoost + deterministic physics fallback |
| **Feedback-driven improvement** | Report feedback, chat thumbs up/down, `preference_profile` |
| **Real-time alerting** | WebSocket alerts, notification feed, alarm acknowledge flow |

---

## 3. System Architecture

### 3.1 Logical architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                                 │
│  Next.js 16 · React 19 · TypeScript · Tailwind                           │
│  Routes: /sansad/* (dashboard)  /manas/chat (wizard)  /login (JWT)       │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTPS REST + WSS
┌───────────────────────────────▼──────────────────────────────────────────┐
│                     APPLICATION / API LAYER                               │
│  Django 6 + DRF + Channels (ASGI/Uvicorn)                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│  │   assets    │ │  telemetry  │ │     ml      │ │      agents         │ │
│  │ diagnostics │ │    twins    │ │consolidation│ │  (MANAS chat/RAG)   │ │
│  │ maintenance │ │   alerts    │ │   reports   │ │                     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘ │
└───────┬─────────────────┬─────────────────┬──────────────────────────────┘
        │                 │                 │
┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼──────────────────────────────┐
│  PostgreSQL   │ │     Redis     │ │  Ollama (GPU) + BGE-M3 embeddings    │
│  TimescaleDB  │ │ Celery broker │ │  ChromaDB vector store (volume)      │
│  Asset ledger │ │  result cache │ │  Model artifacts volume            │
└───────────────┘ └───────────────┘ └──────────────────────────────────────┘
```

### 3.2 Physical deployment (Docker Compose)

| Service | Image / build | Port | Role |
|---------|---------------|------|------|
| `ui-console` | Next.js dev/prod | 3000 | Frontend |
| `nginx` | nginx:1.27 | 80 | Reverse proxy, static files |
| `django-backend` | Python 3.12 Dockerfile | 8000 | API + WebSockets |
| `celery-worker` | Same backend image | — | Async: chat, RAG ingest, ML, telemetry |
| `celery-beat` | Same backend image | — | Scheduled training, telemetry ticks |
| `postgres-db` | TimescaleDB PG17 | 5432 | Relational + time-series |
| `redis` | redis:8-alpine | 6379 | Broker + cache |
| `ollama` | ollama:latest | 11434 (internal) | LLM inference |
| `ollama-warmup` | curl init container | — | Pull/warm qwen models |

Networks: `frontend-net` (nginx, ui, django public), `backend-net` (internal DB/Redis/Ollama).

### 3.3 Security boundaries

1. **JWT authentication** on all `/api/v1/*` except token obtain/refresh and health.
2. **Role-based restrictions** — admin-only: ML retrain, RAG ingest, user admin; supervisor+: maintenance event writes.
3. **LLM tool boundary** — Models do not write directly to PostgreSQL; they invoke structured Python services and serializers.
4. **Local inference** — Ollama + Chroma run on-premise in containers; no document content sent to external APIs in default configuration.
5. **CORS** restricted to local frontend origins in development.

---

## 4. Technology Stack

### 4.1 Implemented stack (as-built)

| Layer | Components | Version / notes |
|-------|------------|-----------------|
| Frontend | Next.js, React, TypeScript, Tailwind, Framer Motion | Next 16.2, React 19 |
| API framework | Django, DRF, SimpleJWT | Django 6.0.6 |
| Real-time | Django Channels, Uvicorn | WebSocket consumers |
| Task queue | Celery, django-celery-beat, django-celery-results | Redis broker |
| OLTP / TSDB | PostgreSQL 17, TimescaleDB hypertables | Sensor readings |
| Vector store | **ChromaDB** (embedded, `chroma-data` volume) | Not Weaviate |
| Embeddings | BAAI/bge-m3 | 1024 dimensions, FlagEmbedding |
| Reranker | BAAI/bge-reranker-v2-m3 | Optional (`RAG_USE_RERANKER`) |
| Keyword search | BM25 in-process index | RRF fusion with dense |
| LLM | **Ollama** qwen3.5:9b + 0.8b | OpenAI-compatible `/v1/chat/completions` |
| ML | scikit-learn, XGBoost, LightGBM artifacts | + deterministic fallback |
| Containers | Docker Compose | GPU profile for Ollama |

### 4.2 Planned vs implemented

Early architecture documents (`Planning/Code Deets/master_tech_stack.md`) reference Weaviate, LangGraph, MLflow, and cloud Claude/GPT APIs. The **submitted prototype** prioritizes:

- **ChromaDB** over Weaviate (simpler embedded deployment)
- **Ollama** over cloud APIs (data sovereignty, offline demo)
- **Custom orchestration** in `consolidation/` + `agents/` over full LangGraph productization (LangChain/LangGraph libraries remain available in requirements for extension)

---

## 5. Data Flow

### 5.1 Telemetry → twin → alert flow

```
Sensor simulator / ingest API
        │
        ▼
POST /api/v1/telemetry/ingest/
        │
        ├──► TimescaleDB (SensorReading hypertable)
        │
        ├──► AssetTwinState update (health_score, campaign_hours)
        │
        ├──► Threshold evaluation → AlarmEvent
        │
        └──► Channel layer → WS /ws/telemetry broadcast
```

**Health score** derives from twin state and degradation campaigns. **RUL** combines ML prediction, campaign hours, health, anomaly score, and sensor stress (`assets/rul_calculator.py`).

### 5.2 ML inference → diagnostics flow

```
Celery beat / manual refresh / consolidation trigger
        │
        ▼
ml.tasks.run_all_asset_models (per asset)
        │
        ├──► Load artifact from model-artifacts OR deterministic.py fallback
        │
        ├──► MLPrediction row (anomaly_score, fault_classification, rul_hours, SHAP)
        │
        └──► diagnostics_service.build_asset_diagnostic()
                    │
                    ├── probableFault (text, LLM-polished or rule-based)
                    ├── faultClass (numeric ML class)
                    ├── rootCauses[] (weighted factors + evidence)
                    ├── processDefects[] (cross-stage links)
                    └── sensors[] (envelope status)
```

### 5.3 Consolidation → intelligence report flow

```
POST /api/v1/consolidate/{asset_id}/
        │
        ▼
consolidation.orchestrator.assemble_consolidated_payload()
        │
        ├── Twin state
        ├── ML predictions (dispatch fresh inference)
        ├── 24h sensor aggregates
        ├── Active alarms
        ├── Spares availability
        └── Maintenance history
        │
        ▼
SANSAD agent runner (multi-step graph)
        │
        ▼
MaintenanceReport + ActionPlan + optional logbook draft
        │
        └──► WS /ws/orchestration/{asset_id}/ (step events)
```

### 5.4 MANAS chat → RAG → LLM flow

```
POST /api/v1/chat/sessions/{id}/message/
        │
        ▼
agents.tasks.run_chat_logic()
        │
        ├── 1. Load session history + preference profile
        ├── 2. Optional 0.8b role advisory pass (advice_mode)
        ├── 3. RAG retrieval:
        │      ├── Collection filters (manual, sop, iso, …)
        │      ├── BM25 + BGE-M3 hybrid (retrieval.py)
        │      ├── Custom upload chunks
        │      └── Optional reranker
        ├── 4. Build system prompt + plant context injection
        ├── 5. Ollama stream (qwen3.5:9b, think=false default)
        ├── 6. WS emit tokens / reasoning / citations
        └── 7. Persist assistant message + feedback hooks
```

### 5.5 Frontend data flow

```
Browser
  ├── REST (api.ts) → django-backend:8000 /api/v1/*
  ├── WSS (ws.ts)   → ws://host:8000/ws/*
  └── Next.js rewrites (SSR) → BACKEND_INTERNAL_URL

Hooks:
  usePlantSnapshot ──► /plant/snapshot/ (poll 15s, 5s when anomaly active)
  useChatStream    ──► /ws/chat/{sessionId}/
  useNotificationFeed ──► /notifications/feed/
```

---

## 6. System Flow (End-to-End Scenarios)

### 6.1 Scenario A — Abnormality detected proactively

1. Telemetry tick pushes vibration above envelope.
2. Twin health drops; `AlarmEvent` created (severity warning/critical).
3. Notification feed ticker updates; log stream shows entry.
4. Diagnostics page shows `probableFault`, elevated `faultClass`, reduced RUL.
5. Risk page elevates urgency score (criticality × delay × spares).
6. Action plan recommends immediate steps; supervisor regenerates plan with LLM polish.
7. Engineer opens MANAS, attaches relevant manual, asks for repair procedure with citations.

### 6.2 Scenario B — Engineer asks a troubleshooting question (reactive)

1. Engineer logs in → `/manas/chat`.
2. Selects SOP + ISO documents in RAG selector.
3. Asks: *"Header pressure dropped to 181 bar during rolling — what should I check first?"*
4. Backend retrieves HHPD manual chunks + ISO 4406 section.
5. Streaming answer cites sources; context panel shows citation cards.
6. Engineer gives thumbs up → preference profile adjusts future tone/detail.

### 6.3 Scenario C — Supervisor reviews plant economics

1. Opens Samvidhaan → Graphs.
2. `GET /plant/cost-analysis/` returns per-factory loss-if-no-action vs PdM savings.
3. Chart compares F1 and F2; cards show per-asset RUL and ₹ lakh impact.
4. Supervisor opens Reports for decision summary export.

---

## 7. Model Design & Reasoning Pipeline

### 7.1 ML models

| Model purpose | Approach | Output |
|---------------|----------|--------|
| **Anomaly detection** | Isolation Forest on sensor feature vectors | `anomaly_score` 0–1 |
| **Fault classification** | XGBoost/LightGBM multi-class | `fault_classification` integer class |
| **RUL estimation** | Regression + physics blend | `rul_hours` |
| **Fallback** | `ml/deterministic.py` | Physics-based when artifacts missing |

Training: `ml/trainer.py`, scheduled via Celery beat (`setup_beat_schedules`). Artifacts stored in `model-artifacts` volume. SHAP explanations via `predictions/{pk}/explain/`.

### 7.2 RUL composition

`compute_rul()` blends:

- Latest ML `rul_hours` prediction
- Campaign operating hours (degradation simulation)
- Health score decay curve
- Anomaly score penalty
- Sensor envelope stress

Output is clamped to sane bounds (`MAX_SANE_RUL_HOURS`).

### 7.3 RAG design

| Stage | Detail |
|-------|--------|
| **Chunking** | `rag/chunker.py` — structure-aware splits for manuals/SOPs |
| **Embedding** | BGE-M3 1024-dim dense vectors |
| **Keyword** | BM25 index rebuilt on ingest |
| **Fusion** | Reciprocal Rank Fusion (RRF) |
| **Rerank** | Cross-encoder BGE reranker v2-M3 (chat path, optional) |
| **Collections** | Per doc type: ISO, SOP, manual, safety, maintenance_log |

Validated gate: ISO 4406 **16/14/11** exact retrieval (`test_rag_pipeline`).

### 7.4 LLM reasoning (MANAS)

| Component | Model | Role |
|-----------|-------|------|
| **Primary** | qwen3.5:9b | Answer generation, report polish, work orders |
| **Advisory** | qwen3.5:0.8b | Role-specific briefing before main answer |
| **Prompt layers** | `system` + `plant_context` + `rag_context` + `preference_profile` | |
| **Deep thinking** | Ollama `think=true` | Separate reasoning channel; salvage if content empty |
| **Compaction** | Summarize old turns | Long session token management |

Ollama calls use OpenAI-compatible API with `"think": false` by default for latency.

### 7.5 Intelligence report generation

`maintenance/intelligence_report.py`:

1. **Threshold base** — structured fields from diagnostics + spares + risk scorer.
2. **LLM polish** — Ollama rewrites narrative sections; `_merge_polish` preserves structured lists if LLM returns empty arrays.
3. **Persistence** — `MaintenanceReport`, linked `ActionPlan`, optional `WorkOrder`.

### 7.6 Predictive cost model

`assets/pareto_maintenance.py` + `plant/cost-analysis`:

- **Loss if no action** — run-to-failure downtime cost × failure probability.
- **PdM savings** — 70–88% of loss avoidable via planned maintenance.
- **Per-asset floor/ceiling** bands for demo stability.
- **Pareto frontier** — defer fraction vs savings trade-off for Samvidhaan graphs.

---

## 8. Alerting & Prediction Logic

### 8.1 Threshold alarms

- Defined per sensor in asset configuration.
- On ingest: compare reading → create `AlarmEvent` with severity, ISO reference, message.
- Unacknowledged alarms count toward asset health display.

### 8.2 Anomaly score

- ML Isolation Forest or deterministic stress index.
- Feeds diagnostics `earlyWarning` text and RUL penalty.

### 8.3 Anomaly trip simulation

- `POST /simulate/trip/` injects fault into campaign simulator.
- Rapid degradation loop (5s plant snapshot polling when active).
- Cleared via `/simulate/trip/clear/`.

### 8.4 Notification feed

`GET /notifications/feed/` aggregates:

- Recent alarms
- ML predictions (RUL highlights)
- Orchestration status strings
- Pre-built `ticker_items` for UI marquees

### 8.5 WebSocket alerting

| Channel | Audience |
|---------|----------|
| `/ws/telemetry` | All connected dashboards |
| `/ws/alerts/` | Authenticated user + broadcast |
| `/ws/orchestration/{asset_id}/` | Per-asset agent progress |

### 8.6 Risk / urgency scoring

Bottleneck composite combines:

- Process criticality (asset type weight — e.g. FS, CGP = 0.35)
- Health inverse
- RUL horizon
- Delay severity
- Spares availability (`full` / `partial` / `none`)
- Procurement lead days

---

## 9. Plant Equipment Model

### 9.1 Factories

| Factory | Code | Process line |
|---------|------|--------------|
| Horizon Foundry | F1 | Hot rolling |
| Zephyr Sinter | F2 | Cold rolling & coating |

### 9.2 Assets (8 total)

| Code | Name | Factory |
|------|------|---------|
| SRF | Slab Reheating Furnace | F1 |
| HHPD | High-Pressure Descaler | F1 |
| FS | Finishing Stands F1–F7 | F1 |
| HAGCC | Hydraulic AGC Cylinders | F1 |
| APT | Acid Pickling Tanks | F2 |
| TCMS | Tandem Cold Mill Stands | F2 |
| CGP | Continuous Galvanizing Pot | F2 |
| HPAK | High-Pressure Air Knives | F2 |

Onboarding: `FactoryOnboardService` in `assets/services.py` seeds factories, assets, sensors, spares, and initial twin state.

---

## 10. Feedback & Continuous Improvement

| Mechanism | Storage | Effect |
|-----------|---------|--------|
| Report feedback (confirm/reject/correct) | `reports` models | Tunes future report acceptance |
| Chat thumbs up/down | `ChatMessageFeedback` | Updates `preference_profile` style summary |
| Maintenance event outcomes | `MaintenanceEvent` | Informs last-maintenance context in health API |

---

## 11. Installation & Configuration Summary

See **[README.md](./README.md)** for step-by-step install. Critical paths:

```bash
bash ATAL_Project/backend/scripts/download_models.sh
bash ATAL_Project/backend/scripts/download_corpus.sh
cp ATAL_Project/backend/env/.env.gpu .env
fish -c "docker compose up atal -d --build"
bash ATAL_Project/backend/scripts/verify-deploy.sh
```

Backend entrypoint (`docker/entrypoint.sh`) runs migrations, demo users, corpus ingest (optional), ML training stubs, and sets readiness marker.

---

## 12. Assumptions

1. **Simulated plant** — Telemetry is generated/simulated; not connected to live Tata Steel SCADA in this prototype.
2. **Two factories** — Scope limited to F1/F2 with four assets each (not full steelworks chain).
3. **GPU recommended** — Ollama 9B + BGE-M3 concurrently expect ~8–10 GB VRAM; CPU mode degrades latency sharply.
4. **English language** — UI, corpus, and LLM prompts are English-first.
5. **Single-tenant demo** — Multi-org admin APIs exist but demo uses shared plant data.
6. **Corpus provided offline** — Documents downloaded via `download_corpus.sh`; not scraped from external networks at runtime.
7. **JWT demo auth** — No SSO/LDAP integration in hackathon build.
8. **Cost figures in ₹ lakh** — Predictive cost analysis uses calibrated demo bands, not live finance ERP data.

---

## 13. Limitations

| Area | Limitation |
|------|------------|
| **Scale** | Not load-tested for plant-wide thousands of assets |
| **LLM reliability** | Ollama polish may fail silently; structured fallbacks preserve data |
| **RAG coverage** | Limited to ingested corpus; unknown docs return general knowledge only |
| **ML accuracy** | Training data is synthetic/competition-oriented; not validated on real failure history |
| **LangGraph** | Full multi-agent graph is partially implemented; consolidation uses Python orchestrator |
| **Weaviate** | Not deployed; ChromaDB used instead |
| **Mobile UI** | Several SANSAD pages show simplified mobile placeholder |
| **i18n** | No Hindi/regional language support |
| **Offline MANAS preview** | Landing demo does not call backend — login required for real chat |

---

## 14. Sample Inputs & Outputs

### Input: PLC fault message

```http
POST /api/v1/maintenance/fault-messages/
{ "asset_id": "...", "code": "HHPD_PRESS_LOW", "message": "Header pressure below interlock" }
```

### Output: Diagnostic payload (excerpt)

```json
{
  "probableFault": "High-Pressure Descaler header pressure envelope breach",
  "faultClass": 2,
  "faultConfidence": 0.87,
  "rulHours": 48,
  "rootCauses": [
    { "factor": "Pump wear", "weight": 0.42, "evidence": "Flow-efficiency index declining 14d" }
  ],
  "earlyWarning": "Critical within 72h if trend continues"
}
```

### Input: MANAS chat question

*"What ISO 4406 code applies to HAGCC hydraulic oil?"*

### Output: Streaming answer with citation

Assistant text references loaded ISO standard chunk; context panel shows `ISO 4406:2021` source card with excerpt.

---

## 15. Validation & Test Evidence

| Test | Command | Proves |
|------|---------|--------|
| LLM | `manage.py test_llm` | Ollama reachable, completion works |
| RAG | `manage.py test_rag_pipeline` | 1024-dim embeddings, reranker ≥0.9, ISO retrieval |
| MANAS matrix | `manage.py test_manas_mode_matrix` | Role × RAG × advice combinations |
| Deploy | `scripts/verify-deploy.sh` | Full stack health |
| Frontend | `npm run lint && npm run build` | UI compiles clean |

---

## 16. References

| Document | Location |
|----------|----------|
| User guide | [USER_GUIDE.md](./USER_GUIDE.md) |
| API reference | [API_DOCS.md](./API_DOCS.md) |
| Install quick start | [README.md](./README.md) |
| Problem statement | `Planning/MDs/tata_steel_ai_hackathon_problem_statement.md` |
| Tech stack (planning) | `Planning/Code Deets/master_tech_stack.md` |
| Pitch deck | `Planning/PITCH_DECK.md` |

---

*This custom documentation package is submitted as part of the Tata Steel AI Hackathon 2026 Round 2 deliverables. It describes the as-built ATAL prototype as of June 2026.*
