#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ATAL doctor — interactive, menu-driven setup & diagnostics.
#
#   bash scripts/doctor.sh
#
# No flags, no options. Run it and pick actions from the menu:
#   diagnose the environment, download BGE models / RAG corpus, start the stack
#   (full or low-VRAM tier), watch logs, run GPU triage, or reset to a clean state.
#
# WHEN TO RUN: before `docker compose up` (Docker, GPU/CDI, ports, disk, RAM, assets)
# and after the stack is up (Ollama / live-state checks report real status).
# ─────────────────────────────────────────────────────────────────────────────
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BK="${ROOT}/ATAL_Project/backend"
BACKEND_SCRIPTS="${BK}/scripts"

green=$'\033[0;32m'; yellow=$'\033[0;33m'; red=$'\033[0;31m'; cyan=$'\033[0;36m'
bold=$'\033[1m'; dim=$'\033[2m'; rst=$'\033[0m'

pass=0; warn=0; fail=0
FLAG_MISSING_MODELS=0
FLAG_MISSING_CORPUS=0

ok()   { echo "  ${green}✔ PASS${rst}  $1"; pass=$((pass+1)); }
wn()   { echo "  ${yellow}▲ WARN${rst}  $1"; [ -n "${2:-}" ] && echo "          ${dim}↳ fix:${rst} $2"; warn=$((warn+1)); }
bad()  { echo "  ${red}✘ FAIL${rst}  $1"; [ -n "${2:-}" ] && echo "          ${dim}↳ fix:${rst} $2"; fail=$((fail+1)); }
sec()  { echo ""; echo "${bold}$1${rst}"; }
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
gpu_verify_hint() { echo "docker run --rm --gpus all nvidia/cuda:12.8.1-base-ubuntu24.04 nvidia-smi"; }

# ═════════════════════════════════════════════════════════════════════════════
#  DIAGNOSTICS
# ═════════════════════════════════════════════════════════════════════════════
run_diagnostics() {
  pass=0; warn=0; fail=0
  FLAG_MISSING_MODELS=0; FLAG_MISSING_CORPUS=0

  echo "${bold}ATAL doctor — environment diagnostics${rst}"
  echo "repo: ${ROOT}"

  # ── Core tooling ────────────────────────────────────────────────────────────
  sec "Core tooling"
  if command -v docker >/dev/null 2>&1; then
    docker_ver=$(docker --version 2>&1 || true)
    ok "docker installed ($(echo "$docker_ver" | awk '{print $3}' | tr -d ,))"
    if docker info >/dev/null 2>&1; then ok "docker daemon reachable"
    else bad "docker daemon not reachable" "start Docker (sudo systemctl start docker) and add your user to the 'docker' group"; fi
  else
    bad "docker not found" "install Docker Engine + the Compose v2 plugin"
  fi
  if docker compose version >/dev/null 2>&1; then
    ok "docker compose v2 ($(docker compose version --short 2>/dev/null))"
  else
    bad "docker compose v2 plugin missing" "install the 'docker-compose-plugin' package (NOT the old docker-compose binary)"
  fi

  # ── GPU / NVIDIA stack ──────────────────────────────────────────────────────
  sec "GPU (required — LLM + BGE run on CUDA)"

  echo "  ${cyan}Step 1 — NVIDIA driver (nvidia-smi)${rst}"
  if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi >/dev/null 2>&1; then
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
          wn "GPU has <10 GB VRAM — the 9b supervisor may not fit; use the low-VRAM tier (menu option 5)" \
             "docker compose -f docker-compose.yml -f docker-compose.low.yml up atal -d --build"
        fi ;;
    esac
  else
    bad "nvidia-smi not found / failed" "install the NVIDIA proprietary driver first — this stack is GPU-only"
    hint "Expected: nvidia-smi prints a table with NVIDIA-SMI 5xx.xx"
  fi

  echo "  ${cyan}Step 2 — NVIDIA runtime registered with Docker${rst}"
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    if docker info 2>/dev/null | grep -qi 'nvidia'; then
      ok "nvidia runtime listed in docker info"
    else
      wn "nvidia runtime NOT listed in docker info"
      hint "This may be fine — try starting the stack (menu 4/5). If you hit a GPU error,"
      hint "configure the nvidia container runtime for YOUR distro, then retry. See TROUBLESHOOTING.md."
    fi
  else
    wn "skipped — docker daemon not reachable"
  fi

  echo "  ${cyan}Step 3 — GPU passthrough (docker run --gpus all)${rst}"
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    gpu_test_rc=0
    gpu_test_out=$(docker run --rm --gpus all nvidia/cuda:12.8.1-base-ubuntu24.04 nvidia-smi 2>&1) || gpu_test_rc=$?
    if [ "$gpu_test_rc" -eq 0 ] && echo "$gpu_test_out" | grep -qi 'NVIDIA-SMI'; then
      ok "GPU passthrough works (nvidia/cuda container nvidia-smi succeeded)"
    elif echo "$gpu_test_out" | grep -qi 'could not select device driver\|CDI\|no known GPU vendor'; then
      wn "GPU passthrough test failed (NVIDIA container runtime not wired into Docker)"
      hint "This is host/distro-specific — don't blind-run a fix. First just try starting the stack"
      hint "(menu 4/5). If it errors on GPU, configure the nvidia container runtime for YOUR distro"
      hint "and regenerate the CDI spec if needed, then retry. Full guide: TROUBLESHOOTING.md"
    elif echo "$gpu_test_out" | grep -qi 'permission denied'; then
      bad "docker permission denied during GPU test" "add your user to the docker group and re-login"
    else
      if docker run --rm --gpus all alpine:latest true >/dev/null 2>&1; then
        ok "GPU passthrough works (--gpus all alpine test)"
      else
        wn "GPU passthrough test failed" "$(gpu_toolkit_install_hint)"
        [ -n "$gpu_test_out" ] && hint "Last error: $(echo "$gpu_test_out" | tail -1)"
      fi
    fi
  else
    wn "skipped — docker daemon not reachable"
  fi

  # ── Host assets ─────────────────────────────────────────────────────────────
  sec "RAG assets (host — optional before compose; also auto-download on first boot)"
  if [ -s "${BK}/models/bge-m3/config.json" ]; then ok "BGE-M3 embedder present"
  else FLAG_MISSING_MODELS=1; wn "BGE-M3 embedder missing" "menu option 2 (download models)"; fi
  if [ -s "${BK}/models/bge-reranker-v2-m3/config.json" ]; then ok "BGE reranker present"
  else FLAG_MISSING_MODELS=1; wn "BGE reranker missing (optional — RAG_USE_RERANKER=0 by default)" "menu option 2"; fi
  if [ -n "$(find "${BK}/data/corpus" -type f 2>/dev/null | head -1)" ]; then ok "RAG corpus present"
  else FLAG_MISSING_CORPUS=1; wn "RAG corpus missing" "menu option 3 (download corpus)"; fi

  # ── Resources ───────────────────────────────────────────────────────────────
  sec "Resources"
  free_gb=$(df -PBG "${ROOT}" 2>/dev/null | awk 'NR==2{gsub(/G/,"",$4); print $4}')
  if [ -n "${free_gb:-}" ]; then
    if [ "$free_gb" -ge 30 ]; then ok "disk free: ${free_gb} GB"
    else wn "low disk: ${free_gb} GB free (need ~30 GB for weights)" "free space or move Docker data-root to a larger disk"; fi
  fi
  ram_gb=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}')
  if [ -n "${ram_gb:-}" ]; then
    if [ "$ram_gb" -ge 24 ]; then ok "RAM: ${ram_gb} GB"
    else wn "RAM ${ram_gb} GB (recommended ~32 GB)" "close other apps; consider the low-VRAM tier"; fi
  fi

  # ── Ports ───────────────────────────────────────────────────────────────────
  sec "Ports"
  for pair in "3000:UI" "8000:backend" "80:nginx" "5432:postgres" "6379:redis" "11434:ollama"; do
    p="${pair%%:*}"; svc="${pair##*:}"
    if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ":${p} "; then
      wn "port ${p} (${svc}) already in use" "stop the conflicting process, or remap the port in docker-compose.yml"
    else
      ok "port ${p} (${svc}) free"
    fi
  done

  # ── Ollama (live) ───────────────────────────────────────────────────────────
  sec "Ollama models (only meaningful when the stack is up)"
  if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
    tags=$(curl -s http://localhost:11434/api/tags 2>/dev/null)
    echo "$tags" | grep -q "qwen3.5:0.8b" && ok "qwen3.5:0.8b loaded" || wn "qwen3.5:0.8b not pulled yet" "wait for ollama-warmup"
    echo "$tags" | grep -q "qwen3.5:9b" && ok "qwen3.5:9b loaded" || wn "qwen3.5:9b not pulled (normal in low-VRAM tier)" "full tier pulls it on first boot"
  else
    wn "Ollama API not reachable on :11434 (stack may be down)" "start the stack: menu option 4"
  fi

  # ── Summary ─────────────────────────────────────────────────────────────────
  echo ""
  echo "${bold}Summary:${rst} ${green}${pass} pass${rst}  ${yellow}${warn} warn${rst}  ${red}${fail} fail${rst}"
  if [ "$fail" -gt 0 ]; then
    echo "${red}Fix the FAIL items above before starting the stack.${rst} See TROUBLESHOOTING.md"
  fi
}

# ═════════════════════════════════════════════════════════════════════════════
#  ACTIONS
# ═════════════════════════════════════════════════════════════════════════════
download_models() {
  sec "Downloading Hugging Face BGE models (~6.5 GB — bge-m3 + bge-reranker-v2-m3)"
  if [ ! -f "${BACKEND_SCRIPTS}/download_models.sh" ]; then
    bad "download_models.sh not found at ${BACKEND_SCRIPTS}"; return 1
  fi
  if bash "${BACKEND_SCRIPTS}/download_models.sh"; then ok "BGE models downloaded"; FLAG_MISSING_MODELS=0
  else bad "BGE model download failed" "check network/disk; retry from the menu"; fi
}

download_corpus() {
  sec "Downloading RAG corpus (~95 MB — manuals, SOPs, ISO, safety codes)"
  if [ ! -f "${BACKEND_SCRIPTS}/download_corpus.sh" ]; then
    bad "download_corpus.sh not found at ${BACKEND_SCRIPTS}"; return 1
  fi
  if bash "${BACKEND_SCRIPTS}/download_corpus.sh"; then ok "RAG corpus downloaded"; FLAG_MISSING_CORPUS=0
  else bad "Corpus download failed" "check network; retry from the menu"; fi
}

start_stack() {
  local tier="$1"  # full | low
  if [ "$tier" = "low" ]; then
    sec "Starting stack — low-VRAM tier (0.8b serves all roles)"
    ( cd "$ROOT" && docker compose -f docker-compose.yml -f docker-compose.low.yml up atal -d --build )
  else
    sec "Starting stack — full tier (9b supervisor + 0.8b worker)"
    ( cd "$ROOT" && docker compose up atal -d --build )
  fi
  echo ""
  echo "  ${dim}First boot runs the full pipeline (migrations, seed, ML train, reports)"
  echo "  before uvicorn serves — allow 20-30 min. Watch with menu option 6.${rst}"
}

watch_logs() {
  sec "Following django-backend logs (Ctrl-C to stop watching — stack keeps running)"
  ( cd "$ROOT" && docker compose logs -f django-backend ) || true
}

stack_status() {
  sec "Stack status"
  ( cd "$ROOT" && docker compose ps ) || true
  echo ""
  if curl -sf http://localhost:8000/health/ready/ >/dev/null 2>&1; then
    ok "backend readiness: http://localhost:8000/health/ready/ → ok"
    echo "  UI: http://localhost:3000   ·   login: tech_demo / TechDemo@123"
  else
    wn "backend not ready yet (still booting or down)" "watch logs: menu option 6"
  fi
}

gpu_triage() {
  sec "GPU triage — paste all three outputs if still stuck"
  echo "${dim}\$ nvidia-smi${rst}";                       nvidia-smi 2>&1 | head -15 || true
  echo ""
  echo "${dim}\$ docker info | grep -i runtime${rst}";    docker info 2>/dev/null | grep -i runtime || echo "  (none / docker unreachable)"
  echo ""
  echo "${dim}\$ $(gpu_verify_hint)${rst}";               docker run --rm --gpus all nvidia/cuda:12.8.1-base-ubuntu24.04 nvidia-smi 2>&1 | head -15 || true
  echo ""
  echo "Fix for 'could not select device driver' / CDI errors:"
  echo "  $(gpu_toolkit_install_hint)"
}

reset_stack() {
  sec "Reset to a clean state"
  echo "  This removes all containers + volumes (keeps images and host BGE/corpus)."
  printf "  Proceed? [y/N]: "
  read -r c </dev/tty 2>/dev/null || c="n"
  case "$(echo "$c" | tr '[:upper:]' '[:lower:]')" in
    y|yes) ( cd "$ROOT" && docker compose down -v --remove-orphans ) && ok "reset done" ;;
    *) echo "  Cancelled." ;;
  esac
}

# ═════════════════════════════════════════════════════════════════════════════
#  MENU LOOP
# ═════════════════════════════════════════════════════════════════════════════
print_menu() {
  echo ""
  echo "${bold}════════════════ ATAL doctor — menu ════════════════${rst}"
  echo "  ${bold}1${rst})  Run diagnostics            (Docker, GPU, assets, ports)"
  echo "  ${bold}2${rst})  Download BGE models        (~6.5 GB, host)"
  echo "  ${bold}3${rst})  Download RAG corpus        (~95 MB, host)"
  echo "  ${bold}4${rst})  Start stack — full tier    (9b + 0.8b, needs ~16 GB VRAM)"
  echo "  ${bold}5${rst})  Start stack — low-VRAM     (0.8b serves all roles)"
  echo "  ${bold}6${rst})  Watch backend logs"
  echo "  ${bold}7${rst})  Stack status / health"
  echo "  ${bold}8${rst})  GPU triage"
  echo "  ${bold}9${rst})  Reset stack (down -v)"
  echo "  ${bold}0${rst})  Quit"
  echo "${bold}════════════════════════════════════════════════════${rst}"
  printf "  Choice: "
}

# First pass: always diagnose so the user sees state before choosing.
run_diagnostics

while true; do
  print_menu
  read -r choice </dev/tty 2>/dev/null || choice="0"
  case "$choice" in
    1) run_diagnostics ;;
    2) download_models ;;
    3) download_corpus ;;
    4) start_stack full ;;
    5) start_stack low ;;
    6) watch_logs ;;
    7) stack_status ;;
    8) gpu_triage ;;
    9) reset_stack ;;
    0|q|quit|exit) echo "Bye."; exit 0 ;;
    *) echo "  Unknown choice: '$choice'" ;;
  esac
done
