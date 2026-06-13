# Project Coding Rules (General, Backend, Frontend, LLM) — ATAL

## 0) Mission / What “good” means for the hackathon
- Win by delivering a working, modular, explainable system prototype that matches the ATAL planning docs.
- Code must be:
  - modular
  - deterministic (for synthetic runs)
  - bug-resistant (clear failure modes)
  - lint-clean
  - professionally commented

## 1) Folder structure (MUST be present for backend)
Backend code organization (preferred layout):

- `sensors/`
  - contains **synthetic sensor signal generators** per equipment asset
- `factories/`
  - contains **factory-level pipelines** (F1..F6 ML phases, orchestration)
- `pipeline/`
  - contains the **4th/system pipeline** (overall plant consolidation + final predictive chart payload + production outcome)
- `datagen/` (or “data_generation/”)
  - shared data generation utilities (RNG, window slicing, time-series helpers)
- (Optional but recommended)
  - `errors/` (error-code registry + persistence adapters)
  - `persistence/` (DB adapters/repositories for schemas)
  - `rag/` (evidence retrieval integration)

Notes:
- Every synthetic sensor module should be owned by `sensors/`.
- Every factory ML module should be owned by `factories/`.
- Every overall consolidation + predictive chart + procurement schedule should be owned by `pipeline/`.

## 2) Folder structure (MUST be present for frontend + LLM)
Frontend:
- `frontend/`
  - reusable UI components
  - pages/forms
  - chart components

LLM:
- `llm/`
  - prompt templates + structured output schema
  - NL → structured request extraction logic
  - evidence-request orchestration (through backend adapters)

(If your repo already has a different layout, keep these folder names at least at the logical/module level.)

## 3) Non-negotiables (global)
### 3.1 Lint / code quality
- No lint errors.
- No unused imports/variables.
- No dead code / unused utilities.
- Keep cyclomatic complexity low; refactor deep conditionals.

### 3.2 Modularity
- Each module has a single responsibility.
- Prefer small pure functions for transformations (feature extraction, signal shaping).

### 3.3 Determinism for synthetic runs
- Every generator must accept:
  - `window` (start/end)
  - `rng_seed`
  - relevant `health_state` / degradation inputs
- All randomness must come from the provided RNG seed.

## 4) Explicit contracts (interfaces + JSON payloads)
- Define strict input/output contracts (typed interfaces or JSON schema validation).
- No implicit fields.
- Validate and fail fast with structured errors (include context: product, window, asset IDs).

Contracts must support (from ATAL plan):
- `error_code` (if critical anomaly/failure)
- `evidence_ids`
- predictive chart payload:
  - anomaly/failure markers
  - `rul_remaining`
  - procurement lead times for modular parts

## 5) Error codes + traceability rules (global)
### 5.1 Error code format
`ERR-<domain>-<factory_or_system>-<YYYYMMDD>-<seq>`

### 5.2 Persistence + pointers
When an anomaly is critical:
- Always store an error registry row that includes:
  - `error_code`
  - `severity`
  - `user_message`
  - `details_json` (model snapshot)
  - `evidence_ids`
  - pointers to the relevant timeseries/ml records

### 5.3 UI must show drill-down
Frontend must show:
- “Go to database using error code: <error_code>”
and provide a link/button to the DB drill-down view.

## 6) Backend rules (synthetic, ML phase, persistence)
### 6.1 Module boundaries (backend)
Backend modules should be separated:
- `sensors/`:
  - signal generation
  - noise/drift + “failure signature” observables mapping
- `factories/`:
  - defect detection, anomaly classification, RUL estimation
  - work order + recommendation generation
- `pipeline/`:
  - system-level consolidation (4th pipeline)
  - predictive chart payload builder
  - final production outcome string formatting

### 6.2 Data persistence
- Use repository/DAO layer (avoid raw SQL scattered).
- Centralize “domain → DB row” mapping.
- Validate payload before insert/update.

### 6.3 Exception handling
- Don’t broad-catch exceptions.
- Return structured error objects with:
  - `error_code` (if applicable)
  - `context`
  - which stage failed (datagen/factory_ml/system_ml/persistence)

## 7) LLM / Agentic rules
- LLM must output JSON-only for anything that affects logic.
- LLM must request evidence via backend adapters (read-only).
- Never fabricate DB pointers or `error_code`.
- Provide a deterministic fallback if structured extraction fails.

## 8) Frontend rules
- Render strictly from backend payloads (no guessing).
- Handle these states:
  - loading
  - success
  - error (error_code present)
- Charts:
  - Must be driven by `chartPayload` from backend
  - Must display:
    - anomalies/failure markers
    - RUL curve
    - procurement lead time overlay/table (if provided)

## 9) Output contract (strict)
Final user-facing response must match:
- Success:
  - `<product_name> successfully produced qnty: <qty>`
- Failure/Anomaly:
  - include `error_code`
  - include predictive chart payload
  - include recommended actions/parts (if available)
  - include: `Go to database using error code: <error_code>`
