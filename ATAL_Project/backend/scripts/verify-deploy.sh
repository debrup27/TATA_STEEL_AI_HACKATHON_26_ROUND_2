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

check "Redis ping" \
    "docker compose exec -T redis redis-cli ping"

check "Postgres ready" \
    "docker compose exec -T postgres-db pg_isready -U atal_user -d atal_db"

check "Celery worker alive" \
    "docker compose exec -T celery-worker celery -A backend inspect ping --timeout 5"

check "Ollama health" \
    "docker compose exec -T django-backend curl -sf http://ollama:11434/api/tags"

check "ChromaDB collections populated" \
    "docker compose exec -T django-backend python manage.py shell -c \"
from apps.rag.chroma_client import get_chroma_client, COLLECTIONS
c = get_chroma_client()
assert any(c.get_or_create_collection(n).count() > 0 for n in ('ISOStandard','SOP'))
\""

echo ""
echo "=== Results: ${PASS} passed / ${FAIL} failed ==="

if [ "$FAIL" -gt 0 ]; then
    echo "Failed checks. Run: docker compose logs --tail=50"
    exit 1
fi

echo "All services healthy."
