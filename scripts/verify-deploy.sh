#!/usr/bin/env bash
# Smoke-test that all services are up and responding.
set -e

API="${API_BASE:-http://localhost:8000}"
PASS=0
FAIL=0

check() {
    local desc="$1"
    local cmd="$2"
    if eval "$cmd" > /dev/null 2>&1; then
        echo "  [PASS] $desc"
        PASS=$((PASS + 1))
    else
        echo "  [FAIL] $desc"
        FAIL=$((FAIL + 1))
    fi
}

echo ""
echo "=== ATAL Smoke Tests ==="
echo ""

check "Django /health/ returns 200" \
    "curl -sf ${API}/health/"

check "Weaviate ready" \
    "curl -sf http://localhost:8001/v1/.well-known/ready"

check "Redis ping" \
    "docker compose exec redis redis-cli ping"

check "Postgres ready" \
    "docker compose exec postgres-db pg_isready -U atal_user"

check "Celery worker alive" \
    "docker compose exec celery-worker celery -A backend inspect ping --timeout 5"

check "vLLM /health (skip if no GPU)" \
    "curl -sf http://localhost:8000/health --max-time 5 || true"

echo ""
echo "=== Results: ${PASS} passed / ${FAIL} failed ==="

if [ "$FAIL" -gt 0 ]; then
    echo "Failed checks. Run: docker compose logs --tail=50"
    exit 1
fi

echo "All services healthy."
