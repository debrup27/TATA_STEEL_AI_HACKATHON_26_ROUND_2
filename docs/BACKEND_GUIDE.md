# Backend Guide

Django 6 + DRF + Channels (ASGI/uvicorn) + Celery. Working dir:
`ATAL_Project/backend/`.

## Django apps (`apps/`)

| App | Responsibility |
|---|---|
| `assets` | Factory/asset/sensor/spares models, health service, diagnostics, calibration, simulation, glossary, samvidhaan, fixtures seed |
| `twins` | Asset twin state (current health/RUL/anomaly snapshot), twin engine |
| `telemetry` | Telemetry cells/windows, threshold evaluation, WS broadcast |
| `synthetic` | Physics-based per-asset generators + dataset builder + live telemetry tasks |
| `ml` | **Deterministic engine** (`deterministic.py`), trainer (XGBoost/IsolationForest), inference, model registry, RUL calculator |
| `agents` | LLM client, guardrails, MANAS chat harness, **LangGraph** graph (`graph/`), SANSAD context mode, prompt optimiser, feedback personality, Ollama warmup |
| `consolidation` | Two-tier orchestration runner + inline consolidation, bottleneck scoring, plant KPIs/cost views |
| `maintenance` | Action plans, intelligence reports, work-order generator, quick plan, backups |
| `reports` | Report models + endpoints |
| `alerts` | Alarm events, abnormal-alert reports, notifications |
| `rag` | Chunker, embedder (BGE-M3), reranker, hybrid retrieval, Chroma client, ingestion |
| `feedback` | Feedback loop, prompt-patch algorithms |
| `users` | Auth (JWT), admin |

## Key modules to know

- `apps/ml/deterministic.py::compute_asset_state` — the authoritative engine.
- `apps/assets/rul_calculator.py` — RUL bands, criticality ceilings, the sanity gate.
- `apps/agents/llm/client.py` — all LLM calls (`/api/chat`), `effective_model_size()`
  (full/low tier), `OLLAMA_SMALL_LOCK`, qwen reasoning salvage.
- `apps/agents/graph/{nodes,tools,runner,builder}.py` — the agentic graph; `tools.py`
  forces the real `asset_id` and audit-logs every call; `nodes.py` aggregator has the
  deterministic fallback.
- `apps/agents/llm/guardrails.py` — tiered input/output guard.
- `apps/agents/tasks.py::run_chat_logic` / `start_chat_thread` — MANAS streaming (thread,
  not Celery; releases its DB connection on exit).
- `apps/consolidation/tasks.py::run_consolidation_inline` — agentic consolidation; no
  Celery LLM task exists.
- `apps/synthetic/generators/*` + `dataset_builder.py` — equipment physics.
- `apps/maintenance/work_order_gen.py`, `intelligence_report.py`, `action_plans.py`.

## Rules / conventions

- **No LLM in Celery.** Celery handles only deterministic/IO work (telemetry, ML inference,
  ingestion, backups). LLM runs in request-spawned daemon threads.
- **`/api/chat` only** for qwen (the `/v1` endpoint breaks thinking models).
- The deterministic engine is the source of truth; ML is sanity-gated.
- Code is volume-mounted, but uvicorn runs without `--reload` — restart the
  `django-backend` container to pick up Python changes.

## Management commands

`train_models`, `test_orchestration` (agentic smoke gate), `test_llm`,
`test_rag_pipeline`, `calibrate_sensors`, `seed_fixtures`, `seed_spares`,
`seed_initial_telemetry`, `setup_timescaledb`, `setup_beat_schedules`, `warm_ollama`,
`ingest_corpus`, `create_demo_users`.

## Adding an asset type

1. Add the enum in `apps/assets/models.py::AssetType`.
2. Add a generator in `apps/synthetic/generators/` + a scenario sampler in
   `dataset_builder.py`.
3. Add RUL band/criticality in `rul_calculator.py`; add it to `compute_asset_state`.
4. Seed it (`apps/assets/services.py`); add corpus docs if needed; `train_models`.
