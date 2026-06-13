# MASTER_REQUIREMENTS.md — Project ATAL
**Living document. Check off, never delete. Every phase task must cite ≥1 REQ ID here.**
Last updated: 2026-06-13

---

## FUNCTIONAL

- [ ] REQ-FUNCTIONAL-001: Accept equipment delay logs as system input
- [ ] REQ-FUNCTIONAL-002: Accept fault/error messages from PLC/SCADA control systems
- [ ] REQ-FUNCTIONAL-003: Accept failure analysis reports
- [ ] REQ-FUNCTIONAL-004: Accept incident records and historical breakdown summaries
- [ ] REQ-FUNCTIONAL-005: Accept sensor data summaries (vibration, temperature, pressure, flow, load, position, concentration)
- [ ] REQ-FUNCTIONAL-006: Accept anomaly/abnormality alerts with timestamps, threshold violations, and severity levels
- [ ] REQ-FUNCTIONAL-007: Accept process condition indicators relevant to equipment health
- [ ] REQ-FUNCTIONAL-008: Accept equipment manuals as knowledge input
- [ ] REQ-FUNCTIONAL-009: Accept maintenance SOPs as knowledge input
- [ ] REQ-FUNCTIONAL-010: Accept historical maintenance records
- [ ] REQ-FUNCTIONAL-011: Accept spare parts information including availability and procurement lead times
- [ ] REQ-FUNCTIONAL-012: Accept natural language queries from maintenance engineers
- [ ] REQ-FUNCTIONAL-013: Support multi-turn conversational context across queries
- [ ] REQ-FUNCTIONAL-014: Generate probable fault diagnosis output
- [ ] REQ-FUNCTIONAL-015: Generate root cause analysis (RCA) output
- [ ] REQ-FUNCTIONAL-016: Predict Remaining Useful Life (RUL) for equipment/systems
- [ ] REQ-FUNCTIONAL-017: Generate early warning of potential catastrophic failures
- [ ] REQ-FUNCTIONAL-018: Detect process-related defects contributing to equipment issues
- [ ] REQ-FUNCTIONAL-019: Classify risk level (low / medium / high / critical)
- [ ] REQ-FUNCTIONAL-020: Assess urgency for intervention
- [ ] REQ-FUNCTIONAL-021: Prioritize maintenance bottlenecks at plant level based on process criticality, delay severity, spares availability, procurement lead time
- [ ] REQ-FUNCTIONAL-022: Generate step-by-step maintenance/repair recommendations
- [ ] REQ-FUNCTIONAL-023: Generate immediate action points
- [ ] REQ-FUNCTIONAL-024: Generate optimized preventive maintenance plan
- [ ] REQ-FUNCTIONAL-025: Generate long-term monitoring recommendations
- [ ] REQ-FUNCTIONAL-026: Generate spare procurement strategy
- [ ] REQ-FUNCTIONAL-027: Generate structured maintenance reports
- [ ] REQ-FUNCTIONAL-028: Generate abnormal alert reports
- [ ] REQ-FUNCTIONAL-029: Generate maintenance decision summaries for engineers and supervisors
- [ ] REQ-FUNCTIONAL-030: Generate equipment-specific digital maintenance log entries
- [ ] REQ-FUNCTIONAL-031: Capture human-in-the-loop feedback (confirmations, corrections, rejections) on AI diagnostics
- [ ] REQ-FUNCTIONAL-032: Save verified corrections back into RAG knowledge base (Weaviate), prioritizing expert feedback in subsequent runs
- [ ] REQ-FUNCTIONAL-033: Generate real-time abnormal alert reports
- [ ] REQ-FUNCTIONAL-034: Send user-specific notifications where relevant
- [ ] REQ-FUNCTIONAL-035: Ensure all outputs are explainable and traceable to source data, records, rules, or documentation
- [ ] REQ-FUNCTIONAL-036: Map diagnostic conclusions to specific source records with audit citations (e.g. "Traceable to: Cold Rolling Mill Manual, Ch.3, p.88")
- [ ] REQ-FUNCTIONAL-037: Support reactive troubleshooting mode
- [ ] REQ-FUNCTIONAL-038: Support proactive maintenance planning mode
- [ ] REQ-FUNCTIONAL-039: Multi-constraint bottleneck scoring engine: combined urgency score from process criticality + delay severity + spares availability + procurement lead time
- [ ] REQ-FUNCTIONAL-040: Consolidation endpoint: gather asset/sensor data + run all relevant ML models + assemble consolidated payload + invoke LLM tool-call + return structured decisions
- [ ] REQ-FUNCTIONAL-041: LLM tool-call returns structured decision payload: diagnosis, RCA, risk/priority, step-by-step recommendations, spare strategy, report
- [ ] REQ-FUNCTIONAL-042: WebSocket real-time streaming of LLM token output to frontend
- [ ] REQ-FUNCTIONAL-043: Live telemetry dashboard streaming via WebSocket `/ws/telemetry`
- [ ] REQ-FUNCTIONAL-044: Role-based alert routing: mechanical alerts → technicians; financial/procurement summaries → supervisors
- [ ] REQ-FUNCTIONAL-045: Dynamic equipment knowledge base accumulating error histories, parts used, and document links per asset
- [ ] REQ-FUNCTIONAL-046: Automatic digital logbook drafting for observations, completed tasks, and downtime

---

## MODEL

### REQ-MODEL-001: Existing Coil Defect Classifier (Competition Mode)
- [ ] REQ-MODEL-001: Wrap `steel_main.py` as-is into a production service endpoint. Preserve HEX_SEED prior-reconstruction + CoilID-1095 anchor. Document as "competition mode" / known limitation. Input: 49 anonymized sensor features (X1–X49) per CoilID. Output: binary defect label Y∈{0,1} per coil.

### Horizon — Slab Reheating Furnace (SRF)
- [ ] REQ-MODEL-002: SRF Thermal Underheating Anomaly Detector — classify slab underheating events from thermocouple + pyrometer + gas-flow + O₂ deviations
- [ ] REQ-MODEL-003: SRF Refractory Degradation RUL Predictor — predict remaining campaign life from thermographic IR + zone deviation trends (thermal lag model: `T_slab(t) = T_target − ΔT·(1−e^{−t/τ_thermal})`)
- [ ] REQ-MODEL-004: SRF Walking Beam Seal Drift Health Score — monitor stroke sensor drift indicating hydraulic skid/seal degradation
- [ ] REQ-MODEL-005: SRF Combustion Air/Fuel Ratio Process Drift Detector — flag excursions outside [1.05, 1.15] and O₂ [1.5–2.5%]

### Horizon — High-Pressure Descaler (HHPD)
- [ ] REQ-MODEL-006: HHPD Nozzle Erosion RUL Predictor — model orifice diameter growth `d(n) = d₀(1+0.0002n)` → predict pressure decay and nozzle replacement horizon
- [ ] REQ-MODEL-007: HHPD Pump Cavitation Anomaly Detector — classify cavitation events from acoustic emission intensity (20–50 kHz) and bearing vibration spectra
- [ ] REQ-MODEL-008: HHPD System Health Score — composite from header pressure, filter delta-pressure, AE intensity, and pump vibration

### Horizon — Finishing Stands F1–F7 (FS)
- [ ] REQ-MODEL-009: FS Chock Bearing Spallation RUL Predictor — Paris-law fatigue model `da/dN = C(ΔK)^m` (C=2×10⁻¹², m=3.2); input: chock vibration BPFO/BPFI spectral features
- [ ] REQ-MODEL-010: FS Chock Wear Clearance Anomaly Detector — detect gap asymmetry and strip wedge from load cell sideload + gap position LVDT
- [ ] REQ-MODEL-011: FS Mill Chatter Detector — classify 100–200 Hz self-excited vibration resonance
- [ ] REQ-MODEL-012: FS Roll Health Score — composite from rolling force, spindle torque, sideload, BPFO amplitude, temperature housing

### Horizon — Hydraulic AGC Cylinders (HAGCC)
- [ ] REQ-MODEL-013: HAGCC Seal Drift RUL Predictor — model bypass leakage growth `drift_rate(t) = 0.001·e^{t/4000hr}`, predict seal replacement horizon, alarm on position hysteresis >50 μm
- [ ] REQ-MODEL-014: HAGCC Servovalve Hysteresis Anomaly Detector — detect valve spool edge wear from step-response lag and amplitude deviations
- [ ] REQ-MODEL-015: HAGCC Oil Contamination Classifier — classify ISO 4406 cleanliness class breach (target 15/13/10) from inline particle count and bypass flow

### Zephyr — Acid Pickling Tanks (APT)
- [ ] REQ-MODEL-016: APT HCl Depletion Predictor — model `[HCl_free](t) = [HCl₀] − consumption_rate·t` where rate = k·[FeO_scale]·speed·width·thickness; predict acid replenishment horizon
- [ ] REQ-MODEL-017: APT Lining Pinhole Anomaly Detector — detect tank wall corrosion acceleration from differential pressure across heat exchangers and UT thickness trends (1–5 mm/year limit)
- [ ] REQ-MODEL-018: APT Process Safety Classifier — alert on FeCl₂ >120 g/L, temperature outside [65–85°C], HCl outside [12–18%]

### Zephyr — Tandem Cold Mill Stands (TCMS)
- [ ] REQ-MODEL-019: TCMS Tapered Roller Bearing RUL Predictor — 4-stage emulsion-contamination wear model; input: BPFO amplitude at 142 Hz, chock temperature, iron swarf concentration; alert stages: Stage 3 threshold (temp >80°C, BPFO amplitude >−12 dB)
- [ ] REQ-MODEL-020: TCMS Emulsion Contamination Classifier — classify iron contamination level from chemical analysis (target <200 ppm iron, pH 5.5–6.5)
- [ ] REQ-MODEL-021: TCMS Roll Force Process Drift Detector — detect deviation from [8–20 MN] range and interstand tension [50–150 MPa]

### Zephyr — Continuous Galvanizing Pot (CGP)
- [ ] REQ-MODEL-022: CGP Dross Formation Rate Predictor — Arrhenius model `dross_rate(T) = A·exp(−Q/RT)` (Q=80,000 J/mol); predict dross accumulation and roll exchange interval; critical alarm at >462°C (4.4× acceleration)
- [ ] REQ-MODEL-023: CGP Sink Roll Bushing Wear RUL Predictor — predict bushing diameter loss from torque + pot roll RPM trends; alarm on >5 mm diameter loss
- [ ] REQ-MODEL-024: CGP Fe-in-Zinc Concentration Anomaly Detector — alert on Fe >0.03% (solubility limit breach)

### Zephyr — High-Pressure Air Knives (HPAK)
- [ ] REQ-MODEL-025: HPAK Nozzle Slot Crystallization Anomaly Detector — detect zinc-dust blockage from blower motor current vs header pressure divergence; alarm on pressure drop >95 mbar (ISO 17359)
- [ ] REQ-MODEL-026: HPAK Coating Weight Stripe Predictor — model `CW(x,t) = CW_target·(1+block_factor(x,t))` where `block_factor = 1−e^{−dep_rate·t}`; predict stripe formation onset
- [ ] REQ-MODEL-027: HPAK Air Knife Health Score — composite from air pressure deviation, nozzle-strip LVDT distance, slot blockage index

### Cross-Asset & Factory Level
- [ ] REQ-MODEL-028: Cross-Stage Process Defect Attribution Model — correlate upstream parameters (e.g. SRF temperature deficit → FS rolling force spike → HAGCC drift) across Horizon stages
- [ ] REQ-MODEL-029: Horizon Factory Aggregation Model — combine 8 Horizon asset health scores into factory-level health index and bottleneck ranking
- [ ] REQ-MODEL-030: Zephyr Factory Aggregation Model — combine 8 Zephyr asset health scores into factory-level health index and bottleneck ranking
- [ ] REQ-MODEL-031: Plant-Level Decision Intelligence Model — combine Horizon + Zephyr factory indices with spares/procurement data into plant-wide urgency and maintenance priority ranking
- [ ] REQ-MODEL-032: Sensor Fault Detector (cross-asset) — distinguish genuine anomaly from sensor fault/dropout using multi-sensor consensus and residual-based methods
- [ ] REQ-MODEL-033: Energy Efficiency Drift Detector — flag abnormal energy consumption patterns (gas flow, inductor power, blower current) relative to production throughput
- [ ] REQ-MODEL-034: Alarm Intelligence Filter — suppress nuisance alarms using statistical floodgating; classify alarm patterns by root cause cluster (maps to ISO IEC 62682)

---

## DATA

### Existing Dataset
- [ ] REQ-DATA-001: Train dataset `ATAL_Project/backend/backend/dataset/train.csv` — 1352 rows, 49 anonymized features X1–X49 + binary label Y. Used exclusively by REQ-MODEL-001 (competition mode). No physics mapping.
- [ ] REQ-DATA-002: Test dataset `ATAL_Project/backend/backend/dataset/test.csv` — 339 rows, same 49 features, no label. Used exclusively by REQ-MODEL-001.

### Synthetic Data Subsystem (first-class service)
- [ ] REQ-DATA-003: Synthetic data generation subsystem — standalone service (Celery worker) producing realistic sensor streams and labeled failure events for every per-asset model. Continuous production pipeline persisting to TimescaleDB and PostgreSQL.
- [ ] REQ-DATA-004: Synthetic generation must implement the exact degradation equations from `horizon_zephyr_summary.md §5` for each applicable model — no approximation with generic Gaussian noise alone.

### SRF Synthetic Datasets
- [ ] REQ-DATA-005: SRF normal-operation dataset — zone temps [1150–1250°C], zone deviation <±15°C, gas flow, O₂ [1.5–2.5%], beam stroke, 1000+ steady-state samples/day simulated
- [ ] REQ-DATA-006: SRF underheating event dataset — inject thermal lag via `T_slab(t)=T_target−ΔT·(1−e^{−t/τ})` (τ=45min, ΔT≈60°C); label onset; downstream feature: induced rolling force spike signature
- [ ] REQ-DATA-007: SRF refractory degradation progression dataset — simulate zone deviation growth over campaign time; IR thermography thickness surrogate; labels: healthy / watch / alert / critical
- [ ] REQ-DATA-008: SRF walking beam stroke drift dataset — exponential drift injected post-seal wear threshold; binary fault label

### HHPD Synthetic Datasets
- [ ] REQ-DATA-009: HHPD normal-operation dataset — header pressure [380–400 bar], flow ~5000 L/min, AE baseline, filter delta-P normal
- [ ] REQ-DATA-010: HHPD nozzle erosion progression dataset — simulate `d(n)=d₀(1+0.0002n)` → `P(n)=P_supply·(d₀/d(n))⁴`; label: cycles-to-replacement (regression target)
- [ ] REQ-DATA-011: HHPD cavitation event dataset — inject AE intensity spikes (20–50 kHz), pressure variance bursts; binary fault + severity label

### FS Synthetic Datasets
- [ ] REQ-DATA-012: FS normal-operation dataset — rolling force [10–20 MN], sideload [200–500 kN], spindle torque [500–3000 kNm], vibration <4.5 mm/s RMS (ISO 10816-3 normal zone)
- [ ] REQ-DATA-013: FS bearing spallation progression dataset — simulate Paris-law crack accumulation `da/dN=C(ΔK)^m`; BPFO amplitude growth; 4-stage health label; RUL regression target in hours
- [ ] REQ-DATA-014: FS chatter detection dataset — inject 100–200 Hz oscillation signatures; binary chatter/no-chatter label
- [ ] REQ-DATA-015: FS chock wear dataset — simulate clearance growth `Clearance(n)=C₀+K_wear·n`; downstream wedge = 0.8·Clearance·(F_roll/K_housing); label: clearance class

### HAGCC Synthetic Datasets
- [ ] REQ-DATA-016: HAGCC normal-operation dataset — gap position LVDT, cylinder pressure [250–350 bar], oil ISO class 15/13/10, bypass flow nominal
- [ ] REQ-DATA-017: HAGCC seal drift dataset — simulate `drift_rate(t)=0.001·e^{t/4000hr}`; thickness error = drift_rate·delay·speed; RUL target = hours to 0.01 mm/min breach
- [ ] REQ-DATA-018: HAGCC servovalve hysteresis dataset — step-response test data with injected phase lag and amplitude attenuation; binary fault label

### APT Synthetic Datasets
- [ ] REQ-DATA-019: APT normal-operation dataset — HCl [12–18%], temp [65–85°C], FeCl₂ [0–120 g/L]
- [ ] REQ-DATA-020: APT acid depletion dataset — simulate consumption `[HCl](t)=[HCl₀]−k·[FeO]·speed·width·thickness·t`; predict hours-to-replenishment (regression)
- [ ] REQ-DATA-021: APT lining failure dataset — differential heat-exchanger pressure growth, UT thickness reduction at 1–5 mm/year; binary leak/no-leak + severity label

### TCMS Synthetic Datasets
- [ ] REQ-DATA-022: TCMS normal-operation dataset — rolling force [8–20 MN], interstand tension [50–150 MPa], emulsion flow [2000–4000 L/min], bearing temp baseline [45°C]
- [ ] REQ-DATA-023: TCMS bearing wear progression dataset — 4-stage model: Stage1 (baseline), Stage2 (temp 45→65°C, faint BPFO at 142 Hz), Stage3 (temp >65°C, BPFO −28→−20 dB), Stage4 (temp >80°C, BPFO >−12 dB); stage label + RUL hours
- [ ] REQ-DATA-024: TCMS emulsion contamination dataset — iron swarf concentration 0→500 ppm; pH drift; 5-level contamination class

### CGP Synthetic Datasets
- [ ] REQ-DATA-025: CGP normal-operation dataset — pot temp [450–462°C], Fe-in-Zinc <0.03%, pot level [500–800 mm], pot roll torque nominal
- [ ] REQ-DATA-026: CGP dross formation dataset — simulate `dross_rate(T)=A·exp(−Q/RT)` over temp excursion events (Q=80,000 J/mol); label: dross-accumulation-level + hours-to-roll-exchange
- [ ] REQ-DATA-027: CGP bushing wear dataset — simulate torque/RPM signature of increasing bushing clearance → diameter loss; alarm threshold >5 mm; RUL regression

### HPAK Synthetic Datasets
- [ ] REQ-DATA-028: HPAK normal-operation dataset — air pressure [0.3–1.2 bar], nozzle distance [8–20 mm], blower RPM nominal, CW within ±5 g/m²
- [ ] REQ-DATA-029: HPAK nozzle crystallization dataset — simulate `block_factor(x,t)=1−e^{−dep_rate·t}`; pressure drop growth to alarm threshold 95 mbar; binary blocked/not + block severity
- [ ] REQ-DATA-030: HPAK coating weight stripe dataset — CW spatial distribution with injected stripes; binary stripe/no-stripe label per strip segment

### Cross-Asset & RAG Datasets
- [ ] REQ-DATA-031: Cross-stage correlation dataset — paired SRF temperature deficit + downstream FS rolling force spike events; label: causal chain type
- [ ] REQ-DATA-032: Plant-level aggregation dataset — combined Horizon+Zephyr factory health score time series + spares stock + procurement lead times; label: maintenance urgency tier (1–4)
- [ ] REQ-DATA-033: Sensor fault injection dataset — single-sensor dropout, drift, spike, frozen-value patterns across all assets; label: sensor_fault / genuine_anomaly
- [ ] REQ-DATA-034: RAG document corpus — OEM manuals and factsheets from Section 6 of `horizon_zephyr_summary.md` (Danieli DANOIL, Parker HY08, SKF guides, Schaeffler FAG, ISO 17359, Emerson Fisher, Siemens S7-1200, Rockwell Logix 5000, OSHA 1910.147, OSHA 1910.119, descaler brief, cold mill guide, galvanizing guide, Scribd SRF SOP), plus ISO/IEC standards text (62682, 61511, 61508, 10816-3, 13373-3, 4406, 17359, 19973, 1461, 1460, 12944, 14224, 6085)
- [ ] REQ-DATA-035: Maintenance dialogue synthetic corpus — Q&A pairs grounded in Horizon/Zephyr SOPs, degradation physics, maintenance schedules, and model outputs for LLM fine-tuning

---

## INFRA

- [ ] REQ-INFRA-001: Django 6.0.6 + DRF 3.17.1 + Django Channels as primary backend framework
- [ ] REQ-INFRA-002: Uvicorn ASGI server (replaces WSGI; enables async DRF + Channels)
- [ ] REQ-INFRA-003: Celery 5.6.3 for async task orchestration (telemetry simulation, ML inference, synthetic data generation, retrain triggers)
- [ ] REQ-INFRA-004: Redis 8.8.0-alpine as Celery broker + session cache + telemetry snapshot store
- [ ] REQ-INFRA-005: PostgreSQL 17-alpine for relational/transactional data (assets, users, maintenance events, model registry, audit logs)
- [ ] REQ-INFRA-006: TimescaleDB extension on PostgreSQL for high-frequency sensor time-series (hypertables, continuous aggregates, data retention policies)
- [ ] REQ-INFRA-007: ChromaDB (embedded, ≥0.6.0) as vector store for RAG (equipment manuals, SOPs, ISO standards, maintenance logs, model explanations) — runs inside Django/Celery containers, no separate service
- [ ] REQ-INFRA-008: Lightweight file/DB-backed model registry in PostgreSQL (replaces MLflow — stores model metadata, version, artifact path, training metrics, promotion status)
- [ ] REQ-INFRA-009: DVC for data version control of synthetic datasets and model artifacts
- [ ] REQ-INFRA-010: Next.js 16.2 frontend build (existing; backend must provide data contracts)
- [ ] REQ-INFRA-011: Docker Compose multi-service orchestration for all backend services
- [ ] REQ-INFRA-012: Synthetic data generation as a first-class Celery-backed service, producing continuous streams to TimescaleDB during development and demo

---

## SECURITY

- [ ] REQ-SECURITY-001: RBAC with at least 3 roles: Technician (operational alerts, chat), Supervisor (reports, procurement), Admin (system config, user management)
- [ ] REQ-SECURITY-002: JWT-based authentication for all API endpoints
- [ ] REQ-SECURITY-003: LLM tool-call boundary enforcement — LLM cannot directly write to database; all writes go through sanitized Python tool decorators validated by Django ORM
- [ ] REQ-SECURITY-004: Redis and Celery isolated within internal Docker network — inaccessible to external web vectors
- [ ] REQ-SECURITY-005: ChromaDB running embedded within Docker containers with persistent volume — no technical documents sent to external cloud services
- [ ] REQ-SECURITY-006: Secrets management via per-environment `.env` files, never committed; `.env.example` committed with placeholders
- [ ] REQ-SECURITY-007: OWASP Top 10 mitigations: input validation, SQL injection prevention via ORM, XSS protection, CSRF tokens, secure headers
- [ ] REQ-SECURITY-008: Container hardening — non-root users, minimal base images, no sensitive data in layers
- [ ] REQ-SECURITY-009: Audit log for all AI diagnostic decisions + user feedback events (who, when, what recommendation, accepted/rejected)

---

## LLM

- [ ] REQ-LLM-001: Primary LLM: `claude-sonnet-4-20250514` (Anthropic API) or `gpt-4o` (OpenAI API) — configurable via environment
- [ ] REQ-LLM-002: On-premises SLM fallback: Ollama hosting `Llama-3-8B-Instruct` or `Phi-3-Mini` in GPU-passthrough container for data-sovereignty mode
- [ ] REQ-LLM-003: LangGraph 1.2.4 for deterministic multi-agent orchestration (Diagnostic Agent → RCA Agent → RUL Predictor Agent → Recommendation Agent)
- [ ] REQ-LLM-004: LangChain ≥0.3.0 + chromadb ≥0.6.0 for RAG retrieval chain
- [ ] REQ-LLM-005: BAAI/bge-m3 via FlagEmbedding ≥1.2.0 for 1024-dim embedding of all RAG documents
- [ ] REQ-LLM-006: Consolidation tool-call schema — structured tool definition accepted by the primary LLM, receiving the ML-consolidated payload; returning `{diagnosis, rca, risk_level, urgency_score, recommendations[], spare_strategy, citations[], report_text}`
- [ ] REQ-LLM-007: Factory context injection — every LLM interaction pre-populated with the queried asset's current twin state, recent sensor summary, active alerts, and applicable ISO alarm thresholds
- [ ] REQ-LLM-008: WebSocket streaming of LLM token output to frontend via Django Channels
- [ ] REQ-LLM-009: Conversation history and session management per user/session stored in Redis
- [ ] REQ-LLM-010: RAG chunking strategy: semantic chunking at section/paragraph level for manuals/SOPs; metadata: document type, asset scope, ISO standard reference, page/section
- [ ] REQ-LLM-011: ChromaDB collection schema: `EquipmentManual`, `SOP`, `ISOStandard`, `MaintenanceLog`, `ModelExplanation`, `SafetyCode` collections; cosine distance; BGE-M3 1024-dim vectors
- [ ] REQ-LLM-012: LLM agent tools: `query_digital_twin`, `query_model_predictions`, `retrieve_maintenance_history`, `search_sop`, `check_iso_compliance`, `trigger_model_retrain`, `generate_work_order`, `run_consolidation_inference`
- [ ] REQ-LLM-013: Hallucination reduction: LLM must cite exact numeric thresholds from retrieved documents; prompt must instruct refusal when operating envelope not retrievable
- [ ] REQ-LLM-014: Fine-tuning corpus construction from Horizon/Zephyr domain documents for domain adaptation
- [ ] REQ-LLM-015: PEFT/LoRA fine-tuning strategy on domain corpus (base model TBD by hardware capability)
- [ ] REQ-LLM-016: Retrieval evaluation framework: hit rate, MRR, faithfulness metrics tracked per query type
- [ ] REQ-LLM-017: Continuous improvement loop: production query logs → evaluation → corpus update → fine-tune trigger
- [ ] REQ-LLM-018: Multi-agent RCA planning for complex cross-stage failure cascades (e.g. SRF underheating → FS force spike → HAGCC drift)

---

## DEPLOY

- [ ] REQ-DEPLOY-001: Single-command production deployment: `docker compose up --env-file .env.prod`
- [ ] REQ-DEPLOY-002: Single-command development deployment: `docker compose up`
- [ ] REQ-DEPLOY-003: Service health checks on all containers with restart policies
- [ ] REQ-DEPLOY-004: Internal Docker network topology isolating broker/worker from public-facing API
- [ ] REQ-DEPLOY-005: Reverse proxy (nginx or Traefik) routing external traffic to API + WebSocket
- [ ] REQ-DEPLOY-006: CI/CD pipeline with stages: lint → unit tests → integration tests → build images → deploy gate → promote
- [ ] REQ-DEPLOY-007: Container vulnerability scanning in CI pipeline
- [ ] REQ-DEPLOY-008: Automated backup of PostgreSQL + ChromaDB persist dir on schedule via Celery beat tasks
- [ ] REQ-DEPLOY-009: Post-deploy verification checklist (health endpoint, WebSocket ping, ML inference smoke test, RAG retrieval smoke test)

---

## MONITORING

- [ ] REQ-MONITORING-001: Structured JSON logging on all services (correlation IDs)
- [ ] REQ-MONITORING-002: Prometheus metrics scraping on all services
- [ ] REQ-MONITORING-003: Grafana dashboards: API latency, ML prediction throughput, RAG retrieval latency, LLM token output rate, WebSocket connection count, Celery task queue depth
- [ ] REQ-MONITORING-004: OpenTelemetry distributed tracing from API → Celery → ML inference → LLM → response
- [ ] REQ-MONITORING-005: ISO-threshold-mapped alerting rules in Prometheus/Grafana:
  - FS vibration alert >4.5 mm/s RMS (ISO 10816-3), trip >7.1 mm/s RMS
  - TCMS BPFO amplitude at 142 Hz crossing −12 dB (Stage 4)
  - CGP temperature >462°C (dross acceleration), >470°C (critical)
  - HPAK header pressure drop >95 mbar (ISO 17359 blockage alarm)
  - HAGCC position hysteresis >50 μm
  - APT FeCl₂ >120 g/L; HCl outside [12–18%]
  - CGP Fe-in-Zinc >0.03%
- [ ] REQ-MONITORING-006: Model drift detection — statistical distribution shift monitoring on prediction inputs; trigger retrain workflow when drift exceeds threshold
- [ ] REQ-MONITORING-007: SRF — continuous zone temp deviation monitoring; alert on zone deviation >±15°C
- [ ] REQ-MONITORING-008: HHPD — header pressure monitoring; alert on <380 bar
- [ ] REQ-MONITORING-009: HAGCC — oil cleanliness monitoring; alert on ISO 4406 class breach above 18/16/13

---

## FRONTEND

- [ ] REQ-FRONTEND-001: Backend must expose data contracts (API response schemas + WebSocket message schemas) sufficient for all existing frontend mock-data consumers to be replaced
- [ ] REQ-FRONTEND-002: SANSAD dashboard data contracts: factory health index, per-asset health scores, live telemetry cells, RUL countdowns, anomaly alert stream
- [ ] REQ-FRONTEND-003: MANAS chat data contracts: conversation session API, LLM streaming WS, RAG source citations in response, feedback submission endpoint
- [ ] REQ-FRONTEND-004: Asset detail page contracts: digital twin state, sensor time-series (last 24h), active alerts, maintenance history, model prediction history
- [ ] REQ-FRONTEND-005: Abnormality prediction (abpred) page contracts: current anomaly alerts per asset, severity, recommended action
- [ ] REQ-FRONTEND-006: RUL monitor page contracts: per-asset RUL values, confidence intervals, trend chart data
- [ ] REQ-FRONTEND-007: Reports/governance (samvidhaan) page contracts: structured report list, exportable maintenance summaries
- [ ] REQ-FRONTEND-008: Log + historical logs contracts: maintenance event history, delay log records, sensor event history

---

## TWIN

- [ ] REQ-TWIN-001: Digital twin state schema per asset grounded in the operating envelopes from `horizon_zephyr_summary.md` — not generic; each asset has its own typed state fields
- [ ] REQ-TWIN-002: SRF twin state: `{zone_temps[6], slab_temp_out, gas_flow, o2_pct, beam_stroke, air_fuel_ratio, refractory_remaining_pct, health_score, alerts[]}`
- [ ] REQ-TWIN-003: HHPD twin state: `{header_pressure, flow_rate, ae_intensity, filter_delta_p, nozzle_erosion_index, pump_vibration, health_score, alerts[]}`
- [ ] REQ-TWIN-004: FS twin state: `{rolling_force[7], sideload[7], spindle_torque[7], vibration_rms[7], bpfo_amplitude[7], gap_position[7], chock_clearance_index, health_score, alerts[]}`
- [ ] REQ-TWIN-005: HAGCC twin state: `{gap_position, oil_pressure, oil_iso_class, bypass_flow, drift_rate, hysteresis_deviation, seal_health_pct, health_score, alerts[]}`
- [ ] REQ-TWIN-006: APT twin state: `{hcl_free_pct, temp, fecl2_gpl, inhibitor_dosing, tank_wall_thickness_mm, rinse_flow, health_score, alerts[]}`
- [ ] REQ-TWIN-007: TCMS twin state: `{rolling_force, interstand_tension, emulsion_flow, emulsion_iron_ppm, emulsion_ph, bpfo_amplitude_142hz, chock_temp, bearing_stage, health_score, alerts[]}`
- [ ] REQ-TWIN-008: CGP twin state: `{pot_temp, fe_in_zinc_pct, pot_level, dross_rate, sink_roll_bushing_wear_mm, inductor_power, health_score, alerts[]}`
- [ ] REQ-TWIN-009: HPAK twin state: `{air_pressure, nozzle_distance, slot_block_factor, header_pressure_drop, blower_rpm, coating_weight_deviation, health_score, alerts[]}`
- [ ] REQ-TWIN-010: Twin state update cadence: real-time from synthetic telemetry stream (≤5s lag); REST read endpoint + WebSocket push on state change
- [ ] REQ-TWIN-011: Twin state transition logic: detect entry/exit of operating envelope bands and transition health scores accordingly
- [ ] REQ-TWIN-012: Cross-asset twin linkage: SRF slab_temp_out feeds FS as input context; CGP dross_rate fed by pot_temp from inductor power

---

## BUSINESS

- [ ] REQ-BUSINESS-001: Reduce unplanned downtime (primary KPI — demonstrate with simulated scenario)
- [ ] REQ-BUSINESS-002: Improve maintenance response time vs baseline manual process
- [ ] REQ-BUSINESS-003: Increase diagnostic accuracy relative to threshold (demonstrate via model acceptance tests)
- [ ] REQ-BUSINESS-004: Shift from reactive to proactive maintenance — demonstrate RUL-triggered work order creation ahead of failure
- [ ] REQ-BUSINESS-005: Demonstrate spare parts optimization — procurement strategy recommendation vs current stock
- [ ] REQ-BUSINESS-006: Demo video showcasing: chat query → diagnosis → RUL visualization → recommendation → report generation
- [ ] REQ-BUSINESS-007: Complete source code deliverable + architecture document + data flow + model design + alerting/prediction logic + assumptions/limitations + install guide + sample I/O demo

---

## COMPLIANCE

- [ ] REQ-COMPLIANCE-001: ISO 10816-3 vibration thresholds embedded in monitoring (alert >4.5 mm/s, trip >7.1 mm/s for Class III machines)
- [ ] REQ-COMPLIANCE-002: ISO 4406 hydraulic oil cleanliness — enforce target class 15/13/10 monitoring and alert on breach to 18/16/13 for FS and HAGCC
- [ ] REQ-COMPLIANCE-003: ISO 1461 + ASTM A123 galvanized coating specs — coat weight target and tolerance in CGP monitoring
- [ ] REQ-COMPLIANCE-004: ISO 17359 condition monitoring principles — alarm matrix design follows Annex D structure
- [ ] REQ-COMPLIANCE-005: ISO 13373-3 bearing fault frequencies — BPFO/BPFI/BSF/FTF frequencies computed and tracked for FS and TCMS bearings
- [ ] REQ-COMPLIANCE-006: IEC 62682 alarm management — alarm priority classification, alarm flood detection
- [ ] REQ-COMPLIANCE-007: IEC 61511 / IEC 61508 safety instrumented system context — SRF combustion interlocks modeled in twin transition logic
- [ ] REQ-COMPLIANCE-008: OSHA 1910.119 + OSHA 1910.147 — APT pickling process safety rules embedded in APT agent tool responses
- [ ] REQ-COMPLIANCE-009: NACE SP0169 — acid transport piping corrosion monitoring rules in APT twin
- [ ] REQ-COMPLIANCE-010: ISO 14224 reliability data structure — maintenance event metadata schema follows ISO 14224 ERP/CMMS registry format
- [ ] REQ-COMPLIANCE-011: ISO 19973 hydraulic seal reliability — HAGCC seal life curves referenced in RUL model acceptance criteria
- [ ] REQ-COMPLIANCE-012: API 610 centrifugal pump design — HHPD pump SOP references in RAG corpus
- [ ] REQ-COMPLIANCE-013: ISO 12944 C5-I corrosion protection — APT structural housing monitoring category in twin
- [ ] REQ-COMPLIANCE-014: ISO 13849-1 PL-d safety — SRF combustion interlock alarm thresholds in twin transition guards
