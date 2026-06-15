#!/usr/bin/env bash
# Pull both required Ollama models into the compose volume.
# Uses host networking so registry DNS works when Docker embedded DNS fails.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "${REPO_ROOT}"

PROJECT="${COMPOSE_PROJECT_NAME:-atal}"
VOLUME="${OLLAMA_DATA_VOLUME:-atal_ollama_data}"
MAIN="${OLLAMA_MODEL:-qwen3.5:9b}"
SMALL="${OLLAMA_SMALL_MODEL:-qwen3.5:0.8b}"
IMAGE="${OLLAMA_IMAGE:-ollama/ollama:latest}"

if ! docker volume inspect "${VOLUME}" >/dev/null 2>&1; then
  echo "[pull-ollama] Creating volume ${VOLUME}..."
  docker volume create "${VOLUME}" >/dev/null
fi

pull_one() {
  local model="$1"
  echo "[pull-ollama] Pulling ${model} into ${VOLUME}..."
  docker run --rm \
    --entrypoint sh \
    --network host \
    -v "${VOLUME}:/root/.ollama" \
    "${IMAGE}" \
    -c "
      ollama serve >/tmp/ollama-serve.log 2>&1 &
      srv=\$!
      trap 'kill \$srv 2>/dev/null || true' EXIT
      for i in \$(seq 1 90); do
        ollama list >/dev/null 2>&1 && break
        sleep 1
      done
      ollama pull '${model}'
    "
}

pull_one "${MAIN}"
pull_one "${SMALL}"

echo "[pull-ollama] Done — ${MAIN} + ${SMALL} in ${VOLUME}"
