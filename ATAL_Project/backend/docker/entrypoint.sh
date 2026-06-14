#!/usr/bin/env bash
set -e

# ── Fix volume permissions (runs as root before dropping privileges) ───────────
chown -R appuser:appuser /model-artifacts /app/staticfiles /chroma_data 2>/dev/null || true

# ── All subsequent steps run as appuser ───────────────────────────────────────
RUN_AS="gosu appuser"

# ── Wait for PostgreSQL ────────────────────────────────────────────────────────
echo "[entrypoint] Waiting for postgres..."
until $RUN_AS python -c "
import psycopg, os, sys
try:
    psycopg.connect(
        host=os.environ.get('POSTGRES_HOST','postgres-db'),
        port=os.environ.get('POSTGRES_PORT','5432'),
        dbname=os.environ.get('POSTGRES_DB','atal_db'),
        user=os.environ.get('POSTGRES_USER','atal_user'),
        password=os.environ.get('POSTGRES_PASSWORD',''),
    ).close()
    sys.exit(0)
except Exception:
    sys.exit(1)
"; do
    sleep 2
done
echo "[entrypoint] PostgreSQL ready."

# ── Wait for Ollama + ensure model is pulled ──────────────────────────────────
if [ "${SKIP_OLLAMA_WAIT:-0}" != "1" ]; then
    echo "[entrypoint] Waiting for Ollama..."
    OLLAMA_HOST="${OLLAMA_BASE_URL:-http://ollama:11434}"
    until curl -sf "${OLLAMA_HOST}/api/tags" > /dev/null; do
        sleep 5
    done
    echo "[entrypoint] Pulling supervisor model ${OLLAMA_MODEL:-qwen3.5:9b}..."
    curl -sf -X POST "${OLLAMA_HOST}/api/pull" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"${OLLAMA_MODEL:-qwen3.5:9b}\"}" \
        | tail -1 || echo "[entrypoint] WARNING: supervisor model pull returned non-zero"
    echo "[entrypoint] Pulling worker model ${OLLAMA_SMALL_MODEL:-qwen3.5:0.8b}..."
    curl -sf -X POST "${OLLAMA_HOST}/api/pull" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"${OLLAMA_SMALL_MODEL:-qwen3.5:0.8b}\"}" \
        | tail -1 || echo "[entrypoint] WARNING: worker model pull returned non-zero"
    echo "[entrypoint] Models ready."
fi

# ── Apply migrations ───────────────────────────────────────────────────────────
echo "[entrypoint] Applying migrations..."
$RUN_AS python manage.py migrate --noinput

# ── TimescaleDB: fix PK constraints + create hypertables ──────────────────────
echo "[entrypoint] Setting up TimescaleDB hypertables..."
$RUN_AS python manage.py setup_timescaledb

# ── Demo users (idempotent — get_or_create, safe to run on every boot) ────────
echo "[entrypoint] Creating demo users..."
$RUN_AS python manage.py create_demo_users

# ── ChromaDB collections ──────────────────────────────────────────────────────
echo "[entrypoint] Initialising ChromaDB collections..."
$RUN_AS python manage.py shell -c "
from apps.rag.chroma_client import init_collections
init_collections()
print('[entrypoint] ChromaDB ready.')
" 2>/dev/null || true

# ── Seed asset fixtures (required before maintenance log seeding) ─────────────
echo "[entrypoint] Seeding asset fixtures..."
$RUN_AS python manage.py seed_fixtures || echo "[entrypoint] WARNING: seed_fixtures failed — check logs."

# ── Ingest RAG corpus (idempotent — uses get_or_create, safe to re-run) ───────
echo "[entrypoint] Ingesting RAG corpus (OEM manuals, ISO standards, SOPs, safety codes)..."
$RUN_AS python manage.py ingest_corpus --sync --force || echo "[entrypoint] WARNING: corpus ingestion failed — check logs."

echo "[entrypoint] Seeding maintenance logs for RAG..."
$RUN_AS python manage.py seed_maintenance_logs --sync || echo "[entrypoint] WARNING: seed_maintenance_logs failed — check logs."

# ── Static files ──────────────────────────────────────────────────────────────
echo "[entrypoint] Collecting static files..."
$RUN_AS python manage.py collectstatic --noinput

# ── Seed Celery Beat periodic task schedules in DB ────────────────────────────
echo "[entrypoint] Seeding Celery Beat schedules..."
$RUN_AS python manage.py setup_beat_schedules

# ── Train ML models (skip if production artifacts already exist on disk) ───────
echo "[entrypoint] Training ML models (skip if artifacts present)..."
$RUN_AS python manage.py train_models --skip-if-exists --scenarios 300

# ── Backend smoke tests (non-fatal — app starts regardless) ──────────────────
# Runs AFTER migrations + seeds so DB state is correct.
# Tests call localhost:8000 endpoints so we start the app in the background,
# wait for it to be ready, run the tests, then hand off to the real process.
# For Celery worker containers (no HTTP server), skip HTTP tests.
if echo "$*" | grep -q "uvicorn\|gunicorn\|asgi"; then
    echo "[entrypoint] Starting app in background for smoke tests..."
    gosu appuser "$@" &
    APP_PID=$!
    echo "[entrypoint] Waiting for app to be ready..."
    for i in $(seq 1 30); do
        curl -sf http://localhost:8000/health/ > /dev/null 2>&1 && break
        sleep 2
    done
    echo "[entrypoint] Running backend smoke tests..."
    gosu appuser python manage.py run_smoke_tests \
        --skip-celery \
        $([ "${SKIP_OLLAMA_WAIT:-0}" = "1" ] && echo "--skip-ollama") \
        || echo "[entrypoint] WARNING: Some smoke tests failed — check logs."
    echo "[entrypoint] Smoke tests complete. Handing off to main process..."
    # Kill background instance and re-exec as the main process
    kill $APP_PID 2>/dev/null || true
    wait $APP_PID 2>/dev/null || true
fi

# ── Start application (as appuser) ────────────────────────────────────────────
echo "[entrypoint] Starting application..."
exec gosu appuser "$@"
