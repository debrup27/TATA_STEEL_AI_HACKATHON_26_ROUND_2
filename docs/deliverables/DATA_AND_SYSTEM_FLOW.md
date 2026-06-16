# Data Flow & System Flow

## 1. Inputs → ATAL → Outputs (problem-statement mapping)

| §4 Expected input | How ATAL ingests it |
|---|---|
| Equipment delay logs, fault/error messages | `/maintenance/fault-messages/`; system log feed; abnormality toggle |
| Failure analysis reports, incident records | `/maintenance/failure-reports/`; maintenance history seed |
| Sensor data summaries, anomaly alerts | Synthetic generators → TimescaleDB; deterministic engine; alarm events |
| Equipment manuals, SOPs, history, spares | RAG corpus (auto-downloaded) + spares catalog + maintenance logs |
| Natural-language queries, multi-turn | MANAS chat (`/chat/...`, `/ws/chat/`) |

| §5 Expected output | Where it appears |
|---|---|
| Diagnosis, RCA, RUL, early warning, defects | Diagnostics & Prediction page; `compute_asset_state`; agentic DecisionOutput |
| Risk class, urgency, bottleneck, spares/lead-time | Risk & Priority page; `/plant/bottleneck-score/` |
| Step-by-step actions, plans, spares strategy | Maintenance Actions page; work-order generator |
| Reports, abnormal alerts, decision summaries, digital log | Intelligence Reports page; Samvidhaan history |

## 2. Live telemetry loop

```
 celery-beat (10 s) ─► generate synthetic readings (per asset, fault-aware)
        │                         │
        ▼                         ▼
 TimescaleDB hypertable    deterministic engine recompute
        │                         │
        └────────► twin state (health/RUL/anomaly) ─► WS broadcast ─► SANSAD pages
```

When the **abnormality toggle** is on, a backend daemon thread re-asserts the injected
fault every 5 s and drives rapid, visible degradation (health falls, anomaly rises, RUL
collapses) across all pages — defeating the synthetic beat's periodic clear.

## 3. Chat request flow (MANAS)

```
 POST /chat/sessions/<id>/message/
   └─► start_chat_thread (daemon thread, NOT Celery)
         ├─ input guardrail (heuristic → 0.8b classifier)
         ├─ phase: rag → hybrid retrieve + rerank → citations
         ├─ phase: compaction (if history too long) → 0.8b summarise
         ├─ build system prompt (intent + mode + role + learned style)
         └─ stream tokens (9b/0.8b via /api/chat) ──► stream_registry queue ──► /ws/chat/ ──► UI
```

The frontend re-arms its inactivity timer on every phase/compaction event, so slow steps
never surface a false error.

## 4. Agentic consolidation flow (SANSAD)

```
 POST /consolidate/<asset_id>/   (or diagnostics refresh → background thread)
   └─► run_sansad_orchestration
         ├─ assemble payload (deterministic state + telemetry + history + RAG)
         ├─ supervisor(9b) ⇄ tools (whitelisted, audit-logged, real asset_id forced)
         ├─ workers(0.8b) parallel transforms
         └─ aggregator → DecisionOutput  (deterministic fallback if no convergence)
               └─► persist MaintenanceReport; auto WorkOrder on high/critical; WS decision.done
```

## 5. Persistence

- **PostgreSQL/TimescaleDB:** assets, factories, twin state, telemetry (hypertables),
  alarms, maintenance reports, work orders, spares, chat sessions/messages, ML model
  registry, agent audit log.
- **Redis:** Celery broker/result, regen status (stale-guarded), cached prompt patch.
- **ChromaDB:** RAG vectors.
- **Volumes:** `model-artifacts` (pickled ML), `ollama_data` (LLM weights),
  `chroma-data`; BGE models + corpus are host bind mounts (survive resets).
