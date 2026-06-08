# Project ATAL — Implementation TODO (Master Plan)

Implementation execution note:
- All backend + database + any local services should run via a **single `docker compose`** setup (one command to bring the full stack up).

## Phase A: Foundations (DB/Schema/Error Codes)
- [ ] Create factory DBs (separate databases):
  - [ ] `atal_factory_1_db`
  - [ ] `atal_factory_2_db`
  - [ ] `atal_factory_3_db`
  - [ ] `atal_factory_4_db`
  - [ ] `atal_factory_5_db`
  - [ ] `atal_factory_6_db`
- [ ] Create system DB:
  - [ ] `atal_plant_system_db`
- [ ] Implement per-factory schemas in each `atal_factory_i_db`:
  - [ ] `schema_asset`
  - [ ] `schema_timeseries`
  - [ ] `schema_derived`
  - [ ] `schema_ml`
  - [ ] `schema_recommend`
  - [ ] `schema_errors`
- [ ] Implement system schemas in `atal_plant_system_db`:
  - [ ] `schema_plant_events`
  - [ ] `schema_system_ml`
  - [ ] `schema_leadtime`
  - [ ] `schema_global_reports`
  - [ ] `schema_errors_global`
- [ ] Implement error-code generator:
  - [ ] Format: `ERR-<domain>-<factory_or_system>-<YYYYMMDD>-<seq>`
- [ ] Implement error registry persistence:
  - [ ] Factory ML errors: write to `atal_factory_i_db.schema_errors.error_registry`
  - [ ] System ML errors: write to `atal_plant_system_db.schema_errors_global.error_registry_global`
- [ ] Implement “error drill-down pointers”:
  - [ ] error registry row must store evidence_ids + pointers to relevant schema_ml / schema_timeseries records

## Phase B: Bottom-Up Synthetic Data Generation (Sensor → Subpart → Equipment)
Goal/order per your feedback: first implement **synthetic sensor modules** for every equipment, then implement **equipment degradation/malfunction models** and DB wiring, then bubble up to factory DBs and ML.

WebSocket live telemetry requirement:
- [ ] Stream live synthetic sensor data to the frontend using WebSockets (Django Channels), via a dedicated endpoint (as per tech stack: `/ws/telemetry`)
- [ ] Define a strict message schema for WebSocket events (e.g., `sensor_sample`, `anomaly_event`, `error_event`) that mirrors the same evidence_ids/error_code used in DB persistence
- [ ] Ensure WebSocket streaming can run concurrently with Celery-driven datagen without blocking core REST APIs

- [ ] Create project folder structure:
  - [ ] Create `sensors/` folder
  - [ ] Create `equipment/` folder
- [ ] For each equipment asset (e.g., `F2-EQ03`, `F3-EQ13`, …) implement:
  - [ ] `sensors/<factory_id>/<equipment_id>/...` synthetic sensor generator module
    - [ ] Define sampling rate(s)
    - [ ] Define baseline signals + noise + drift model
    - [ ] Define “failure signature” observables for that equipment (from split physics)
    - [ ] Export an interface like `generate_signals(window, health_state, rng_seed) -> SensorStream`
  - [ ] `equipment/<factory_id>/<equipment_id>/...` equipment model module
    - [ ] Maintain degradation/wear state variables (health_index, wear_level, stress_state)
    - [ ] Apply defect mechanisms and update health state over time
    - [ ] Emit anomaly/failure triggers + evidence_ids
    - [ ] Export an interface like `step(dt, operating_inputs) -> {health_state, anomalies?, evidence_ids?}`
- [ ] Implement per-equipment watchability (DB) as you requested:
  - [ ] Each equipment has its own DB (or at minimum its own tables/schema) for raw synthetic telemetry + events
  - [ ] Create DB name pattern proposal:
    - [ ] `atal_equipment_<factory_id>_<equipment_id>_db` (example: `atal_equipment_F2_F2-EQ03_db`)
  - [ ] Within each equipment DB create schemas:
    - [ ] `schema_timeseries_equipment` (raw + normalized sensor segments)
    - [ ] `schema_equipment_state` (health_index + wear progression)
    - [ ] `schema_equipment_events` (anomaly events + generated error_code + pointers)
- [ ] Implement canonical entities + data contracts:
  - [ ] SensorStream entity model (with sampling rates + noise/drift)
  - [ ] Subpart entity model
  - [ ] EquipmentAsset entity model
  - [ ] DefectMechanism mapping
  - [ ] AnomalyEvent + ErrorEvent derivation model
- [ ] Implement sensor/subpart datagen engine (bottom-up fashion):
  - [ ] Health state variables + wear/stress trajectories per equipment (delegating to `equipment/` modules)
  - [ ] DefectMechanism → sensor signature mapping (delegating to `sensors/` modules)
  - [ ] Add PLC/SOP alarm thresholds (warning vs trip)
  - [ ] Cascade propagation rules (Type A/B/C/D)
- [ ] Implement “anomaly generation” per equipment asset:
  - [ ] Sensor drift/frozen readings/EMI masking mechanisms where applicable
  - [ ] Process-quality anomalies (FeO, coating weight stripe, acid under-pickling, etc.)
  - [ ] Mechanical anomalies (spalling/crack sequences, bearing failure signatures)
  - [ ] Safety anomalies (hydrogen spike, pressure restriction, furnace stops)
- [ ] Ensure every anomaly can optionally generate:
  - [ ] `error_code`
  - [ ] `evidence_ids`
  - [ ] DB pointers (equipment DB first; later summarized into factory DBs)

## Phase C: Factory Pipelines (ML Phase per Factory)
For each factory pipeline i = 1..6:
- [ ] Create ingestion layer:
  - [ ] Load normalized time windows into `schema_timeseries` (factory DB), aggregating from per-equipment DBs
- [ ] Train/implement defect detection models:
  - [ ] Output defect_classes with confidence
  - [ ] Output anomaly_probability + failure_risk tier
- [ ] Implement RUL estimation per relevant equipment/subparts:
  - [ ] Output `rul_remaining` with confidence
- [ ] Implement explainable “evidence bundle”:
  - [ ] Use mechanistic features + optionally RAG citations from Weaviate
  - [ ] Output `evidence_ids` referenced back to equipment DB rows
- [ ] Implement recommendation/work-order generator:
  - [ ] Immediate / short-term / long-term actions
  - [ ] Spare parts list + procurement lead time
- [ ] Persist results:
  - [ ] Write predictions to `schema_ml`
  - [ ] Write recommendations to `schema_recommend`
  - [ ] Write critical anomalies/errors to `schema_errors`
- [ ] Validate routing semantics:
  - [ ] Product context X/Y/Z correctness using `product_chain.md` route logic

## Phase D: System / 4th Pipeline (Overall Plant ML + Output Contract)
- [ ] Implement system-level consolidation:
  - [ ] Ingest factory predictions + RUL + anomaly events
  - [ ] Apply system cascade logic (cross-factory + time-lag handling)
- [ ] Implement system-level bottleneck + production interruption detection
- [ ] Implement modular parts procurement lead-time planner:
  - [ ] Compute need_by dates from predicted intervention windows
  - [ ] Persist to `atal_plant_system_db.schema_leadtime`
- [ ] Implement predictive chart payload builder:
  - [ ] anomaly_score(t)
  - [ ] failure_probability(t)
  - [ ] rul_remaining(t)
  - [ ] include anomaly/fail event markers and intervention windows
  - [ ] include procurement lead-time overlay series/tables
- [ ] Implement final output formatter (strict output contract):
  - [ ] Success: `<product_name> successfully produced qnty: <qty>`
  - [ ] Failure/Anomaly:
    - [ ] include `error_code`
    - [ ] include chart payload
    - [ ] include recommended actions + parts with lead times
    - [ ] include instruction: `Go to database using error code: <error_code>`

## Phase E: Thorough Testing (Required Before Final Deliverable)
Requirement up-front: no code exists yet, so treat this as mandatory acceptance criteria for the next implementation PR.
- [ ] Unit tests for:
  - [ ] Error-code generator uniqueness
  - [ ] Threshold logic (warning vs trip)
  - [ ] Cascade propagation timing
  - [ ] Evidence pointer integrity (error → evidence → DB rows)
- [ ] Integration tests for:
  - [ ] Bottom-up datagen → factory pipeline → system pipeline end-to-end
  - [ ] Correct DB writes to factory and system schemas
- [ ] Output contract tests:
  - [ ] Success string format exact match
  - [ ] Failure output includes error_code + DB drill-down instruction
  - [ ] Chart payload contains required series and events
- [ ] Scenario tests (sanity):
  - [ ] One anomaly per representative equipment:
    - [ ] one from F2, one from F3, one from F4, one from F5, one from F6
  - [ ] at least one cross-product cascade scenario affecting X/Y/Z routing
