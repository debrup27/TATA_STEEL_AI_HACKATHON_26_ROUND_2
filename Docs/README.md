# Project ATAL — Documentation Hub

**Autonomous Troubleshooting, Asset Intelligence & Lifecycle Management**

Tata Steel AI Hackathon 2026 — Round 2 (Agentic AI Challenge)

ATAL is an intelligent **Maintenance Wizard** for steel plant equipment. It unifies live telemetry, ML-based health prediction, multi-agent orchestration (**SANSAD**), and a conversational AI assistant (**MANAS**) grounded in OEM manuals, SOPs, ISO standards, and maintenance history.

---

## Documentation Index

| Document | Audience | Contents |
|----------|----------|----------|
| **[SANSAD_MANAS_SUITE_GUIDE.md](./SANSAD_MANAS_SUITE_GUIDE.md)** | Demo reviewers, judges | **In-depth** SANSAD + MANAS page/button reference |
| **[../SYSTEM_ARCHITECTURE.md](../SYSTEM_ARCHITECTURE.md)** | Hackathon judges, architects | **Detailed** architecture with Mermaid diagrams (submission doc) |
| **[USER_GUIDE.md](./USER_GUIDE.md)** | Plant engineers, supervisors, demo reviewers | Login, SANSAD hub, MANAS chat, workflows, roles |
| **[API_DOCS.md](./API_DOCS.md)** | Integrators, backend developers | REST + WebSocket API reference |
| **[Custom_docs.md](./Custom_docs.md)** | Hackathon judges, architects | Architecture, data flows, ML/RAG pipeline, assumptions *(required deliverable)* |

---

## What ATAL Delivers (Problem Statement Mapping)

| Problem statement output (§5) | ATAL implementation |
|-------------------------------|---------------------|
| **§5.1 Diagnostics & Prediction** | `/sansad/hub/diagnostics` — fault diagnosis, RCA, RUL, early warnings, cross-stage defects |
| **§5.2 Risk & Priority** | `/sansad/hub/risk` — risk levels, urgency scores, bottleneck ranking, spares |
| **§5.3 Maintenance Actions** | `/sansad/hub/actions` — step plans, work orders, long-term monitoring |
| **§5.4 Reporting** | `/sansad/hub/reports` — intelligence reports, alert digests, digital logbook |
| **Natural language interaction** | **MANAS** at `/manas/chat` — multi-turn chat with RAG citations |
| **Real-time alerting** | WebSocket telemetry, notification feed, anomaly trip simulation |

---

## System at a Glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser (Next.js 16 — ui-console :3000, nginx :80)                     │
│  ├── SANSAD  — plant dashboard, factory canvases, intelligence pillars    │
│  └── MANAS   — maintenance chat, RAG document selector, streaming WS    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ REST /api/v1/*  +  WebSocket /ws/*
┌───────────────────────────────▼─────────────────────────────────────────┐
│  Django 6 + DRF + Channels (django-backend :8000)                       │
│  ├── Assets, telemetry, twins, diagnostics, maintenance, reports        │
│  ├── ML inference (RUL, anomaly, fault class) + consolidation           │
│  ├── RAG (ChromaDB + BGE-M3 + BM25 hybrid + optional reranker)        │
│  └── Agents (MANAS chat → Ollama qwen3.5:9b + 0.8b role workers)      │
└───────┬─────────────────┬─────────────────┬─────────────────────────────┘
        │                 │                 │
   PostgreSQL          Redis            Ollama (GPU)
   TimescaleDB         Celery           BGE embeddings
   Chroma volume       task queues      qwen3.5:9b / 0.8b
```

### Plant model (canonical)

Two factories, eight critical assets:

| Factory | Code | Process | Assets |
|---------|------|---------|--------|
| **Horizon Foundry** | F1 | Hot rolling | SRF, HHPD, FS, HAGCC |
| **Zephyr Sinter** | F2 | Cold rolling & coating | APT, TCMS, CGP, HPAK |

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Docker + Docker Compose** | Primary runtime |
| **NVIDIA GPU** (recommended) | Ollama `qwen3.5:9b` + BGE-M3 embeddings; CPU fallback possible with mocks |
| **~32 GB RAM** | Compose file budgets services accordingly |
| **Fish shell** (optional) | Project conventions use `fish -c "..."` |
| **Disk** | ~8 GB models (`bge-m3`, `bge-reranker-v2-m3`) + corpus documents |

---

## Quick Start

### 1. Clone and configure

```bash
cd TATA_STEEL_AI_HACKATHON_26_ROUND_2
cp ATAL_Project/backend/env/.env.gpu .env   # GPU profile; adjust if needed
```

### 2. Download models and corpus (first time)

```bash
bash ATAL_Project/backend/scripts/download_models.sh    # ~6.5 GB BGE weights
bash ATAL_Project/backend/scripts/download_corpus.sh    # OEM manuals, SOPs, ISO
```

### 3. Start the stack (Ollama models pull automatically)

The `ollama-warmup` init container pulls `qwen3.5:9b` and `qwen3.5:0.8b` into volume `atal_ollama_data` on first boot (Compose creates the volume). Optional pre-pull: `bash ATAL_Project/backend/scripts/pull_ollama_models.sh`

```bash
fish -c "docker compose up atal -d --build"
```

With GPU profile:

```bash
fish -c "docker compose --profile gpu up atal -d --build"
```

### 4. Verify deployment

```bash
bash ATAL_Project/backend/scripts/verify-deploy.sh
```

Expected checks: Django `/health/`, Redis, Postgres, Celery, Ollama, Chroma collections.

### 5. Open the application

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Next.js UI (primary dev entry) |
| http://localhost | nginx reverse proxy |
| http://localhost:8000/health/ | Backend liveness |
| http://localhost:8000/admin/ | Django admin (if enabled) |

### 6. Log in

Demo accounts (created by backend entrypoint `create_demo_users`):

| Username | Password | Role |
|----------|----------|------|
| `tech_demo` | `TechDemo@123` | Technician |
| `supervisor_demo` | `SuperDemo@123` | Supervisor |
| `admin_demo` | `AdminDemo@123` | Admin |

Use **MANAS Chat** at `/manas/chat` after login for full backend features (sessions, RAG, streaming).

---

## Repository Layout

```
TATA_STEEL_AI_HACKATHON_26_ROUND_2/
├── Docs/                          ← You are here
├── docker-compose.yml             ← Full stack orchestration
├── docker/nginx/nginx.conf
├── .env                           ← Active env (gitignored; copy from .env.gpu)
├── Planning/                      ← Hackathon planning & problem statement
└── ATAL_Project/
    ├── frontend/                  ← Next.js 16 dashboard
    │   └── src/app/
    │       ├── sansad/            ← Telemetry & hub
    │       └── manas/             ← AI chat
    └── backend/                   ← Django 6 + Celery + RAG + ML
        ├── apps/
        │   ├── agents/            ← MANAS chat, prompts, streaming
        │   ├── assets/            ← Factories, diagnostics, simulation
        │   ├── alerts/            ← Alarms, notifications
        │   ├── consolidation/     ← Payload assembly, SANSAD orchestration
        │   ├── maintenance/       ← Action plans, work orders, reports
        │   ├── ml/                ← Training, inference, RUL
        │   ├── rag/               ← ChromaDB, BGE, BM25, ingestion
        │   ├── reports/           ← Intelligence reports
        │   ├── telemetry/         ← Sensor ingest & snapshots
        │   └── twins/             ← Digital twin state
        ├── data/corpus/           ← RAG document source (gitignored)
        ├── models/                ← BGE weights (gitignored)
        └── scripts/               ← download_*, verify-deploy, dev-start
```

---

## Technology Stack (Implemented)

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16.2, React 19, TypeScript, Tailwind v4 |
| **API** | Django 6, Django REST Framework, JWT (SimpleJWT) |
| **Real-time** | Django Channels, Uvicorn ASGI, WebSockets |
| **Task queue** | Celery 5.6, Redis 8, django-celery-beat |
| **Database** | PostgreSQL 17 / TimescaleDB (telemetry hypertables) |
| **Vector RAG** | ChromaDB (embedded), BAAI/bge-m3 (1024-dim), BM25 + RRF hybrid |
| **Reranker** | BAAI/bge-reranker-v2-m3 (optional, `RAG_USE_RERANKER`) |
| **LLM** | Ollama — `qwen3.5:9b` (main), `qwen3.5:0.8b` (role/advice workers) |
| **ML** | scikit-learn, XGBoost/LightGBM artifacts, deterministic physics fallback |
| **Containers** | Docker Compose, nginx reverse proxy |

> **Note:** Early planning documents reference Weaviate and cloud LLM APIs. The **running prototype** uses **ChromaDB** and **local Ollama** for data sovereignty and offline demo capability.

---

## Validated Test Gates

Run inside `django-backend`:

| Gate | Command | Validates |
|------|---------|-----------|
| LLM smoke | `python manage.py test_llm` | Ollama chat completion |
| RAG pipeline | `python manage.py test_rag_pipeline` | BGE 1024-dim, reranker, ISO 4406 retrieval |
| MANAS modes | `python manage.py test_manas_mode_matrix` | Role/advice/RAG combinations |
| Deploy smoke | `bash scripts/verify-deploy.sh` | All services healthy |

```bash
fish -c "docker compose exec django-backend python manage.py test_rag_pipeline"
```

---

## Key Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `OLLAMA_BASE_URL` | `http://ollama:11434` | LLM endpoint |
| `OLLAMA_MODEL` | `qwen3.5:9b` | Primary MANAS model |
| `OLLAMA_SMALL_MODEL` | `qwen3.5:0.8b` | Role advisory workers |
| `BGE_M3_MODEL_PATH` | `/models/bge-m3` | Embedding model path |
| `CORPUS_DIR` | `/app/data/corpus` | RAG document source |
| `CHROMA_PERSIST_DIR` | `/chroma_data` | Vector store volume |
| `EMBEDDING_MOCK` | `0` | Set `1` to skip BGE load |
| `OLLAMA_MOCK` | `0` | Set `1` to skip real LLM calls |
| `INGEST_CORPUS_ON_START` | `0` | Set `1` to re-ingest corpus on boot |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Browser REST base (frontend) |

Full list: `docker-compose.yml` → `x-django-env` block.

---

## Development Commands

```bash
# Full stack
fish -c "docker compose up atal -d --build"

# Django management
fish -c "docker compose exec django-backend python manage.py migrate"
fish -c "docker compose exec django-backend python manage.py shell"

# Frontend lint & build
fish -c "docker compose exec ui-console npm run lint"
fish -c "docker compose exec ui-console npm run build"

# Celery logs
fish -c "docker compose logs celery-worker --tail=50"

# Restart backend after Python changes
fish -c "docker compose restart django-backend"
```

---

## Support & Further Reading

- **Operator workflows:** [USER_GUIDE.md](./USER_GUIDE.md)
- **API integration:** [API_DOCS.md](./API_DOCS.md)
- **Architecture deep-dive (hackathon deliverable):** [Custom_docs.md](./Custom_docs.md)
- **In-repo architecture notes:** `CLAUDE.md`, `Planning/Code Deets/master_tech_stack.md`
- **Problem statement:** `Planning/MDs/tata_steel_ai_hackathon_problem_statement.md`

---

*ATAL — Built for Tata Steel AI Hackathon 2026. Demonstrates reactive troubleshooting and proactive predictive maintenance on simulated hot- and cold-rolling plant equipment.*
