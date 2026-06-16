# ATAL — Instructions to Run

**Everything runs through one interactive script — `scripts/doctor.sh`.** It checks your
machine, downloads assets, starts the stack, and verifies health, all from a menu. No flags.

## Prerequisites
- Docker + Docker Compose (Compose v2 plugin)
- NVIDIA GPU + nvidia-container-toolkit (16 GB VRAM for both LLMs + BGE; ~6–8 GB → low-VRAM tier)
- ~32 GB RAM · ~30 GB free disk · internet on first run

## Quick install

```bash
# 1. Get the code (either one)
git clone https://github.com/debrup27/TATA_STEEL_AI_HACKATHON_26_ROUND_2.git
unzip ATAL_Submission.zip
cd TATA_STEEL_AI_HACKATHON_26_ROUND_2

# 2. Launch the doctor — do everything from its menu
bash scripts/doctor.sh
```

Then, in the menu, **in this order**:

| Step | Menu option | What it does |
|---|---|---|
| 1 | **1) Run diagnostics** | Checks Docker, GPU/CDI, ports, disk, RAM, assets. Fix any **FAIL** first. |
| 2 | **2) Download BGE models** | Hugging Face BGE-M3 + reranker (~6.5 GB, once). |
| 3 | **3) Download RAG corpus** | OEM manuals, SOPs, ISO, safety codes (~95 MB, once). |
| 4 | **4) Start stack — full tier** | `docker compose up` with the 9b + 0.8b LLMs. |
| — | **5) Start stack — low-VRAM** | Use *instead of 4* on ~6–8 GB GPUs (0.8b serves all roles). |
| 5 | **6) Watch backend logs** | Follow the first-boot pipeline. Allow **20–30 min** the first time. |
| 6 | **7) Stack status / health** | Confirms all services healthy + backend ready. |

The two Ollama LLMs (`qwen3.5:9b` + `qwen3.5:0.8b`, ~7.6 GB) are pulled automatically on
first start — no separate download. GPU (CUDA) is required in both tiers; there is no CPU mode.

First boot runs the full pipeline automatically (migrations, TimescaleDB hypertables, demo
users, ChromaDB, asset/spares/telemetry seeding, sensor calibration, ML train + inference,
report generation). No manual steps — just watch option 6 until the backend reports healthy.

> Prefer raw commands? The doctor just wraps these:
> ```bash
> bash scripts/setup_assets.sh                 # = menu 2 + 3
> docker compose up atal -d --build            # = menu 4
> docker compose -f docker-compose.yml -f docker-compose.low.yml up atal -d --build   # = menu 5
> ```

## Access

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | **UI** (SANSAD dashboard + MANAS chat) — open this |
| http://localhost/api/… , /health/… , /ws/… , /admin/ | Backend API + WebSocket, via the nginx proxy on :80 |
| http://localhost:8000/health/ready/ | Backend readiness (direct) |

> nginx (:80) fronts the **backend** (API, WebSocket, admin, health). The Next.js UI is
> served directly on **:3000** — that's the page to open in a browser.

**Seeded logins** (created automatically on first boot — no setup):

| Role | Username | Password |
|---|---|---|
| Technician | `tech_demo` | `TechDemo@123` |
| Supervisor | `supervisor_demo` | `SuperDemo@123` |
| Admin | `admin_demo` | `AdminDemo@123` |

Log in, then click **Admin** for the admin view — the admin account is already seeded.

## Optional
- To populate the MANAS document library (RAG), set `INGEST_CORPUS_ON_START=1` before `up`:
  ```bash
  INGEST_CORPUS_ON_START=1 docker compose up atal -d --build
  ```

## Reset / clean reinstall

Use the doctor: **9) Reset stack** (runs `down -v --remove-orphans`), then **4** (or **5**) to start fresh.
Host BGE models + corpus survive a reset (they live on disk, not in Docker volumes), so only the
LLM weights re-pull. Raw equivalent:

```bash
docker compose down -v --remove-orphans
docker compose up atal -d --build
```

## Troubleshooting
- `bash scripts/doctor.sh` — the menu also covers **8) GPU triage** and **9) Reset** when something's wrong
- `TROUBLESHOOTING.md` — full guide (GPU/CDI error, low-VRAM tier, missing assets, resets)

## Documentation
- `README.md` — project overview, architecture summary, tech stack
- `docs/` — full documentation: architecture, API, user/backend/frontend guides, methodology,
  and `docs/deliverables/` (data flow, model design, alerting & prediction, equipment physics,
  assumptions & limitations, sample I/O)
- `snapshots/` — product screenshots
