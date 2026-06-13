#!/usr/bin/env bash
set -e

# Wait for PostgreSQL
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

# Wait for vLLM (optional — skip if SKIP_VLLM_WAIT=1 for dev without GPU)
if [ "${SKIP_VLLM_WAIT:-0}" != "1" ]; then
    echo "[entrypoint] Waiting for vLLM..."
    VLLM_HOST="${VLLM_BASE_URL:-http://vllm:8000}"
    until curl -sf "${VLLM_HOST}/health" > /dev/null; do
        sleep 5
    done
    echo "[entrypoint] vLLM ready."
fi

# Run Django setup
echo "[entrypoint] Running migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "[entrypoint] Loading seed fixtures..."
python manage.py loaddata apps/assets/fixtures/seed_factories.json 2>/dev/null || true
python manage.py loaddata apps/users/fixtures/seed_users.json 2>/dev/null || true

echo "[entrypoint] Initialising ChromaDB collections..."
python manage.py shell -c "
from apps.rag.chroma_client import init_collections
init_collections()
print('[entrypoint] ChromaDB collections ready.')
" 2>/dev/null || true

echo "[entrypoint] Starting application..."
exec "$@"
