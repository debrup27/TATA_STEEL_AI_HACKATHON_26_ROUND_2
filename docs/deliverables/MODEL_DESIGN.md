# Model Design & Reasoning Pipeline

## 1. Three layers, clear separation of concern

| Layer | Owns | Implementation |
|---|---|---|
| **Deterministic engine** | Authoritative health, RUL, anomaly, fault, risk | `apps/ml/deterministic.py` |
| **Pickled ML (sanity-gated)** | Optional refinement of RUL/anomaly | XGBoost + IsolationForest, `apps/ml/trainer.py` |
| **LLM** | Narrative: diagnosis prose, RCA, reports, chat, work orders | qwen3.5 via Ollama |

The engine is the source of truth; ML and LLM never override it.

## 2. Deterministic engine

`compute_asset_state(asset)` returns `{health_score, rul_hours, anomaly_score,
fault_classification, fault_confidence, risk_level, components}`.

- **Health:** `base = 100 − 25·(1 − life_fraction)`, then penalised by
  `45·sensor_stress + 22·anomaly + 10·alert_factor`; clamped ≤ `35 − 12·crit_weight` when a
  fault is injected. The gentle base prevents always-on telemetry from saturating
  short-life assets to 0.
- **Sensor stress:** per-sensor deviation of the live reading vs its calibrated
  normal/alert/trip envelope, aggregated.
- **RUL:** physics/age-derived, bounded to **30–600 h**, with criticality ceilings
  (critical 120 h / high 280 h / medium 450 h / low 600 h). 30 h floor unless failure is
  imminent (fault or health ≤ 5).
- **Anomaly:** rises with sensor stress + active alarms; drives early warning.
- **Fault classification:** dominant fault from the active fault flag + sensor signature.

It is pure, fast (<ms), deterministic and never returns NaN/None — so the dashboard is
always populated and consistent.

## 3. Pickled ML — trained, but gated

Per asset type (8 types), three models are trained from synthetic physics data
(`train_models`):

| Model | Algorithm | Target |
|---|---|---|
| RUL predictor | XGBoost regressor | remaining-useful-life hours (physics-derived label) |
| Fault classifier | XGBoost classifier | fault / no-fault |
| Anomaly detector | IsolationForest | unsupervised outlier score |

**SHAP** provides per-feature attribution for explainability.

The output is **only** used when:
1. it arrives within the request (no stale background result),
2. `0 < RUL ≤ engine health-cap` (plausible), and
3. it is consistent with the deterministic anomaly score.

Otherwise it is discarded. This makes a degenerate model (e.g. an asset whose synthetic
faults were too rare to learn) harmless — the engine value is used instead. Training runs
on first boot (`--skip-if-exists`) and on a weekly Celery schedule.

## 4. LLM reasoning pipeline

### 4.1 SANSAD agentic consolidation (two-tier graph)
1. Assemble a payload: deterministic state + telemetry window + active alarms + history +
   RAG context.
2. **Supervisor (9b)** reasons, calls whitelisted tools (ML refresh, twin snapshot, drift,
   doc retrieval, work-order creation, escalation), and emits worker tasks.
3. **Workers (0.8b)** run bounded parallel transforms (work-order drafting, sensor-window
   summarising, alarm triage, citation formatting, spare strategy).
4. **Aggregator** merges them into a `DecisionOutput` (diagnosis, RCA, risk, urgency,
   recommendations, spare strategy, citations, report text). If the supervisor loops to
   `max_iterations` without a decision, the aggregator **synthesises one from the
   deterministic engine** — the report is never empty.

### 4.2 MANAS chat
Intent classification → mode/role harness → optional RAG retrieval (hybrid + rerank) →
9b (full) / 0.8b (low) streamed answer with `[n]` citations, chain-of-thought leak
suppression, and learned per-user response style appended to the system prompt.

### 4.3 Guardrails (tiered)
- **Input:** sync heuristics (profanity with a steel-term allowlist, coding/essay/off-topic
  patterns) → a 0.8b structured classifier for borderline cases → allow / block / steer.
- **Output:** light profanity + code-dump filter on non-maintenance replies.

## 5. Feedback-driven improvement

Thumbs up/down on a chat message updates an EWMA trait vector (concise, detailed,
step-by-step, technical depth, citation-heavy, action-oriented). The learned summary is
appended to the MANAS system prompt for that user. Weekly feedback export feeds a
prompt-patch used by the SANSAD supervisor too.

## 6. Why qwen3.5 (9b + 0.8b)

- Self-hostable on a single GPU, no external API (requirement: no cloud).
- The 9b is strong enough for tool-calling + RCA; the 0.8b is fast enough to parallelise
  worker sub-tasks and to serve *every* role in the low-VRAM tier.
- Thinking-model output is salvaged via the native `/api/chat` endpoint (the `/v1`
  endpoint drops `think=false` and returns empty content).
