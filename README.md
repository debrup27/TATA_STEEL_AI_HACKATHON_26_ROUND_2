# Project ATAL

**Autonomous Troubleshooting, Asset Intelligence & Lifecycle Management**

Intelligent **Maintenance Wizard** for steel-plant equipment — Tata Steel AI Hackathon 2026 ·
Round 2 · Agentic AI Challenge.

---

## What is ATAL?

ATAL unifies live telemetry, deterministic + ML health/RUL/anomaly intelligence, multi-agent
orchestration, and a RAG-grounded conversational assistant behind a single Docker Compose stack.

| Suite | Purpose |
|-------|---------|
| **SANSAD** | Real-time plant dashboard — factory canvases, diagnostics, risk & priority, cost analytics, action plans, work orders, reports, Samvidhaan history |
| **MANAS** | Maintenance chat — RAG citations over OEM manuals/SOPs/ISO standards, multi-turn context, `/sansad` live-plant linking, deep-thinking mode |

**Two factories · eight assets:** Horizon Foundry (SRF, HHPD, FS, HAGCC) and Zephyr Sinter
(APT, TCMS, CGP, HPAK).

---

## Documentation

| Document | Contents |
|----------|----------|
| [docs/SYSTEM_ARCHITECTURE.md](./docs/SYSTEM_ARCHITECTURE.md) | Full architecture — topology, intelligence engine, RAG, agents, boot pipeline |
| [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) | All REST endpoints + WebSocket channels |
| [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) | Operator walkthrough of SANSAD, MANAS, and the live demo |
| [docs/PROBLEM_STATEMENT_DELIVERABLE.md](./docs/PROBLEM_STATEMENT_DELIVERABLE.md) | Problem-statement technical deliverable |

---

## Quick Start

### Prerequisites
- Docker + Docker Compose
- NVIDIA GPU recommended (16 GB VRAM for both LLMs + BGE; runs degraded without)
- ~32 GB RAM · ~30 GB free disk (after all weights download)

### 1 — Download host assets (run ONCE)
One script fetches the Hugging Face BGE models (~6.5 GB) and the RAG corpus:

```bash
cd TATA_STEEL_AI_HACKATHON_26_ROUND_2
bash scripts/setup_assets.sh
```

> The two Ollama LLMs (`qwen3.5:9b` + `qwen3.5:0.8b`, ~7 GB) are **not** downloaded here — the
> `ollama-warmup` service pulls them automatically on the first `docker compose up`
> (network required; allow 10–20 min once).

### 2 — Start the whole stack (one command)

```bash
docker compose up atal -d --build
```

The `django-backend` entrypoint runs the full boot pipeline automatically: migrations, TimescaleDB
hypertables, demo users, ChromaDB, asset/spares/telemetry seeding, sensor calibration, ML training +
inference, and intelligence-report seeding. No manual steps.

### 3 — Verify

```bash
curl http://localhost:8000/health/ready/
bash ATAL_Project/backend/scripts/verify-deploy.sh
```

### Access

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | UI (SANSAD + MANAS) |
| http://localhost/ | Same, via nginx proxy |
| http://localhost:8000/health/ready/ | Backend readiness |
| Login | `tech_demo` / `TechDemo@123` |

> Optional: set `INGEST_CORPUS_ON_START=1` (in `.env` or shell) before `up` to ingest the corpus
> into RAG so library documents appear in the MANAS document selector.

---

## Reset to a clean state

Re-run the full boot pipeline from scratch **without** re-pulling the multi-GB LLM weights:

```bash
docker compose down
# remove app-state volumes only; keep the Ollama weights volume to avoid a 7 GB re-pull
docker volume rm atal_postgres-data atal_chroma-data atal_redis-data atal_staticfiles atal_model-artifacts 2>/dev/null || true
docker compose up atal -d --build
```

To also wipe LLM weights (forces a fresh Ollama pull): add `docker volume rm atal_ollama_data`.
Images are kept — only volumes are removed.

---

## Create the submission ZIP

```bash
bash scripts/create_submission_zip.sh
```

Produces `ATAL_Submission.zip` in the repo root — `README.md` at the zip root, all reference docs
under `docs/`, full source, excluding secrets, model weights, corpus, and build artifacts (each
re-fetched by `setup_assets.sh` / first boot).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16.2, React 19, TypeScript, Tailwind v4 |
| Backend | Django 6, DRF, Channels, Celery 5 |
| Database | PostgreSQL 17 / TimescaleDB |
| Vector RAG | ChromaDB + BGE-M3 (1024-dim) + BGE reranker v2-m3 + BM25 hybrid |
| LLM | Ollama — qwen3.5:9b (supervisor) + qwen3.5:0.8b (workers) |
| Agents | LangGraph orchestration, role advisory, `/sansad` context mode |
| ML | Deterministic engine + sanity-gated XGBoost / scikit-learn fallback, SHAP explain |
| Runtime | Docker Compose, NVIDIA GPU |

---

## Repository Layout

```
TATA_STEEL_AI_HACKATHON_26_ROUND_2/
├── README.md                      ← you are here
├── docker-compose.yml             ← one-command stack
├── docs/                          ← architecture, API, user guide, deliverable
├── scripts/
│   ├── setup_assets.sh            ← one-time: BGE models + corpus
│   └── create_submission_zip.sh   ← build submission ZIP
├── snapshots/                     ← place screenshots here
└── ATAL_Project/
    ├── frontend/                  ← Next.js dashboard
    └── backend/                   ← Django + Celery + RAG + ML
```

---

*Built for Tata Steel AI Hackathon 2026 — reactive troubleshooting and proactive predictive
maintenance on simulated steel-plant equipment.*
