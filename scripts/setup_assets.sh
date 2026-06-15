#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ATAL — one-command asset setup (run ONCE on the host before `docker compose up`)
#
# Downloads everything the stack needs that is NOT baked into the images and NOT
# auto-pulled by a container:
#   1. Hugging Face BGE models   → ATAL_Project/backend/models/{bge-m3,bge-reranker-v2-m3}
#   2. RAG corpus (manuals/SOPs) → ATAL_Project/backend/data/corpus/**
#
# The two Ollama LLMs (qwen3.5:9b + qwen3.5:0.8b) are NOT downloaded here — the
# `ollama-warmup` service pulls them automatically on the first `docker compose up`.
#
# Total download on a clean machine: ~6.5 GB BGE + ~95 MB corpus (plus ~7 GB of
# Ollama weights pulled later by compose). Re-running is safe — existing files skip.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_SCRIPTS="${ROOT}/ATAL_Project/backend/scripts"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ATAL asset setup — Hugging Face models + RAG corpus           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "[1/2] Hugging Face BGE models (bge-m3 + bge-reranker-v2-m3, ~6.5 GB)…"
bash "${BACKEND_SCRIPTS}/download_models.sh"
echo ""

echo "[2/2] RAG corpus (OEM manuals, SOPs, ISO standards, safety codes)…"
bash "${BACKEND_SCRIPTS}/download_corpus.sh"
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Host assets ready.                                            ║"
echo "║  Next:  docker compose up atal -d --build                      ║"
echo "║  (Ollama LLMs are pulled automatically on first boot.)         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
