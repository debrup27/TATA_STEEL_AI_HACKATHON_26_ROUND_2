#!/usr/bin/env bash
# One-command dev startup from project root.
# Usage: bash ATAL_Project/backend/scripts/dev-start.sh
set -e

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

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

echo "[dev-start] Starting full stack..."
docker compose up --build "$@"
