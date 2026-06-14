# TECH_STACK.md — Project ATAL
**Audited against `Planning/Code Deets/master_tech_stack.md`. CONFLICT = diverges from original. All versions confirmed latest-stable as of June 2026.**

---

## API & Web Framework

| Component | Technology | Pinned Version | Rationale | REQ IDs |
|---|---|---|---|---|
| Web framework | Django | 6.0.6 | Primary backend; ORM, admin, routing | REQ-INFRA-001 |
| REST API | Django REST Framework | 3.17.1 | Exposes all REST endpoints consumed by Next.js | REQ-INFRA-001 |
| WebSocket | Django Channels | 4.2.0 | Bidirectional WS for `/ws/telemetry` and LLM streaming | REQ-INFRA-001, REQ-FUNCTIONAL-042 |
| ASGI server | Uvicorn | 0.35.0 | Replaces WSGI; full async support for Channels + DRF | REQ-INFRA-002 |
| CORS | django-cors-headers | 4.7.0 | Cross-origin for Next.js frontend | REQ-INFRA-001 |
| Celery results | django-celery-results | 2.6.0 | Maps Celery task outcomes to Django-managed DB views | REQ-INFRA-003 |

---

## Async Task Processing

| Component | Technology | Pinned Version | Rationale | REQ IDs |
|---|---|---|---|---|
| Task queue | Celery | 5.6.3 | Async ML inference, telemetry simulation, synthetic data generation, retrain triggers | REQ-INFRA-003 |
| Celery broker | Redis | 8.8.0-alpine | Low-latency message transport to Celery workers | REQ-INFRA-004 |
| Celery beat | Celery Beat (bundled) | 5.6.3 | Periodic tasks: synthetic data generation cadence, scheduled aggregation | REQ-INFRA-003 |

---

## Storage

| Component | Technology | Pinned Version | Rationale | REQ IDs |
|---|---|---|---|---|
| Relational DB | PostgreSQL | 17-alpine | Asset ledger, users, maintenance events, model registry, audit logs | REQ-INFRA-005 |
| Time-series | TimescaleDB extension | 2.18.x | **CONFLICT vs original (plain PG17 only)** — hypertables for sensor streams, continuous aggregates, retention policies; co-hosted on PG17 image | REQ-INFRA-006 |
| Session/cache | Redis | 8.8.0-alpine | Chat session memory, telemetry snapshot cache | REQ-INFRA-004 |
| Vector store | ChromaDB (embedded) | ≥0.6.0 | RAG document embeddings, semantic search, MMR ranking — runs inside Django/Celery containers (no separate service); data on `chroma-data` volume | REQ-INFRA-007, REQ-LLM-004 |
| Object storage | Local filesystem / Docker volume | — | Model artifact storage for lightweight registry | REQ-INFRA-008 |

---

## ML / Data Science

| Component | Technology | Pinned Version | Rationale | REQ IDs |
|---|---|---|---|---|
| Gradient boosting | XGBoost | 3.2.0 | Primary classifier for defect detection (REQ-MODEL-001), failure classification, per-asset fault classifiers | REQ-MODEL-001–034 |
| Gradient boosting | LightGBM | 4.6.0 | Alternative/ensemble for failure classification and risk scoring | REQ-MODEL-001–034 |
| Statistical / baseline | scikit-learn | 1.9.0 | Isolation Forest (anomaly), StandardScaler, metrics, baseline models | REQ-MODEL-002–034 |
| Signal processing | SciPy | 1.17.1 | Statistical signal processing on sensor time-series, BPFO frequency analysis | REQ-MODEL-009, REQ-MODEL-019 |
| Explainability | SHAP | 0.47.x | SHAP values for all tree-based models; source-mapped explanations | REQ-FUNCTIONAL-035 |
| Data frames | pandas | 3.0.3 | Data manipulation throughout ML pipelines | All REQ-MODEL |
| Numerical | numpy | 2.4.6 | Physics formula computation, feature engineering | REQ-DATA-003–034 |
| Validation | pydantic | 2.13.4 | Sensor input validation, API request/response schemas | REQ-INFRA-001 |
| Data versioning | DVC | 3.x | Version control for synthetic datasets and model artifacts | REQ-INFRA-009 |
| **Model registry** | **PostgreSQL-backed custom registry** | **—** | **CONFLICT vs original (MLflow 3.13.0 removed)** — lightweight DB table tracking model metadata, version, artifact path, training metrics, promotion status, train timestamp | REQ-INFRA-008 |

> **⚠️ CONFLICT — MLflow removed:** Original `master_tech_stack.md` specifies MLflow 3.13.0 on port 5000. Replaced by a lightweight model registry implemented as a Django model (`ModelVersion` table in PostgreSQL). Rationale: MLflow is a heavy service dependency adding a 7th container for tracking functionality that can be trivially implemented in the existing DB. DVC handles artifact versioning. If experiment-tracking richness becomes necessary, MLflow can be re-added as an optional container.

---

## AI / LLM Layer

> **Architecture decision: fully self-hosted, no external API calls (REQ-SECURITY-005).**
> All inference, embedding, and reranking run within the Docker Compose stack.

| Component | Technology | Pinned Version | Rationale | REQ IDs |
|---|---|---|---|---|
| Primary LLM | **Ollama** serving **Qwen3.5:9b** | `ollama/ollama:latest` | Self-hosted inference on OpenAI-compatible REST API (`/v1/chat/completions`); supports quantized models; strong reasoning on industrial maintenance tasks; no external API calls. Always pass `"think": false`. | REQ-LLM-001, REQ-SECURITY-005 |
| LLM client | `httpx` (direct HTTP to Ollama endpoint `http://ollama:11434`) | 0.28.1 | No SDK dependency; streams SSE; already in requirements | REQ-LLM-001 |
| Agent framework | LangGraph | 1.2.4 | Deterministic stateful multi-agent graph (Diagnostic → RCA → RUL → Recommendation); durable state persistence | REQ-LLM-003 |
| RAG chain | LangChain + langchain-community | ≥0.3.0 | RAG orchestration chains; ChromaDB integration; tool definitions | REQ-LLM-004 |
| ChromaDB client | chromadb | ≥0.6.0 | Embedded Python client; PersistentClient for local HNSW index | REQ-LLM-004 |
| Embedding model | **BAAI/bge-m3** via **FlagEmbedding** | FlagEmbedding ≥1.2.0 | **CONFLICT vs original (all-MiniLM-L6-v2 replaced)** — 1024-dim dense vectors; superior multilingual + domain recall; hybrid dense+sparse output; local inference only | REQ-LLM-005 |
| Reranker | **BAAI/bge-reranker-v2-m3** via **raw `transformers`** (`AutoModelForSequenceClassification` + `PreTrainedTokenizerFast`) | transformers ≥4.40 | Cross-encoder reranking; avoids FlagEmbedding/sentencepiece version churn; `tokenizer.json` loaded directly — no sentencepiece dependency; local inference | REQ-LLM-014 |
| Sparse retrieval | **rank-bm25** (BM25Okapi) | 0.2.2 | BM25 keyword index for hybrid search alongside BGE-M3 dense vectors | REQ-LLM-015 |
| Document processing | **unstructured** + **pymupdf** + **pypdf** | 0.17.2 / 1.26.1 / 5.5.0 | Heterogeneous PDF/DOCX/HTML ingestion; OCR fallback; fast text+image extraction; metadata extraction | REQ-DATA-034 |

> **⚠️ CONFLICT vs original — LLM providers changed:**
> Original stack specified Anthropic `claude-sonnet-4-20250514` (primary) + OpenAI `gpt-4o` (fallback) + Ollama (on-premises). **All replaced by self-hosted Ollama serving `qwen3.5:9b`.** vLLM was evaluated but dropped (GGUF format unsupported). Ollama exposes OpenAI-compatible `/v1/chat/completions`. No external API calls anywhere. `anthropic`, `openai`, `langchain-anthropic`, `langchain-openai` packages removed from requirements.
>
> **⚠️ CONFLICT vs original — Embedding model changed:**
> `all-MiniLM-L6-v2` (384-dim) replaced by `BAAI/bge-m3` (1024-dim). ChromaDB collection configured with cosine distance to match. BGE Reranker v2-M3 and BM25 added for hybrid search pipeline.
>
> **⚠️ Vector store changed — Weaviate removed:**
> Original specified Weaviate 1.30.4 as a separate container. Replaced by **embedded ChromaDB** — no Docker service needed, zero startup time, no healthcheck race conditions. Data persisted to `chroma-data` Docker volume.

---

## Frontend

| Component | Technology | Pinned Version | Rationale | REQ IDs |
|---|---|---|---|---|
| Framework | Next.js | 16.2.0 | Existing frontend; Turbopack; App Router | REQ-INFRA-010 |
| UI library | React | 19.0.0 | Existing | REQ-INFRA-010 |
| Language | TypeScript | 5.7.3 | Existing | REQ-INFRA-010 |
| Styling | TailwindCSS | v4 | Existing dark-theme dashboard | REQ-INFRA-010 |
| Charts | ECharts + Recharts | latest | Industrial health heatmaps, real-time sensor charts | REQ-FRONTEND-002–008 |

---

## Containerization & Orchestration

| Component | Technology | Pinned Version | Rationale | REQ IDs |
|---|---|---|---|---|
| Containerization | Docker | 27.x | All services containerized | REQ-INFRA-011 |
| Orchestration | Docker Compose v2 | 2.x | Multi-service local deploy + single-command prod | REQ-DEPLOY-001, REQ-DEPLOY-002 |
| Reverse proxy | Nginx | 1.27-alpine | Routes HTTP/WS; TLS termination; rate limiting | REQ-DEPLOY-005 |

### Service Inventory (docker-compose.yml)

| Service | Base Image | Internal Port | External Port | Purpose |
|---|---|---|---|---|
| `ui-console` | `node:20-alpine` | 3000 | 3000 | Next.js 16.2 frontend |
| `django-backend` | `python:3.12-slim` | 8000 | — (via nginx) | Django 6.0.6 + DRF + Channels |
| `celery-worker` | `python:3.12-slim` | — | — | Celery 5.6.3 workers |
| `celery-beat` | `python:3.12-slim` | — | — | Celery Beat scheduler |
| `postgres-db` | `postgres:17-alpine` | 5432 | 5432 | PostgreSQL + TimescaleDB |
| ~~weaviate~~ | ~~removed~~ | — | — | Replaced by embedded ChromaDB — no separate container |
| `redis` | `redis:8.8.0-alpine` | 6379 | — | Broker + cache |
| `ollama` | `ollama/ollama:latest` | 11434 | — | Self-hosted Qwen3.5:9b inference (GPU profile: `docker compose --profile gpu up`) |
| `nginx` | `nginx:1.27-alpine` | 80/443 | 80/443 | Reverse proxy |

> **CONFLICT vs original:** Original has 7 services. This stack replaces `mlflow` with `celery-beat`, keeps `ollama` (serving Qwen3.5:9b instead of Llama-3 fallback), and adds `nginx`. Net: 9 services.

---

## Observability

| Component | Technology | Pinned Version | Rationale | REQ IDs |
|---|---|---|---|---|
| Metrics | Prometheus | 3.x | Scrapes all services; stores time-series metrics | REQ-MONITORING-002 |
| Dashboards | Grafana | 11.x | Visualizes Prometheus metrics; alarm rules | REQ-MONITORING-003 |
| Tracing | OpenTelemetry | 0.x | Distributed tracing API → Celery → ML → LLM | REQ-MONITORING-004 |
| Log format | structlog (JSON) | 25.x | Structured JSON logging with correlation IDs | REQ-MONITORING-001 |

---

## Security & Secrets

| Component | Technology | Pinned Version | Rationale | REQ IDs |
|---|---|---|---|---|
| Auth | djangorestframework-simplejwt | 5.x | JWT access/refresh tokens | REQ-SECURITY-002 |
| RBAC | django-guardian or custom | latest | Object-level permissions per role | REQ-SECURITY-001 |
| Secrets | `.env` files per environment | — | Never committed; `.env.example` committed | REQ-SECURITY-006 |

---

## CI/CD

| Component | Technology | Rationale | REQ IDs |
|---|---|---|---|
| Pipeline | GitHub Actions | Lint → test → build → gate → promote | REQ-DEPLOY-006 |
| Container scan | Trivy | Vulnerability scanning in CI | REQ-DEPLOY-007 |
| Linting | ruff (Python) + ESLint (TS) | Code quality gates | REQ-DEPLOY-006 |
| Testing | pytest + Django test client | Unit + integration tests | REQ-DEPLOY-006 |

---

## Full CONFLICT Summary vs `master_tech_stack.md`

| # | Original | This Stack | Reason |
|---|---|---|---|
| 1 | PostgreSQL 17-alpine only | + TimescaleDB extension | Sensor time-series requires hypertables |
| 2 | MLflow 3.13.0 (port 5000) | **Removed** → PostgreSQL `ModelVersion` table | Unnecessary heavy service; DB registry sufficient |
| 3 | 7 docker-compose services | 9 services | Replaced `mlflow` with `celery-beat`; kept `ollama` (Qwen3.5:9b); added `nginx` |
| 4 | Anthropic `claude-sonnet-4-20250514` as primary LLM | **Ollama `qwen3.5:9b`** (self-hosted) | No external API calls; data sovereignty; self-contained demo. vLLM evaluated + dropped (GGUF unsupported). |
| 5 | OpenAI `gpt-4o` as fallback LLM | **Removed** — single Ollama inference path | Simplicity; no API keys needed |
| 6 | `sentence-transformers` `all-MiniLM-L6-v2` (384-dim) | **BAAI/bge-m3** (1024-dim) via FlagEmbedding + BGE Reranker v2-M3 via raw `transformers` + BM25 | Superior retrieval; hybrid search; reranker via raw transformers avoids sentencepiece dep |
| 7 | No document processing pipeline | `unstructured` + `pymupdf` + `pypdf` | Heterogeneous PDF/DOCX ingestion, OCR, metadata |
| 8 | No reverse proxy specified | Nginx 1.27-alpine | Required for WebSocket routing + TLS |
| 9 | No observability stack | Prometheus + Grafana + OpenTelemetry | REQ-MONITORING-001–005 |
| 10 | TailwindCSS v3.4.17 | TailwindCSS v4 | Already in-use in existing frontend |
