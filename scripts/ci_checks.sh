#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ATAL CI gate — runs against the live docker compose stack.
#
#   bash scripts/ci_checks.sh
#
# Gates:
#   1. Frontend markdown normalizer suite  (jest, pure — no backend needed)
#   2. SANSAD agentic orchestration smoke   (manage.py test_orchestration)
#
# Gate 2 verifies the two-tier graph returns a non-empty DecisionOutput. With
# OLLAMA_MOCK=1 the supervisor returns empty and the deterministic fallback must
# still produce a valid decision — so this passes with or without real Ollama.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail=0

echo "── [1/2] Frontend markdown suite (jest) ─────────────────────────────"
if docker compose exec -T ui-console npx jest src/lib/markdown-stream.test.ts; then
  echo "✅ markdown suite passed"
else
  echo "❌ markdown suite FAILED"; fail=1
fi

echo ""
echo "── [2/2] SANSAD orchestration smoke gate ────────────────────────────"
if docker compose exec -T django-backend python manage.py test_orchestration; then
  echo "✅ orchestration gate passed"
else
  echo "❌ orchestration gate FAILED"; fail=1
fi

echo ""
if [ "$fail" -eq 0 ]; then
  echo "╔══════════════════════════════════╗"
  echo "║  ALL CI GATES PASSED              ║"
  echo "╚══════════════════════════════════╝"
else
  echo "ONE OR MORE GATES FAILED" >&2
fi
exit "$fail"
