#!/usr/bin/env bash
# Run once on host before `docker compose up`.
# Downloads all three model artifacts using huggingface_hub snapshot_download.
# Paths match the volume mounts defined in docker-compose.yml.
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODELS_DIR="${REPO_ROOT}/models"

echo "[download_models] Installing huggingface_hub..."
pip install -q huggingface_hub

python3 - <<EOF
import os, sys
from huggingface_hub import snapshot_download

models_dir = "${MODELS_DIR}"
os.makedirs(models_dir, exist_ok=True)

print("\\n[1/3] Downloading Qwen 3.5 9B MTP GGUF (Q4_K_XL)...")
snapshot_download(
    "unsloth/Qwen3.5-9B-MTP-GGUF",
    local_dir=f"{models_dir}/qwen3-9b-mtp-q4",
    allow_patterns=["*Q4_K_XL*", "*.json", "tokenizer*"],
)
print("      -> ${MODELS_DIR}/qwen3-9b-mtp-q4")

print("\\n[2/3] Downloading BAAI/bge-m3 (dense embeddings)...")
snapshot_download(
    "BAAI/bge-m3",
    local_dir=f"{models_dir}/bge-m3",
)
print("      -> ${MODELS_DIR}/bge-m3")

print("\\n[3/3] Downloading BAAI/bge-reranker-v2-m3 (cross-encoder reranker)...")
snapshot_download(
    "BAAI/bge-reranker-v2-m3",
    local_dir=f"{models_dir}/bge-reranker-v2-m3",
)
print("      -> ${MODELS_DIR}/bge-reranker-v2-m3")

print("\\n[download_models] All models downloaded successfully.")
print(f"Total disk usage: {models_dir}")
EOF

du -sh "${MODELS_DIR}"/*/
