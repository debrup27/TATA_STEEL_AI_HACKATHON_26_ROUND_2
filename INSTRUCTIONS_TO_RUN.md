# ATAL — Instructions to Run

Full stack runs with **one asset-download script + one `docker compose` command**.

## Get the code (pick one)
```bash
# A · from GitHub
git clone https://github.com/debrup27/TATA_STEEL_AI_HACKATHON_26_ROUND_2.git

# B · from the submission package
unzip ATAL_Submission.zip
```
Both produce the same `TATA_STEEL_AI_HACKATHON_26_ROUND_2/` directory — run everything below from inside it.

## Prerequisites
- Docker + Docker Compose (with the Compose v2 plugin)
- NVIDIA GPU + nvidia-container-toolkit recommended (16 GB VRAM for both LLMs + BGE)
- ~32 GB RAM · ~30 GB free disk
- Internet access on first run (downloads model weights + corpus)

## Step 1 — Download host assets (run ONCE)
Downloads the Hugging Face BGE models (~6.5 GB) and the RAG corpus:

```bash
cd TATA_STEEL_AI_HACKATHON_26_ROUND_2
bash scripts/setup_assets.sh
```

The two Ollama LLMs (`qwen3.5:9b` + `qwen3.5:0.8b`, ~7.6 GB) are **not** downloaded here — they
are pulled automatically by the `ollama-warmup` service on the first `docker compose up`.

## Step 2 — Start the stack

```bash
docker compose up atal -d --build
```

On the first boot the backend automatically runs the full pipeline: migrations, TimescaleDB
hypertables, demo users, ChromaDB, asset/spares/telemetry seeding, sensor calibration, ML
training + inference, and intelligence-report generation. No manual steps. Allow 15–25 minutes
the first time (Ollama is pulling ~7.6 GB of weights and the backend is seeding).

## Step 3 — Verify

```bash
curl http://localhost/health/ready/        # -> ok
docker compose ps                          # all services healthy
```

## Access

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | UI (SANSAD dashboard + MANAS chat) |
| http://localhost/ | Same, via nginx proxy |
| http://localhost:8000/health/ready/ | Backend readiness |

**Login:** `tech_demo` / `TechDemo@123`

## Optional
- To populate the MANAS document library (RAG), set `INGEST_CORPUS_ON_START=1` before `up`:
  ```bash
  INGEST_CORPUS_ON_START=1 docker compose up atal -d --build
  ```

## Reset / clean reinstall

```bash
docker compose down -v --remove-orphans     # removes containers + all volumes (keeps images)
docker compose up atal -d --build           # fresh install (re-pulls LLM weights)
```

Host BGE models + corpus (downloaded in Step 1) are not in Docker volumes, so they survive a reset.

## Documentation
- `README.md` — project overview, architecture summary, tech stack
- `CLAUDE.md` — repo-root engineering reference (services, env vars, test gates)
