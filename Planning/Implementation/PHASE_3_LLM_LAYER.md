# PHASE_3_LLM_LAYER.md — Project ATAL
**Scope: Full industrial maintenance assistant — RAG pipeline, LangGraph agents, consolidation tool-call, factory context injection, WS streaming.**

> **PHASE ORDER DECISION (2026-06-14):** Phase 3 runs BEFORE Sub-Phase 2.2 (frontend wiring). LLM chat and consolidation endpoints are live when frontend wiring begins — enables real-time AI testing in frontend during Sub-Phase 2.2.
> Execution order: Phase 1 → Sub-Phase 2.1 → Phase 3 → Sub-Phase 2.2 → Phase 4 → Phase 5

Task format: `- [ ] P3-NNN: {task} | REQ: REQ-LLM-NNN | Depends: P3-NNN`

---

## 1. RAG Pipeline Architecture

### 1.1 Chunking Strategy

- [ ] P3-001: Implement semantic chunker for PDF/HTML documents — split at section headings first, then paragraph-level; target chunk size 400–600 tokens with 50-token overlap; preserve section + page metadata | REQ: REQ-LLM-010 | Depends: —
- [ ] P3-002: Implement table-preserving chunker — tables in ISO standards and sensor registries extracted as self-contained chunks with column headers prepended; never split a table row | REQ: REQ-LLM-010 | Depends: P3-001
- [ ] P3-003: Implement formula-preserving chunker — degradation equations and physics formulas kept in their enclosing paragraph; LaTeX/MathML stripped to ASCII approximation for embedding | REQ: REQ-LLM-010 | Depends: P3-001

### 1.2 Embedding & Hybrid Retrieval Stack

- [ ] P3-004: Deploy `BAAI/bge-m3` via `FlagEmbedding` as the local embedding service (replaces all-MiniLM-L6-v2) — 1024-dim dense vectors; `use_fp16=True`; batch embedding via `embed_chunks()` in `apps/rag/embedder.py`; lazy-loaded singleton; already implemented | REQ: REQ-LLM-005 | Depends: —
- [ ] P3-005: Implement embedding cache in Redis — `emb_bge:{sha256(text)}` → vector; 30-day TTL; cache hits skip model inference; already implemented | REQ: REQ-LLM-005 | Depends: P3-004
- [ ] P3-004b: Deploy `BAAI/bge-reranker-base` via `FlagEmbedding` (`FlagReranker`) as cross-encoder reranker — normalised scores 0–1; `use_fp16=True`; `apps/rag/reranker.py` already implemented | REQ: REQ-LLM-014 | Depends: P3-004
- [ ] P3-004c: Implement BM25 sparse retrieval via `rank_bm25.BM25Okapi` — maintain per-collection BM25 index in memory (refreshed on document ingest); combine BM25 scores with ChromaDB semantic distances for hybrid ranking; merge before passing to reranker | REQ: REQ-LLM-015 | Depends: P3-004

### 1.3 ChromaDB Collection Schema

> All collections use BGE-M3 pre-computed 1024-dim vectors; HNSW cosine distance. Collections created via `chroma_client.init_collections()`.

- [ ] P3-006: Verify ChromaDB collection `EquipmentManual` — metadata fields: `title`, `manufacturer`, `asset_scope`, `section`, `page`, `source_url`; document = content; confirm vector dims = **1024** (BGE-M3) | REQ: REQ-LLM-011 | Depends: P3-004
- [ ] P3-007: Verify ChromaDB collection `SOP` — metadata: `title`, `asset_scope`, `factory_scope`, `step_number`, `procedure_phase`; document = content | REQ: REQ-LLM-011 | Depends: —
- [ ] P3-008: Verify ChromaDB collection `ISOStandard` — metadata: `standard_code`, `title`, `scope`, `section`, `threshold_values`; document = content | REQ: REQ-LLM-011 | Depends: —
- [ ] P3-009: Verify ChromaDB collection `MaintenanceLog` — metadata: `asset_id`, `event_type`, `date`, `technician`, `root_cause`, `parts_used`, `outcome`; document = description | REQ: REQ-LLM-011 | Depends: —
- [ ] P3-010: Verify ChromaDB collection `ModelExplanation` — metadata: `asset_id`, `model_type`, `prediction_id`, `shap_summary`, `timestamp`; document = plain_language_explanation | REQ: REQ-LLM-011 | Depends: —
- [ ] P3-011: Verify ChromaDB collection `SafetyCode` — metadata: `standard`, `code_number`, `scope`, `critical_thresholds`; document = content | REQ: REQ-LLM-011 | Depends: —

---

## 2. Document Intelligence Ingestion Pipeline

Ingests all Section-6 OEM manuals and reference documents from `horizon_zephyr_summary.md §6`.

**Document processing stack (heterogeneous formats):**
- `unstructured` — primary ingestion and OCR for PDF/DOCX/HTML/TXT
- `pymupdf` (fitz) — fast PDF text + image extraction (primary PDF path)
- `pypdf` — PDF metadata extraction + fallback text extraction

Pipeline: Upload/URL → `pymupdf` text extract → `unstructured` OCR/structure → semantic chunker → BGE-M3 embed → ChromaDB upsert → BM25 index refresh → `Document` DB record + `is_ingested=True`

- [ ] P3-012: Implement `DocumentIngestionTask` Celery task — given `source_url` or file path + `doc_type` + `asset_scope`: extract with `pymupdf` (fast path) falling back to `unstructured` (OCR path); chunk (P3-001–003); embed via BGE-M3 (P3-004); upsert into ChromaDB via `chroma_client.get_or_create_collection`; refresh BM25 index for that collection; create `Document` DB record | REQ: REQ-LLM-010 | Depends: P3-001, P3-004, P3-006–P3-011
- [ ] P3-013: Implement ingestion seed command `manage.py ingest_corpus` — triggers `DocumentIngestionTask` for all 16 documents listed in §6.1 and §6.2 of `horizon_zephyr_summary.md`:
  - SRF SOP (Scribd) → `SOP`
  - Danieli DANOIL PDF → `EquipmentManual` (scope: FS)
  - Parker Gen II HY08 PDF → `EquipmentManual` (scope: HAGCC)
  - SKF Bearing Installation Guide PDF → `EquipmentManual` (scope: FS, TCMS)
  - SKF Bearing Maintenance Handbook PDF → `EquipmentManual` (scope: FS, TCMS)
  - Schaeffler FAG Mounting Guide PDF → `EquipmentManual` (scope: FS, TCMS)
  - Emerson Fisher Control Valve Handbook PDF → `EquipmentManual` (scope: HAGCC, APT)
  - Siemens S7-1200 Manual PDF → `EquipmentManual` (scope: SRF, HHPD)
  - Rockwell Logix 5000 Manual PDF → `EquipmentManual` (scope: SRF, HHPD)
  - ISO 17359 Sample PDF → `ISOStandard`
  - HHPD Descaler Factsheet PDF → `EquipmentManual` (scope: HHPD)
  - Tandem Cold Mill Guidelines (HTML) → `EquipmentManual` (scope: TCMS)
  - Galvanizing Line Guide PDF → `EquipmentManual` (scope: CGP, HPAK)
  - OSHA 1910.147 → `SafetyCode`
  | REQ: REQ-DATA-034 | Depends: P3-012
- [ ] P3-014: Implement ingestion for ISO/IEC standards text (62682, 61511, 61508, 10816-3, 13373-3, 4406, 17359, 19973, 1461, 1460, 12944, 14224, 6085) — insert as `ISOStandard` records with `threshold_values` JSON populated from the summary's operating envelopes | REQ: REQ-DATA-034, REQ-COMPLIANCE-001 | Depends: P3-012
- [ ] P3-015: Implement REST endpoint POST `/api/v1/rag/ingest/` (Admin) — triggers `DocumentIngestionTask` for a new document; returns `document_id` | REQ: REQ-LLM-010 | Depends: P3-012
- [ ] P3-016: Implement feedback-triggered RAG update — on `Feedback` record with type=correct/confirm: re-index updated content into `MaintenanceLog` collection; set `weaviate_updated=True` | REQ: REQ-FUNCTIONAL-032 | Depends: P3-009, P3-012

---

## 3. Retrieval Systems

**All retrieval functions follow the hybrid pipeline:**
`BM25 keyword score + BGE-M3 semantic score → merge candidates → BGE Reranker Base → top-K with reranker_score + source citations`

### 3.1 SOP Retrieval
- [ ] P3-017: Implement `retrieve_sop(asset_id, query, procedure_phase=None)` — hybrid search (BM25 + BGE-M3) in `SOP` collection; optional `procedure_phase` metadata filter; BGE reranker; return top-5 with section metadata and citations | REQ: REQ-LLM-004 | Depends: P3-007, P3-004b, P3-004c

### 3.2 ISO Compliance Retrieval
- [ ] P3-018: Implement `retrieve_iso_compliance(standard_code=None, asset_id=None, query=None)` — filter by `standard_code` if provided; hybrid search on content; extract `threshold_values` JSON for numeric grounding in LLM responses; BGE reranker | REQ: REQ-LLM-004 | Depends: P3-008, P3-004b, P3-004c

### 3.3 Asset Intelligence Retrieval
- [ ] P3-019: Implement `retrieve_asset_intelligence(asset_id, query)` — multi-collection hybrid search across `EquipmentManual`, `MaintenanceLog`, `ModelExplanation` filtered by `asset_scope`; BGE reranker on merged results; return top-8 with citations | REQ: REQ-LLM-004 | Depends: P3-006, P3-009, P3-010, P3-004b, P3-004c

### 3.4 Safety Code Retrieval
- [ ] P3-020: Implement `retrieve_safety_codes(asset_id=None, query=None)` — hybrid search in `SafetyCode` collection; always include in APT consolidation context (OSHA 1910.119 + 1910.147) | REQ: REQ-LLM-004 | Depends: P3-011, P3-004b

---

## 4. LangGraph Agent Architecture

### 4.1 Agent Tools

- [ ] P3-021: Implement `query_digital_twin` tool — takes `asset_id`, returns current `AssetTwinState` JSON with envelope status flags | REQ: REQ-LLM-012 | Depends: P3-006
- [ ] P3-022: Implement `query_model_predictions` tool — takes `asset_id`, `model_types[]` (optional), returns latest `MLPrediction` records per model type, formatted with plain-language summaries | REQ: REQ-LLM-012 | Depends: —
- [ ] P3-023: Implement `retrieve_maintenance_history` tool — takes `asset_id`, `limit`, `event_type` (optional); returns formatted maintenance event history with dates, outcomes, parts | REQ: REQ-LLM-012 | Depends: P3-009
- [ ] P3-024: Implement `search_sop` tool — wraps `retrieve_sop()`; returns formatted chunks with source citations | REQ: REQ-LLM-012 | Depends: P3-017
- [ ] P3-025: Implement `check_iso_compliance` tool — wraps `retrieve_iso_compliance()`; given a sensor value + sensor type, identifies the applicable standard and states whether the value is within spec | REQ: REQ-LLM-012 | Depends: P3-018
- [ ] P3-026: Implement `trigger_model_retrain` tool — creates a `ml.retrain_trigger` Celery task for the specified model; returns task ID; requires Supervisor role | REQ: REQ-LLM-012 | Depends: —
- [ ] P3-027: Implement `generate_work_order` tool — creates a `WorkOrder` record from structured recommendation output; returns work_order_id; logs to audit trail | REQ: REQ-LLM-012 | Depends: —
- [ ] P3-028: Implement `run_consolidation_inference` tool — **this is the core consolidation tool-call** defined in REQ-LLM-006. Input: `ConsolidatedAssetPayload` JSON. System prompt: "You are an industrial maintenance expert for steel manufacturing. Analyze the following consolidated asset condition report and return a structured JSON decision." Output schema: `{diagnosis: str, rca: str, risk_level: "low"|"medium"|"high"|"critical", urgency_score: float[0.0–1.0], recommendations: [{step: str, rationale: str, iso_ref: str|null}], spare_strategy: str, citations: [{doc: str, section: str, page: str|null, iso_ref: str|null}], report_text: str}`. Hallucination guard: citations must only reference documents returned by retrieval tools; numeric thresholds must be quoted from `threshold_values` in retrieved ISOStandard records. | REQ: REQ-LLM-006, REQ-LLM-013, REQ-FUNCTIONAL-041 | Depends: P3-018, P3-017, P3-019

### 4.2 LangGraph Graph Definition

- [ ] P3-029: Define `MaintenanceWizardGraph` (LangGraph `StateGraph`) — nodes:
  - `context_injector` — pre-populate graph state with factory context (twin state, recent alerts, applicable ISO thresholds)
  - `diagnostic_agent` — calls `query_digital_twin`, `query_model_predictions`; produces initial diagnosis
  - `rca_agent` — calls `retrieve_maintenance_history`, `search_sop`, `retrieve_asset_intelligence`; produces RCA
  - `rul_predictor_agent` — calls `query_model_predictions` for RUL models specifically; formats RUL output
  - `recommendation_agent` — calls `check_iso_compliance`, `generate_work_order`; produces step-by-step recommendations
  - `consolidation_invoker` — assembles final consolidated payload, calls `run_consolidation_inference`; receives `DecisionOutput`
  - `response_formatter` — formats `DecisionOutput` into final API response with streaming tokens
  | REQ: REQ-LLM-003 | Depends: P3-021–P3-028
- [ ] P3-030: Implement graph edges and conditional routing:
  - Start → `context_injector` → `diagnostic_agent`
  - `diagnostic_agent` → if RCA needed → `rca_agent`, else → `rul_predictor_agent`
  - `rca_agent` → `rul_predictor_agent`
  - `rul_predictor_agent` → `recommendation_agent`
  - `recommendation_agent` → `consolidation_invoker`
  - `consolidation_invoker` → `response_formatter` → End
  | REQ: REQ-LLM-003 | Depends: P3-029
- [ ] P3-031: Implement durable state persistence for LangGraph — checkpoint state to Redis at each node; survive server restarts without losing context (LangGraph 1.0+ native feature) | REQ: REQ-LLM-003 | Depends: P3-029

### 4.3 Multi-Agent RCA for Complex Cascades

- [ ] P3-032: Implement `CrossStageRCAAgent` sub-graph — triggered when `diagnostic_agent` identifies a cross-stage cascade signature (e.g. SRF underheating → FS force spike). Sub-graph queries twins for both upstream and downstream assets; retrieves cross-stage correlation data; traces causal chain; adds cascade context to RCA node | REQ: REQ-LLM-018 | Depends: P3-029, P3-030

---

## 5. Factory Context Injection Layer

- [ ] P3-033: Implement `FactoryContextAssembler` — given `asset_id` + `user_session`, assembles context object:
  ```
  {
    asset: {name, type, factory},
    twin_state_summary: {...},
    recent_alerts: [...],          # last 24h, severity >= warning
    applicable_iso_thresholds: {   # keyed by sensor_type
      vibration: {alert: 4.5, trip: 7.1, standard: "ISO 10816-3"},
      ...
    },
    active_predictions: {...},
    last_maintenance: {...}
  }
  ```
  | REQ: REQ-LLM-007 | Depends: P3-021, P3-022
- [ ] P3-034: Inject `FactoryContext` as the first message in every LangGraph state — system prompt includes: asset name, factory, current health score, top 3 active alerts with ISO thresholds, current RUL if available | REQ: REQ-LLM-007 | Depends: P3-033

---

## 6. WebSocket Streaming

- [ ] P3-035: Implement `LLMStreamConsumer` Django Channels WebSocket consumer on `/ws/llm/{session_id}/` — subscribes to Redis channel `llm.stream.{session_id}`; relays LLM token events to frontend client | REQ: REQ-LLM-008 | Depends: —
- [ ] P3-036: Implement LLM streaming integration in `response_formatter` node — stream tokens via `stream()` API of chosen LLM; publish each token to Redis channel `llm.stream.{session_id}`; publish `{type: "done", decision_output: {...}}` on completion | REQ: REQ-LLM-008 | Depends: P3-035
- [ ] P3-037: Implement streaming REST endpoint POST `/api/v1/chat/stream/` — accepts `{session_id, asset_id, message}`; dispatches LangGraph run as Celery task with WS token streaming; returns `{session_id, task_id, ws_channel}` | REQ: REQ-LLM-008 | Depends: P3-035, P3-036

---

## 7. Conversation History & Session Management

- [ ] P3-038: Implement `ChatSession` model — id (UUID), user FK, asset_id, created_at, last_active, session_metadata JSON | REQ: REQ-LLM-009 | Depends: —
- [ ] P3-039: Implement `ChatMessage` model — id, session FK, role (user/assistant), content, citations JSON, shap_context JSON, model_used, token_usage JSON, timestamp | REQ: REQ-LLM-009 | Depends: P3-038
- [ ] P3-040: Store LangGraph conversation history in Redis (short-term, 24h TTL) + `ChatMessage` PostgreSQL (permanent) per session | REQ: REQ-LLM-009 | Depends: P3-038, P3-039
- [ ] P3-041: Implement session REST endpoints: GET `/api/v1/chat/sessions/`, POST `/api/v1/chat/sessions/` (create), GET `/api/v1/chat/sessions/{id}/messages/`, DELETE `/api/v1/chat/sessions/{id}/` | REQ: REQ-LLM-009 | Depends: P3-039
- [ ] P3-042: Implement MANAS chat endpoint POST `/api/v1/chat/` — accepts `{session_id, asset_id, message, use_streaming: bool}`; for non-streaming: runs full LangGraph graph synchronously, returns `ChatMessageSchema`; for streaming: delegates to P3-037 | REQ: REQ-FUNCTIONAL-012, REQ-FUNCTIONAL-013 | Depends: P3-029, P3-037, P3-041

---

## 8. SANSAD Two-Tier Agentic Orchestration (2026-06-14 — supersedes §4 fixed pipeline)

> **Design upgrade.** §4 specified a fixed single-model pipeline (diagnostic→rca→rul→recommendation→consolidation). It is replaced by a **two-tier supervisor/worker** architecture so SANSAD behaves like an HQ/parliament: gather info → MANAS (9B brain) decides what actions to take → spawn small worker agents + dispatch whitelisted tools → route decisions back to the UI.
>
> - **MANAS supervisor** = `qwen3.5:9b` (`OLLAMA_MODEL`) — reasons over the consolidated payload + RAG; emits tool calls and worker-spawn requests.
> - **Worker agents** = `qwen3.5:0.8b` (`OLLAMA_SMALL_MODEL`) — bounded, parallel text sub-tasks; no DB writes.
> - Both models stay resident in Ollama via `keep_alive` (9B-Q4 ~6GB + 0.8B ~0.8GB fit 16GB GPU).
> - Heavy/destructive actions (retrain, work-order creation) execute via Celery through a **whitelisted tool registry only** (REQ-SECURITY-003) — the LLM never touches the ORM directly.

### 8.1 Tool Registry & Security (REQ-SECURITY-003)
- [ ] P3-043: Implement `apps/agents/graph/tools.py` — `@sansad_tool(name, arg_schema)` decorator registers callables into `TOOL_REGISTRY`; `dispatch_tool(name, args)` validates name + args against the registry, executes only whitelisted wrappers, and writes an `AgentAuditLog` row per call. Reject unknown tool names; no raw SQL / generic `.save()` exposed to the LLM. | REQ: REQ-SECURITY-003, REQ-LLM-012 | Depends: —
- [ ] P3-044: Define whitelisted tools wrapping existing backend functions: `run_ml_inference`→`apps.ml.tasks.run_all_asset_models`, `request_retrain`→`apps.ml.tasks.trigger_retrain` (async, Supervisor-gated), `check_drift`→`apps.ml.tasks.check_model_drift`, `query_twin_state`→twins, `retrieve_docs`→`apps.rag.retrieval`, `create_work_order`→guarded `WorkOrder.objects.create`, `escalate`→notification-only. | REQ: REQ-SECURITY-003, REQ-LLM-012 | Depends: P3-043
- [ ] P3-045: Implement `AgentAuditLog` model — `id, asset_id, tool_name, args JSON, result_summary, dispatched_by (agent role), timestamp, rejected (bool)`; one row per tool dispatch or rejection. | REQ: REQ-SECURITY-003 | Depends: —

### 8.2 LLM Client Layer
- [ ] P3-046: Extend `apps/consolidation/llm_bridge.py` — add `tools` array support in the supervisor request body (Ollama OpenAI-compatible function-calling, `think:false`); add `run_small_agent(prompt, system, ...)` hitting `OLLAMA_SMALL_MODEL` with `keep_alive`. | REQ: REQ-LLM-001, REQ-LLM-006 | Depends: —
- [ ] P3-047: Add settings `OLLAMA_SMALL_MODEL` (default `qwen3.5:0.8b`) + `OLLAMA_KEEP_ALIVE` (default `30m`); add `langgraph` + `langchain-core` to requirements; pull both models in entrypoint/compose. | REQ: REQ-LLM-001, REQ-INFRA-001 | Depends: —

### 8.3 Worker Agents (qwen3.5:0.8b)
- [ ] P3-048: Implement `apps/agents/graph/agents.py` — worker agents as system-prompt + `run_small_agent` calls: `WorkOrderDrafter`, `SensorWindowSummarizer`, `AlarmTriager`, `CitationFormatter`, `SpareStrategist`. Pure text transforms over already-gathered data; mock fallback under `OLLAMA_MOCK=1`. | REQ: REQ-LLM-003 | Depends: P3-046

### 8.4 LangGraph Supervisor Graph
- [ ] P3-049: Implement `apps/agents/graph/state.py` — `AgentState` TypedDict: `asset_id, payload, rag_context, plan, tool_calls, tool_results, worker_tasks, worker_outputs, decision, events`. | REQ: REQ-LLM-003 | Depends: —
- [ ] P3-050: Implement `apps/agents/graph/nodes.py` — `supervisor_node` (9B planner emits tool calls + worker spawns), `tool_node` (executes via `dispatch_tool`), `worker_node` (fan-out 0.8b agents in parallel), `aggregator_node` (assemble final `DecisionOutput`). Each node appends to `state["events"]` for WS. | REQ: REQ-LLM-003 | Depends: P3-043, P3-048, P3-049
- [ ] P3-051: Implement `apps/agents/graph/builder.py` — `build_graph()` wires the `StateGraph`: supervisor → conditional edges → tool/worker → aggregator → END, with a bounded re-plan loop (max N iterations). | REQ: REQ-LLM-003 | Depends: P3-050
- [ ] P3-052: Implement `apps/agents/graph/runner.py` — `run_sansad_orchestration(asset_id, trigger)`: compile graph once, invoke, stream `events` to WS group `orchestration_{asset_id}`, return `DecisionOutput`. | REQ: REQ-LLM-003 | Depends: P3-051

### 8.5 Wire into Consolidation
- [ ] P3-053: Fix `apps/consolidation/orchestrator.py` — run `run_all_asset_models(asset_id)` (fresh inference) before reading predictions; populate `cross_stage_context` from `apps.ml.cross_stage`. | REQ: REQ-FUNCTIONAL-040 | Depends: P3-044
- [ ] P3-054: Reroute `apps/consolidation/tasks.py` — replace single `run_consolidation_llm` call with `run_sansad_orchestration(...)`; keep `MaintenanceReport`/`WorkOrder` persistence informed by tool actions the graph took. | REQ: REQ-FUNCTIONAL-041 | Depends: P3-052, P3-053

### 8.6 WS Streaming + Verification
- [ ] P3-055: Add `OrchestrationConsumer` (or extend `apps/agents/consumers.py`) for group `orchestration_{asset_id}` emitting `agent.step`, `tool.call`, `decision.done`; add `manage.py test_orchestration` smoke command mirroring `test_llm`/`test_rag_pipeline`. | REQ: REQ-LLM-008 | Depends: P3-052
