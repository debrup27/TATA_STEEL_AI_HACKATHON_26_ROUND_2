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

## Demo Video

📹 **Walkthrough:** _<!-- VIDEO_LINK -->_ &nbsp;`(link to be added)`

<!-- Paste the demo video URL above, replacing the VIDEO_LINK placeholder. -->

---

## Get the Code

Two equivalent ways to obtain the project — both land the same tree and use the same setup below.

**A · Clone from GitHub**
```bash
git clone https://github.com/debrup27/TATA_STEEL_AI_HACKATHON_26_ROUND_2.git
cd TATA_STEEL_AI_HACKATHON_26_ROUND_2
```

**B · Unzip the submission package**
```bash
unzip ATAL_Submission.zip
cd TATA_STEEL_AI_HACKATHON_26_ROUND_2
```

`ATAL_Submission.zip` (built with `bash scripts/create_submission_zip.sh`) carries the
submission-ready `docker-compose.yml`, `README.md`, and `INSTRUCTIONS_TO_RUN.md` at its root,
plus all source. Model weights, RAG corpus and build artifacts are excluded and re-fetched on
setup (so both paths converge after Step 1 below).

---

## Documentation

Full documentation lives in **[`docs/`](./docs/)** (see [docs/README.md](./docs/README.md) for the index):

| Area | Document |
|---|---|
| Full description | [docs/PROJECT_DESCRIPTION.md](./docs/PROJECT_DESCRIPTION.md) — functions, deliverables, realistic-dataset mapping |
| Setup / run | [INSTRUCTIONS_TO_RUN.md](./INSTRUCTIONS_TO_RUN.md) · [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| Architecture | [docs/SYSTEM_ARCHITECTURE.md](./docs/SYSTEM_ARCHITECTURE.md) · [docs/TECH_STACK.md](./docs/TECH_STACK.md) · [docs/METHODOLOGY.md](./docs/METHODOLOGY.md) |
| Interfaces | [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) · [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) |
| Engineering | [docs/BACKEND_GUIDE.md](./docs/BACKEND_GUIDE.md) · [docs/FRONTEND_GUIDE.md](./docs/FRONTEND_GUIDE.md) · [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md) |
| Deliverables | [docs/deliverables/](./docs/deliverables/) — data/system flow, model design, alerting & prediction, **equipment physics**, assumptions & limitations, sample I/O |

> Hit a problem? Run `bash scripts/doctor.sh` — it diagnoses Docker, GPU/CDI, models,
> corpus, disk, ports and Ollama, and prints the exact fix command for each.

Deeper architecture, REST/WebSocket API, and the boot pipeline are documented inline in the
backend (`ATAL_Project/backend/`) and in `CLAUDE.md` at the repo root.

---

## Quick Start

> Works identically whether you cloned from GitHub or unzipped the submission — run from the
> `TATA_STEEL_AI_HACKATHON_26_ROUND_2/` directory.

### Prerequisites
- Docker + Docker Compose
- NVIDIA GPU recommended (16 GB VRAM for both LLMs + BGE; runs degraded without)
- ~32 GB RAM · ~30 GB free disk (after all weights download)

### 1 — Download host assets (run ONCE)
One script fetches the Hugging Face BGE models (~6.5 GB) and the RAG corpus:

```bash
bash scripts/setup_assets.sh
```

> The two Ollama LLMs (`qwen3.5:9b` + `qwen3.5:0.8b`, ~7 GB) are **not** downloaded here — the
> `ollama-warmup` service pulls them automatically on the first `docker compose up`
> (network required; allow 10–20 min once).

### 2 — Start the whole stack (one command)

```bash
docker compose up atal -d --build
```

**Low-VRAM GPUs (~6–8 GB):** run the low tier — the 0.8b model serves every role
(supervisor, orchestration, SANSAD, chat); the 9b is never loaded:

```bash
docker compose -f docker-compose.yml -f docker-compose.low.yml up atal -d --build
```

> GPU required either way (CUDA) — there is no CPU mode. If `docker compose up` fails
> with a GPU/CDI error, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) §1 or run `bash scripts/doctor.sh`.

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
| http://localhost:3000 | **UI** (SANSAD + MANAS) — open this |
| http://localhost/api/… , /health/… , /ws/… , /admin/ | Backend API + WebSocket, via nginx (:80) |
| http://localhost:8000/health/ready/ | Backend readiness (direct) |
| Logins | `tech_demo`/`TechDemo@123` · `supervisor_demo`/`SuperDemo@123` · `admin_demo`/`AdminDemo@123` |

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

Produces `ATAL_Submission.zip` in the repo root — `README.md` and `INSTRUCTIONS_TO_RUN.md` at the
zip root next to `docker-compose.yml`, plus full source, excluding secrets, model weights, corpus,
and build artifacts (each re-fetched by `setup_assets.sh` / first boot).

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
├── INSTRUCTIONS_TO_RUN.md         ← step-by-step run guide
├── TROUBLESHOOTING.md             ← fixes for common setup problems
├── docker-compose.yml             ← one-command stack (full tier)
├── docker-compose.low.yml         ← low-VRAM override (0.8b serves all roles)
├── docs/                          ← full documentation + deliverables/
├── snapshots/                     ← product screenshots
├── scripts/
│   ├── setup_assets.sh            ← one-time: BGE models + corpus
│   ├── doctor.sh                  ← diagnose env issues + print fixes
│   └── create_submission_zip.sh   ← build submission ZIP
└── ATAL_Project/
    ├── frontend/                  ← Next.js dashboard
    └── backend/                   ← Django + Celery + RAG + ML
```

---

*Built for Tata Steel AI Hackathon 2026 — reactive troubleshooting and proactive predictive
maintenance on simulated steel-plant equipment.*
