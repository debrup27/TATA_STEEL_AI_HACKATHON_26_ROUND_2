#!/bin/sh
# Load Ollama models into VRAM at stack startup (same /api/chat path MANAS uses).
set -e

OLLAMA_HOST="${OLLAMA_HOST:-http://ollama:11434}"
MODEL_MAIN="${OLLAMA_MODEL:-qwen3.5:9b}"
MODEL_SMALL="${OLLAMA_SMALL_MODEL:-qwen3.5:0.8b}"

# Ollama API: keep_alive must be JSON number -1 (indefinite), not string "-1".
keep_alive_json() {
  case "${OLLAMA_KEEP_ALIVE:--1}" in
    -1) printf '%s' '-1' ;;
    *) printf '"%s"' "${OLLAMA_KEEP_ALIVE}" ;;
  esac
}

KEEP=$(keep_alive_json)

warm_model() {
  model="$1"
  required="$2"
  echo "[ollama-warmup] loading ${model}"
  if curl -fsS -X POST "${OLLAMA_HOST}/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"${model}\",\"messages\":[{\"role\":\"user\",\"content\":\"ok\"}],\"stream\":false,\"think\":false,\"keep_alive\":${KEEP},\"options\":{\"num_predict\":1}}"; then
    echo ""
    return 0
  fi
  if [ "${required}" = "1" ]; then
    echo "[ollama-warmup] required model ${model} failed" >&2
    return 1
  fi
  echo "[ollama-warmup] optional model ${model} skipped (not pulled yet)"
  return 0
}

warm_model "${MODEL_MAIN}" 1
warm_model "${MODEL_SMALL}" 0
echo "[ollama-warmup] done"
