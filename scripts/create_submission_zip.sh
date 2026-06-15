#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Build the ATAL hackathon submission ZIP.
#
# Layout inside the ZIP:
#   README.md            ← at the ZIP root
#   docs/                ← system architecture, API reference, user guide, deliverable
#   docker-compose.yml   ← one-command stack
#   scripts/             ← setup_assets.sh (BGE + corpus) + this script
#   ATAL_Project/        ← full frontend + backend source
#   snapshots/           ← screenshots (add your own)
#
# Excluded (re-fetched by scripts/setup_assets.sh or on first `docker compose up`):
#   secrets (.env*), Git/IDE/agent dirs, BGE model weights, RAG corpus,
#   node_modules, .next, __pycache__, venvs, logs, prior zips.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/ATAL_Submission.zip"
STAGING_NAME="TATA_STEEL_AI_HACKATHON_26_ROUND_2"

if ! command -v zip >/dev/null 2>&1; then
  echo "ERROR: 'zip' is not installed. Install it (e.g. 'sudo pacman -S zip' / 'apt install zip')." >&2
  exit 1
fi

cd "$(dirname "$ROOT")"

echo "Creating submission ZIP: ${OUT}"
echo "Source: ${ROOT}"

rm -f "${OUT}"

zip -r "${OUT}" "${STAGING_NAME}" \
  -x "${STAGING_NAME}/.git/*" \
  -x "${STAGING_NAME}/.git/**/*" \
  -x "${STAGING_NAME}/.env" \
  -x "${STAGING_NAME}/.env.*" \
  -x "${STAGING_NAME}/.cursor/*" \
  -x "${STAGING_NAME}/.cursor/**/*" \
  -x "${STAGING_NAME}/.claude/*" \
  -x "${STAGING_NAME}/.claude/**/*" \
  -x "${STAGING_NAME}/graphify-out/*" \
  -x "${STAGING_NAME}/graphify-out/**/*" \
  -x "${STAGING_NAME}/Docs/*" \
  -x "${STAGING_NAME}/Docs/**/*" \
  -x "${STAGING_NAME}/Planning/*" \
  -x "${STAGING_NAME}/Planning/**/*" \
  -x "${STAGING_NAME}/CLAUDE.md" \
  -x "${STAGING_NAME}/*/node_modules/*" \
  -x "${STAGING_NAME}/*/*/node_modules/*" \
  -x "${STAGING_NAME}/*/*/*/node_modules/*" \
  -x "${STAGING_NAME}/*/*/*/*/node_modules/*" \
  -x "${STAGING_NAME}/*/.next/*" \
  -x "${STAGING_NAME}/*/*/.next/*" \
  -x "${STAGING_NAME}/*/*/out/*" \
  -x "${STAGING_NAME}/*/*/__pycache__/*" \
  -x "${STAGING_NAME}/*/*/*/__pycache__/*" \
  -x "${STAGING_NAME}/*/*/*/*/__pycache__/*" \
  -x "${STAGING_NAME}/*/.pytest_cache/*" \
  -x "${STAGING_NAME}/*/*/.pytest_cache/*" \
  -x "${STAGING_NAME}/*/*/*/.pytest_cache/*" \
  -x "${STAGING_NAME}/*/.venv/*" \
  -x "${STAGING_NAME}/*/*/.venv/*" \
  -x "${STAGING_NAME}/ATAL_Project/backend/models/bge-m3/*" \
  -x "${STAGING_NAME}/ATAL_Project/backend/models/bge-m3/**/*" \
  -x "${STAGING_NAME}/ATAL_Project/backend/models/bge-reranker-v2-m3/*" \
  -x "${STAGING_NAME}/ATAL_Project/backend/models/bge-reranker-v2-m3/**/*" \
  -x "${STAGING_NAME}/ATAL_Project/backend/data/corpus/*" \
  -x "${STAGING_NAME}/ATAL_Project/backend/data/corpus/**/*" \
  -x "${STAGING_NAME}/data/corpus/*" \
  -x "${STAGING_NAME}/data/corpus/**/*" \
  -x "${STAGING_NAME}/*.log" \
  -x "${STAGING_NAME}/*/*.log" \
  -x "${STAGING_NAME}/*.zip"

SIZE=$(du -h "${OUT}" | cut -f1)
echo ""
echo "Done: ${OUT} (${SIZE})"
echo ""
echo "ZIP root:  README.md"
echo "docs/:     SYSTEM_ARCHITECTURE.md, API_REFERENCE.md, USER_GUIDE.md, PROBLEM_STATEMENT_DELIVERABLE.md"
echo ""
echo "NOT bundled (fetched on setup):"
echo "  - BGE models + corpus  → bash scripts/setup_assets.sh"
echo "  - Ollama LLM weights   → auto-pulled on first 'docker compose up'"
echo "  - node_modules / .next → auto-installed on ui-console boot"
