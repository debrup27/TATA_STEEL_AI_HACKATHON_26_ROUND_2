#!/usr/bin/env bash
# Run once on host before `docker compose up`.
# Downloads BGE embedding + reranker models into ATAL_Project/backend/models/
# The LLM (qwen3.5:9b) is pulled automatically by Ollama — run: python ollama_qwen.py serve --wait
set -e

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MODELS_DIR="${BACKEND_DIR}/models"

# Pin the HF cache to a writable path and disable the Xet transfer backend. Under
# `gosu appuser` in the container HOME may be unset, so HF's default cache (and the
# Xet downloader's temp store) land in a non-writable dir → Permission denied.
export HF_HOME="${HF_HOME:-${MODELS_DIR}/.hf_cache}"
export HF_HUB_DISABLE_XET=1
export HF_HUB_ENABLE_HF_TRANSFER=0
mkdir -p "${HF_HOME}" 2>/dev/null || true

echo "[download_models] Resolving a Python with huggingface_hub..."
# Prefer uv's ephemeral env (no venv needed); fall back to whatever pip exists.
if command -v uv >/dev/null 2>&1; then
  RUN="uv run --with huggingface_hub python"
elif python3 -c "import huggingface_hub" 2>/dev/null; then
  RUN="python3"
else
  python3 -m pip install -q huggingface_hub 2>/dev/null \
    || pip3 install -q huggingface_hub 2>/dev/null \
    || pip install -q huggingface_hub 2>/dev/null \
    || { echo "[download_models] ERROR: need 'uv' or a pip-enabled python3 to install huggingface_hub." >&2; \
         echo "  Install uv (https://astral.sh/uv) or python3-pip, then re-run. Or skip this — the container auto-downloads BGE on first boot." >&2; \
         exit 1; }
  RUN="python3"
fi

$RUN - <<EOF
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
