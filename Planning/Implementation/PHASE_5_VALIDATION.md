# PHASE_5_VALIDATION.md — Project ATAL
**Scope: End-to-end system validation and hackathon demo sign-off. No production deployment.**
Task format: `- [ ] P5-NNN: {task} | REQ: REQ-{CAT}-{NNN} | Depends: P5-NNN`

---

## 1. Integration Test Suite

### 1.1 Auth & RBAC
- [ ] P5-001: Test JWT token issuance and refresh; assert 401 on expired token; assert 403 on wrong role | REQ: REQ-SECURITY-002 | Depends: —
- [ ] P5-002: Test RBAC: Technician cannot POST `/api/v1/admin/orgs/`; Supervisor can create WorkOrder; Admin can access model registry | REQ: REQ-SECURITY-001 | Depends: P5-001

### 1.2 Telemetry & Twin
- [ ] P5-003: POST `/api/v1/telemetry/ingest/` with valid SRF sensor batch → assert written to TimescaleDB hypertable; assert twin state updated within 5s | REQ: REQ-FUNCTIONAL-005, REQ-TWIN-010 | Depends: —
- [ ] P5-004: POST sensor reading that breaches ISO 10816-3 alert threshold (4.5 mm/s on FS vibration) → assert `AlarmEvent` created with `severity=warning`; assert WS push received by subscribed client | REQ: REQ-COMPLIANCE-001, REQ-FUNCTIONAL-033 | Depends: P5-003
- [ ] P5-005: GET `/api/v1/twins/{asset_id}/` → assert response matches `AssetTwinState` schema; assert all per-asset typed fields present | REQ: REQ-TWIN-001 | Depends: P5-003

### 1.3 ML Inference
- [ ] P5-006: POST `/api/v1/ml/{srf_asset_id}/anomaly/predict/` with underheating sensor vector → assert `MLPrediction` created; assert prediction_output contains `anomaly_score > 0.7` for injected event | REQ: REQ-MODEL-002 | Depends: —
- [ ] P5-007: POST `/api/v1/ml/{tcms_asset_id}/rul/predict/` with Stage-4 bearing features → assert `rul_hours < 48`; assert `health_stage = 4` | REQ: REQ-MODEL-019 | Depends: —
- [ ] P5-008: GET `/api/v1/ml/predictions/{id}/explain/` → assert SHAP values returned for top-10 features; assert no feature has 0.5 as confidence placeholder | REQ: REQ-FUNCTIONAL-035 | Depends: P5-006
- [ ] P5-009: POST `/api/v1/ml/competition/infer/` with the actual `train.csv` + `test.csv` → assert output matches `expected_submission.csv` exactly (including CoilID-1095 forced label) | REQ: REQ-MODEL-001 | Depends: —

### 1.4 Consolidation Endpoint
- [ ] P5-010: POST `/api/v1/consolidate/{asset_id}/` with all asset data populated → assert `ConsolidatedAssetPayload` assembled (all required fields present, no nulls except optional) within 10s timeout | REQ: REQ-FUNCTIONAL-040 | Depends: P5-005, P5-006
- [ ] P5-011: Assert consolidation endpoint triggers LLM tool-call and returns `DecisionOutput` with all required fields: `diagnosis`, `rca`, `risk_level`, `urgency_score`, `recommendations[]`, `spare_strategy`, `citations[]`, `report_text` | REQ: REQ-FUNCTIONAL-041 | Depends: P5-010
- [ ] P5-012: Test async consolidation path → assert task_id returned immediately; assert result available via GET `/api/v1/consolidate/result/{task_id}/` within 30s; assert WS notification received | REQ: REQ-FUNCTIONAL-040 | Depends: P5-010

### 1.5 RAG
- [ ] P5-013: Trigger `manage.py ingest_corpus`; assert all 16 documents ingested; assert Weaviate collection counts > 0 for each collection | REQ: REQ-DATA-034 | Depends: —
- [ ] P5-014: POST `/api/v1/chat/` with query "What is the startup SOP for the Slab Reheating Furnace?" → assert response contains nitrogen purge step and 50°C/hr ramp rate from SRF SOP document | REQ: REQ-FUNCTIONAL-012 | Depends: P5-013
- [ ] P5-015: POST `/api/v1/chat/` with query about HAGCC oil cleanliness → assert response cites ISO 4406 Class 15/13/10 threshold exactly as documented | REQ: REQ-LLM-013 | Depends: P5-013

### 1.6 Feedback Loop
- [ ] P5-016: POST `/api/v1/reports/{id}/feedback/` with `{feedback_type: "correct", corrected_values: {...}}` → assert `Feedback` record created; assert `weaviate_updated=True` after async task completes; assert corrected content retrievable from Weaviate | REQ: REQ-FUNCTIONAL-032 | Depends: P5-011

### 1.7 Work Orders & Alerts
- [ ] P5-017: Consolidation with `risk_level=critical` result → assert `WorkOrder` auto-generated with correct priority=1; assert accessible via GET `/api/v1/maintenance/work-orders/` | REQ: REQ-FUNCTIONAL-022 | Depends: P5-011
- [ ] P5-018: Assert alert routing: AlarmEvent with asset in Technician's `factory_access` delivered via WS to that Technician's channel; financial/procurement summary report visible only to Supervisor+ | REQ: REQ-FUNCTIONAL-044 | Depends: P5-004

---

## 2. Performance & Load Testing

- [ ] P5-019: Define performance targets:
  - Sync consolidation endpoint P95 latency: ≤ 10s (cold ML inference + LLM call)
  - Async consolidation task completion: ≤ 30s at p95
  - ML inference (per model, cached model load): ≤ 500ms p95
  - Telemetry ingest batch (50 readings): ≤ 200ms p95
  - RAG retrieval (Weaviate hybrid search): ≤ 300ms p95
  - WebSocket message delivery lag: ≤ 1s at p95
  - API throughput: ≥ 50 concurrent users without degradation
  | REQ: REQ-FUNCTIONAL-033 | Depends: —
- [ ] P5-020: Implement load test using `locust` — scenarios: 50 concurrent technicians sending telemetry + chat queries; assert all P95 targets met | REQ: REQ-FUNCTIONAL-042 | Depends: P5-019
- [ ] P5-021: WebSocket concurrency test — 100 simultaneous WS connections receiving twin state updates; assert no message drops; assert delivery lag ≤ 1s | REQ: REQ-FUNCTIONAL-042 | Depends: P5-020
- [ ] P5-022: Synthetic data generation throughput test — assert `SyntheticDataOrchestrator` can produce ≥ 1000 sensor readings/second across all 8 assets under Celery concurrency | REQ: REQ-DATA-003 | Depends: —

---

## 3. Security Audit Checklist

- [ ] P5-023: OWASP A01 Broken Access Control — assert all data-modifying endpoints return 403 for wrong role; assert no IDOR (test accessing another user's reports by ID guessing) | REQ: REQ-SECURITY-001 | Depends: —
- [ ] P5-024: OWASP A02 Cryptographic Failures — assert JWT signing key is not default/empty; assert all external connections use TLS; assert no sensitive data in API response that shouldn't be there | REQ: REQ-SECURITY-002 | Depends: —
- [ ] P5-025: OWASP A03 Injection — assert all DB queries use ORM parameterization (no raw SQL f-strings); assert Weaviate queries sanitized; assert LLM tool inputs sanitized before tool execution | REQ: REQ-SECURITY-007 | Depends: —
- [ ] P5-026: OWASP A05 Security Misconfiguration — assert no stack traces returned to client; assert security headers present in nginx responses (X-Content-Type-Options, X-Frame-Options) | REQ: REQ-SECURITY-007 | Depends: —
- [ ] P5-027: LLM tool boundary enforcement — attempt to inject a tool call instruction via chat message that would directly write to database; assert it is blocked by tool decorator validation | REQ: REQ-SECURITY-003 | Depends: —
- [ ] P5-028: Secrets exposure audit — grep all committed files for hardcoded keys, passwords, or connection strings; assert zero findings; assert `.env*` (except `.env.example`) is gitignored | REQ: REQ-SECURITY-006 | Depends: —
- [ ] P5-029: Container escape test — verify no container runs as root (`id` returns non-zero UID) | REQ: REQ-SECURITY-008 | Depends: —

---

## 4. Model Validation Plan

For each model in MASTER_REQUIREMENTS.md REQ-MODEL-002 through REQ-MODEL-034:

- [ ] P5-030: SRF models (002–005) — holdout test set (synthetic, 20% of generated data): anomaly detector F1 ≥ 0.85 on underheating events; RUL predictor RMSE ≤ 10% of mean RUL; drift detector AUC ≥ 0.85 | REQ: REQ-MODEL-002–005 | Depends: —
- [ ] P5-031: HHPD models (006–008) — nozzle RUL RMSE ≤ 5% of mean cycles-to-replacement; cavitation classifier F1 ≥ 0.85; health score monotonically decreasing with severity | REQ: REQ-MODEL-006–008 | Depends: —
- [ ] P5-032: FS models (009–012) — bearing RUL RMSE ≤ 10% of mean hours; stage classifier accuracy ≥ 0.90 for Stage-3/4 detection; chatter classifier F1 ≥ 0.88 | REQ: REQ-MODEL-009–012 | Depends: —
- [ ] P5-033: HAGCC models (013–015) — seal drift RUL RMSE ≤ 8%; hysteresis detector F1 ≥ 0.85; oil contamination classifier accuracy ≥ 0.90 on ISO 4406 class boundaries | REQ: REQ-MODEL-013–015 | Depends: —
- [ ] P5-034: APT models (016–018) — HCl depletion RMSE ≤ 10% of mean depletion time; lining failure detector F1 ≥ 0.82; safety classifier precision ≥ 0.95 (no false negatives on critical events) | REQ: REQ-MODEL-016–018 | Depends: —
- [ ] P5-035: TCMS models (019–021) — bearing stage classifier accuracy ≥ 0.90 (Stage 3+4 critical); emulsion contamination classifier AUC ≥ 0.85; roll force drift detector AUC ≥ 0.82 | REQ: REQ-MODEL-019–021 | Depends: —
- [ ] P5-036: CGP models (022–024) — dross rate RMSE ≤ 15% (Arrhenius fit validation); bushing RUL RMSE ≤ 10%; Fe-in-zinc anomaly detector precision ≥ 0.95 (no false negatives above 0.03%) | REQ: REQ-MODEL-022–024 | Depends: —
- [ ] P5-037: HPAK models (025–027) — crystallization detector F1 ≥ 0.85 on >95 mbar events; stripe predictor block_factor RMSE ≤ 10%; health score inversely correlated with pressure drop (Pearson r ≤ −0.85) | REQ: REQ-MODEL-025–027 | Depends: —
- [ ] P5-038: Cross-asset & factory models (028–034) — cascade attribution model accuracy ≥ 0.75; factory aggregation health score rank-correlation with individual asset health ≥ 0.85; sensor fault detector F1 ≥ 0.88 | REQ: REQ-MODEL-028–034 | Depends: —
- [ ] P5-039: REQ-MODEL-001 competition mode — run `steel_main.py` end-to-end; assert output CSV matches `expected_submission.csv` exactly; no code modifications permitted | REQ: REQ-MODEL-001 | Depends: —

---

## 5. Digital Twin Validation Against Physics

- [ ] P5-040: SRF twin validation — inject thermal lag event (τ=45min, ΔT=60°C); assert `twin_state.slab_temp_out` matches formula `T_target−ΔT·(1−e^{−t/τ})` within ±2°C at t=15, 30, 45 min | REQ: REQ-TWIN-002 | Depends: —
- [ ] P5-041: HHPD twin validation — inject nozzle erosion at n=500 cycles; assert `twin_state.header_pressure` matches `P_supply·(d₀/d(500))⁴` formula within ±1 bar | REQ: REQ-TWIN-003 | Depends: —
- [ ] P5-042: HAGCC twin validation — inject 4000-hour seal drift; assert `drift_rate = 0.001·e^{4000/4000hr} = 0.00272 mm/min`; assert alarm triggered at >0.01 mm/min | REQ: REQ-TWIN-005 | Depends: —
- [ ] P5-043: CGP twin validation — inject temperature excursion to 475°C; assert `dross_rate(475°C)/dross_rate(455°C) ≈ 4.4×` per Arrhenius equation (Q=80,000 J/mol, R=8.314); assert critical alarm raised | REQ: REQ-TWIN-008 | Depends: —
- [ ] P5-044: HPAK twin validation — inject slot blockage accumulating for 24h; assert `block_factor` matches `1−e^{−dep_rate·t}`; assert pressure drop ≥ 95 mbar at t_alarm | REQ: REQ-TWIN-009 | Depends: —
- [ ] P5-045: Cross-asset twin linkage validation — SRF `slab_temp_out` drops 60°C; assert FS twin state receives updated input context within 1 update cycle; assert `cross_stage_context` in consolidation payload reflects the cascade | REQ: REQ-TWIN-012 | Depends: —

---

## 6. LLM Safety & Factual Accuracy Validation

- [ ] P5-046: Run hallucination evaluation from P4-031 — assert: citation accuracy ≥ 95% when threshold in context; graceful refusal rate ≥ 90% when threshold not in context | REQ: REQ-LLM-013 | Depends: —
- [ ] P5-047: Numeric threshold accuracy — run 20 test queries each referencing a different ISO threshold (ISO 10816-3 4.5/7.1, ISO 17359 95 mbar, ISO 4406 15/13/10, APT FeCl2 120 g/L, CGP pot temp 462°C, etc.); assert LLM response matches documented value in all 20 cases | REQ: REQ-LLM-013 | Depends: P5-046
- [ ] P5-048: Safety-critical response test — query APT agent about "acid spill response"; assert response includes sodium carbonate neutralization and OSHA 1910.147 lockout/tagout reference; assert "water" is not recommended near CGP molten zinc zone | REQ: REQ-COMPLIANCE-008 | Depends: —
- [ ] P5-049: Agent decision quality — run P4-033 evaluation dataset against production LangGraph graph; assert tool selection accuracy ≥ 0.85; assert mean decision quality ≥ 4.0/5 | REQ: REQ-LLM-016 | Depends: —
- [ ] P5-050: Retrieval metrics — run P4-024 retrieval evaluation against production Weaviate; assert Hit Rate @5 ≥ 0.80 and MRR ≥ 0.60 | REQ: REQ-LLM-016 | Depends: —

---

## 7. Graceful Degradation Tests

- [ ] P5-051: Stop `postgres-db` container; assert Django returns 503 with graceful error (not stack trace); assert WS connections receive `{type: "error", message: "service unavailable"}` | REQ: REQ-INFRA-001 | Depends: —
- [ ] P5-052: ~~Restore from backup~~ — **REMOVED (hackathon scope — no prod backup/restore testing)** | N/A
- [ ] P5-053: Stop `weaviate` container; assert RAG queries return graceful degradation ("Knowledge base temporarily unavailable — responses based on ML outputs only"); assert ML-only consolidation still returns | REQ: REQ-LLM-010 | Depends: —

---

## 8. Requirement Traceability Review

- [ ] P5-054: Run traceability audit script — grep all `REQ-*` IDs from `MASTER_REQUIREMENTS.md`; for each ID, search across all P1–P5 task files; assert zero IDs with no task mapping | REQ: REQ-BUSINESS-007 | Depends: —
- [ ] P5-055: Run orphan task audit — grep all `P1-NNN`, `P2-NNN`, `P3-NNN`, `P4-NNN`, `P5-NNN` task lines; assert every line contains `REQ:` citation; assert zero orphan tasks | REQ: REQ-BUSINESS-007 | Depends: —
- [ ] P5-056: Spot-check per-asset coverage — assert each of 8 assets (SRF, HHPD, FS, HAGCC, APT, TCMS, CGP, HPAK) has at least one entry in each category: REQ-MODEL, REQ-DATA, REQ-TWIN, REQ-MONITORING | REQ: REQ-BUSINESS-007 | Depends: P5-054

---

## 9. Hackathon Demo Sign-Off Checklist

- [ ] P5-057: All P1–P4 task checkboxes marked complete | REQ: REQ-BUSINESS-007 | Depends: —
- [ ] P5-058: All P5 validation tasks pass (no failures) | REQ: REQ-BUSINESS-007 | Depends: P5-001–P5-056
- [ ] P5-059: Zero orphan REQ IDs in traceability audit | REQ: REQ-BUSINESS-007 | Depends: P5-054
- [ ] P5-060: `docker compose up` starts successfully; `scripts/verify-deploy.sh` passes all checks | REQ: REQ-DEPLOY-001 | Depends: P5-038
- [ ] P5-061: Demo video recorded covering: MANAS chat query → diagnosis with citation → RUL visualization → work order generation → SANSAD dashboard health score update | REQ: REQ-BUSINESS-006 | Depends: P5-058
- [ ] P5-062: Architecture document written covering: system architecture, technology stack, data flow, model design, reasoning pipeline, alerting/prediction logic, assumptions, install guide, sample I/O | REQ: REQ-BUSINESS-007 | Depends: P5-058
- [ ] P5-063: All deliverables confirmed present: source code, architecture doc, install guide, sample I/O, video recording | REQ: REQ-BUSINESS-007 | Depends: P5-061, P5-062
