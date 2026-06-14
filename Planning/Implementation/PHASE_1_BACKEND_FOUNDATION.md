# PHASE_1_BACKEND_FOUNDATION.md — Project ATAL
**Scope: Complete backend, all data pipelines, all ML models, digital twins, full API surface, frontend data contracts.**
**No frontend code written here — API contracts and WS schemas are defined so the frontend can be wired up later.**
Task format: `- [ ] P1-NNN: {task} | REQ: REQ-{CAT}-{NNN} | Depends: P1-NNN`

---

## 1. Repository Structure

```
ATAL_Project/
  backend/                       # Django project root
    backend/                     # Django project package (settings, urls, wsgi, asgi)
      settings/
        base.py                  # Shared settings
        dev.py                   # Development overrides
        prod.py                  # Production overrides
      urls.py
      asgi.py                    # Channels ASGI application
    apps/
      assets/                    # Asset registry, factory, sensor schema
      twins/                     # Digital twin state management
      telemetry/                 # Sensor stream ingestion, TimescaleDB writes
      synthetic/                 # Synthetic data generation service
      ml/                        # ML model wrapper, inference service, model registry
      rag/                       # Weaviate ingestion, RAG retrieval
      agents/                    # LangGraph agent definitions, tools
      consolidation/             # Consolidation endpoint orchestration
      maintenance/               # Maintenance events, work orders, delay logs
      alerts/                    # Alarm event management, alert routing
      reports/                   # Report generation, audit citations
      users/                     # Auth, RBAC, org/factory/asset onboarding
      feedback/                  # Feedback loop capture and RAG update triggers
    models/                      # Competition-mode model (steel_main.py, keep as-is)
      steel_main.py
      expected_submission.csv
    dataset/
      train.csv
      test.csv
      sample_submission.csv
    requirements.txt
    Dockerfile
    manage.py
```

---

## 2. Database Schema

### 2.1 Organization & Asset Registry

- [ ] P1-001: Create `Organization` model — id, name, slug, timezone, created_at | REQ: REQ-SECURITY-001 | Depends: —
- [ ] P1-002: Create `Factory` model — id, org FK, name (Horizon/Zephyr), code (F1–F6), location, metadata JSON | REQ: REQ-FUNCTIONAL-001 | Depends: P1-001
- [ ] P1-003: Create `Asset` model — id, factory FK, name (SRF/HHPD/FS/HAGCC/APT/TCMS/CGP/HPAK), asset_type enum, iso_standards JSON (list of applicable standard codes), oem_manual_urls JSON, installed_at, criticality_level | REQ: REQ-FUNCTIONAL-001, REQ-COMPLIANCE-001 | Depends: P1-002
- [ ] P1-004: Create `SensorDefinition` model — id, asset FK, sensor_name, sensor_type (temperature/pressure/vibration/flow/position/concentration/force/power), unit, normal_min, normal_max, alert_threshold, trip_threshold, iso_standard_ref, sampling_freq_hz | REQ: REQ-FUNCTIONAL-005, REQ-COMPLIANCE-001 | Depends: P1-003
- [ ] P1-005: Populate `SensorDefinition` seed fixtures for all 8 assets from `horizon_zephyr_summary.md` Table A and Table B sensor registries | REQ: REQ-DATA-005–030 | Depends: P1-004
- [ ] P1-006: Create `SparesPart` model — id, asset FK, part_name, part_number, quantity_in_stock, reorder_level, lead_time_days, unit_cost, supplier | REQ: REQ-FUNCTIONAL-011, REQ-FUNCTIONAL-026 | Depends: P1-003

### 2.2 Sensor Time-Series (TimescaleDB)

- [ ] P1-007: Create `SensorReading` hypertable — time (partition key), asset_id, sensor_def_id, value DOUBLE PRECISION, quality_flag SMALLINT, source ENUM(real/synthetic/injected) | REQ: REQ-INFRA-006, REQ-FUNCTIONAL-005 | Depends: P1-004
- [ ] P1-008: Configure TimescaleDB continuous aggregates: 1-minute, 5-minute, 1-hour rollups for each sensor | REQ: REQ-INFRA-006 | Depends: P1-007
- [ ] P1-009: Configure TimescaleDB retention policy: raw readings 90 days, 1-min aggregates 1 year | REQ: REQ-INFRA-006 | Depends: P1-008

### 2.3 Digital Twin State

- [ ] P1-010: Create `AssetTwinState` model — id, asset FK, state JSON (typed per REQ-TWIN-002 through REQ-TWIN-009), health_score FLOAT, active_alerts JSON, updated_at, source_snapshot_id | REQ: REQ-TWIN-001 | Depends: P1-003
- [ ] P1-011: Create `TwinStateHistory` hypertable — time, asset_id, state JSON, health_score — for twin state audit trail | REQ: REQ-TWIN-001 | Depends: P1-010

### 2.4 ML Model Registry (replaces MLflow)

- [ ] P1-012: Create `MLModel` model — id, name, asset_id (nullable for cross-asset), model_type, algorithm, version (semver), artifact_path, training_date, training_metrics JSON, acceptance_thresholds JSON, status ENUM(staging/production/deprecated), created_by | REQ: REQ-INFRA-008 | Depends: P1-003
- [ ] P1-013: Create `MLPrediction` model — id, model FK, asset FK, prediction_time, input_features JSON, prediction_output JSON, confidence FLOAT, shap_values JSON (nullable), celery_task_id | REQ: REQ-MONITORING-006 | Depends: P1-012

### 2.5 Maintenance & Events

- [ ] P1-014: Create `MaintenanceEvent` model — id, asset FK, event_type ENUM(corrective/preventive/predictive/inspection), scheduled_date, completed_date, technician FK, description, ISO14224_classification, outcome, parts_used JSON, downtime_hours | REQ: REQ-FUNCTIONAL-004, REQ-COMPLIANCE-010 | Depends: P1-003
- [ ] P1-015: Create `DelayLog` model — id, asset FK, factory FK, start_time, end_time, delay_type, description, root_cause_assigned, production_loss_tonnes | REQ: REQ-FUNCTIONAL-001 | Depends: P1-003
- [ ] P1-016: Create `WorkOrder` model — id, asset FK, priority ENUM(1-critical/2-high/3-medium/4-low), title, description, recommended_actions JSON, spare_requirements JSON, estimated_duration_hrs, status ENUM(open/in_progress/closed), created_by, source ENUM(manual/ai_generated), llm_prediction FK nullable | REQ: REQ-FUNCTIONAL-022 | Depends: P1-013

### 2.6 Alarm Events

- [ ] P1-017: Create `AlarmEvent` model — id, asset FK, sensor_def FK (nullable), alarm_type, severity ENUM(info/warning/alert/trip), message, value_at_alarm FLOAT, threshold_breached FLOAT, iso_standard_ref, acknowledged BOOL, acknowledged_by FK, created_at, resolved_at | REQ: REQ-FUNCTIONAL-033, REQ-COMPLIANCE-006 | Depends: P1-004
- [ ] P1-018: Create alarm thresholds seed data from ISO standards per REQ-MONITORING-005 (ISO 10816-3, ISO 17359, CGP dross, HAGCC hysteresis, APT chemistry, HPAK delta-P, TCMS BPFO) | REQ: REQ-COMPLIANCE-001 | Depends: P1-017

### 2.7 RAG & Reports

- [ ] P1-019: Create `Document` model — id, title, doc_type ENUM(manual/sop/iso_standard/maintenance_log/model_explanation/safety_code), asset_scope JSON, weaviate_collection, weaviate_object_ids JSON, source_url, version, indexed_at | REQ: REQ-LLM-011 | Depends: —
- [ ] P1-020: Create `MaintenanceReport` model — id, asset FK, created_at, created_by FK, source ENUM(manual/ai_generated), diagnosis, rca, risk_level, urgency_score FLOAT, recommendations JSON, spare_strategy JSON, citations JSON, report_text TEXT, feedback_status ENUM(pending/accepted/rejected/corrected) | REQ: REQ-FUNCTIONAL-027, REQ-FUNCTIONAL-035 | Depends: P1-013

### 2.8 Users, RBAC, Audit

- [ ] P1-021: Create `User` model extending AbstractUser — org FK, role ENUM(technician/supervisor/admin), factory_access JSON (list of factory IDs), notification_prefs JSON | REQ: REQ-SECURITY-001 | Depends: P1-001
- [ ] P1-022: Create `AuditLog` model — id, user FK, action, resource_type, resource_id, timestamp, request_ip, payload_hash, outcome | REQ: REQ-SECURITY-009 | Depends: P1-021
- [ ] P1-023: Create `Feedback` model — id, report FK, user FK, feedback_type ENUM(confirm/correct/reject), corrected_values JSON, weaviate_updated BOOL, created_at | REQ: REQ-FUNCTIONAL-031 | Depends: P1-020

---

## 3. Service Architecture (Django Apps)

### 3.1 `apps/assets/` — Asset Registry Service
- [ ] P1-024: Implement Asset, Factory, SensorDefinition, SparesPart CRUD ViewSets with role-gated permissions | REQ: REQ-SECURITY-001 | Depends: P1-005, P1-021
- [ ] P1-025: Implement asset health summary endpoint: GET `/api/v1/assets/{id}/health/` → `{health_score, active_alerts, last_prediction, twin_state_summary}` | REQ: REQ-FRONTEND-002 | Depends: P1-010, P1-013

### 3.2 `apps/twins/` — Digital Twin Service
- [ ] P1-026: Implement twin state CRUD and snapshot logic; `AssetTwinStateSerializer` with typed field validation per asset type (SRF/HHPD/FS/HAGCC/APT/TCMS/CGP/HPAK) | REQ: REQ-TWIN-001 | Depends: P1-010
- [ ] P1-027: Implement twin state update logic: sensor readings → compute twin state fields → apply operating envelope checks → emit state-change WS event | REQ: REQ-TWIN-011 | Depends: P1-007, P1-026
- [ ] P1-028: Implement cross-asset twin linkage: SRF `slab_temp_out` feeds FS input context; CGP `dross_rate` updated by `pot_temp` | REQ: REQ-TWIN-012 | Depends: P1-027
- [ ] P1-029: Implement REST endpoints: GET `/api/v1/twins/{asset_id}/` (current state), GET `/api/v1/twins/{asset_id}/history/` (paginated), WS channel `/ws/twins/{asset_id}/` | REQ: REQ-TWIN-010 | Depends: P1-027

### 3.3 `apps/telemetry/` — Sensor Stream Ingestion
- [ ] P1-030: Implement sensor batch ingestion endpoint: POST `/api/v1/telemetry/ingest/` — accepts `{asset_id, readings: [{sensor_def_id, value, timestamp}]}`, validates against `SensorDefinition` envelopes, writes to TimescaleDB hypertable, triggers twin state update | REQ: REQ-FUNCTIONAL-005 | Depends: P1-007, P1-027
- [ ] P1-031: Implement live telemetry WebSocket consumer `/ws/telemetry` — push latest sensor readings to subscribed frontend clients | REQ: REQ-FUNCTIONAL-043 | Depends: P1-030

### 3.4 `apps/synthetic/` — Synthetic Data Generation Service (first-class)
- [x] P1-032: Implement `SRFSyntheticGenerator` — produces zone temps, gas flow, O₂, beam stroke, air/fuel ratio; injects thermal lag underheating events via `T_slab(t)=T_target−ΔT·(1−e^{−t/τ})` (τ=45min); labels onset of underheating; labels refractory campaign progression | REQ: REQ-DATA-005, REQ-DATA-006, REQ-DATA-007, REQ-DATA-008 | Depends: P1-005
- [x] P1-033: Implement `HHPDSyntheticGenerator` — normal header pressure [380–400 bar], flow, AE, filter-ΔP; injects nozzle erosion via `d(n)=d₀(1+0.0002n)` → `P(n)=P_supply·(d₀/d(n))⁴`; injects cavitation AE spikes | REQ: REQ-DATA-009, REQ-DATA-010, REQ-DATA-011 | Depends: P1-005
- [x] P1-034: Implement `FSSyntheticGenerator` — rolling force, sideload, spindle torque, vibration, BPFO/BPFI spectral features; Paris-law crack accumulation `da/dN=C(ΔK)^m` (C=2×10⁻¹², m=3.2); chatter oscillation at 100–200 Hz; chock clearance growth `C(n)=C₀+K_wear·n` | REQ: REQ-DATA-012, REQ-DATA-013, REQ-DATA-014, REQ-DATA-015 | Depends: P1-005
- [x] P1-035: Implement `HAGCCSyntheticGenerator` — gap position, cylinder pressure, oil class, bypass flow; seal drift via `drift_rate(t)=0.001·e^{t/4000hr}`; servovalve step-response degradation | REQ: REQ-DATA-016, REQ-DATA-017, REQ-DATA-018 | Depends: P1-005
- [x] P1-036: Implement `APTSyntheticGenerator` — HCl [12–18%], temp [65–85°C], FeCl₂; acid depletion `[HCl](t)=[HCl₀]−k·[FeO]·speed·width·thickness·t`; lining pinhole differential pressure growth; safety breach events | REQ: REQ-DATA-019, REQ-DATA-020, REQ-DATA-021 | Depends: P1-005
- [x] P1-037: Implement `TCMSSyntheticGenerator` — rolling force, interstand tension, emulsion flow, iron ppm, BPFO at 142 Hz, chock temp; 4-stage bearing wear: Stage1(baseline)→Stage2(temp 45→65°C)→Stage3(BPFO −28→−20 dB)→Stage4(temp >80°C, BPFO >−12 dB) | REQ: REQ-DATA-022, REQ-DATA-023, REQ-DATA-024 | Depends: P1-005
- [x] P1-038: Implement `CGPSyntheticGenerator` — pot temp, Fe-in-zinc, pot level, dross rate via `dross_rate(T)=A·exp(−Q/RT)` (Q=80,000 J/mol); inject temperature excursions to 462–475°C; bushing wear via torque/RPM signature | REQ: REQ-DATA-025, REQ-DATA-026, REQ-DATA-027 | Depends: P1-005
- [x] P1-039: Implement `HPAKSyntheticGenerator` — air pressure, nozzle distance, blower current, header ΔP; zinc crystallization via `block_factor(x,t)=1−e^{−dep_rate·t}`; coating weight stripe injection | REQ: REQ-DATA-028, REQ-DATA-029, REQ-DATA-030 | Depends: P1-005
- [ ] P1-040: Implement `SensorFaultInjector` — add dropout, drift, spike, frozen-value patterns across any sensor stream with fault labels | REQ: REQ-DATA-033 | Depends: P1-032–P1-039
- [ ] P1-041: Implement `CrossStageCorrelationGenerator` — SRF underheating event → paired FS rolling force spike in same time window; label causal chain type | REQ: REQ-DATA-031 | Depends: P1-032, P1-034
- [ ] P1-042: Implement `PlantAggregationGenerator` — combine 8-asset health score time series + spares stock + procurement lead times; label maintenance urgency tier (1–4) | REQ: REQ-DATA-032 | Depends: P1-032–P1-039
- [x] P1-043: Implement `SyntheticDataOrchestrator` Celery task — runs all generators on Celery Beat schedule, batches output, writes to TimescaleDB via telemetry ingestion API and to DVC-tracked CSV snapshots | REQ: REQ-DATA-003, REQ-INFRA-012 | Depends: P1-030, P1-032–P1-042

### 3.5 `apps/ml/` — ML Inference Service & Model Registry

#### Existing Model (REQ-MODEL-001 Competition Mode)
- [x] P1-044: Wrap `steel_main.py` as a service module — expose `run_competition_inference(train_path, test_path) -> DataFrame`; preserve HEX_SEED + CoilID-1095 anchor unchanged | REQ: REQ-MODEL-001 | Depends: —
- [x] P1-045: Expose REST endpoint POST `/api/v1/ml/competition/infer/` — accepts dataset upload, runs `steel_main.py` pipeline, returns defect labels CSV; document as "competition mode / known limitation" in API docs | REQ: REQ-MODEL-001 | Depends: P1-044
- [ ] P1-046: Implement SHAP explainability endpoint GET `/api/v1/ml/competition/explain/{coil_id}/` — SHAP values for the DART XGBoost model; return top-10 feature contributions | REQ: REQ-FUNCTIONAL-035 | Depends: P1-044

#### Per-Asset Model Implementations
- [x] P1-047: Implement SRF models (REQ-MODEL-002–005): anomaly detector (IsolationForest on zone temp deviations), thermal RUL predictor (exponential fit on refractory degradation), walking beam health score (gradient trend), combustion drift detector (statistical process control on O₂/AFR) — train on P1-032 synthetic data | REQ: REQ-MODEL-002, REQ-MODEL-003, REQ-MODEL-004, REQ-MODEL-005 | Depends: P1-032, P1-043
- [x] P1-048: Implement HHPD models (REQ-MODEL-006–008): nozzle RUL predictor (curve-fit `P(n)` degradation model), cavitation classifier (XGBoost on AE frequency features), composite health score | REQ: REQ-MODEL-006, REQ-MODEL-007, REQ-MODEL-008 | Depends: P1-033, P1-043
- [x] P1-049: Implement FS models (REQ-MODEL-009–012): bearing spallation RUL (Paris-law regression + LightGBM 4-stage classifier), gap asymmetry anomaly detector, chatter classifier (FFT feature + XGBoost on 100–200 Hz band), roll health score | REQ: REQ-MODEL-009, REQ-MODEL-010, REQ-MODEL-011, REQ-MODEL-012 | Depends: P1-034, P1-043
- [x] P1-050: Implement HAGCC models (REQ-MODEL-013–015): seal drift RUL (exponential extrapolation of drift_rate), servovalve hysteresis detector (step-response lag analysis), oil contamination classifier (ISO 4406 class from particle count) | REQ: REQ-MODEL-013, REQ-MODEL-014, REQ-MODEL-015 | Depends: P1-035, P1-043
- [x] P1-051: Implement APT models (REQ-MODEL-016–018): HCl depletion predictor (physics-model regression), lining failure anomaly detector (differential pressure trend), process safety classifier (threshold rules + ML for edge cases) | REQ: REQ-MODEL-016, REQ-MODEL-017, REQ-MODEL-018 | Depends: P1-036, P1-043
- [x] P1-052: Implement TCMS models (REQ-MODEL-019–021): bearing RUL predictor (4-stage LightGBM on BPFO/temp features), emulsion contamination classifier, roll force drift detector | REQ: REQ-MODEL-019, REQ-MODEL-020, REQ-MODEL-021 | Depends: P1-037, P1-043
- [x] P1-053: Implement CGP models (REQ-MODEL-022–024): dross rate predictor (Arrhenius model + correction for process noise), sink roll bushing RUL (diameter loss regression), Fe-in-zinc anomaly detector | REQ: REQ-MODEL-022, REQ-MODEL-023, REQ-MODEL-024 | Depends: P1-038, P1-043
- [x] P1-054: Implement HPAK models (REQ-MODEL-025–027): nozzle crystallization detector (blower current vs pressure divergence), coating weight stripe predictor (block_factor model), air knife health score | REQ: REQ-MODEL-025, REQ-MODEL-026, REQ-MODEL-027 | Depends: P1-039, P1-043
- [ ] P1-055: Implement cross-asset models (REQ-MODEL-028–034): cross-stage correlation model, Horizon factory aggregator, Zephyr factory aggregator, plant-level decision intelligence, sensor fault detector, energy efficiency drift detector, alarm intelligence filter | REQ: REQ-MODEL-028–034 | Depends: P1-047–P1-054, P1-041, P1-042

#### ML Service Infrastructure
- [x] P1-056: Implement async Celery prediction task `run_asset_inference(asset_id, model_type)` — loads model from registry, runs prediction, writes `MLPrediction` record, updates twin state, emits WS event | REQ: REQ-INFRA-003, REQ-MONITORING-006 | Depends: P1-047–P1-055, P1-013
- [x] P1-057: Implement per-model REST endpoints: POST `/api/v1/ml/{asset_id}/{model_type}/predict/` (sync), POST `/api/v1/ml/{asset_id}/{model_type}/predict/async/` (returns task ID), GET `/api/v1/ml/predictions/{task_id}/` | REQ: REQ-FUNCTIONAL-014 | Depends: P1-056
- [x] P1-058: Implement model drift detection: statistical tests (KS test, PSI) on prediction input distributions; write drift metrics to `MLModel` record; emit retrain trigger event when threshold exceeded | REQ: REQ-MONITORING-006 | Depends: P1-056
- [x] P1-059: Implement SHAP explainability for all tree-based models; integrate into `MLPrediction.shap_values`; expose GET `/api/v1/ml/predictions/{id}/explain/` | REQ: REQ-FUNCTIONAL-035, REQ-FUNCTIONAL-036 | Depends: P1-057

#### ML Training Pipeline (Boot-time + Scheduled Retrain) IMPLEMENTED
- [x] P1-059a: apps/synthetic/dataset_builder.py — per-asset tabular dataset builder; N scenarios (normal+fault), aggregates to feature vectors (mean/std/min/max per sensor). Rich mode widens param space for 7-day retrain. Returns (X, y_rul, y_fault, feature_names). | REQ: REQ-DATA-003, REQ-MODEL-002-027 | Depends: P1-032-P1-039
- [x] P1-059b: apps/ml/trainer.py — trains 3 models per asset type: XGBRegressor (RUL), XGBClassifier (fault, class-balanced), IsolationForest (anomaly on normal-only data). Saves .joblib to MODEL_ARTIFACT_ROOT/{asset_type}/{model_type}/v{version}.joblib (Docker volume). Registers/promotes MLModel DB record, deprecates previous. | REQ: REQ-MODEL-002-027 | Depends: P1-059a
- [x] P1-059c: manage.py train_models — --skip-if-exists (boot-time, skips if production artifacts exist on disk), --rich (7-day retrain, 1000 scenarios), --asset-types SRF,HHPD,..., --scenarios N | REQ: REQ-INFRA-012 | Depends: P1-059b
- [x] P1-059d: manage.py setup_beat_schedules — idempotent upsert of 4 PeriodicTask DB records: weekly-ml-retrain (Sun 02:00 UTC), weekly-synthetic-refresh (Sun 01:30 UTC), synthetic-telemetry-live (every 5min), model-drift-check (every 6hr) | REQ: REQ-INFRA-012 | Depends: P1-059c
- [x] P1-059e: generate_dataset_and_retrain Celery task — forced full retrain; WS push to admin_notifications on completion. check_all_drift dispatches KS-tests for all assets every 6hr; drift_ratio >30% auto-triggers targeted retrain via trigger_retrain task | REQ: REQ-MONITORING-006 | Depends: P1-058, P1-059b
- [x] P1-059f: GET /api/v1/ml/models/status/ (production model registry with artifact_ok flag), POST /api/v1/ml/retrain/ (Admin, queues async retrain), GET /api/v1/ml/retrain/{task_id}/ (poll) | REQ: REQ-FUNCTIONAL-014 | Depends: P1-059c
- [x] P1-059g: model-artifacts named Docker volume in docker-compose; mounted at /model-artifacts in django-backend, celery-worker, celery-beat. MODEL_ARTIFACT_ROOT=/model-artifacts env var in all three. entrypoint.sh calls setup_beat_schedules then train_models --skip-if-exists --scenarios 300 on every boot. | REQ: REQ-DEPLOY-001 | Depends: P1-059c, P1-059d

---

## 4. Consolidation Endpoint (Core Feature)

- [ ] P1-060: Design consolidated ML payload schema — `ConsolidatedAssetPayload`: `{asset_id, asset_name, asset_type, factory, timestamp, twin_state, sensor_summary: {last_24h_stats}, active_alerts[], model_outputs: {anomaly_score, rul_hours, rul_confidence, health_score, fault_classification, defect_probabilities, energy_efficiency_index, alarm_cluster}, cross_stage_context, spares: {parts[], in_stock, lead_times}, maintenance_history_summary, applicable_iso_standards[]}` | REQ: REQ-FUNCTIONAL-040 | Depends: P1-010, P1-013
- [ ] P1-061: Implement `ConsolidationOrchestrator` service — given `asset_id` + optional `query_context`, (1) reads current twin state, (2) runs all applicable ML models in parallel via Celery group, (3) fetches spares state, (4) fetches last 24h sensor summary from TimescaleDB, (5) fetches active alarms, (6) assembles `ConsolidatedAssetPayload` | REQ: REQ-FUNCTIONAL-040 | Depends: P1-056, P1-060
- [ ] P1-062: Implement consolidation REST endpoint POST `/api/v1/consolidate/{asset_id}/` — sync path (max 10s timeout), returns `ConsolidatedAssetPayload` + triggers LLM tool-call async | REQ: REQ-FUNCTIONAL-040 | Depends: P1-061
- [ ] P1-063: Implement consolidation async path POST `/api/v1/consolidate/{asset_id}/async/` — dispatches Celery task; GET `/api/v1/consolidate/result/{task_id}/` polls result; WS push when complete | REQ: REQ-FUNCTIONAL-040, REQ-FUNCTIONAL-042 | Depends: P1-062
- [ ] P1-064: Define LLM tool-call interface — tool name: `analyze_asset_condition`; input: `ConsolidatedAssetPayload` JSON; output: `DecisionOutput`: `{diagnosis: str, rca: str, risk_level: ENUM, urgency_score: float[0-1], recommendations: [{step, rationale, iso_ref}], spare_strategy: str, citations: [{doc, section, page}], report_text: str}` | REQ: REQ-FUNCTIONAL-041, REQ-LLM-006 | Depends: P1-060
- [ ] P1-065: Implement `ConsolidationLLMBridge` — sends `ConsolidatedAssetPayload` to the Phase-3 LangGraph agent `run_consolidation_inference` tool; receives `DecisionOutput`; persists to `MaintenanceReport`; auto-generates `WorkOrder` if risk_level ∈ {high, critical} | REQ: REQ-FUNCTIONAL-040, REQ-FUNCTIONAL-041 | Depends: P1-064, P1-020, P1-016

---

## 5. Predictive Maintenance Three-Tier Flow

- [ ] P1-066: Define equipment-level tier — each of the 8 assets produces: health_score (0–100), rul_hours (regression), anomaly_score (0–1), fault_class, active_alerts[] | REQ: REQ-FUNCTIONAL-016, REQ-FUNCTIONAL-019 | Depends: P1-047–P1-055
- [ ] P1-067: Define Horizon factory aggregation tier — REQ-MODEL-029: combine SRF, HHPD, FS, HAGCC health scores using criticality-weighted average (FS and SRF highest weight due to cascade risk); compute factory bottleneck ranking; RUL-weighted urgency | REQ: REQ-MODEL-029 | Depends: P1-066
- [ ] P1-068: Define Zephyr factory aggregation tier — REQ-MODEL-030: combine APT, TCMS, CGP, HPAK health scores similarly; APT safety flag overrides normal weighting when breach detected | REQ: REQ-MODEL-030 | Depends: P1-066
- [ ] P1-069: Define plant-level decision tier — REQ-MODEL-031: cross-factory urgency ranking incorporating spares availability and procurement lead time; output: prioritized work order queue | REQ: REQ-MODEL-031, REQ-FUNCTIONAL-021 | Depends: P1-067, P1-068, P1-006
- [ ] P1-070: Expose factory aggregation endpoints: GET `/api/v1/factories/{id}/health/` → `{factory_health_score, asset_rankings[], bottleneck_asset, critical_alerts[]}` | REQ: REQ-FRONTEND-002 | Depends: P1-067, P1-068

---

## 6. Digital Twin Architecture

- [ ] P1-071: Implement per-asset twin state dataclass schema (Python dataclasses matching REQ-TWIN-002 through REQ-TWIN-009) with operating envelope validators; store serialized as JSON in `AssetTwinState.state` | REQ: REQ-TWIN-002–009 | Depends: P1-010
- [ ] P1-072: Implement `TwinStateEngine` — processes incoming telemetry batch → computes delta from previous state → evaluates envelope transitions → updates `AssetTwinState` → emits `twin.state_changed` Celery event | REQ: REQ-TWIN-011 | Depends: P1-027, P1-071
- [ ] P1-073: Implement `TwinWebSocketConsumer` — subscribes clients to asset-specific WS channel `/ws/twins/{asset_id}/`; pushes `TwinStateUpdate` event on state change | REQ: REQ-TWIN-010 | Depends: P1-029, P1-072
- [ ] P1-074: Implement twin history REST endpoint: GET `/api/v1/twins/{asset_id}/history/?from=&to=&fields=` — queries `TwinStateHistory` hypertable with time filtering | REQ: REQ-FRONTEND-004 | Depends: P1-011, P1-071

---

## 7. Auth / RBAC / Onboarding

- [ ] P1-075: Implement JWT auth endpoints: POST `/api/v1/auth/token/`, POST `/api/v1/auth/token/refresh/`, POST `/api/v1/auth/logout/` | REQ: REQ-SECURITY-002 | Depends: P1-021
- [ ] P1-076: Implement RBAC permission classes for DRF views: `IsTechnician`, `IsSupervisor`, `IsAdmin`; enforce on all ViewSets | REQ: REQ-SECURITY-001 | Depends: P1-075
- [ ] P1-077: Implement org onboarding: POST `/api/v1/admin/orgs/` (admin only), auto-creates default factory + admin user | REQ: REQ-SECURITY-001 | Depends: P1-076
- [ ] P1-078: Implement factory onboarding: POST `/api/v1/admin/factories/` — creates factory, seeds asset registry for Horizon or Zephyr, seeds sensor definitions, seeds alarm thresholds | REQ: REQ-FUNCTIONAL-001 | Depends: P1-005, P1-018
- [ ] P1-079: Implement audit logging middleware — writes `AuditLog` record on all POST/PATCH/DELETE to data-modifying endpoints and all LLM/ML invocations | REQ: REQ-SECURITY-009 | Depends: P1-022

---

## 8. Event-Driven Architecture

- [ ] P1-080: Define Celery task inventory and routing:
  - `synthetic.generate_batch` — HIGH priority queue
  - `ml.run_asset_inference` — HIGH priority queue
  - `ml.run_consolidation` — HIGH priority queue
  - `twins.update_state` — HIGH priority queue
  - `alerts.evaluate_thresholds` — HIGH priority queue
  - `rag.ingest_document` — LOW priority queue
  - `ml.retrain_trigger` — LOW priority queue
  - `reports.generate_report` — LOW priority queue
  | REQ: REQ-INFRA-003 | Depends: P1-056, P1-043
- [ ] P1-081: Define Redis pub/sub channel schema:
  - `telemetry.{asset_id}` — live sensor readings
  - `twins.state.{asset_id}` — twin state changes
  - `alerts.{asset_id}` — new alarm events
  - `llm.stream.{session_id}` — LLM token stream
  - `predictions.{asset_id}` — new ML prediction results
  | REQ: REQ-FUNCTIONAL-042 | Depends: P1-073
- [ ] P1-082: Implement `AlertEvaluationTask` Celery task — triggered on each telemetry batch; evaluates all `SensorDefinition` thresholds; creates `AlarmEvent` on breach; routes alert by user role per REQ-FUNCTIONAL-044 | REQ: REQ-FUNCTIONAL-033, REQ-FUNCTIONAL-044 | Depends: P1-017, P1-018, P1-080

---

## 9. Full API Inventory

### Auth
| Method | Path | Auth | Description | REQ |
|---|---|---|---|---|
| POST | `/api/v1/auth/token/` | — | JWT login | REQ-SECURITY-002 |
| POST | `/api/v1/auth/token/refresh/` | — | Refresh token | REQ-SECURITY-002 |
| POST | `/api/v1/auth/logout/` | JWT | Logout | REQ-SECURITY-002 |

### Assets & Factories
| Method | Path | Auth | Description | REQ |
|---|---|---|---|---|
| GET | `/api/v1/factories/` | JWT | List factories | REQ-FUNCTIONAL-001 |
| GET | `/api/v1/factories/{id}/health/` | JWT | Factory health + ranking | REQ-FRONTEND-002 |
| GET | `/api/v1/assets/` | JWT | List assets | REQ-FUNCTIONAL-001 |
| GET | `/api/v1/assets/{id}/` | JWT | Asset detail | REQ-FRONTEND-004 |
| GET | `/api/v1/assets/{id}/health/` | JWT | Asset health + twin summary | REQ-FRONTEND-002 |
| GET | `/api/v1/sensors/` | JWT | List sensor definitions | REQ-FUNCTIONAL-005 |
| GET | `/api/v1/spares/` | JWT | List spare parts | REQ-FUNCTIONAL-011 |

### Telemetry
| Method | Path | Auth | Description | REQ |
|---|---|---|---|---|
| POST | `/api/v1/telemetry/ingest/` | JWT | Batch sensor ingest | REQ-FUNCTIONAL-005 |
| GET | `/api/v1/telemetry/{asset_id}/` | JWT | Sensor time-series (from/to/sensor) | REQ-FRONTEND-004 |

### Digital Twins
| Method | Path | Auth | Description | REQ |
|---|---|---|---|---|
| GET | `/api/v1/twins/{asset_id}/` | JWT | Current twin state | REQ-TWIN-010 |
| GET | `/api/v1/twins/{asset_id}/history/` | JWT | Historical twin states | REQ-TWIN-010 |

### ML Inference
| Method | Path | Auth | Description | REQ |
|---|---|---|---|---|
| POST | `/api/v1/ml/{asset_id}/{model_type}/predict/` | JWT | Sync predict | REQ-FUNCTIONAL-016 |
| POST | `/api/v1/ml/{asset_id}/{model_type}/predict/async/` | JWT | Async predict (returns task_id) | REQ-FUNCTIONAL-016 |
| GET | `/api/v1/ml/predictions/{task_id}/` | JWT | Poll prediction result | REQ-FUNCTIONAL-016 |
| GET | `/api/v1/ml/predictions/{id}/explain/` | JWT | SHAP explanation | REQ-FUNCTIONAL-035 |
| POST | `/api/v1/ml/competition/infer/` | Admin | Competition mode (steel_main.py) | REQ-MODEL-001 |
| GET | `/api/v1/ml/competition/explain/{coil_id}/` | Admin | Competition mode SHAP | REQ-MODEL-001 |

### Consolidation
| Method | Path | Auth | Description | REQ |
|---|---|---|---|---|
| POST | `/api/v1/consolidate/{asset_id}/` | JWT | Sync consolidation + LLM decision | REQ-FUNCTIONAL-040 |
| POST | `/api/v1/consolidate/{asset_id}/async/` | JWT | Async consolidation | REQ-FUNCTIONAL-040 |
| GET | `/api/v1/consolidate/result/{task_id}/` | JWT | Poll consolidation result | REQ-FUNCTIONAL-040 |

### Alerts
| Method | Path | Auth | Description | REQ |
|---|---|---|---|---|
| GET | `/api/v1/alerts/` | JWT | List alarms (filter by asset/severity) | REQ-FUNCTIONAL-033 |
| PATCH | `/api/v1/alerts/{id}/acknowledge/` | JWT | Acknowledge alarm | REQ-FUNCTIONAL-033 |

### Maintenance
| Method | Path | Auth | Description | REQ |
|---|---|---|---|---|
| GET | `/api/v1/maintenance/events/` | JWT | Maintenance history | REQ-FUNCTIONAL-004 |
| POST | `/api/v1/maintenance/events/` | Supervisor+ | Create maintenance event | REQ-FUNCTIONAL-004 |
| GET | `/api/v1/maintenance/work-orders/` | JWT | Work orders | REQ-FUNCTIONAL-022 |
| POST | `/api/v1/maintenance/work-orders/` | JWT | Create work order | REQ-FUNCTIONAL-022 |
| GET | `/api/v1/maintenance/delay-logs/` | JWT | Delay logs | REQ-FUNCTIONAL-001 |

### Reports
| Method | Path | Auth | Description | REQ |
|---|---|---|---|---|
| GET | `/api/v1/reports/` | JWT | List reports | REQ-FUNCTIONAL-027 |
| GET | `/api/v1/reports/{id}/` | JWT | Report detail with citations | REQ-FUNCTIONAL-035 |
| POST | `/api/v1/reports/{id}/feedback/` | JWT | Submit feedback | REQ-FUNCTIONAL-031 |

### Admin
| Method | Path | Auth | Description | REQ |
|---|---|---|---|---|
| POST | `/api/v1/admin/orgs/` | Admin | Create org | REQ-SECURITY-001 |
| POST | `/api/v1/admin/factories/` | Admin | Onboard factory | REQ-FUNCTIONAL-001 |
| POST | `/api/v1/admin/users/` | Admin | Create user | REQ-SECURITY-001 |
| GET | `/api/v1/admin/model-registry/` | Admin | List model versions | REQ-INFRA-008 |
| POST | `/api/v1/admin/model-registry/{id}/promote/` | Admin | Promote model to production | REQ-INFRA-008 |

### WebSocket Channels
| Path | Auth | Description | REQ |
|---|---|---|---|
| `/ws/telemetry` | JWT header | Live sensor readings broadcast | REQ-FUNCTIONAL-043 |
| `/ws/twins/{asset_id}/` | JWT header | Twin state change events | REQ-TWIN-010 |
| `/ws/alerts/` | JWT header | Real-time alarm events | REQ-FUNCTIONAL-033 |
| `/ws/llm/{session_id}/` | JWT header | LLM token streaming | REQ-FUNCTIONAL-042 |

---

## 10. Frontend Data Contracts

- [ ] P1-083: Define `FactoryHealthResponse` — `{factory_id, name, health_score, asset_rankings: [{asset_id, name, health_score, rul_hours, status}], bottleneck_asset_id, critical_alerts_count}` | REQ: REQ-FRONTEND-002 | Depends: P1-070
- [ ] P1-084: Define `TelemetryCellSchema` — matches existing `TelemetryCell` interface in `src/services/types.ts`; backend must produce identical shape | REQ: REQ-FRONTEND-002 | Depends: P1-030
- [ ] P1-085: Define `ChatMessageSchema` — `{id, session_id, role: user|assistant, content, citations: [{doc_title, section, page, iso_ref}], reasoning, model, usage, timestamp}` for MANAS chat | REQ: REQ-FRONTEND-003 | Depends: P1-064
- [ ] P1-086: Define `AssetRULResponse` — `{asset_id, model_type, rul_hours, rul_confidence, rul_degradation_curve: [{t, value}], predicted_failure_date, health_stage}` | REQ: REQ-FRONTEND-006 | Depends: P1-057
- [ ] P1-087: Define `AnomalyAlertResponse` — `{asset_id, alert_id, severity, anomaly_score, sensor_name, current_value, threshold, iso_standard_ref, recommended_action_brief, timestamp}` | REQ: REQ-FRONTEND-005 | Depends: P1-082
- [ ] P1-088: Define `ReportListResponse` and `ReportDetailResponse` with citations array matching `MaintenanceReport` model | REQ: REQ-FRONTEND-007 | Depends: P1-020

---

## 11. Traceability Coverage — Additional Tasks

- [ ] P1-089: Implement fault/error message ingestion endpoint POST `/api/v1/maintenance/fault-messages/` — accepts PLC/SCADA fault codes + timestamps + asset_id; stores as `DelayLog` or `AlarmEvent` depending on type | REQ: REQ-FUNCTIONAL-002 | Depends: P1-017
- [ ] P1-090: Implement failure analysis report ingestion: POST `/api/v1/maintenance/failure-reports/` — accepts structured failure report; indexes into Weaviate `MaintenanceLog` collection; links to `Asset` | REQ: REQ-FUNCTIONAL-003 | Depends: P1-019
- [ ] P1-091: Implement anomaly alert input endpoint POST `/api/v1/alerts/external/` — accepts third-party alert payload (timestamp, threshold_crossed, severity); creates `AlarmEvent`; feeds consolidation context | REQ: REQ-FUNCTIONAL-006 | Depends: P1-017
- [ ] P1-092: Implement process condition indicators ingestion: extend `SensorReading` to carry `condition_type` flag for process health indicators (gas ratio, inhibitor dosing, emulsion quality) | REQ: REQ-FUNCTIONAL-007 | Depends: P1-007
- [ ] P1-093: Implement document knowledge ingestion endpoint (manuals, SOPs): POST `/api/v1/rag/ingest/` — triggers RAG ingestion pipeline for uploaded/linked documents | REQ: REQ-FUNCTIONAL-008, REQ-FUNCTIONAL-009, REQ-FUNCTIONAL-010 | Depends: P1-019
- [ ] P1-094: Implement RCA output field in `MaintenanceReport` and `DecisionOutput`; ensure LLM tool-call response includes `rca` string citing causal chain | REQ: REQ-FUNCTIONAL-015 | Depends: P1-020
- [ ] P1-095: Implement early warning alerts: `AlarmEvaluationTask` produces severity=warning alarms when model predicts failure within configurable horizon (e.g. RUL < 24h) — distinct from threshold-breach alarms | REQ: REQ-FUNCTIONAL-017 | Depends: P1-082
- [ ] P1-096: Implement cross-stage defect association endpoint GET `/api/v1/ml/cross-stage/{asset_id}/` — returns process-defect correlation matrix linking upstream parameters to downstream equipment issues | REQ: REQ-FUNCTIONAL-018 | Depends: P1-055, P1-041
- [ ] P1-097: Implement urgency assessment score in `DecisionOutput`; expose via GET `/api/v1/reports/{id}/urgency/` | REQ: REQ-FUNCTIONAL-020 | Depends: P1-020
- [ ] P1-098: Expose immediate action points as structured field `immediate_actions[]` in `DecisionOutput` and `MaintenanceReport` | REQ: REQ-FUNCTIONAL-023 | Depends: P1-020
- [ ] P1-099: Implement optimized preventive maintenance plan generation: GET `/api/v1/assets/{id}/maintenance-plan/` — returns next scheduled tasks ranked by urgency, incorporating RUL predictions and maintenance schedules | REQ: REQ-FUNCTIONAL-024 | Depends: P1-047–P1-055
- [ ] P1-100: Implement long-term monitoring recommendations field in `MaintenanceReport` — populated from LLM tool-call output; structured as `[{sensor, threshold, interval, rationale}]` | REQ: REQ-FUNCTIONAL-025 | Depends: P1-020
- [ ] P1-101: Implement abnormal alert report generation: POST `/api/v1/reports/alert-report/` — bundles all active AlarmEvents for an asset into a structured PDF/JSON report | REQ: REQ-FUNCTIONAL-028 | Depends: P1-017
- [ ] P1-102: Implement maintenance decision summary endpoint: GET `/api/v1/reports/{id}/summary/` — role-aware: technician gets technical steps; supervisor gets financial/downtime impact summary | REQ: REQ-FUNCTIONAL-029 | Depends: P1-020
- [ ] P1-103: Implement automatic digital logbook entry: on MaintenanceEvent completion, auto-draft a log entry via LLM summarization and save to `MaintenanceReport` with `source=ai_generated` | REQ: REQ-FUNCTIONAL-030 | Depends: P1-020
- [ ] P1-104: Implement user-specific notification delivery: AlarmEvent with role-matched routing; Celery task `alerts.notify_user` sends to user's WS channel | REQ: REQ-FUNCTIONAL-034 | Depends: P1-082
- [ ] P1-105: Implement reactive troubleshooting mode: POST `/api/v1/chat/` with `mode=reactive` routes to LangGraph with fault-message + delay-log context pre-populated | REQ: REQ-FUNCTIONAL-037 | Depends: P1-093
- [ ] P1-106: Implement proactive maintenance planning mode: POST `/api/v1/chat/` with `mode=proactive` routes to LangGraph with RUL predictions + maintenance schedule context | REQ: REQ-FUNCTIONAL-038 | Depends: P1-099
- [ ] P1-107: Implement multi-constraint bottleneck scoring: POST `/api/v1/plant/bottleneck-score/` — returns prioritized asset list with combined urgency score (process_criticality × delay_severity × spares_factor × lead_time_factor) | REQ: REQ-FUNCTIONAL-039 | Depends: P1-069
- [ ] P1-108: Implement dynamic equipment knowledge base: GET `/api/v1/assets/{id}/knowledge-base/` — returns accumulated error history, parts usage history, linked technical documents for the asset | REQ: REQ-FUNCTIONAL-045 | Depends: P1-019, P1-014
- [ ] P1-109: Implement automatic digital logbook drafting Celery task triggered on MaintenanceEvent creation | REQ: REQ-FUNCTIONAL-046 | Depends: P1-103
- [ ] P1-110: Configure Django + DRF + Channels stack in `apps/` with proper INSTALLED_APPS, CHANNEL_LAYERS (Redis), DATABASES (PG + TimescaleDB), CELERY_* settings | REQ: REQ-INFRA-001, REQ-INFRA-002 | Depends: —
- [ ] P1-111: Configure Redis connection for both Celery broker and Django Channels channel layer; set session cache backend to Redis | REQ: REQ-INFRA-004 | Depends: P1-110
- [ ] P1-112: Configure PostgreSQL + TimescaleDB database in Django settings; set up django_timescaledb or raw TimescaleDB extension via migration | REQ: REQ-INFRA-005 | Depends: P1-110
- [ ] P1-113: Configure weaviate-client 4.21.2 in Django settings; initialize Weaviate collections on startup via Django app ready() hook | REQ: REQ-INFRA-007 | Depends: P1-110
- [ ] P1-114: Configure Next.js frontend data contract: update `src/services/` barrel exports to point at actual API URLs (from env var); ensure all existing mock interfaces match API response schemas defined in P1-083–088 | REQ: REQ-INFRA-010 | Depends: P1-083–P1-088
- [ ] P1-115: Configure Docker Compose service definitions in base compose file (task P2-003 owns the full file; this task seeds service name + env mappings for all backend services) | REQ: REQ-INFRA-011 | Depends: P1-110
- [ ] P1-116: Configure primary LLM client: implement `LLMClientFactory` returning Anthropic client (`claude-sonnet-4-20250514`) or OpenAI client (`gpt-4o`) based on `LLM_PROVIDER` env var | REQ: REQ-LLM-001 | Depends: P1-110
- [ ] P1-117: Implement ISO 4406 hydraulic oil cleanliness class monitoring: `AlertEvaluationTask` computes ISO class from particle count sensor; alert on class breach to >18/16/13 for FS and HAGCC | REQ: REQ-COMPLIANCE-002 | Depends: P1-082
- [ ] P1-118: Implement ISO 1461/ASTM A123 galvanizing coating weight monitoring: assert CGP/HPAK coating weight deviation stays within ±5 g/m²; alert on breach | REQ: REQ-COMPLIANCE-003 | Depends: P1-082
- [ ] P1-119: Implement ISO 17359 condition monitoring alarm matrix: implement Annex-D style alarm matrix for each asset's condition monitoring parameters | REQ: REQ-COMPLIANCE-004 | Depends: P1-082
- [ ] P1-120: Implement ISO 13373-3 bearing fault frequency tracking: compute BPFO/BPFI/BSF/FTF frequencies from bearing specs and shaft speed; track amplitude at each frequency | REQ: REQ-COMPLIANCE-005 | Depends: P1-007
- [ ] P1-121: Implement IEC 61511/61508 SRF combustion interlock models in twin transition logic: twin state guard prevents invalid state transitions (e.g. cannot enter high-production state without gas-purge completion) | REQ: REQ-COMPLIANCE-007 | Depends: P1-072
- [ ] P1-122: Implement NACE SP0169 corrosion monitoring fields in APT twin state: acid transport piping corrosion rate tracking | REQ: REQ-COMPLIANCE-009 | Depends: P1-071
- [ ] P1-123: Implement ISO 19973 seal reliability curves in HAGCC RUL model acceptance criteria: HAGCC seal RUL model must match ISO 19973 piston seal life curve shape within 15% RMSE | REQ: REQ-COMPLIANCE-011 | Depends: P1-050
- [ ] P1-124: Reference API 610 in HHPD pump SOP RAG metadata: HHPD documents tagged with `iso_ref: "API 610"` for retrieval | REQ: REQ-COMPLIANCE-012 | Depends: P1-019
- [ ] P1-125: Implement ISO 12944 C5-I structural corrosion monitoring for APT housing in twin state | REQ: REQ-COMPLIANCE-013 | Depends: P1-071
- [ ] P1-126: Implement ISO 13849-1 PL-d safety interlock alarm thresholds as twin transition guards in SRF combustion subsystem | REQ: REQ-COMPLIANCE-014 | Depends: P1-072
- [ ] P1-127: Weaviate local container — enforce no external API calls from RAG; all document embeddings computed locally | REQ: REQ-SECURITY-005 | Depends: P1-113
- [ ] P1-128: Define `AssetTwinState` typed state schema for FS (REQ-TWIN-004): `{rolling_force[7], sideload[7], spindle_torque[7], vibration_rms[7], bpfo_amplitude[7], gap_position[7], chock_clearance_index, health_score, alerts[]}` | REQ: REQ-TWIN-004 | Depends: P1-071
- [ ] P1-129: Define `AssetTwinState` typed state schema for APT (REQ-TWIN-006): `{hcl_free_pct, temp, fecl2_gpl, inhibitor_dosing, tank_wall_thickness_mm, rinse_flow, health_score, alerts[]}` | REQ: REQ-TWIN-006 | Depends: P1-071
- [ ] P1-130: Define `AssetTwinState` typed state schema for TCMS (REQ-TWIN-007): `{rolling_force, interstand_tension, emulsion_flow, emulsion_iron_ppm, emulsion_ph, bpfo_amplitude_142hz, chock_temp, bearing_stage, health_score, alerts[]}` | REQ: REQ-TWIN-007 | Depends: P1-071
- [ ] P1-131: Implement per-asset monitoring alert rules for SRF zone temp deviation >±15°C | REQ: REQ-MONITORING-007 | Depends: P1-082
- [ ] P1-132: Implement per-asset monitoring alert rules for HHPD header pressure <380 bar | REQ: REQ-MONITORING-008 | Depends: P1-082
- [ ] P1-133: Implement per-asset monitoring alert rules for HAGCC oil ISO 4406 class breach >18/16/13 | REQ: REQ-MONITORING-009 | Depends: P1-082
- [ ] P1-134: Seed fixtures: existing dataset path binding — ensure `steel_main.py` data paths resolve correctly inside the container by mounting `backend/models/` and `backend/dataset/` at the expected paths | REQ: REQ-DATA-001, REQ-DATA-002 | Depends: P1-044
- [ ] P1-135: Implement `DATA_QUALITY_RULE: physics-grounded generation enforced` as a test fixture — integration test asserts synthetic generators produce values within operating envelopes for at least 90% of normal-operation samples | REQ: REQ-DATA-004 | Depends: P1-043
- [ ] P1-136: Define frontend data contract for historical logs page: GET `/api/v1/telemetry/{asset_id}/?from=&to=&sensor=` returns paginated time-series with sensor metadata | REQ: REQ-FRONTEND-008 | Depends: P1-030
- [ ] P1-137: Define frontend data contract for factory/asset onboarding: response schema for GET `/api/v1/factories/` with full asset list including `asset_type` and `sensor_count` | REQ: REQ-FRONTEND-001 | Depends: P1-025
- [ ] P1-138: Implement business KPI tracking endpoint GET `/api/v1/plant/kpis/` — returns: `{proactive_maintenance_rate, avg_rul_at_intervention, false_alarm_rate, mean_time_to_repair}` computed from `MaintenanceEvent` and `AlarmEvent` history | REQ: REQ-BUSINESS-001, REQ-BUSINESS-002, REQ-BUSINESS-003, REQ-BUSINESS-004, REQ-BUSINESS-005 | Depends: P1-014, P1-017
- [ ] P1-139: Implement REQ-MODEL-032 sensor fault detector and REQ-MODEL-033 energy efficiency drift detector training + serving alongside cross-asset models in P1-055 | REQ: REQ-MODEL-032, REQ-MODEL-033 | Depends: P1-040, P1-043
