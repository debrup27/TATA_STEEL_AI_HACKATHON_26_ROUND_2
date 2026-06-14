#!/usr/bin/env bash
# One-command dev startup from project root.
# Usage:
#   bash ATAL_Project/backend/scripts/dev-start.sh          # fast ML boot (default)
#   bash ATAL_Project/backend/scripts/dev-start.sh --train # full ML training (1000 scenarios, rich)
set -e

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

ARGS=()
for arg in "$@"; do
    case "$arg" in
        --train)
            export ATAL_TRAIN_MODE=full
            echo "[dev-start] Full ML training enabled (ATAL_TRAIN_MODE=full)"
            ;;
        *)
            ARGS+=("$arg")
            ;;
    esac
done

# Check .env exists
if [ ! -f ".env" ]; then
    echo "[dev-start] No .env file found."
    echo "[dev-start]   GPU mode:  cp ATAL_Project/backend/env/.env.gpu .env"
    echo "[dev-start]   Dev mode:  cp ATAL_Project/backend/.env.example .env"
    echo "[dev-start] Edit .env and set required values then re-run."
    exit 1
fi

# Warn if BGE models not downloaded
if [ ! -d "ATAL_Project/backend/models/bge-m3" ]; then
    echo "[dev-start] WARNING: BGE models not found."
    echo "[dev-start]          Run: bash ATAL_Project/backend/scripts/download_models.sh"
fi

# Warn if corpus not populated
if [ -z "$(ls -A ATAL_Project/backend/data/corpus/ 2>/dev/null)" ]; then
    echo "[dev-start] WARNING: corpus empty."
    echo "[dev-start]          Run: bash ATAL_Project/backend/scripts/download_corpus.sh"
fi

if [ "${SKIP_OLLAMA_PULL:-0}" != "1" ]; then
    echo "[dev-start] Ensuring Ollama models (9b + 0.8b) are in the compose volume..."
    bash ATAL_Project/backend/scripts/pull_ollama_models.sh
fi

echo "[dev-start] Starting full stack..."
docker compose up --build "${ARGS[@]}"
