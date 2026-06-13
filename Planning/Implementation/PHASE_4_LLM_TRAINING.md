# PHASE_4_LLM_TRAINING.md — Project ATAL
**Scope: Domain adaptation and fine-tuning for industrial maintenance reasoning over Horizon and Zephyr.**
Task format: `- [ ] P4-NNN: {task} | REQ: REQ-LLM-NNN | Depends: P4-NNN`

---

## 1. Training Corpus Construction

### 1.1 Primary Domain Documents
- [ ] P4-001: Collect and preprocess all Section-6 OEM manual PDFs and HTML pages into plain text + structured JSON; normalize formulas to ASCII (`e^{-Q/RT}` → `exp(-Q/RT)`); strip watermarks and footers | REQ: REQ-LLM-014 | Depends: —
- [ ] P4-002: Process `horizon_zephyr_summary.md` §1–§5 in full — extract equipment descriptions, process flow steps, asset tables, sensor registry tables, operating envelopes, degradation formulas, SOPs (startup/operation/shutdown/emergency), maintenance schedules, and ISO standard mappings as structured training documents | REQ: REQ-LLM-014 | Depends: P4-001
- [ ] P4-003: Construct per-asset degradation equation document — one document per asset combining: the physics formula, parameter meanings, alarm thresholds, and the failure mode it models. E.g. for SRF: thermal lag formula + τ=45min + ΔT≈60°C + underheating alarm + refractory campaign degradation | REQ: REQ-LLM-014 | Depends: P4-002
- [ ] P4-004: Construct ISO/IEC standards corpus — extract alarm threshold tables and scope statements from ISO 10816-3, 4406, 1461, 1460, 17359, 13373-3, 12944, 13849-1, 19973; IEC 62682, 61511, 61508; OSHA 1910.119, 1910.147; NACE SP0169; API 610 | REQ: REQ-LLM-014 | Depends: P4-001
- [ ] P4-005: Construct maintenance schedule corpus — per-asset schedules (daily/weekly/monthly/quarterly/annual/per-roll-change/500hr/predictive) extracted from §5 of `horizon_zephyr_summary.md`; formatted as `{asset, interval, task, reference_standard}` | REQ: REQ-LLM-014 | Depends: P4-002

### 1.2 Synthetic Maintenance Dialogue Generation
- [ ] P4-006: Generate SRF maintenance dialogues — 200+ Q&A pairs covering: underheating diagnosis, refractory inspection, walking beam SOP, combustion alarm response, startup sequence, ISO 10816 combustion blower vibration interpretation | REQ: REQ-DATA-035, REQ-LLM-014 | Depends: P4-003
- [ ] P4-007: Generate HHPD maintenance dialogues — 100+ pairs: nozzle erosion RUL query, cavitation diagnosis, pump SOP (API 610), pressure decay interpretation, water hammer prevention | REQ: REQ-DATA-035, REQ-LLM-014 | Depends: P4-003
- [ ] P4-008: Generate FS maintenance dialogues — 200+ pairs: bearing spallation diagnosis (BPFO interpretation), Paris-law RUL explanation, chatter identification, chock wear SOP, roll change schedule, ISO 13373-3 frequency interpretation | REQ: REQ-DATA-035, REQ-LLM-014 | Depends: P4-003
- [ ] P4-009: Generate HAGCC maintenance dialogues — 100+ pairs: seal drift RUL interpretation, hysteresis test procedure, ISO 4406 oil cleanliness alarm, Parker cylinder manual references | REQ: REQ-DATA-035, REQ-LLM-014 | Depends: P4-003
- [ ] P4-010: Generate APT maintenance dialogues — 100+ pairs: HCl depletion prediction, lining inspection, OSHA 1910.119 safety query ("what do I do if the tank level drops suddenly?"), FeCl2 concentration alarm, acid neutralization emergency SOP | REQ: REQ-DATA-035, REQ-LLM-014 | Depends: P4-003
- [ ] P4-011: Generate TCMS maintenance dialogues — 150+ pairs: 4-stage bearing wear progression interpretation, emulsion chemistry management, BPFO at 142 Hz diagnosis, Schaeffler FAG manual references | REQ: REQ-DATA-035, REQ-LLM-014 | Depends: P4-003
- [ ] P4-012: Generate CGP maintenance dialogues — 150+ pairs: dross rate Arrhenius explanation, temperature excursion alarm (>462°C), water prohibition safety (class-D fire suppression), bushing RUL interpretation, ISO 1461 coating spec | REQ: REQ-DATA-035, REQ-LLM-014 | Depends: P4-003
- [ ] P4-013: Generate HPAK maintenance dialogues — 100+ pairs: zinc crystallization diagnosis, pressure drop alarm interpretation (ISO 17359 >95 mbar), coating weight stripe response, LVDT calibration SOP | REQ: REQ-DATA-035, REQ-LLM-014 | Depends: P4-003
- [ ] P4-014: Generate cross-stage cascade dialogues — 100+ pairs: "SRF is running cold, what does this mean for F1–F7?", "HAGCC drift detected after FS chatter event — causal chain?", cross-factory impact queries | REQ: REQ-DATA-035, REQ-LLM-014 | Depends: P4-006–P4-013
- [ ] P4-015: Generate model output explanation dialogues — 200+ pairs: "the RUL model says 48 hours — explain the top SHAP features", "the anomaly score is 0.87 on TCMS — what does that mean?", "why is the health score dropping?"; grounded in SHAP outputs from P1-059 | REQ: REQ-DATA-035, REQ-LLM-014 | Depends: P4-006–P4-013

### 1.3 Corpus Assembly
- [ ] P4-016: Assemble full training corpus in JSONL format: `{instruction: str, context: str|null, response: str, citations: [str], asset_scope: [str], domain_tags: [str]}`; minimum corpus size target: 2,000 examples | REQ: REQ-LLM-014 | Depends: P4-001–P4-015
- [ ] P4-017: Split corpus: 85% train / 10% validation / 5% test (held-out for final evaluation); stratify by asset scope and dialogue type | REQ: REQ-LLM-014 | Depends: P4-016
- [ ] P4-018: Version corpus with DVC; store as `rag_corpus/v{N}/` with SHA manifest | REQ: REQ-INFRA-009 | Depends: P4-016

---

## 2. Fine-Tuning Strategy

- [ ] P4-019: Select base model for fine-tuning — preferred: `Llama-3-8B-Instruct` (open weights, compatible with Ollama on-premises deployment); fallback: `Phi-3-Mini` for lower GPU memory environments; document hardware requirements (minimum: 1× A100 80GB or 2× RTX 4090) | REQ: REQ-LLM-015, REQ-LLM-002 | Depends: P4-017
- [ ] P4-020: Implement PEFT/LoRA fine-tuning — LoRA rank r=16, alpha=32, target modules: q_proj, v_proj; using `peft` + `transformers` + `trl` SFTTrainer; batch size 8, gradient accumulation 4, learning rate 2e-4, 3 epochs | REQ: REQ-LLM-015 | Depends: P4-019
- [ ] P4-021: Implement 4-bit QLoRA quantization for memory efficiency on smaller GPUs — `bitsandbytes` NF4 quantization + LoRA | REQ: REQ-LLM-015 | Depends: P4-020
- [ ] P4-022: Save LoRA adapter weights to DVC-tracked artifact path; register in model registry with training corpus version, eval metrics, and base model ref | REQ: REQ-INFRA-008, REQ-INFRA-009 | Depends: P4-021
- [ ] P4-023: Implement fine-tuned model serving via Ollama — create Ollama `Modelfile` that merges base model + LoRA adapter; load into `ollama` container | REQ: REQ-LLM-002 | Depends: P4-022

---

## 3. Retrieval Evaluation Framework

- [ ] P4-024: Implement retrieval evaluation dataset — 100 test queries with ground-truth relevant chunk IDs per query; cover all 6 Weaviate collections and all 8 assets | REQ: REQ-LLM-016 | Depends: P4-017
- [ ] P4-025: Implement Hit Rate @K metric (K=1,3,5) — fraction of queries where at least one relevant chunk appears in top-K results | REQ: REQ-LLM-016 | Depends: P4-024
- [ ] P4-026: Implement MRR (Mean Reciprocal Rank) metric — average of 1/rank of first relevant chunk across test queries | REQ: REQ-LLM-016 | Depends: P4-024
- [ ] P4-027: Implement Faithfulness metric — for each retrieved chunk used in a generation, verify the LLM response makes no claims that contradict the retrieved content; use an LLM-as-judge approach | REQ: REQ-LLM-016 | Depends: P4-024
- [ ] P4-028: Run retrieval evaluation as part of CI pipeline — fail if Hit Rate @5 < 0.80 or MRR < 0.60; log metrics to model registry | REQ: REQ-LLM-016 | Depends: P4-025, P4-026, P4-027

---

## 4. Hallucination Reduction Strategy

The primary hallucination risk is the LLM inventing numerical thresholds (operating envelopes, ISO limits) that differ from the verified source documents.

- [ ] P4-029: Implement threshold grounding rule in system prompt — "Every numeric threshold you cite MUST appear verbatim in the retrieved document context. If no retrieved document contains the threshold, state: 'Threshold not found in available documentation — please consult the original standard.'" | REQ: REQ-LLM-013 | Depends: —
- [ ] P4-030: Implement threshold verification post-processor — after each `run_consolidation_inference` output, extract all numeric values from `recommendations` and `citations`; verify each against `threshold_values` JSON in retrieved `ISOStandard` records; flag any value not present in retrieved context | REQ: REQ-LLM-013 | Depends: P3-018
- [ ] P4-031: Construct hallucination evaluation dataset — 50 adversarial test cases where the correct threshold is in the retrieved context and 50 where it is not; measure: (a) correct citation rate when threshold available, (b) refusal rate when threshold not available | REQ: REQ-LLM-013 | Depends: P4-029, P4-030
- [ ] P4-032: Set acceptance criteria: ≥95% correct citation when threshold available; ≥90% graceful refusal when threshold not available | REQ: REQ-LLM-013 | Depends: P4-031

---

## 5. Agent & Tool-Calling Evaluation

- [ ] P4-033: Implement agent trace evaluation dataset — 50 multi-turn maintenance scenarios with ground-truth tool call sequences and expected final `DecisionOutput` fields | REQ: REQ-LLM-016 | Depends: P4-017
- [ ] P4-034: Implement tool selection accuracy metric — fraction of scenarios where the agent selects the correct tool set (no missing tools, no spurious tools) | REQ: REQ-LLM-016 | Depends: P4-033
- [ ] P4-035: Implement end-to-end decision quality metric — LLM-as-judge scoring of `diagnosis`, `rca`, `risk_level`, `recommendations` against expert-labeled ground truth; score 1–5 per dimension | REQ: REQ-LLM-016 | Depends: P4-033
- [ ] P4-036: Acceptance thresholds: tool selection accuracy ≥ 0.85; mean decision quality score ≥ 4.0/5 on validation set | REQ: REQ-LLM-016 | Depends: P4-034, P4-035

---

## 6. Continuous Improvement Loop

- [ ] P4-037: Implement `ProductionQueryLogger` — log all `/api/v1/chat/` requests and `run_consolidation_inference` invocations to a DVC-tracked JSONL log with: query, asset_id, retrieved_chunk_ids, LLM response, token usage, latency, session_id | REQ: REQ-LLM-017 | Depends: —
- [ ] P4-038: Implement feedback-to-corpus pipeline — when a `Feedback` record has `feedback_type=correct`, the corrected `MaintenanceReport` is reformatted as a training example and appended to the corpus; triggers DVC dataset version bump | REQ: REQ-LLM-017, REQ-FUNCTIONAL-032 | Depends: P4-016, P4-018
- [ ] P4-039: Implement automatic retrieval gap detection — weekly Celery Beat task: for every production query that received a `Feedback(type=reject)`, check if the relevant chunk was missing from the retrieval result; if so, flag as a corpus gap and notify Admin | REQ: REQ-LLM-017 | Depends: P4-037, P4-038
- [ ] P4-040: Implement retrain trigger logic — when corpus grows by ≥200 new examples since last fine-tune, or when retrieval evaluation metrics drop below thresholds (P4-028), create `ml.retrain_trigger` Celery task for LLM adapter; notify Admin | REQ: REQ-LLM-017 | Depends: P4-038, P4-028
