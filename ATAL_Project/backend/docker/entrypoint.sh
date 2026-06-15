#!/usr/bin/env bash
set -e

READY_MARKER="${ATAL_READY_MARKER:-/tmp/atal_backend_ready}"
rm -f "${READY_MARKER}"

banner() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════════╗"
  printf "║ %-64s ║\n" "$1"
  echo "╚══════════════════════════════════════════════════════════════════╝"
  echo ""
}

# ── Fix volume permissions (runs as root before dropping privileges) ───────────
chown -R appuser:appuser /model-artifacts /app/staticfiles /chroma_data 2>/dev/null || true

# ── All subsequent steps run as appuser ───────────────────────────────────────
RUN_AS="gosu appuser"

# ── Test / one-off containers: migrate only, skip seeds & ML training ─────────
if [ "${ATAL_ENTRYPOINT_LITE:-0}" = "1" ]; then
    echo "[entrypoint] Lite mode — migrate only, then exec command."
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
    $RUN_AS python manage.py ensure_migrations
    echo "[entrypoint] Lite boot complete."
    exec "$@"
fi

# ── Celery worker/beat: lightweight boot (django-backend runs full seed pipeline) ─
if [ "${CELERY_LIGHT_ENTRYPOINT:-0}" = "1" ]; then
    echo "[entrypoint] Celery light mode — migrate only, then start worker/beat."
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
    $RUN_AS python manage.py ensure_migrations
    echo "[entrypoint] Starting Celery process..."
    touch "${READY_MARKER}"
    exec "$@"
fi

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

# ── Wait for Ollama + verify models (pull only if missing) ───────────────────
ollama_model_present() {
    local name="$1"
    curl -sf "${OLLAMA_HOST}/api/tags" | grep -q "\"name\":\"${name}\""
}

pull_ollama_model() {
    local name="$1"
    local label="$2"
    local tmp
    tmp=$(mktemp)
    echo "[entrypoint] Pulling ${label} ${name}..."
    if ! curl -fsS --max-time 1800 -X POST "${OLLAMA_HOST}/api/pull" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"${name}\"}" -o "${tmp}"; then
        rm -f "${tmp}"
        return 1
    fi
    if grep -q '"error"' "${tmp}"; then
        echo "[entrypoint] pull error: $(tail -1 "${tmp}")" >&2
        rm -f "${tmp}"
        return 1
    fi
    rm -f "${tmp}"
    return 0
}

ensure_ollama_model() {
    local name="$1"
    local label="$2"
    if ollama_model_present "${name}"; then
        echo "[entrypoint] ${label} ${name} already available"
        return 0
    fi
    if pull_ollama_model "${name}" "${label}"; then
        return 0
    fi
    if ollama_model_present "${name}"; then
        echo "[entrypoint] ${name} available after pull retry"
        return 0
    fi
    echo "[entrypoint] ERROR: ${name} missing. Run: bash ATAL_Project/backend/scripts/pull_ollama_models.sh" >&2
    exit 1
}

if [ "${SKIP_OLLAMA_WAIT:-0}" != "1" ]; then
    echo "[entrypoint] Waiting for Ollama..."
    OLLAMA_HOST="${OLLAMA_BASE_URL:-http://ollama:11434}"
    until curl -sf "${OLLAMA_HOST}/api/tags" > /dev/null; do
        sleep 5
    done
    MAIN_MODEL="${OLLAMA_MODEL:-qwen3.5:9b}"
    SMALL_MODEL="${OLLAMA_SMALL_MODEL:-qwen3.5:0.8b}"
    ensure_ollama_model "${MAIN_MODEL}" "supervisor model"
    ensure_ollama_model "${SMALL_MODEL}" "worker model"
    echo "[entrypoint] Models ready."
    echo "[entrypoint] Warming Ollama models into memory (best-effort)..."
    # Best-effort: a cold 9B load can exceed the warm timeout under GPU pressure. Do NOT crash
    # the backend on a flaky warm — the deterministic dashboard needs no LLM, and the final
    # server re-warms post-start (below) and on first chat. This removes a brittle startup gate.
    for attempt in 1 2 3; do
        if $RUN_AS python manage.py warm_ollama --skip-rag; then
            break
        fi
        if [ "${attempt}" -eq 3 ]; then
            echo "[entrypoint] WARNING: Ollama warmup did not complete — continuing; will warm on demand." >&2
            break
        fi
        echo "[entrypoint] Ollama warmup retry ${attempt}/3 in 10s..." >&2
        sleep 10
    done
fi

# ── Apply migrations ───────────────────────────────────────────────────────────
echo "[entrypoint] Applying migrations..."
$RUN_AS python manage.py ensure_migrations

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

echo "[entrypoint] Seeding spare parts catalog..."
$RUN_AS python manage.py seed_spares --sync --force \
  || echo "[entrypoint] WARNING: seed_spares failed — check logs."

# ── Initial synthetic telemetry (populates TimescaleDB before UI loads) ─────
echo "[entrypoint] Seeding initial synthetic telemetry..."
$RUN_AS python manage.py seed_initial_telemetry --samples=30 \
  || echo "[entrypoint] WARNING: seed_initial_telemetry failed — check logs."

# ── Calibrate sensor thresholds to actual nominal generator output ──────────
# Aligns normal/alert/trip bands with what the generators emit so healthy assets read
# healthy and fault data still breaches (fixes synthetic threshold scale mismatches).
echo "[entrypoint] Calibrating sensor thresholds from nominal telemetry..."
$RUN_AS python manage.py calibrate_sensors \
  || echo "[entrypoint] WARNING: calibrate_sensors failed — check logs."

# ── Optional RAG corpus ingest (off by default — user picks library docs in MANAS) ─
if [ "${INGEST_CORPUS_ON_START:-0}" = "1" ]; then
    echo "[entrypoint] Ingesting RAG corpus (INGEST_CORPUS_ON_START=1)..."
    $RUN_AS python manage.py ingest_corpus --sync --force \
        || echo "[entrypoint] WARNING: corpus ingestion failed — check logs."
    echo "[entrypoint] Seeding maintenance logs for RAG..."
    $RUN_AS python manage.py seed_maintenance_logs --sync \
        || echo "[entrypoint] WARNING: seed_maintenance_logs failed — check logs."
else
    echo "[entrypoint] Skipping corpus ingest (set INGEST_CORPUS_ON_START=1 to enable)."
fi

# ── Static files ──────────────────────────────────────────────────────────────
echo "[entrypoint] Collecting static files..."
$RUN_AS python manage.py collectstatic --noinput

# ── Seed Celery Beat periodic task schedules in DB ────────────────────────────
echo "[entrypoint] Seeding Celery Beat schedules..."
$RUN_AS python manage.py setup_beat_schedules

# ── Queue first live telemetry batch (Celery worker picks up when ready) ──────
echo "[entrypoint] Queueing initial synthetic telemetry batch..."
$RUN_AS python manage.py shell -c "
from apps.synthetic.tasks import orchestrate_all
orchestrate_all.delay(n_samples=30)
print('[entrypoint] orchestrate_all queued')
" 2>/dev/null || echo "[entrypoint] WARNING: could not queue orchestrate_all"

# ── Train ML models (fast by default; use --train / ATAL_TRAIN_MODE=full for full) ─
TRAIN_MODE="${ATAL_TRAIN_MODE:-fast}"
if [ "$TRAIN_MODE" = "skip" ]; then
    echo "[entrypoint] Skipping ML training (ATAL_TRAIN_MODE=skip)."
elif [ "$TRAIN_MODE" = "full" ]; then
    echo "[entrypoint] Full ML training (ATAL_TRAIN_MODE=full)..."
    $RUN_AS python manage.py train_models --scenarios 1000 --rich
else
    echo "[entrypoint] Fast ML training (ATAL_TRAIN_MODE=fast, skip-if-exists)..."
    $RUN_AS python manage.py train_models --skip-if-exists --fast --scenarios 50
fi

# ── Kick off initial ML inference for all assets (populates RUL/health on nodes) ─
echo "[entrypoint] Queueing ML inference for all assets..."
$RUN_AS python manage.py shell -c "
from apps.assets.models import Asset
from apps.ml.tasks import run_all_asset_models
for a in Asset.objects.all():
    run_all_asset_models.delay(str(a.id))
print('[entrypoint] ML inference queued for', Asset.objects.count(), 'assets')
" 2>/dev/null || echo "[entrypoint] WARNING: could not queue ML inference"

# ── Queue intelligence reports (2 per factory + per-asset plans) ─────────────
echo "[entrypoint] Starting intelligence report seed (background thread, sync Ollama)..."
$RUN_AS python manage.py shell -c "
import threading
from apps.maintenance.tasks import seed_intelligence_reports_sync

def _run():
    try:
        seed_intelligence_reports_sync(trigger='startup')
        print('[entrypoint] intelligence report seed complete')
    except Exception as exc:
        print('[entrypoint] WARNING: intelligence seed failed:', exc)

threading.Thread(target=_run, daemon=True, name='intel-seed').start()
print('[entrypoint] intelligence report seed started')
" 2>/dev/null || echo "[entrypoint] WARNING: could not start intelligence reports"

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
    banner "ATAL Backend — smoke test suite"
    gosu appuser python manage.py run_smoke_tests \
        --skip-celery \
        $([ "${SKIP_OLLAMA_WAIT:-0}" = "1" ] && echo "--skip-ollama") \
        || echo "[entrypoint] WARNING: Some smoke tests failed — check logs."
    banner "ATAL Backend — smoke tests complete"
    # Kill background instance and re-exec as the main process
    kill $APP_PID 2>/dev/null || true
    wait $APP_PID 2>/dev/null || true
fi

# ── Re-warm inference stack (Ollama + BGE) before serving — avoids first-chat spike ─
if [ "${SKIP_OLLAMA_WAIT:-0}" != "1" ] && echo "$*" | grep -q "uvicorn\|gunicorn\|asgi"; then
    echo "[entrypoint] Re-warming Ollama models before serving traffic..."
    $RUN_AS python manage.py warm_ollama --skip-rag \
        || echo "[entrypoint] WARNING: re-warm skipped (models loaded at startup / ollama busy)"
fi

# ── Final migration pass (picks up files added after image build / volume mount) ─
if echo "$*" | grep -q "uvicorn\|gunicorn\|asgi\|celery"; then
    echo "[entrypoint] Final migration check before serving..."
    $RUN_AS python manage.py ensure_migrations \
        || { echo "[entrypoint] ERROR: migrations failed — fix models/migrations and restart." >&2; exit 1; }
fi

# ── Start application (as appuser) ────────────────────────────────────────────
echo "[entrypoint] Starting application..."
touch "${READY_MARKER}"
exec gosu appuser "$@"
