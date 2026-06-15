# ATAL — System Architecture

**Autonomous Troubleshooting, Asset Intelligence & Lifecycle Management**
Tata Steel AI Hackathon 2026 · Round 2 · Agentic AI Challenge

---

## 1. Overview

ATAL is an end-to-end **predictive maintenance and troubleshooting platform** for steel-plant
equipment. It fuses four capabilities behind one Docker Compose stack:

1. **Live telemetry simulation** — physics-shaped sensor streams for 8 assets across 2 factories.
2. **Asset intelligence** — deterministic health / RUL / anomaly engine with a sanity-gated ML
   fallback, surfaced as risk, diagnostics, cost and Pareto analytics.
3. **Agentic reasoning** — LangGraph multi-agent orchestration (SANSAD) and a grounded
   maintenance chat assistant (MANAS) with RAG over OEM manuals, SOPs, ISO standards and history.
4. **Lifecycle workflows** — action plans, spare-parts decisions, AI work-order generation and
   maintenance reports.

The product is split into two user-facing suites:

| Suite | Route | Purpose |
|-------|-------|---------|
| **SANSAD** | `/sansad/**` | Industrial telemetry dashboard — factory canvases, diagnostics, risk & priority, action plans, reports, historical logs, Samvidhaan analytics |
| **MANAS** | `/manas/**` | Conversational Maintenance Wizard — RAG-cited chat, multi-turn context, `/sansad` plant-context linking, deep-thinking mode |

---

## 2. Component Topology

```
                    ┌──────────────────────────────────────────────┐
  Browser ─────────►│  nginx :80  (reverse proxy + static files)    │
   :3000 / :80      └───────────────┬──────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────────┐
        │                           │                                │
┌───────▼────────┐         ┌────────▼─────────┐            ┌─────────▼─────────┐
│  ui-console     │  REST   │  django-backend  │  WebSocket │  ASGI / Channels  │
│  Next.js 16     │◄──────► │  DRF + Uvicorn    │◄──────────►│  /ws/telemetry …  │
│  React 19 :3000 │  /ws    │  :8000            │            │                   │
└─────────────────┘         └───┬───────┬───────┘            └───────────────────┘
                                │       │
              ┌─────────────────┘       └───────────────────┐
              │                                              │
      ┌───────▼────────┐   ┌──────────────┐        ┌─────────▼────────┐
      │ celery-worker  │   │ celery-beat   │        │  Ollama (GPU)     │
      │ threads pool   │   │ periodic jobs │        │  qwen3.5:9b +0.8b │
      └───┬────────┬───┘   └──────┬────────┘        └───────────────────┘
          │        │              │
   ┌──────▼──┐  ┌──▼───────┐  ┌───▼────────┐   ┌──────────────────────────┐
   │ Redis   │  │ ChromaDB │  │ PostgreSQL │   │  BGE-M3 + Reranker (GPU)  │
   │ broker/ │  │ vectors  │  │ TimescaleDB│   │  sentence-transformers    │
   │ cache   │  │ (volume) │  │ hypertables│   │  host-mounted weights     │
   └─────────┘  └──────────┘  └────────────┘   └──────────────────────────┘
```

### Services (docker-compose)

| Service | Image / Build | Role | Ports |
|---------|---------------|------|-------|
| `postgres-db` | timescale/timescaledb:pg17 | Relational + time-series (hypertables) | 5432 |
| `redis` | redis:8.0-alpine | Celery broker/result + cache + stream registry | 6379 |
| `ollama` | ollama/ollama:latest | LLM inference (GPU), auto-pulls qwen3.5 weights | 11434 (internal) |
| `ollama-warmup` | curlimages/curl | One-shot: pull + warm both LLMs before backend boots | — |
| `django-backend` | backend/Dockerfile | DRF API + Channels ASGI (Uvicorn), boot seed pipeline | 8000 |
| `celery-worker` | backend/Dockerfile | Async telemetry / ML / RAG / alerts (threads pool) | — |
| `celery-beat` | backend/Dockerfile | Periodic schedules (DatabaseScheduler) | — |
| `nginx` | nginx:1.27-alpine | Reverse proxy + static | 80 |
| `ui-console` | frontend/Dockerfile.dev | Next.js dev server | 3000 |
| `atal` | alpine | Aggregator — `docker compose up atal` starts the whole stack | — |

GPU is shared across `ollama`, `django-backend`, and `celery-worker` (BGE embeddings).
VRAM budget (16 GB): qwen3.5:9b ≈ 6 GB + 0.8b ≈ 0.8 GB + BGE ≈ 1.7 GB + KV headroom.

---

## 3. Data & Asset Model

**Two factories, eight assets:**

| Factory | Code | Assets |
|---------|------|--------|
| Horizon Foundry (hot rolling) | F1 | SRF (Slab Reheating Furnace), HHPD (High-Pressure Descaler), FS (Finishing Stand), HAGCC (Hydraulic AGC Cylinder) |
| Zephyr Sinter (cold rolling) | F2 | APT (Acid Pickling Tanks), TCMS (Tandem Cold Mill Stands), CGP (Continuous Galvanizing Pot), HPAK (High-Pressure Air Knives) |

Core Django apps:

| App | Responsibility |
|-----|----------------|
| `assets` | Factory / Asset / Sensor / Spares models, plant snapshot, diagnostics, calibration, simulate (fault injection) |
| `telemetry` | Time-series ingest + snapshot (TimescaleDB hypertables) |
| `synthetic` | Physics-shaped generators per asset, fault-kwarg injection |
| `twins` | `AssetTwinState` (health_score, campaign_hours, fault flags) |
| `ml` | Deterministic engine + sanity-gated pickled-model fallback, `MLPrediction`, SHAP explain |
| `consolidation` | Plant snapshot, bottleneck scoring, KPIs, cost analysis, LLM tool bridge |
| `rag` | ChromaDB client, BGE-M3 embedder, BM25 hybrid retrieval, reranker, ingest |
| `agents` | MANAS chat pipeline, LangGraph orchestration, SANSAD context mode, guardrails, prompt optimizer |
| `maintenance` | Action plans, spares decisions, work-order generation, intelligence reports |
| `reports` | Maintenance reports, alert reports |
| `alerts` | Alarm events, acknowledgements, notification feed |
| `users` | JWT auth, role-based demo users |

---

## 4. Asset Intelligence Engine (single source of truth)

`apps/ml/deterministic.py::compute_asset_state(asset)` is the **authoritative brain**. It produces
`{health_score, rul_hours, anomaly_score, fault_classification, criticality_level, risk_level,
components{…}}` from inputs that always obey the abnormality toggle:

- **campaign_hours** vs `CAMPAIGN_MAX` → life fraction.
- **live sensor-vs-threshold stress** (`sensor_stress_factor`).
- **`_fault_injected` / `_fault_type`** (twin) → forces anomaly high, health crash, RUL to floor.
- **active unacknowledged alerts** count.
- **criticality_level** → RUL ceiling band.

**Health:** condition-led baseline minus stress / anomaly / alert penalties; a fault clamps health
to ≤ ~35 and decays fast. **Anomaly:** `clamp(0.35·stress + 0.40·fault + 0.10·alert, 0..1)`,
≥ 0.7 whenever a fault is active. **RUL:** ranges **30–600 h** with criticality ceilings
(critical 120 / high 280 / medium 450 / low 600); a 30 h floor for non-failed assets, down to ~6 h
only on true imminent failure.

**ML as sanity-gated fallback.** The pickled XGBoost / IsolationForest models are attempted
best-effort; their RUL is blended (0.22 weight) **only if** the prediction is fresh (≤ 5 min),
plausible (`0 < ml_rul ≤ health_cap`), and not contradicting anomaly (≥ 0.6). Otherwise it is
ignored and the engine stays pure-physics. `run_all_asset_models` writes the deterministic result
into `MLPrediction` + `twin.health_score`, so every downstream endpoint (snapshot, bottleneck, KPIs,
diagnostics, cost) reads correct numbers with no endpoint changes.

**Abnormality toggle → 5 s rapid degradation.** `apps/assets/anomaly_trip.py` spawns a daemon
thread (no Celery) that re-asserts the fault every 5 s for ~90 s: advances campaign, regenerates a
faulted synthetic batch, recomputes state, evaluates thresholds, broadcasts WS telemetry. Health
collapses and anomaly rises live across diagnostics / risk / actions / reports / Samvidhaan; the
frontend drops its poll to 5 s while any fault is active. Clearing the trip acks all unacked alarms
and recovers the asset.

---

## 5. RAG Pipeline (MANAS grounding)

```
corpus docs ──► chunk ──► BGE-M3 embed (1024-dim) ──► ChromaDB
user query  ──► BGE-M3 embed ─┐
            └─► BM25 lexical ──┴─► hybrid fuse ──► (optional) BGE reranker ──► top-k ──► LLM context
```

- **Embeddings:** `BAAI/bge-m3` (1024-dim dense), host-mounted weights, GPU.
- **Retrieval:** dense (Chroma) + BM25 lexical, hybrid-fused.
- **Reranking:** `BAAI/bge-reranker-v2-m3` cross-encoder (toggle `RAG_USE_RERANKER`).
- **Corpus:** OEM equipment manuals, SOPs, ISO standards (e.g. ISO 4406 / 17359), safety codes
  (OSHA LOTO). Downloaded by `download_corpus.sh` with synthetic fallbacks for login-blocked URLs.
- **Security:** all corpus + history stays inside the deployment boundary — **no external API calls**
  (REQ-SECURITY-005). The only model endpoints are the in-cluster Ollama and local BGE weights.

---

## 6. Agentic Layer

### MANAS chat pipeline (`apps/agents/tasks.py::run_chat_logic`)
Thread-safe, **Celery-free for all LLM work** (Celery + Ollama is unreliable under load). Stages:
input guardrails → RAG retrieval (if docs selected) → role advisory (0.8b workers) → system-prompt
assembly → **native `/api/chat` streaming** from qwen3.5:9b with token + thinking channels → output
finalisation / CoT-leak salvage → persistence + WebSocket `done`.

### `/sansad` context mode (`apps/agents/sansad_context_mode.py`)
Links live plant state into the chat. On activation a background thread harvests a plant-wide bundle
(snapshots, alarms, events, reports, 90-day dossiers, cost, KPIs), summarises it via the **9b model**
into a dense briefing stored on the session, and injects it into every answer. A dedicated 9b answer
path (`sansad_llm_answer`) recovers if the main stream returns an empty / CoT-only body. Auto-refresh
every N turns. *Context sizing is kept under Ollama's default 4096-token window so the model always
has room to generate.*

### SANSAD orchestration (`apps/agents/graph/`)
LangGraph multi-agent graph for cross-stage reasoning and role-tailored advisories; small-model
(0.8b) worker calls are serialised behind a process-wide lock (parallel 0.8b calls crash Ollama
while the 9b is resident).

### Guardrails & prompt optimizer
Input/output guardrails (profanity / off-topic / steer) and an on-demand prompt optimizer, all
serialised through the same small-model lock with retry.

---

## 7. Real-time Transport (Channels)

| WebSocket | Consumer | Payload |
|-----------|----------|---------|
| `/ws/telemetry` | TelemetryConsumer | Live sensor frames, plant snapshot refresh |
| `/ws/twins/<asset_id>/` | TwinStateConsumer | Twin health/RUL updates |
| `/ws/alerts/` | AlertConsumer | Alarm events |
| `/ws/chat/<session_id>/` | LLMStreamConsumer | MANAS token / thinking / phase / done stream |
| `/ws/orchestration/<asset_id>/` | OrchestrationConsumer | LangGraph step events |

An in-process asyncio stream registry (with a Channels group_send fallback) delivers LLM tokens
without a Redis round-trip.

---

## 8. Boot Pipeline (one `docker compose up`)

`django-backend` entrypoint runs idempotently on every boot:

1. Wait for Postgres + Redis; wait for Ollama and **pull qwen3.5 models if missing**, then warm.
2. Apply migrations → set up TimescaleDB hypertables.
3. Create demo users; init ChromaDB collections.
4. Seed asset fixtures, spares catalog, initial synthetic telemetry.
5. **Calibrate sensor thresholds** from nominal generator output.
6. Optional corpus ingest (`INGEST_CORPUS_ON_START=1`).
7. Collect static; seed Celery Beat schedules; queue first live telemetry batch.
8. Fast ML training (skip-if-exists); queue ML inference for all assets.
9. Background thread seeds intelligence reports (sync Ollama, no Celery).
10. Non-fatal smoke tests; re-warm; final migration pass; serve.

The only host prerequisite is `bash scripts/setup_assets.sh` (BGE weights + corpus) — everything
else is automatic.

---

## 9. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16.2, React 19, TypeScript, Tailwind v4 |
| Backend | Django 6, Django REST Framework, Channels, Celery 5 |
| Database | PostgreSQL 17 + TimescaleDB hypertables |
| Vector / RAG | ChromaDB + BGE-M3 (1024-dim) + BGE reranker v2-m3 + BM25 hybrid |
| LLM | Ollama — qwen3.5:9b (supervisor) + qwen3.5:0.8b (workers) |
| Agents | LangGraph orchestration, role advisory, `/sansad` context mode |
| ML | Deterministic engine + sanity-gated XGBoost / scikit-learn fallback, SHAP explain |
| Realtime | Django Channels WebSockets (ASGI / Uvicorn) |
| Runtime | Docker Compose, NVIDIA GPU |

---

## 10. Security & Constraints

- **REQ-SECURITY-005** — all manuals/histories stay within the deployment boundary; no external
  cloud API calls. LLM is local Ollama; embeddings are local BGE weights.
- **REQ-SECURITY-006** — secrets via per-environment `.env` files, never committed.
- **No Celery for LLM tasks** — every LLM call path is inline / threaded.
- Context window (`num_ctx`) is left at the model default; inputs are sized to fit rather than
  shrinking the window.
