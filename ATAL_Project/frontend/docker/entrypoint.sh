#!/bin/sh
set -e

cd /app

banner() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════════╗"
  printf "║ %-64s ║\n" "$1"
  echo "╚══════════════════════════════════════════════════════════════════╝"
  echo ""
}

wait_backend_ready() {
  node /app/docker/check-backend-ready.mjs "$1"
}

# Host bind-mount hides image node_modules; anonymous volume may be empty on first run.
if [ ! -x node_modules/.bin/next ] || [ ! -x node_modules/.bin/jest ]; then
  banner "ATAL Frontend — installing dependencies"
  if [ -f package-lock.json ]; then
    npm ci || npm install
  else
    npm install
  fi
fi

BACKEND_URL="${BACKEND_INTERNAL_URL:-http://django-backend:8000}"
HEALTH_URL="${BACKEND_URL}/health/ready/"

banner "ATAL — serving wait page"
node /app/docker/wait-server.mjs &
WAIT_PID=$!

banner "ATAL Frontend — waiting for backend /health/ready/"
echo "  Target: ${HEALTH_URL}"
echo "  (503 until migrations, seeds, and smoke tests finish)"
echo ""

ATTEMPTS=0
until wait_backend_ready "${HEALTH_URL}"; do
  ATTEMPTS=$((ATTEMPTS + 1))
  echo "[ui-console] Backend not ready (attempt ${ATTEMPTS}) — retrying in 10s…"
  sleep 10
done

echo "[ui-console] Backend ready — requests can be sent."
echo ""

FRONTEND_TEST_FAILED=0

banner "ATAL Frontend — Jest test suite"
if npm run test:run -- --verbose; then
  echo "[ui-console] Jest: all tests passed."
else
  FRONTEND_TEST_FAILED=1
  echo "[ui-console] WARNING: Jest reported failures — continuing startup (see log above)."
fi
echo ""

banner "ATAL Frontend — ESLint"
if npm run lint; then
  echo "[ui-console] ESLint: no errors."
else
  FRONTEND_TEST_FAILED=1
  echo "[ui-console] WARNING: ESLint reported issues — continuing startup (see log above)."
fi
echo ""

if [ "$FRONTEND_TEST_FAILED" -eq 1 ]; then
  echo "[ui-console] Startup checks finished with warnings."
else
  echo "[ui-console] Startup checks passed."
fi

# Re-check backend before handing off — django may have restarted during long test runs
ATTEMPTS=0
until wait_backend_ready "${HEALTH_URL}"; do
  ATTEMPTS=$((ATTEMPTS + 1))
  echo "[ui-console] Backend not ready before Next.js (attempt ${ATTEMPTS}) — retrying in 10s…"
  sleep 10
done

kill "$WAIT_PID" 2>/dev/null || true
wait "$WAIT_PID" 2>/dev/null || true
sleep 0.5

banner "ATAL Frontend — starting Next.js dev server"
exec npm run dev
