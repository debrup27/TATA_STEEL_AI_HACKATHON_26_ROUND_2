#!/usr/bin/env bash
# Run once on host before `docker compose up`.
# Downloads BGE embedding + reranker models into ATAL_Project/backend/models/
# The LLM (qwen3.5:9b) is pulled automatically by Ollama — run: python ollama_qwen.py serve --wait
set -e

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MODELS_DIR="${BACKEND_DIR}/models"

echo "[download_models] Installing huggingface_hub..."
uv pip install -q huggingface_hub 2>/dev/null || python3 -m pip install -q huggingface_hub

PYTHON="python3"
command -v uv >/dev/null && PYTHON="uv run python"

$PYTHON - <<EOF
from huggingface_hub import snapshot_download
import os

models_dir = "${MODELS_DIR}"
os.makedirs(models_dir, exist_ok=True)

print("\n[1/2] Downloading BAAI/bge-m3 (dense embeddings, 1024-dim)...")
snapshot_download("BAAI/bge-m3", local_dir=f"{models_dir}/bge-m3")
print(f"      -> {models_dir}/bge-m3")

print("\n[2/2] Downloading BAAI/bge-reranker-v2-m3 (cross-encoder reranker)...")
snapshot_download("BAAI/bge-reranker-v2-m3", local_dir=f"{models_dir}/bge-reranker-v2-m3")
print(f"      -> {models_dir}/bge-reranker-v2-m3")

print("\n[download_models] BGE models downloaded successfully.")
print("NOTE: LLM (qwen3.5:9b) is pulled automatically by Ollama:")
print("      python ATAL_Project/backend/ollama_qwen.py serve --wait")
EOF

du -sh "${MODELS_DIR}"/bge-*/
