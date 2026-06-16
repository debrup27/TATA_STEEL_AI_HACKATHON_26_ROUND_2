#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ATAL doctor — diagnose setup problems and optionally download host assets.
#
#   bash scripts/doctor.sh                  # diagnose only (default)
#   bash scripts/doctor.sh -i               # diagnose + prompt to download assets
#   bash scripts/doctor.sh --download-all   # diagnose, then download models + corpus
#   bash scripts/doctor.sh --download-models
#   bash scripts/doctor.sh --download-corpus
#
# WHEN TO RUN: before `docker compose up` as a pre-flight (Docker, GPU/CDI, ports,
# disk, RAM). After the stack is up, Ollama checks report live state.
# ─────────────────────────────────────────────────────────────────────────────
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BK="${ROOT}/ATAL_Project/backend"
BACKEND_SCRIPTS="${BK}/scripts"

green=$'\033[0;32m'; yellow=$'\033[0;33m'; red=$'\033[0;31m'; bold=$'\033[1m'; dim=$'\033[2m'; rst=$'\033[0m'
pass=0; warn=0; fail=0

INTERACTIVE=0
DOWNLOAD_MODELS=0
DOWNLOAD_CORPUS=0
FLAG_MISSING_MODELS=0
FLAG_MISSING_CORPUS=0

usage() {
  cat <<EOF
ATAL doctor — environment diagnostics (+ optional asset download)

Usage:
  bash scripts/doctor.sh                     Diagnose only
  bash scripts/doctor.sh -i                  Diagnose, then ask to download missing assets
  bash scripts/doctor.sh --download-models   Diagnose, then download BGE models (~6.5 GB)
  bash scripts/doctor.sh --download-corpus   Diagnose, then download RAG corpus
  bash scripts/doctor.sh --download-all      Diagnose, then download models + corpus
  bash scripts/doctor.sh -h                  This help

Downloads write to:
  ATAL_Project/backend/models/       (Hugging Face BGE-M3 + reranker)
  ATAL_Project/backend/data/corpus/  (manuals, SOPs, ISO, safety codes)

Ollama LLMs (qwen3.5:9b + 0.8b) are NOT downloaded here — pulled on first compose up.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    -i|--interactive) INTERACTIVE=1; shift ;;
    --download-models) DOWNLOAD_MODELS=1; shift ;;
    --download-corpus) DOWNLOAD_CORPUS=1; shift ;;
    --download-all|-a) DOWNLOAD_MODELS=1; DOWNLOAD_CORPUS=1; shift ;;
    *) echo "Unknown option: $1 (try -h)" >&2; exit 2 ;;
  esac
done

ok()   { echo "  ${green}✔ PASS${rst}  $1"; pass=$((pass+1)); }
wn()   { echo "  ${yellow}▲ WARN${rst}  $1"; [ -n "${2:-}" ] && echo "          ↳ fix: $2"; warn=$((warn+1)); }
bad()  { echo "  ${red}✘ FAIL${rst}  $1"; [ -n "${2:-}" ] && echo "          ↳ fix: $2"; fail=$((fail+1)); }
head() { echo ""; echo "${bold}$1${rst}"; }
hint() { echo "          ${dim}$1${rst}"; }

gpu_toolkit_install_hint() {
  if [ -f /etc/fedora-release ] || [ -f /etc/redhat-release ]; then
    echo "sudo dnf install -y nvidia-container-toolkit && sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker"
  elif [ -f /etc/arch-release ]; then
    echo "sudo pacman -S nvidia-container-toolkit && sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker"
  elif [ -f /etc/debian_version ]; then
    echo "sudo apt install -y nvidia-container-toolkit && sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker"
  else
    echo "install nvidia-container-toolkit, then: sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker"
  fi
}

gpu_verify_hint() {
  echo "docker run --rm --gpus all nvidia/cuda:12.8.1-base-ubuntu24.04 nvidia-smi"
}

run_download_models() {
  head "Downloading Hugging Face models"
  if [ ! -x "${BACKEND_SCRIPTS}/download_models.sh" ]; then
    bad "download_models.sh not found at ${BACKEND_SCRIPTS}/download_models.sh"
    return 1
  fi
  echo "  (~6.5 GB — BGE-M3 + bge-reranker-v2-m3)"
  if bash "${BACKEND_SCRIPTS}/download_models.sh"; then
    ok "BGE models downloaded"
    FLAG_MISSING_MODELS=0
    return 0
  fi
  bad "BGE model download failed" "check network/disk; retry: bash ${BACKEND_SCRIPTS}/download_models.sh"
  return 1
}

run_download_corpus() {
  head "Downloading RAG corpus"
  if [ ! -x "${BACKEND_SCRIPTS}/download_corpus.sh" ]; then
    bad "download_corpus.sh not found at ${BACKEND_SCRIPTS}/download_corpus.sh"
    return 1
  fi
  echo "  (~95 MB — manuals, SOPs, ISO, safety codes)"
  if bash "${BACKEND_SCRIPTS}/download_corpus.sh"; then
    ok "RAG corpus downloaded"
    FLAG_MISSING_CORPUS=0
    return 0
  fi
  bad "Corpus download failed" "check network; retry: bash ${BACKEND_SCRIPTS}/download_corpus.sh"
  return 1
}

offer_asset_downloads() {
  local need_prompt=0
  if [ "$DOWNLOAD_MODELS" -eq 1 ] || [ "$DOWNLOAD_CORPUS" -eq 1 ]; then
    need_prompt=0
  elif [ "$INTERACTIVE" -eq 1 ] || { [ -t 0 ] && { [ "$FLAG_MISSING_MODELS" -eq 1 ] || [ "$FLAG_MISSING_CORPUS" -eq 1 ]; }; }; then
    need_prompt=1
  fi

  if [ "$DOWNLOAD_MODELS" -eq 1 ]; then run_download_models || true; fi
  if [ "$DOWNLOAD_CORPUS" -eq 1 ]; then run_download_corpus || true; fi

  if [ "$need_prompt" -eq 0 ]; then return 0; fi

  head "Host asset download (optional)"
  echo "  Missing or incomplete host assets were detected."
  [ "$FLAG_MISSING_MODELS" -eq 1 ] && echo "    • Hugging Face BGE models (~6.5 GB)"
  [ "$FLAG_MISSING_CORPUS" -eq 1 ] && echo "    • RAG corpus (~95 MB)"
  echo ""
  echo "  Download now?"
  echo "    [m] Models only   [c] Corpus only   [b] Both   [n] Skip"
  printf "  Choice [m/c/b/n]: "
  read -r choice </dev/tty 2>/dev/null || choice="n"
  case "$(echo "$choice" | tr '[:upper:]' '[:lower:]')" in
    m|models)  run_download_models || true ;;
    c|corpus)  run_download_corpus || true ;;
    b|both|a|all) run_download_models || true; run_download_corpus || true ;;
    *) echo "  Skipped." ;;
  esac
}

echo "${bold}ATAL doctor — environment diagnostics${rst}"
echo "repo: ${ROOT}"

# ── Core tooling ──────────────────────────────────────────────────────────────
head "Core tooling"
if command -v docker >/dev/null 2>&1; then
  docker_ver=$(docker --version 2>&1 || true)
  ok "docker installed ($(echo "$docker_ver" | awk '{print $3}' | tr -d ,))"
  if docker info >/dev/null 2>&1; then ok "docker daemon reachable"
  else bad "docker daemon not reachable" "start Docker (sudo systemctl start docker) and ensure your user is in the 'docker' group"; fi
else
  bad "docker not found" "install Docker Engine + the Compose v2 plugin"
fi

if docker compose version >/dev/null 2>&1; then
  ok "docker compose v2 ($(docker compose version --short 2>/dev/null))"
else
  bad "docker compose v2 plugin missing" "install the 'docker-compose-plugin' package (NOT the old docker-compose binary)"
fi

# ── GPU / NVIDIA container stack (step-by-step) ───────────────────────────────
head "GPU (required — LLM + BGE run on CUDA)"

head "  Step 1 — NVIDIA driver (nvidia-smi)"
if command -v nvidia-smi >/dev/null 2>&1; then
  if nvidia-smi >/dev/null 2>&1; then
    gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 | tr -d '\r' | sed 's/^ *//;s/ *$//')
    vram=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null | head -1 | tr -d '\r' | sed 's/^ *//;s/ *$//')
    driver=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1 | tr -d '\r' | sed 's/^ *//;s/ *$//')
    case "$gpu_name" in ""|-1|*N/A*) gpu_name="detected (name unavailable)";; esac
    case "$vram" in ""|-1|*N/A*) vram="VRAM unknown";; esac
    ok "NVIDIA driver OK — ${gpu_name} (${vram}, driver ${driver:-unknown})"
    case "$vram" in
      *MiB)
        mib=$(echo "$vram" | tr -dc '0-9')
        if [ -n "$mib" ] && [ "$mib" -lt 10000 ]; then
          wn "GPU has <10 GB VRAM — the 9b supervisor may not fit" \
             "low-VRAM tier: docker compose -f docker-compose.yml -f docker-compose.low.yml up -d --build"
        fi ;;
    esac
  else
    bad "nvidia-smi failed (driver installed but not working)" \
        "reinstall or reboot after installing the proprietary NVIDIA driver"
    hint "Expected: nvidia-smi prints a table with NVIDIA-SMI 5xx.xx"
  fi
else
  bad "nvidia-smi not found" "install the NVIDIA proprietary driver first — this stack is GPU-only"
  hint "If you see 'command not found' or 'NVIDIA-SMI has failed', fix the host driver before container toolkit"
fi

head "  Step 2 — Container engine (Docker vs Podman)"
docker_bin=$(command -v docker 2>/dev/null || true)
if [ -n "$docker_bin" ]; then
  if docker --version 2>&1 | grep -qi podman || echo "$docker_bin" | grep -qi podman; then
    wn "The 'docker' command is Podman, not Docker Engine" \
       "ATAL expects Docker Engine + Compose v2; install docker-ce or use podman-docker only if GPU runtime is configured for Podman"
    hint "Check: docker --version && which docker"
  else
    ok "docker command is Docker Engine (not Podman)"
    hint "$(which docker 2>/dev/null || echo 'docker path unknown')"
  fi
fi

head "  Step 3 — NVIDIA runtime registered with Docker"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  runtime_line=$(docker info 2>/dev/null | grep -i '^ Runtimes:' || docker info 2>/dev/null | grep -i runtime | head -3)
  if echo "$runtime_line" | grep -qi nvidia; then
    ok "nvidia runtime listed in docker info"
  else
    wn "nvidia runtime NOT listed in docker info" "$(gpu_toolkit_install_hint)"
    hint "Expected something like: Runtimes: ... nvidia ... runc"
    [ -n "$runtime_line" ] && hint "Got: $runtime_line"
  fi
  if docker info 2>/dev/null | grep -qi 'nvidia'; then
    : # covered above
  fi
else
  wn "skipped — docker daemon not reachable"
fi

head "  Step 4 — GPU passthrough (docker run --gpus all)"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  gpu_test_rc=0
  gpu_test_out=$(docker run --rm --gpus all nvidia/cuda:12.8.1-base-ubuntu24.04 nvidia-smi 2>&1) || gpu_test_rc=$?
  if [ "$gpu_test_rc" -eq 0 ] && echo "$gpu_test_out" | grep -qi 'NVIDIA-SMI'; then
    ok "GPU passthrough works (nvidia/cuda container nvidia-smi succeeded)"
  elif echo "$gpu_test_out" | grep -qi 'could not select device driver'; then
    bad "could not select device driver \"nvidia\" with capabilities: [[gpu]]" \
        "$(gpu_toolkit_install_hint)"
    hint "Meaning: Docker is requesting GPU access but the NVIDIA Container Runtime is not installed/configured."
    hint "Fedora: sudo dnf install -y nvidia-container-toolkit"
    hint "Then:  sudo nvidia-ctk runtime configure --runtime=docker"
    hint "        sudo systemctl restart docker"
    hint "Verify: $(gpu_verify_hint)"
    hint "Quick triage — run and paste output: nvidia-smi; docker info | grep -i runtime; $(gpu_verify_hint)"
  elif echo "$gpu_test_out" | grep -qi 'CDI\|no known GPU vendor'; then
    bad "GPU passthrough fails via CDI (no known GPU vendor / CDI spec missing)" \
        "sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml && sudo systemctl restart docker"
    hint "Also run: sudo nvidia-ctk runtime configure --runtime=docker"
    hint "This compose file uses deploy.resources.devices (not gpus: all) — CDI must still be generated on Docker 29+"
  elif echo "$gpu_test_out" | grep -qi 'permission denied\|connect: permission'; then
    bad "docker permission denied during GPU test" "add your user to the docker group and re-login"
  else
    alpine_rc=0
    docker run --rm --gpus all alpine:latest true >/dev/null 2>&1 || alpine_rc=$?
    if [ "$alpine_rc" -eq 0 ]; then
      ok "GPU passthrough works (--gpus all alpine test)"
    else
      wn "GPU passthrough test failed" "$(gpu_toolkit_install_hint)"
      hint "Verify: $(gpu_verify_hint)"
      [ -n "$gpu_test_out" ] && hint "Last error: $(echo "$gpu_test_out" | tail -1)"
    fi
  fi
else
  wn "skipped — docker daemon not reachable"
fi

# ── Host assets ───────────────────────────────────────────────────────────────
head "RAG assets (host — optional before compose; also auto-download on first boot)"
if [ -s "${BK}/models/bge-m3/config.json" ]; then ok "BGE-M3 embedder present"
else FLAG_MISSING_MODELS=1; wn "BGE-M3 embedder missing" "bash scripts/doctor.sh --download-models  OR  bash scripts/setup_assets.sh"; fi
if [ -s "${BK}/models/bge-reranker-v2-m3/config.json" ]; then ok "BGE reranker present"
else FLAG_MISSING_MODELS=1; wn "BGE reranker missing (optional — RAG_USE_RERANKER=0 by default)" "bash scripts/doctor.sh --download-models"; fi
if [ -n "$(find "${BK}/data/corpus" -type f 2>/dev/null | head -1)" ]; then ok "RAG corpus present"
else FLAG_MISSING_CORPUS=1; wn "RAG corpus missing" "bash scripts/doctor.sh --download-corpus  OR  bash scripts/setup_assets.sh"; fi

# ── Disk + memory ─────────────────────────────────────────────────────────────
head "Resources"
free_gb=$(df -PBG "${ROOT}" 2>/dev/null | awk 'NR==2{gsub(/G/,"",$4); print $4}')
if [ -n "${free_gb:-}" ]; then
  if [ "$free_gb" -ge 30 ]; then ok "disk free: ${free_gb} GB"
  else wn "low disk: ${free_gb} GB free (need ~30 GB for weights)" "free space or move Docker's data-root to a larger disk"; fi
fi
ram_gb=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}')
if [ -n "${ram_gb:-}" ]; then
  if [ "$ram_gb" -ge 24 ]; then ok "RAM: ${ram_gb} GB"
  else wn "RAM ${ram_gb} GB (recommended ~32 GB)" "close other apps; consider the low-VRAM tier"; fi
fi

# ── Port conflicts ────────────────────────────────────────────────────────────
head "Ports"
for pair in "3000:UI" "8000:backend" "80:nginx" "5432:postgres" "6379:redis" "11434:ollama"; do
  p="${pair%%:*}"; svc="${pair##*:}"
  if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ":${p} "; then
    wn "port ${p} (${svc}) already in use" "stop the conflicting process, or remap the port in docker-compose.yml"
  else
    ok "port ${p} (${svc}) free"
  fi
done

# ── Ollama models (only meaningful when the stack is up) ──────────────────────
head "Ollama models (if stack running)"
if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
  tags=$(curl -s http://localhost:11434/api/tags 2>/dev/null)
  echo "$tags" | grep -q "qwen3.5:0.8b" && ok "qwen3.5:0.8b loaded" || wn "qwen3.5:0.8b not pulled yet" "wait for ollama-warmup, or: docker compose exec ollama ollama pull qwen3.5:0.8b"
  echo "$tags" | grep -q "qwen3.5:9b" && ok "qwen3.5:9b loaded" || wn "qwen3.5:9b not pulled (normal in low-VRAM tier)" "full tier pulls it on first boot"
else
  wn "Ollama API not reachable on :11434 (stack may be down)" "start the stack: docker compose up atal -d --build"
fi

# ── Optional downloads ────────────────────────────────────────────────────────
offer_asset_downloads

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "${bold}Summary:${rst} ${green}${pass} pass${rst}  ${yellow}${warn} warn${rst}  ${red}${fail} fail${rst}"
if [ "$fail" -gt 0 ]; then
  echo ""
  echo "Fix the FAIL items above, then re-run: bash scripts/doctor.sh"
  echo "GPU quick triage (paste all three outputs if still stuck):"
  echo "  nvidia-smi"
  echo "  docker info | grep -i runtime"
  echo "  docker run --rm --gpus all nvidia/cuda:12.8.1-base-ubuntu24.04 nvidia-smi"
  echo "Full guide: TROUBLESHOOTING.md"
  exit 1
fi
echo "No blocking issues. Next: docker compose up atal -d --build"
echo "Assets: bash scripts/doctor.sh -i  or  bash scripts/setup_assets.sh"
echo "Full guide: TROUBLESHOOTING.md"
exit 0
