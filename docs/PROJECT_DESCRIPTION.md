# Project ATAL — Detailed Description

**Autonomous Troubleshooting, Asset Intelligence & Lifecycle Management**
Tata Steel AI Hackathon 2026 · Round 2 · Agentic AI Challenge

This document is the comprehensive narrative of the system: what it does, every function it
exposes, how it is engineered, how it maps to the problem statement's expected inputs,
outputs, functional requirements and deliverables, and — importantly — how its synthetic
data is grounded in the **real failure physics** of steel-plant equipment so the behaviour
is realistic rather than arbitrary.

---

## Table of contents

1. The problem
2. What ATAL is
3. The simulated plant — two factories, eight assets
4. Realistic datasets: equipment physics mapping
5. SANSAD — the industrial telemetry suite
6. MANAS — the conversational maintenance wizard
7. Capability catalogue (functions)
8. System architecture
9. The deterministic engine (source of truth)
10. The agentic reasoning graph
11. The RAG knowledge layer
12. Alerting, anomaly & prediction logic
13. Feedback-driven improvement
14. Data flow: inputs → processing → outputs
15. Problem-statement mapping (§4, §5, §6, §7, §9)
16. Model design & reasoning pipeline
17. Technology stack
18. Deployment, tiers & operations
19. Security, explainability & guardrails
20. Assumptions & limitations
21. Demo script
22. Glossary

---

## 1. The problem

Steel manufacturing plants run highly complex, capital-intensive, interdependent equipment.
Unplanned downtime cascades into production loss, safety risk and cost. In practice a
maintenance engineer juggles fragmented sources — equipment manuals, SOPs, historical
maintenance logs, failure-analysis reports and sensor alerts — to diagnose a problem and
decide what to do. That process is manual, slow and expert-dependent, which delays response
and makes decisions inconsistent.

The challenge asks for an **intelligent, context-aware Maintenance Wizard** that consolidates
these sources and supports the engineer with faster diagnosis, root-cause analysis,
remaining-useful-life prediction, proactive abnormality detection, prioritised maintenance
actions and structured reporting — for both reactive troubleshooting and proactive planning.

## 2. What ATAL is

ATAL is a **self-hosted, GPU-resident decision-support platform** that turns those
fragmented inputs into explainable, actionable outputs behind a single `docker compose`
stack. It consists of:

- a **deterministic, physics-grounded intelligence engine** that is the authoritative
  source of truth for equipment health, remaining-useful-life (RUL), anomaly score and
  fault classification;
- a **two-tier agentic reasoning graph** (a qwen3.5:9b supervisor orchestrating qwen3.5:0.8b
  worker agents through whitelisted, audit-logged tools) that produces diagnosis, RCA,
  recommendations and structured reports;
- a **hybrid RAG knowledge layer** (BGE-M3 dense + BM25 lexical + cross-encoder reranking
  over OEM manuals, SOPs, ISO standards and safety codes) for document-grounded, citeable
  answers;
- a **sanity-gated ML tier** (per-asset XGBoost + IsolationForest) that refines RUL/anomaly
  only when its output is fresh, plausible and consistent with the engine;
- two product surfaces — **SANSAD** (the real-time telemetry dashboard) and **MANAS** (the
  conversational maintenance wizard).

Everything runs locally on one NVIDIA GPU — no external LLM or cloud API. A low-VRAM tier
lets the entire system run the 0.8b model for every role on 6–8 GB cards.

## 3. The simulated plant — two factories, eight assets

With no live plant feed available, ATAL drives itself from physics-based synthetic
generators. The plant models the major equipment classes of an integrated steel works,
split across two factories:

| Factory | Asset (code) | Criticality | Equipment class |
|---|---|---|---|
| **Horizon Foundry** (F1) | Slab Reheating Furnace (SRF) | critical | reheating furnace |
| | High-Pressure Descaler (HHPD) | high | hydraulic descaling |
| | Finishing Stands F1–F7 (FS) | critical | hot-rolling stands |
| | Hydraulic AGC Cylinders (HAGCC) | high | gauge-control hydraulics |
| **Zephyr Sinter** (F2) | Acid Pickling Tanks (APT) | high | strip pickling |
| | Tandem Cold Mill Stands (TCMS) | critical | cold-rolling stands |
| | Continuous Galvanizing Pot (CGP) | high | hot-dip galvanising |
| | High-Pressure Air Knives (HPAK) | medium | coating-weight control |

Each asset has live sensors with calibrated normal/alert/trip envelopes, a maintenance
history, a spares catalogue with stock and lead time, and an abnormality toggle that drives
it into a realistic failure regime.

## 4. Realistic datasets: equipment physics mapping

This is the core of ATAL's realism. Every asset's data is produced by a dedicated generator
(`apps/synthetic/generators/*.py`) and a scenario sampler (`apps/synthetic/dataset_builder.py`)
that reproduce the **actual degradation physics** of that equipment class, with sensor
signatures, failure thresholds tied to published standards, and physically-derived RUL
labels. Standards referenced: **ISO 4406** (oil cleanliness), **ISO 17359** (condition
monitoring), **ISO 281 / L10** (bearing life), **OSHA 1910.147** (lock-out/tag-out), bearing
defect frequencies (**BPFO/BPFI**), and **Paris' law** of fatigue crack growth.

### 4.1 Slab Reheating Furnace (SRF)
- **Mechanism:** refractory lining wears with cumulative campaign hours
  (`refractory_pct = 100 − 0.01·campaign_hr`). Failure modes: burner underheating
  (air-fuel drift), refractory degradation, hearth-seal drift.
- **Signals:** zone temperatures, fuel/air ratio, refractory thermocouples.
- **RUL label:** `refractory_pct · 30 h − underheating_penalty`, floored at 50 h — the
  remaining refractory campaign life, penalised when underheating is active.

### 4.2 High-Pressure Descaler (HHPD)
- **Mechanism:** descaling-nozzle orifices erode with use; nozzle life ≈ 5000 cycles before
  the orifice reaches 1.5×D₀ and jet pressure collapses. Cavitation is the acute mode.
- **Signals:** header pressure (~380–400 bar), flow rate (~5000 L/min), nozzle cycle count.
- **RUL label:** `(5000 − nozzle_cycles) · 0.4 h`; fault when cavitation injected or
  cycles > 4000.

### 4.3 Finishing Stands F1–F7 (FS)
- **Mechanism:** work-roll bearing fatigue modelled by **Paris' law**:
  `da/dN = C·(ΔK)^m`, with `C = 2×10⁻¹²`, `m = 3.2`, `ΔK = 12·√(a·1000)`; failure at
  critical crack `a_crit = 5 mm`. The **BPFO** vibration amplitude grows with crack size:
  `BPFO_dB = −45 + 25·log₁₀(a·10⁵)`. Secondary modes: roll chatter, chock wear.
- **Signals:** BPFO/BPFI vibration (dB), roll force, roll revolutions.
- **RUL label:** integrated Paris' law from current crack to `a_crit`, converted to hours.

### 4.4 Hydraulic AGC Cylinders (HAGCC)
- **Mechanism:** servo-valve seal drift decays exponentially with seal age
  (`τ = 4000 h`, base drift 0.001), alarm at 1% drift. Oil contamination tracked against
  **ISO 4406 15/13/10** cleanliness (particles/mL > 4 µm). Hysteresis = control degradation.
- **Signals:** position-loop error, valve current, ISO 4406 particle counts, oil pressure.
- **RUL label:** `τ·ln(0.01/base_rate) − seal_age` — time to the 1% drift alarm.

### 4.5 Acid Pickling Tanks (APT)
- **Mechanism:** HCl depletion kinetics — free-acid drops with pickling time at rate
  `K·FeO·LS·W·TH` (rate constant × ferrous-oxide load × line speed × strip width ×
  thickness). Start 15 g/L, alarm at 12 g/L. Modes: tank-lining failure, ventilation/safety
  breach.
- **Signals:** free-HCl (g/L), Fe²⁺ load, bath temperature, ventilation flow (Nm³/h).
- **RUL label:** `(HCl_now − 12)/rate` — pickling hours before replenishment.

### 4.6 Tandem Cold Mill Stands (TCMS)
- **Mechanism:** work-roll bearing degradation as discrete **L10-life** stages
  (1 healthy → 4 failure), RUL factors `{1:1.0, 2:0.6, 3:0.25, 4:0.0}` against a 2000 h
  base; BPFO and bearing temperature rise per stage. Emulsion (lubricant) contamination is
  the acute mode.
- **Signals:** bearing temperature (~45 °C baseline), BPFO amplitude, rolling force,
  emulsion cleanliness.
- **RUL label:** `2000 h · stage_factor`.

### 4.7 Continuous Galvanizing Pot (CGP)
- **Mechanism:** molten-zinc pot at ~450–465 °C; **dross formation** rises sharply with pot
  temperature (Arrhenius-like `dross_rate(T)`), alarm above 462 °C. Modes: sink/stabiliser
  bushing wear, temperature excursions.
- **Signals:** pot temperature, dross rate, bushing wear (mm), bath level.
- **RUL label:** `3000 h · dross_rate(462)/dross_rate(T)` — inverse to dross rate.

### 4.8 High-Pressure Air Knives (HPAK)
- **Mechanism:** nozzle crystallisation/blockage; pressure drop grows as
  `Δp = 20 + 200·(1 − e^(−0.0001·t))` mbar, crossing the 95 mbar alarm at `t ≈ 4700 min`.
- **Signals:** air-knife header pressure, Δp across the knife, coating-weight uniformity.
- **RUL label:** `(t_alarm − blockage_time)/60` hours.

### 4.9 Why this matters
- **Realistic abnormality demo:** toggling abnormality re-asserts a fault and drives the
  generators into their failure regimes, so health falls, anomaly rises and RUL collapses
  with physically-plausible sensor traces — visible across every page within ~5 s.
- **Grounded thresholds:** alarm/trip bands are calibrated to the nominal generator output
  (`calibrate_sensors`) and cross-referenced to ISO/OEM limits in the corpus, so the LLM can
  cite a real standard when explaining a deviation.
- **Meaningful ML labels:** the XGBoost RUL regressors train on physics-derived targets, not
  arbitrary numbers — even though the deterministic engine remains authoritative.

## 5. SANSAD — the industrial telemetry suite

SANSAD (`/sansad/hub`) is the operator's real-time cockpit. Each page is a problem-statement
output rendered live from the deterministic engine.

- **Hub** — module grid + a live System Log Stream (severity-coded telemetry events) +
  factory canvases. Entry to every sub-module.
- **Diagnostics & Prediction** — per-asset probable fault, root-cause analysis, RUL
  prediction, live sensor pills, process-defect correlation, cross-stage propagation, and
  factory-level predictive-cost graphs. "Ask MANAS" gives an inline RCA insight with a
  pop-out modal for long answers.
- **Risk & Priority** — the plant **bottleneck stack**: every asset ranked by a composite
  of process criticality, delay severity, spares availability and procurement lead time,
  with risk class (low/medium/high/critical) and an urgency score; "MANAS insight" explains
  the composite.
- **Maintenance Actions** — structured action plans (immediate actions, step-by-step repair,
  long-term monitoring), a spares table showing in-stock quantity **and** a separate
  order-decision column, **Schedule Work Order** (qwen drafts a maintenance order from live
  SANSAD feeds), and **Regenerate** (a fresh LLM pass rebuilds the plan).
- **Intelligence Reports** — structured maintenance reports, abnormal-alert reports,
  executive decision summaries and the digital logbook.
- **Samvidhaan** — the plant "constitution": a graph view (Horizon · MANAS · Zephyr), a
  predictive-maintenance graph set, a legend/glossary of every metric, and historical plant
  dossiers (fleet snapshots + maintenance history).
- **Factory pipeline viewers** (Horizon Foundry / Zephyr Sinter) — interactive process-line
  canvases with draggable equipment nodes and live system alerts fading in/out of the stack.
- **Monitor / Logs / Historical Logs / ABPred** — RUL monitor, raw and historical system
  logs, and abnormality prediction views.
- **Abnormality toggle** — flips a chosen asset into a fault regime; within ~5 s every page
  reflects it (health falls, anomaly rises, RUL collapses, alarms raise, reports regenerate),
  driven by a backend daemon thread that re-asserts the fault every 5 s. Toggle off to
  recover.

## 6. MANAS — the conversational maintenance wizard

MANAS (`/manas/chat`) is the natural-language interface (problem-statement §4.4, §6.3).

- **Multi-turn chat** with context preserved across the session and automatic context
  compaction when history grows long.
- **Document-grounded answers** — select reference documents and MANAS answers only from
  retrieved excerpts, with inline `[n]` citations, a sources panel and document preview.
- **`/sansad` live-plant linking** — MANAS harvests the current plant state (faults, RUL,
  logs, work orders, KPIs) and answers from live data, never claiming "data unavailable".
- **Deep-thinking mode** for harder analysis; **role lenses** (technician/supervisor) shape
  emphasis and tone.
- **Streaming** token-by-token over WebSocket, with a thinking channel and phase indicators.
- **Feedback** — thumbs up/down trains a per-user response-style profile appended to the
  system prompt.
- **Prompt optimiser** — a 0.8b pass can rewrite a rough query into a focused maintenance
  question.
- **Guardrails** — input/output scoped to maintenance; off-topic/coding/essay requests are
  blocked or steered, with a steel-term profanity allowlist.

## 7. Capability catalogue (functions)

A consolidated list of the system's functions, each backed by a live endpoint/module:

**Diagnosis & prediction**
- Probable fault diagnosis (deterministic + LLM narrative)
- Root-cause analysis (RCA overview + defect correlation insights)
- RUL prediction (physics engine + sanity-gated XGBoost), bounded 30–600 h
- Early warning of catastrophic failure
- Process-defect detection and cross-stage propagation

**Risk & prioritisation**
- Risk-level classification (low/medium/high/critical)
- Urgency assessment
- Plant bottleneck ranking
- Prioritisation by process criticality, delay severity, spares availability, lead time

**Maintenance recommendation**
- Step-by-step repair recommendations (LOTO-first)
- Immediate action points
- Optimised maintenance plan + long-term monitoring
- Spare-procurement strategy (stock vs order decision)
- AI work-order generation

**Reporting**
- Structured maintenance reports
- Abnormal-alert reports
- Executive decision summaries
- Digital maintenance logbook
- Predictive cost analysis (loss-if-no-action vs PdM savings, ₹ lakhs, with methodology)
- Plant KPIs (proactive rate, avg RUL at intervention, false-alarm rate, MTTR, plant health)

**Interaction & learning**
- Natural-language multi-turn chat with RAG citations
- Live-plant context mode
- Feedback-driven personalisation
- Real-time WebSocket alerting and notifications

## 8. System architecture

Nine services on one Docker Compose project (`name: atal`), two bridge networks; only UI,
nginx and backend ports are published.

| Service | Tech | Role |
|---|---|---|
| `ui-console` | Next.js 16.2 / React 19 | SANSAD + MANAS |
| `django-backend` | Django 6 + DRF + Channels (uvicorn) | REST, WebSockets, RAG, ML, agents |
| `ollama` | qwen3.5:9b + :0.8b (GPU) | LLM inference |
| `celery-worker` + `celery-beat` | Celery 5 | async **non-LLM** work + schedules |
| `postgres-db` | TimescaleDB pg17 | relational + time-series telemetry |
| `redis` | redis:8 | broker/result + cache |
| `nginx` | nginx:1.27 | reverse proxy |
| `ollama-warmup` | curl sidecar | pull + warm models before serving |

ChromaDB is embedded in-process in Django and Celery. BGE-M3 and the reranker run on GPU.
The architecture is **deterministic-first**: ML and the LLM layer on top of the engine,
never overriding it.

## 9. The deterministic engine (source of truth)

`apps/ml/deterministic.py::compute_asset_state(asset)` returns `{health_score, rul_hours,
anomaly_score, fault_classification, fault_confidence, risk_level, components}`.

- **Health:** `base = 100 − 25·(1 − life_fraction)`, penalised by
  `45·sensor_stress + 22·anomaly + 10·alert_factor`, clamped ≤ `35 − 12·crit_weight` under
  an injected fault. The gentle base stops always-on telemetry saturating short-life assets
  to zero.
- **Sensor stress:** aggregate deviation of each live reading vs its calibrated
  normal/alert/trip envelope.
- **RUL:** physics/age-derived, bounded **30–600 h** with criticality ceilings
  (critical 120 / high 280 / medium 450 / low 600 h); 30 h floor unless failure is imminent.
- **Anomaly:** rises with sensor stress and active alarms; drives early warning.
- **Fault classification:** dominant fault from the active fault flag and sensor signature.

It is pure, sub-millisecond, deterministic and never returns NaN/None — so the dashboard is
always populated and consistent.

## 10. The agentic reasoning graph

SANSAD consolidation runs a two-tier **LangGraph** pipeline:

1. **Payload assembly** — deterministic state + telemetry window + active alarms + history +
   RAG context.
2. **Supervisor (qwen3.5:9b)** reasons, calls whitelisted tools, and dispatches worker tasks.
   Tools: `run_ml_inference`, `query_twin_state`, `check_drift`, `retrieve_docs`,
   `create_work_order`, `escalate`, `request_retrain`. Every call is written to an immutable
   `AgentAuditLog`, and the **graph's real `asset_id` is forced** so a hallucinated id can
   never reach a tool.
3. **Workers (qwen3.5:0.8b)** run bounded parallel transforms: WorkOrderDrafter,
   SensorWindowSummarizer, AlarmTriager, CitationFormatter, SpareStrategist.
4. **Aggregator** merges supervisor decision + worker output into a `DecisionOutput`. If the
   supervisor loops to `max_iterations` without converging, the aggregator **synthesises a
   valid DecisionOutput from the deterministic engine** — the report is never blank.

No LLM ever runs inside a Celery worker (it deadlocks there); every LLM path runs in a
request-spawned daemon thread that releases its DB connection on exit.

## 11. The RAG knowledge layer

```
 corpus ─► chunk ─► BGE-M3 embed (1024-d) ─► ChromaDB
 query ─► BGE-M3 embed ─┬─ dense top-k ─┐
                        └─ BM25 lexical ─┤ fuse ─► BGE reranker v2-m3 ─► top-n + [n] citations
```

- **Embedder:** BAAI/bge-m3 (1024-dim, GPU).
- **Hybrid:** dense (Chroma) + BM25 lexical, fused — dense catches semantics, BM25 catches
  exact codes (ISO 4406, part numbers).
- **Reranker:** BAAI/bge-reranker-v2-m3 cross-encoder.
- **Corpus:** OEM manuals (Danieli, Parker, SKF, Schaeffler, Emerson, Siemens, Rockwell),
  process guides (descaler, TCMS, galvanizing), an SRF startup SOP, ISO 17359 and OSHA
  1910.147 — bundled in the submission and auto-seeded at runtime.

## 12. Alerting, anomaly & prediction logic

- **Three-band thresholds** (normal/alert/trip) per sensor, calibrated to nominal generator
  output on first boot.
- **Anomaly:** authoritative deterministic score (sensor stress + active alarms) plus a
  secondary, sanity-gated IsolationForest.
- **Early warning:** fires when anomaly is high AND RUL collapsing AND criticality
  high/critical; raises an alarm, clamps health, auto-creates a high/critical work order,
  regenerates intelligence reports, and persists until cleared.
- **RUL:** physics engine primary; XGBoost refinement only when fresh + plausible +
  anomaly-consistent; a model-vs-trip discrepancy is surfaced explicitly (engine wins).
- **Risk:** composite bottleneck score, criticality honoured as a floor.
- **Predictive cost:** `loss = downtime_h × hourly_loss × P(fail) + emergency_premium +
  spares_risk`; `savings = recovery_fraction × loss` (recovery rises with health deficit),
  reported in ₹ lakhs with a methodology object so every number is explainable.

## 13. Feedback-driven improvement

Thumbs up/down on a chat message updates an EWMA trait vector (concise, detailed,
step-by-step, technical depth, citation-heavy, action-oriented). The learned summary is
appended to the MANAS system prompt for that user; a weekly export feeds a prompt-patch the
SANSAD supervisor also uses. This is honest behaviour change without the cost/instability of
online fine-tuning (domain fine-tuning of qwen is a documented future step).

## 14. Data flow: inputs → processing → outputs

```
 INPUTS                         PROCESSING                         OUTPUTS
 ───────                        ──────────                         ───────
 sensor telemetry ─► TimescaleDB ─► deterministic engine ─► health/RUL/anomaly/fault
 fault/error msgs ─► ingest ─────────────┐                          │
 failure reports ─► ingest ──────────────┤                          ▼
 manuals/SOPs/ISO ─► RAG (embed+rerank) ─┼─► agentic graph ─► diagnosis · RCA · risk
 spares + history ─► DB ──────────────────┘   (9b ⇄ tools ⇄ 0.8b)   recommendations · reports
 NL queries ──────► MANAS chat (thread) ─► RAG + LLM stream ─► cited answers
```

The live telemetry loop runs every 10 s (Celery beat); the abnormality toggle drives a 5 s
rapid-degrade loop. Chat and consolidation run in request threads, streaming over WebSocket.

## 15. Problem-statement mapping

**§4 Expected inputs → ingestion**

| Input | How ATAL ingests it |
|---|---|
| Delay logs, fault/error messages | `/maintenance/fault-messages/`, system log feed, abnormality toggle |
| Failure-analysis reports, incident records | `/maintenance/failure-reports/`, maintenance history seed |
| Sensor summaries, anomaly alerts | generators → TimescaleDB → engine → alarm events |
| Manuals, SOPs, history, spares | RAG corpus + spares catalogue + maintenance logs |
| NL queries, multi-turn | MANAS chat (`/chat/...`, `/ws/chat/`) |

**§5 Expected outputs → surfaces**

| Output | Where it appears |
|---|---|
| §5.1 diagnosis, RCA, RUL, early warning, defects | Diagnostics page; engine; agentic DecisionOutput |
| §5.2 risk, urgency, bottleneck, spares/lead-time | Risk & Priority page; `/plant/bottleneck-score/` |
| §5.3 steps, plans, spares strategy | Maintenance Actions; work-order generator |
| §5.4 reports, abnormal alerts, decision summaries, digital log | Intelligence Reports; Samvidhaan |

**§6 Functional requirements**

| Requirement | Implementation |
|---|---|
| 6.1 LLM/SLM contextual reasoning | qwen3.5 9b/0.8b; self-hosted; agentic graph |
| 6.2 Knowledge integration | RAG over manuals/SOPs/history/reports |
| 6.3 Natural-language multi-turn | MANAS chat with compaction + context mode |
| 6.4 Explainable, traceable | `[n]` citations, audit-logged tools, deterministic numbers, SHAP |
| 6.5 Abnormality detection + failure prediction | deterministic anomaly + IsolationForest + early warning |
| 6.6 Feedback-driven improvement | EWMA personality + prompt patch |
| 6.7 Real-time alerting | WebSocket alarms + notifications |

**§7 Optional enhancements (delivered)** — conversational interface ✓, visualisation
dashboard ✓, simulated IoT/monitoring ✓, dynamic per-equipment knowledge ✓, automatic
digital logbook ✓, role-based alerts/recommendations ✓.

**§9 Deliverables** — working prototype source ✓; architecture/tech-stack/data-flow/model-
design/alerting docs ✓ (this `docs/` set); install/configure/run docs ✓
(`README.md`, `INSTRUCTIONS_TO_RUN.md`, `TROUBLESHOOTING.md`); sample I/O ✓
(`docs/deliverables/SAMPLE_IO.md`); screenshots ✓ (`snapshots/`).

## 16. Model design & reasoning pipeline

Three layers, clear separation: the **deterministic engine** owns authoritative
health/RUL/anomaly/fault; **pickled ML** (XGBoost RUL + classifier, IsolationForest anomaly,
SHAP attributions) refines only through the sanity gate; the **LLM** produces narrative
(diagnosis prose, RCA, reports, chat, work orders). The reasoning pipeline for SANSAD is the
agentic graph (§10); for MANAS it is intent-classify → mode/role harness → optional RAG →
streamed answer with citation and chain-of-thought-leak suppression. Guardrails are tiered
(sync heuristics → 0.8b classifier on input; light filter on output).

## 17. Technology stack

Frontend: Next.js 16.2, React 19, TypeScript, Tailwind v4, react-markdown + KaTeX, Jest.
Backend: Django 6, DRF, Channels (uvicorn ASGI), Celery 5, Python 3.12. Data:
PostgreSQL/TimescaleDB pg17, Redis 8, ChromaDB. AI/ML: Ollama (qwen3.5 9b + 0.8b),
LangGraph, LangChain, BAAI/bge-m3, bge-reranker-v2-m3, BM25, XGBoost, scikit-learn
(IsolationForest), SHAP, better-profanity. Infra: Docker Compose, NVIDIA Container Toolkit
(GPU via `deploy.resources`, not `gpus: all`, to avoid CDI), nginx, Hugging Face Hub.

## 18. Deployment, tiers & operations

- **One command:** `docker compose up atal -d --build`. First boot auto-runs the full
  pipeline (migrations → TimescaleDB → demo users → ChromaDB → fixtures → telemetry seed →
  sensor calibration → BGE/corpus auto-download → ML training → inference → report seeding →
  Ollama warm → serve). Allow 15–30 min once; later boots reuse volumes.
- **Tiers:** full (9b supervisor + 0.8b workers, ~12–14 GB VRAM) by default; low-VRAM
  (`docker-compose.low.yml`, 0.8b for every role, ~6–8 GB) — the 9b is never pulled. The
  deterministic engine is identical in both, so dashboard correctness is tier-independent.
- **GPU-only** — no CPU mode by design.
- **doctor.sh** — an interactive, menu-driven helper (no flags) that runs diagnostics
  (Docker, GPU/CDI, models, corpus, disk, RAM, ports) and also downloads assets, starts the
  stack (full or low-VRAM), watches logs and resets. For most issues it prints the exact fix;
  GPU runtime/passthrough warnings are flagged but left to the user to fix per-distro
  (host-specific) rather than auto-running `nvidia-ctk` blind.
- **Auto-download portability:** the entrypoint chowns the bind-mounted dirs and disables
  HF Xet so a fresh checkout/unzip self-provisions BGE + corpus on any host.

## 19. Security, explainability & guardrails

- **No external calls at inference** — qwen and BGE are local; industrial data stays on the
  host.
- **Whitelisted, audit-logged tools** — the LLM cannot mutate data rows directly, only
  through whitelisted tools with the graph's real asset_id; every call is logged.
- **Traceable outputs** — RAG `[n]` citations to documents, deterministic numbers traceable
  to sensor inputs, SHAP attributions for ML.
- **Tiered guardrails** constrain scope to maintenance.

## 20. Assumptions & limitations

Simulated plant (feed-agnostic architecture); deterministic-first by design (ML is a gated
refinement, deliberately not the headline); synthetic-trained ML reflects the simulation,
not field data; LLM richness scales with tier; first-boot downloads take time; the corpus is
representative, not exhaustive; single-node (no HA). Full detail in
`docs/deliverables/ASSUMPTIONS_AND_LIMITATIONS.md`.

## 21. Demo script

1. Open the SANSAD hub — note healthy assets.
2. Toggle abnormality on HHPD — watch Diagnostics, Risk and Reports update live; an alarm
   and a work order appear within ~5 s.
3. Open Maintenance Actions — Regenerate the plan, then Schedule a work order.
4. Open MANAS, type `/sansad`, ask "What should I fix first and why?" — it ranks from the
   live bottleneck data and cites SOPs.
5. Ask a document question (e.g. ISO 4406 target) to show RAG citations.
6. Toggle abnormality off — assets recover.

## 22. Glossary

- **SANSAD** — the telemetry dashboard suite.
- **MANAS** — the conversational maintenance wizard.
- **Deterministic engine** — the authoritative health/RUL/anomaly/fault calculator.
- **DecisionOutput** — the structured agentic result (diagnosis, RCA, risk, recommendations,
  spares, citations, report text).
- **RUL** — Remaining Useful Life (hours).
- **BPFO/BPFI** — bearing ball-pass frequencies (outer/inner race) — vibration fault
  signatures.
- **Sanity gate** — the rule that accepts ML output only when fresh, plausible and
  anomaly-consistent.
- **Abnormality toggle** — the control that injects a realistic fault to demo live
  degradation.
- **Low-VRAM tier** — the mode where the 0.8b model serves every role.
