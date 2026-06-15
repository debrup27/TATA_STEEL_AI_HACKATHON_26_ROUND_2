#!/bin/sh
# Pull + load both Ollama models (supervisor 9b + worker 0.8b) before the stack starts.
set -e

OLLAMA_HOST="${OLLAMA_HOST:-http://ollama:11434}"
MODEL_MAIN="${OLLAMA_MODEL:-qwen3.5:9b}"
MODEL_SMALL="${OLLAMA_SMALL_MODEL:-qwen3.5:0.8b}"
WARMUP_RETRIES="${OLLAMA_WARMUP_RETRIES:-8}"
WARMUP_RETRY_SECS="${OLLAMA_WARMUP_RETRY_SECS:-10}"
PULL_TIMEOUT_SECS="${OLLAMA_PULL_TIMEOUT_SECS:-1800}"
WARM_MAX_TIME="${OLLAMA_WARM_MAX_TIME:-600}"

keep_alive_json() {
  case "${OLLAMA_KEEP_ALIVE:--1}" in
    -1) printf '%s' '-1' ;;
    *) printf '"%s"' "${OLLAMA_KEEP_ALIVE}" ;;
  esac
}

KEEP=$(keep_alive_json)

has_model() {
  model="$1"
  curl -sf "${OLLAMA_HOST}/api/tags" | grep -q "\"name\":\"${model}\""
}

pull_model() {
  model="$1"
  if has_model "${model}"; then
    echo "[ollama-warmup] ${model} already present"
    return 0
  fi
  echo "[ollama-warmup] pulling ${model} (timeout ${PULL_TIMEOUT_SECS}s)..."
  tmp=$(mktemp)
  code=$(curl -sS -o "${tmp}" -w "%{http_code}" --max-time "${PULL_TIMEOUT_SECS}" \
    -X POST "${OLLAMA_HOST}/api/pull" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${model}\"}" 2>/dev/null || echo "000")
  if grep -q '"error"' "${tmp}" 2>/dev/null; then
    err=$(tail -1 "${tmp}")
    echo "[ollama-warmup] pull failed for ${model}: ${err}" >&2
    rm -f "${tmp}"
    return 1
  fi
  rm -f "${tmp}"
  if [ "${code}" != "200" ]; then
    echo "[ollama-warmup] pull HTTP ${code} for ${model}" >&2
    return 1
  fi
  if ! has_model "${model}"; then
    echo "[ollama-warmup] ${model} not listed after pull" >&2
    return 1
  fi
  echo "[ollama-warmup] pulled ${model}"
}

warm_model() {
  model="$1"
  attempt=1
  while [ "${attempt}" -le "${WARMUP_RETRIES}" ]; do
    echo "[ollama-warmup] loading ${model} (attempt ${attempt}/${WARMUP_RETRIES})"
    tmp=$(mktemp)
    # /api/generate with num_predict 0 = "just load the model" (lighter than a chat turn).
    code=$(curl -sS -o "${tmp}" -w "%{http_code}" --max-time "${WARM_MAX_TIME}" -X POST "${OLLAMA_HOST}/api/generate" \
      -H "Content-Type: application/json" \
      -d "{\"model\":\"${model}\",\"prompt\":\"\",\"stream\":false,\"keep_alive\":${KEEP},\"options\":{\"num_predict\":0}}" \
      2>/dev/null || echo "000")
    rm -f "${tmp}"
    if [ "${code}" = "200" ]; then
      echo "[ollama-warmup] ${model} loaded"
      return 0
    fi
    echo "[ollama-warmup] ${model} HTTP ${code}" >&2
    if [ "${code}" = "404" ]; then
      pull_model "${model}" || return 1
    fi
    if [ "${attempt}" -lt "${WARMUP_RETRIES}" ]; then
      echo "[ollama-warmup] ${model} not ready — retry in ${WARMUP_RETRY_SECS}s" >&2
      sleep "${WARMUP_RETRY_SECS}"
    fi
    attempt=$((attempt + 1))
  done
  echo "[ollama-warmup] ${model} failed after ${WARMUP_RETRIES} attempts" >&2
  return 1
}

echo "[ollama-warmup] waiting for Ollama API..."
until curl -sf "${OLLAMA_HOST}/api/tags" > /dev/null; do
  sleep 2
done

sleep 2

# Pull is required — models must be present for the stack to function.
pull_model "${MODEL_SMALL}"
pull_model "${MODEL_MAIN}"

# Warm small (fast) first, then the large supervisor. Warm is best-effort: a flaky cold load must
# NOT block the whole stack from starting (the backend re-warms on start and on first chat). The
# sidecar still ALWAYS attempts the warm and warns loudly if it can't complete.
warm_ok=1
if ! warm_model "${MODEL_SMALL}"; then
  echo "[ollama-warmup] WARNING: ${MODEL_SMALL} did not warm — will load on demand" >&2
  warm_ok=0
fi
if ! warm_model "${MODEL_MAIN}"; then
  echo "[ollama-warmup] WARNING: ${MODEL_MAIN} did not warm — will load on demand" >&2
  warm_ok=0
fi

if [ "${warm_ok}" = "1" ]; then
  echo "[ollama-warmup] done — ${MODEL_SMALL} + ${MODEL_MAIN} warmed and ready"
else
  echo "[ollama-warmup] done — models pulled; warm incomplete (see warnings above), continuing" >&2
fi
exit 0
