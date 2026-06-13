#!/usr/bin/env bash
# One-command dev startup. Runs on host (not inside container).
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${REPO_ROOT}"

# Check .env.dev exists
if [ ! -f ".env" ] && [ ! -f ".env.dev" ]; then
    echo "[dev-start] No .env file found. Copying from .env.example..."
    cp ATAL_Project/backend/.env.example .env
    echo "[dev-start] Edit .env and set required values (DB_PASSWORD, SECRET_KEY, etc.) then re-run."
    exit 1
fi

[ -f ".env.dev" ] && cp .env.dev .env

# Check models downloaded (warn but don't block)
if [ ! -d "models/bge-m3" ]; then
    echo "[dev-start] WARNING: models/bge-m3 not found. Run scripts/download_models.sh first."
    echo "[dev-start]          Set SKIP_VLLM_WAIT=1 in .env to start without vLLM."
fi

echo "[dev-start] Starting all services (dev mode)..."
docker compose up --build "$@"
