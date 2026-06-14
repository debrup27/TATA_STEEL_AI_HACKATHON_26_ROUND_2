# PHASE_2_CONTAINERIZATION.md — Project ATAL
**Scope: Docker-based dev/demo setup + frontend integration.**
**Hackathon scope — no production deployment, no Prometheus/Grafana observability stack.**
**Phase 2 split into Sub-Phase 2.1 (backend validation) then Sub-Phase 2.2 (frontend wiring).**

> **⚠️ PHASE ORDER DECISION (2026-06-14):** Sub-Phase 2.1 (backend validation gates P2-042–P2-049) runs BEFORE Sub-Phase 2.2 (frontend wiring). **Phase 3 (LLM Layer) runs BETWEEN Sub-Phase 2.1 and Sub-Phase 2.2.** Rationale: LLM endpoints must be live so frontend can test the full AI chat and consolidation flow during Sub-Phase 2.2, avoiding a second frontend integration pass.
> Execution order: **Phase 1 → Sub-Phase 2.1 → Phase 3 → Sub-Phase 2.2 → Phase 4 → Phase 5**

Task format: `- [ ] P2-NNN: {task} | REQ: REQ-{CAT}-{NNN} | Depends: P2-NNN`

---

## Sub-Phase 2.1 — Backend Validation & Container Testing

> **Goal: every Docker service boots, communicates, and passes smoke tests before touching the frontend.**

### Service Inventory

| Service | Base Image | External Port (dev) | Health Check |
|---|---|---|---|
| `postgres-db` | `timescale/timescaledb:latest-pg17` | 5432 | `pg_isready -U atal_user` |
| `redis` | `redis:8.0-alpine` | 6379 | `redis-cli ping` |
| ~~weaviate~~ | ~~removed~~ | — | — (ChromaDB embedded in django-backend) |
| `ollama` | `ollama/ollama:latest` (GPU profile) | 11434 | `/api/tags` |
| `django-backend` | `python:3.12-slim` | 8000 | `/health/` |
| `celery-worker` | `python:3.12-slim` | — | `celery inspect ping` |
| `celery-beat` | `python:3.12-slim` | — | — |
| `nginx` | `nginx:1.27-alpine` | 80 | `/health` |
| `ui-console` | `node:20-alpine` | 3000 | added Sub-Phase 2.2 |

### Files produced

- [x] P2-001: Dockerfiles (`docker/Dockerfile`, `docker/Dockerfile.celery`) — multi-stage, non-root `appuser` | REQ: REQ-SECURITY-008 | Depends: —
- [x] P2-002: `docker-compose.yml` — all backend services, health checks, named volumes, two networks | REQ: REQ-DEPLOY-003 | Depends: P2-001
- [x] P2-003: `docker-compose.override.yml` — dev bind mounts, hot reload, exposed ports | REQ: REQ-DEPLOY-002 | Depends: P2-002
- [x] P2-004: Ollama service in compose — GPU profile, `ollama/ollama:latest`, model `qwen3.5:9b`, port 11434 | REQ: REQ-LLM-001 | Depends: P2-002
- [x] P2-005: ~~`docker-compose.prod.yml`~~ — **REMOVED (hackathon scope — not deploying to production)** | N/A
- [x] P2-006: `depends_on: condition: service_healthy` on all services in `docker-compose.yml` | REQ: REQ-DEPLOY-003 | Depends: P2-002
- [x] P2-007: `docker/entrypoint.sh` — waits PG+Ollama, runs migrate, collectstatic, seed fixtures, init ChromaDB collections | REQ: REQ-DEPLOY-001 | Depends: P2-002
- [x] P2-008: `env/.env.gpu` — all required vars: `POSTGRES_*`, `REDIS_URL`, `CHROMA_PERSIST_DIR`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `BGE_*_MODEL_PATH`, `DJANGO_SECRET_KEY`, `JWT_SIGNING_KEY`, `CORS_ALLOWED_ORIGINS`, `CORPUS_DIR` | REQ: REQ-SECURITY-006 | Depends: —
- [x] P2-009: `.env` (dev copy of `.env.example`, gitignored) created by `scripts/dev-start.sh` | REQ: REQ-SECURITY-006 | Depends: P2-008
- [x] P2-010: ~~`.env.prod`~~ — **REMOVED (hackathon scope)** | N/A
- [x] P2-011: No secrets in Dockerfiles/compose — all injected at runtime via `env_file: .env` | REQ: REQ-SECURITY-008 | Depends: P2-003

### Network topology

```
dev host:
  http://localhost:8000  → django-backend
  redis://localhost:6379 → redis (debug)
  http://localhost:80    → nginx → django-backend

networks in compose:
  frontend-net: nginx, django-backend
  backend-net (no host ports): postgres, redis, ollama, celery-*
  ChromaDB: embedded in django-backend/celery containers, shared via chroma-data volume
```

- [x] P2-012: `frontend-net` + `backend-net` defined; backend-net internal | REQ: REQ-SECURITY-004 | Depends: P2-002
- [x] P2-013: `docker/nginx/nginx.conf` — upstream django, `/api/` proxy, `/ws/` WS upgrade, rate limit 100/min, security headers | REQ: REQ-SECURITY-007 | Depends: P2-012

### ~~Observability stack~~ — REMOVED (hackathon scope)

Prometheus, Grafana, OpenTelemetry, structlog JSON logging: **not included**.
Removed from `requirements.txt`, `settings/base.py`, and compose files.
ISO alarm thresholds are enforced in Django app logic (`apps/alerts/`) instead.

- [x] P2-014: ~~`django-prometheus`~~ — **REMOVED** from requirements + settings | N/A
- [x] P2-015: ~~Prometheus/Grafana containers~~ — **REMOVED** | N/A
- [x] P2-016: ~~`prometheus.yml`~~ — **REMOVED** | N/A
- [x] P2-017: ~~Prometheus alert rules~~ — ISO alert thresholds enforced in `apps/alerts/models.py` instead | N/A
- [x] P2-018..P2-022: ~~Grafana dashboards~~ — **REMOVED** | N/A
- [x] P2-023: ~~OpenTelemetry~~ — **REMOVED** from requirements | N/A
- [x] P2-024: ~~structlog JSON logging~~ — **REMOVED**; standard Django logging used | N/A

### CI/CD

- [x] P2-025: `.github/workflows/ci.yml` — lint → test → integration (no trivy scan, no deploy-gate) | REQ: REQ-DEPLOY-006 | Depends: P2-003
- [x] P2-026: `docker-compose.test.yml` — PG + Redis + pytest test-runner (ChromaDB embedded, uses tmpfs dir) | REQ: REQ-DEPLOY-006 | Depends: P2-003
- [x] P2-027: ~~Trivy scan~~ — **REMOVED (not deploying)** | N/A

### Scripts

- [x] P2-037: `ATAL_Project/backend/scripts/dev-start.sh` — checks `.env`, runs `docker compose up --build` | REQ: REQ-DEPLOY-002 | Depends: P2-004
- [x] P2-038: ~~`scripts/prod-start.sh`~~ — **REMOVED** | N/A
- [x] P2-039: `ATAL_Project/backend/scripts/verify-deploy.sh` — smoke tests: Django /health/, Redis, Postgres, Celery ping, ChromaDB init | REQ: REQ-DEPLOY-009 | Depends: P2-037
- [x] P2-040: Network topology enforced in compose — backend-net internal, nginx only public port | REQ: REQ-SECURITY-004 | Depends: P2-012

---

### Model Weight Downloads (pre-requisite — run before first `docker compose up`)

```bash
bash ATAL_Project/backend/scripts/download_models.sh
```

Or manually:
```bash
# 1. Qwen3.5:9b — pulled by Ollama at runtime (no manual download needed)
#    docker compose --profile gpu up ollama
#    docker compose exec ollama ollama pull qwen3.5:9b

# 2. BAAI/bge-m3 — dense embeddings (full snapshot: config + tokenizer + weights)
python -c "from huggingface_hub import snapshot_download; snapshot_download('BAAI/bge-m3', local_dir='ATAL_Project/backend/models/bge-m3')"

# 3. BAAI/bge-reranker-v2-m3 — cross-encoder reranker (raw transformers, no sentencepiece)
python -c "from huggingface_hub import snapshot_download; snapshot_download('BAAI/bge-reranker-v2-m3', local_dir='ATAL_Project/backend/models/bge-reranker-v2-m3')"
```

> `OLLAMA_MOCK=1` + `EMBEDDING_MOCK=1` in `.env` to start stack without GPU/Ollama.

---

## Sub-Phase 2.1 — Validation Gates (must all pass before Sub-Phase 2.2)

- [ ] P2-041: All backend containers boot healthy: `docker compose up` → all services pass health checks within 5 min | REQ: REQ-DEPLOY-003 | Depends: P2-002, P2-006, P2-007
- [x] P2-042: ✅ Ollama chat completion — `manage.py test_llm` → `POST http://ollama:11434/v1/chat/completions` returns valid JSON, `"think": false` verified | REQ: REQ-LLM-001 | Depends: P2-004
- [x] P2-043: ✅ BGE-M3 1024-dim embedding — `embed_chunk("test")` returns 1024-dim vector; `FlagEmbedding.BGEM3FlagModel` via `/app/models/bge-m3` | REQ: REQ-LLM-005 | Depends: P2-007
- [x] P2-044: ✅ BGE Reranker v2-M3 works — score ≥ 0.96; raw `transformers` (`AutoModelForSequenceClassification` + `PreTrainedTokenizerFast(tokenizer_file=...)`); no sentencepiece | REQ: REQ-LLM-014 | Depends: P2-007
- [x] P2-045: ✅ RAG pipeline end-to-end — 14 corpus docs ingested (ISO 4406 16/14/11 exact retrieval confirmed); BM25+dense RRF; rerank; `manage.py test_rag_pipeline` all PASS | REQ: REQ-LLM-010 | Depends: P2-043, P2-044
- [ ] P2-046: Celery + Redis — dispatch `test_task` via `delay()`; verify result in result backend within 10s | REQ: REQ-INFRA-003 | Depends: P2-007
- [ ] P2-047: Django API smoke tests — JWT auth, asset CRUD, telemetry WS, consolidation endpoint, chat session CRUD | REQ: REQ-INFRA-001 | Depends: P2-007
- [ ] P2-048: RBAC enforcement — Technician blocked from Admin endpoints; all 3 demo accounts (Technician/Supervisor/Admin) authenticate | REQ: REQ-SECURITY-001 | Depends: P2-047
- [ ] P2-049: Fix all blocking issues found in P2-041–P2-048 before proceeding | REQ: REQ-DEPLOY-003 | Depends: P2-041–P2-048

---

## Sub-Phase 2.2 — Frontend Integration

> Begin only after all Sub-Phase 2.1 validation gates pass.

- [ ] P2-050: Dockerfile for `ui-console` — Node 20 build (`npm run build`, inject `NEXT_PUBLIC_API_URL`); serve via Nginx Alpine | REQ: REQ-DEPLOY-001 | Depends: P2-049
- [ ] P2-051: Add `ui-console` to `docker-compose.yml`; wire into `frontend-net` | REQ: REQ-DEPLOY-003 | Depends: P2-050
- [ ] P2-052: Wire `/sansad/hub/` factory dashboard pages to live backend — replace mock `src/services/` with real `fetch()` to Django endpoints | REQ: REQ-FRONTEND-001 | Depends: P2-049
- [ ] P2-053: Wire equipment/asset detail pages to live twin state, RUL predictions, anomaly scores | REQ: REQ-FRONTEND-002 | Depends: P2-049
- [ ] P2-054: Surface ISO compliance alerts on dashboard — wire to `/api/v1/alerts/` | REQ: REQ-COMPLIANCE-001, REQ-FRONTEND-003 | Depends: P2-049
- [ ] P2-055: One-click demo login toggles on `/login` — Technician/Supervisor/Admin pre-fill + auto-submit JWT | REQ: REQ-SECURITY-001, REQ-FRONTEND-004 | Depends: P2-049
- [ ] P2-056: RBAC-driven UI visibility — hide Admin panels from Technician/Supervisor | REQ: REQ-SECURITY-001 | Depends: P2-055
- [ ] P2-057: MANAS chat WebSocket integration — wire `/ws/llm/{session_id}/`, streamed tokens, citations panel | REQ: REQ-LLM-008, REQ-FUNCTIONAL-012 | Depends: P2-049
- [ ] P2-058: Document upload — PDF → POST `/api/v1/rag/ingest/` → ingestion progress UI | REQ: REQ-LLM-010, REQ-FRONTEND-005 | Depends: P2-049
- [ ] P2-059: Audit log viewer for Admin role — GET `/api/v1/admin/audit-logs/` paginated table | REQ: REQ-SECURITY-001, REQ-FRONTEND-006 | Depends: P2-049
- [ ] P2-060: E2E test — frontend action → API → Django → Celery → Ollama → rendered in UI; no CORS errors, citations shown | REQ: REQ-DEPLOY-009 | Depends: P2-057, P2-058
