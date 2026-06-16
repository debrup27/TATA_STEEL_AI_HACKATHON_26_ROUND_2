# System Architecture

## 1. Topology

ATAL runs as a single Docker Compose project (`name: atal`). All services share two
bridge networks (`frontend-net`, `backend-net`); only the UI, nginx and backend ports are
published.

```
                        ┌─────────────┐
   Browser ───────────► │   nginx     │ :80  (reverse proxy)
        │               └──────┬──────┘
        │ :3000                │ /api, /ws
        ▼                      ▼
 ┌───────────────┐     ┌──────────────────────┐      ┌──────────────┐
 │  ui-console   │     │   django-backend     │◄────►│   ollama     │
 │  Next.js 16   │◄───►│ DRF + Channels (ASGI)│ :8000│ qwen3.5 9b/  │
 │  SANSAD/MANAS │ WS  │  uvicorn, no reload  │      │ 0.8b (GPU)   │
 └───────────────┘     └───────┬──────────────┘      └──────────────┘
                               │
        ┌──────────────────────┼───────────────────────────┐
        ▼                      ▼                            ▼
 ┌──────────────┐     ┌──────────────┐            ┌──────────────────┐
 │ postgres-db  │     │   redis      │            │  celery-worker   │
 │ TimescaleDB  │     │ broker+cache │◄──────────►│  + celery-beat   │
 │  (hypertbls) │     │              │            │ (NO LLM tasks)   │
 └──────────────┘     └──────────────┘            └──────────────────┘
   ChromaDB (embedded in django + celery)  ·  BGE-M3 + reranker on GPU
```

| Service | Tech | Port | Role |
|---|---|---|---|
| `ui-console` | Next.js 16.2 / React 19 | 3000 | SANSAD dashboard + MANAS chat |
| `django-backend` | Django 6 + DRF + Channels (uvicorn ASGI) | 8000 | REST API, WebSockets, RAG, ML, agents |
| `ollama` | ollama/ollama + qwen3.5:9b & :0.8b | 11434 (internal) | LLM inference (GPU-resident) |
| `celery-worker` | Celery 5 (threads pool) | — | Async non-LLM work (telemetry, ML, ingestion, backups) |
| `celery-beat` | Celery beat | — | Periodic schedules |
| `postgres-db` | TimescaleDB (pg17) | 5432 | Relational + time-series telemetry |
| `redis` | redis:8 | 6379 | Celery broker/result, cache |
| `nginx` | nginx:1.27 | 80 | Reverse proxy (API + WS + UI) |
| `ollama-warmup` | curl sidecar | — | Pulls + warms models before backend serves |

## 2. The dual-engine design (the core idea)

The single most important architectural decision: **a deterministic physics-grounded
engine is the source of truth for health, RUL, anomaly and fault** — not a black-box ML
model. ML and the LLM are layered on top, never trusted blindly.

```
 live telemetry ─┐
 thresholds ─────┤
 campaign age ───┼──►  Deterministic Engine  ──►  health · RUL · anomaly · fault · risk
 active alarms ──┤    (apps/ml/deterministic.py)        │
 criticality ────┘                                      │
                                                        ▼
            pickled ML (XGBoost / IsolationForest) ──► sanity-gated fallback
            (used only if it arrives instantly AND is plausible vs the engine)
                                                        │
                                                        ▼
                          LLM (qwen3.5) ──► narrative: diagnosis prose, RCA, reports, chat
```

- **Deterministic engine** (`apps/ml/deterministic.py::compute_asset_state`) computes a
  bounded health score, RUL (30–600 h band, criticality-ceilinged), anomaly score and
  fault classification from live sensor stress vs calibrated thresholds, campaign hours,
  active alarms, an injected-fault flag and criticality. It always obeys the abnormality
  toggle and never produces NaN/None.
- **Sanity-gated ML** — per-asset XGBoost (RUL regressor, fault classifier) and
  IsolationForest (anomaly) trained on synthetic physics data. Their output is used only
  when it is fresh (≤5 min), plausible (0 < RUL ≤ engine cap) and consistent with the
  anomaly score. Otherwise it is ignored. This means a broken/degenerate model can never
  corrupt the dashboard.
- **LLM** generates only *explanations and narrative* (diagnosis text, RCA, work orders,
  intelligence reports, chat answers), grounded in the deterministic numbers + RAG.

Rationale and trade-offs: see [METHODOLOGY.md](./METHODOLOGY.md).

## 3. RAG stack

Document-grounded answering for MANAS and the agentic graph.

```
 corpus (manuals, SOPs, ISO, safety) ─► chunk ─► BGE-M3 embed (1024-d) ─► ChromaDB
                                                                              │
 user query ─► BGE-M3 embed ─┬─► dense top-k ──┐                             │
                             └─► BM25 lexical ──┤  hybrid fuse ─► BGE reranker v2-m3 ─► top-n
                                                ┘     (cross-encoder)              │
                                                                                   ▼
                                                              numbered excerpts + [n] citations
```

- **Embedder:** BAAI/bge-m3 (1024-dim dense), loaded on GPU (`EMBEDDING_DEVICE=cuda`).
- **Vector store:** ChromaDB, embedded in-process in both Django and Celery.
- **Hybrid retrieval:** dense (Chroma) + BM25 lexical, fused.
- **Reranker:** BAAI/bge-reranker-v2-m3 cross-encoder (optional, `RAG_USE_RERANKER`).
- **Corpus:** OEM equipment manuals, maintenance SOPs, ISO 17359, OSHA 1910.147 (LOTO),
  galvanizing/descaler/TCMS process guides — auto-downloaded on first boot.

## 4. Agentic reasoning graph (the "Agentic AI Challenge")

SANSAD consolidation runs a two-tier LangGraph pipeline:

```
 payload (deterministic state + telemetry + history)
        │
        ▼
 ┌──────────────────────────────┐      whitelisted tools
 │  Supervisor  (qwen3.5:9b)    │────► run_ml_inference, query_twin_state,
 │  reason · plan · dispatch    │◄──── check_drift, retrieve_docs,
 └───────┬──────────────────────┘      create_work_order, escalate, request_retrain
         │ worker_tasks
         ▼
 ┌──────────────────────────────┐
 │  Workers  (qwen3.5:0.8b)     │  WorkOrderDrafter, SensorWindowSummarizer,
 │  parallel bounded transforms │  AlarmTriager, CitationFormatter, SpareStrategist
 └───────┬──────────────────────┘
         ▼
 ┌──────────────────────────────┐
 │  Aggregator                  │  merges supervisor decision + worker output
 │  + DETERMINISTIC FALLBACK    │  if the LLM loops out without a decision, a valid
 └──────────────────────────────┘  DecisionOutput is synthesised from the engine
```

Key robustness properties:

- The supervisor's tool calls are dispatched with the **graph's real `asset_id`**, never
  an LLM-provided one (small models hallucinate IDs).
- Every tool call is whitelisted and written to an immutable `AgentAuditLog` →
  explainability + traceability (problem-statement §6.4).
- The aggregator always returns a populated `DecisionOutput`: if the supervisor fails to
  converge, the deterministic engine fills risk/diagnosis. The report is never blank.
- **No LLM ever runs inside a Celery worker** (it deadlocks/crashes there). Every
  LLM path — chat, orchestration, intelligence regeneration, SANSAD context harvest —
  runs in a request-spawned daemon thread that releases its DB connection on exit.

## 5. Real-time layer

- **Django Channels** (`/ws/chat/<session>/`) streams MANAS tokens. A pure-ASGI consumer
  (no channel layer) avoids the Redis idle read-timeout during long generations: a
  background thread → in-process `asyncio.Queue` → WebSocket.
- **`/ws/orchestration/<asset>/`** streams agentic step/tool/decision events.
- The frontend hook keeps an **inactivity timer**: any progress signal (phase change,
  context compaction, SANSAD sync) re-arms it, so slow-but-legitimate steps never flash a
  false "no response" error.

## 6. Model tiers (full vs low-VRAM)

| Tier | Supervisor | Workers / chat | VRAM |
|---|---|---|---|
| **Full** (default) | qwen3.5:9b | qwen3.5:0.8b | ~12–14 GB |
| **Low** (`docker-compose.low.yml`) | qwen3.5:0.8b | qwen3.5:0.8b | ~6–8 GB |

Tier is resolved at one chokepoint (`effective_model_size()`); in low mode the 9b is never
pulled, loaded or warmed. The deterministic engine is identical in both tiers, so
dashboard correctness is tier-independent — only narrative richness changes.

## 7. Boot pipeline (first `docker compose up`)

The `django-backend` entrypoint runs, idempotently and in order:
migrations → TimescaleDB hypertables → demo users → ChromaDB collections → asset/spares
fixtures → initial synthetic telemetry → sensor-threshold calibration → **auto-download
BGE models + corpus** (if absent) → ML training (`--skip-if-exists`) → inference →
intelligence-report seeding (background thread) → Ollama warm → serve.
