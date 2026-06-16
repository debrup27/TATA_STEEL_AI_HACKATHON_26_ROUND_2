# ATAL — Troubleshooting

First step for any problem: run the doctor.

```bash
bash scripts/doctor.sh          # diagnose only
bash scripts/doctor.sh -i         # diagnose + prompt to download missing BGE models / corpus
bash scripts/doctor.sh --download-all   # diagnose, then download models + corpus on the host
```

It checks Docker, the GPU/NVIDIA stack (4-step: driver → runtime → passthrough), models,
corpus, disk, RAM, ports and Ollama, and prints the exact fix command for each issue.

---

## 1. GPU: `failed to discover GPU vendor from CDI: no known GPU vendor found`

Seen on newer Docker (Fedora, Arch, etc.). Docker tried to resolve the GPU through
**CDI** but no CDI spec exists. This repo's `docker-compose.yml` already uses the
`deploy.resources.reservations.devices` form (legacy nvidia runtime) instead of
`gpus: all` to sidestep CDI — but the daemon still needs the nvidia runtime configured.

```bash
# 1. Install nvidia-container-toolkit (distro package), then:
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# 2. If it still fails, generate a CDI spec:
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
sudo systemctl restart docker

# 3. Verify:
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
```

Works the same on Arch (`paru -S nvidia-container-toolkit`) and Fedora
(`sudo dnf install nvidia-container-toolkit`).

### 1a. GPU: `could not select device driver "nvidia" with capabilities: [[gpu]]`

Same root cause, different message: the **nvidia container runtime is not registered with
Docker** (nvidia-container-toolkit missing, or installed but not wired in). The compose GPU
request can't be satisfied. Fix:

```bash
# 1. Install the toolkit
#    Arch:    sudo pacman -S nvidia-container-toolkit
#    Ubuntu:  sudo apt install -y nvidia-container-toolkit
#    Fedora:  sudo dnf install -y nvidia-container-toolkit

# 2. Register the nvidia runtime with Docker (this is the missing step)
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# 3. Verify, then start
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
docker compose up atal -d --build
```

A CUDA driver (`nvidia-smi` on the host) must already be installed. Run
`bash scripts/doctor.sh` first — it tests GPU passthrough and prints this exact fix.

## 2. GPU too small (low VRAM) — use the low tier

The default (full) tier loads the 9b supervisor + 0.8b worker + BGE (~12–14 GB VRAM).
On smaller cards (~6–8 GB) run the **low-VRAM tier**: the 0.8b model serves *every*
role (supervisor, orchestration, SANSAD mode, chat). The 9b is never pulled or loaded.

```bash
docker compose -f docker-compose.yml -f docker-compose.low.yml up -d --build
```

Quality is lower than the 9b, but the deterministic engine remains the source of truth
for health / RUL / anomaly, so SANSAD dashboards are unaffected. There is **no CPU
mode** — a CUDA GPU is required either way.

## 3. Models or corpus missing

BGE models (~6.5 GB) and the RAG corpus download **automatically** on the first
`docker compose up` (entrypoint, idempotent). To force or do it on the host:

```bash
bash ATAL_Project/backend/scripts/download_models.sh   # BGE embedder + reranker
bash ATAL_Project/backend/scripts/download_corpus.sh   # OEM manuals, SOPs, ISO
# or both at once:
bash scripts/setup_assets.sh
```

Disable auto-download (e.g. air-gapped, pre-seeded): set `ATAL_DOWNLOAD_ASSETS=0`.

### 3a. `Permission denied (os error 13)` during model download
The host model dir didn't exist, so Docker created it root-owned. The entrypoint now
chowns it to `appuser` before downloading; if you still hit this on a host bind mount:

```bash
sudo chown -R 1000:999 ATAL_Project/backend/models ATAL_Project/backend/data/corpus
```

### 3b. Hugging Face `xet` / I/O errors
The downloader pins `HF_HOME` and sets `HF_HUB_DISABLE_XET=1`. If you run it by hand
in a restricted shell, export the same first:
```bash
export HF_HUB_DISABLE_XET=1 HF_HOME="$PWD/ATAL_Project/backend/models/.hf_cache"
```

## 4. Ollama models won't pull / pull times out

The `ollama-warmup` sidecar pulls `qwen3.5:0.8b` (+ `qwen3.5:9b` in full tier) on first
boot. On a slow link the first pull can take 10–20 min.

```bash
docker compose logs -f ollama-warmup            # watch progress
docker compose exec ollama ollama pull qwen3.5:0.8b   # pull manually
docker compose exec ollama ollama list          # what's present
```

Ollama needs outbound network — the compose sets DNS 8.8.8.8/1.1.1.1 on the ollama
service to survive broken host DNS.

## 5. Backend stays "health: starting" for a long time

First boot blocks on the BGE download (~6.5 GB) + Ollama pulls before `uvicorn` serves,
so the healthcheck `start_period` is generous. Watch it:

```bash
docker compose logs -f django-backend
```

If it never goes healthy, look for a FAIL in the logs and run `bash scripts/doctor.sh`.

## 6. `nginx` returns 502

nginx proxies the backend; a 502 means the backend isn't ready yet (still downloading
or migrating). Wait for `django-backend` to report healthy, then retry. The UI is also
reachable directly on `http://localhost:3000`.

## 7. Port already in use

Something else holds 3000 / 8000 / 80 / 5432 / 6379 / 11434. Stop it, or remap the host
side of the port in `docker-compose.yml` (e.g. `"3001:3000"`).

## 8. Reset to a clean state

```bash
docker compose down -v --remove-orphans     # containers + volumes (keeps images)
docker compose up -d --build                # fresh boot (re-pulls weights)
```

Host BGE models + corpus live under `ATAL_Project/backend/` (not in Docker volumes),
so they survive a reset and are reused.

## 9. Chat / report rendering looks wrong

Subscripts (H₂O, F₁–F₇), superscripts (m/s², 10⁶) and code values render via KaTeX +
a markdown normalizer. If a *previously generated* message looks off after an update,
refresh the page — already-rendered messages aren't re-normalized live. New messages
use the latest renderer.

---

Login: `tech_demo` / `TechDemo@123` · UI: http://localhost:3000 · backend health:
http://localhost:8000/health/ready/
