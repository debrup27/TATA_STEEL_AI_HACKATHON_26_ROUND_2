#!/usr/bin/env bash
set -e

# ── Wait for PostgreSQL ────────────────────────────────────────────────────────
echo "[entrypoint] Waiting for postgres..."
until python -c "
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

# ── Wait for vLLM (skip with SKIP_VLLM_WAIT=1 on dev/CPU machines) ────────────
if [ "${SKIP_VLLM_WAIT:-0}" != "1" ]; then
    echo "[entrypoint] Waiting for vLLM..."
    VLLM_HOST="${VLLM_BASE_URL:-http://vllm:8000}"
    until curl -sf "${VLLM_HOST}/health" > /dev/null; do
        sleep 5
    done
    echo "[entrypoint] vLLM ready."
fi

# ── Generate migrations from current models (always in sync, no drift) ────────
echo "[entrypoint] Generating migrations from models..."
python manage.py makemigrations --noinput

# ── Apply migrations ───────────────────────────────────────────────────────────
echo "[entrypoint] Applying migrations..."
python manage.py migrate --noinput

# ── TimescaleDB: fix PK constraints + create hypertables ──────────────────────
echo "[entrypoint] Setting up TimescaleDB hypertables..."
python manage.py setup_timescaledb

# ── Demo users (idempotent — get_or_create, safe to run on every boot) ────────
echo "[entrypoint] Creating demo users..."
python manage.py create_demo_users

# ── ChromaDB collections ──────────────────────────────────────────────────────
echo "[entrypoint] Initialising ChromaDB collections..."
python manage.py shell -c "
from apps.rag.chroma_client import init_collections
init_collections()
print('[entrypoint] ChromaDB ready.')
" 2>/dev/null || true

# ── Static files ──────────────────────────────────────────────────────────────
echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput --clear

# ── Start application ─────────────────────────────────────────────────────────
echo "[entrypoint] Starting application..."
exec "$@"
