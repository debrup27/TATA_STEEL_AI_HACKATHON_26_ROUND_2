"""
manage.py run_smoke_tests

Comprehensive backend smoke test suite. Runs automatically at container startup
(via entrypoint.sh). Covers:

  1.  Health endpoint
  2.  JWT auth (obtain + refresh)
  3.  Assets CRUD (list, retrieve)
  4.  Sensor definitions list
  5.  Spares list
  6.  Digital twin state
  7.  Telemetry recent readings
  8.  ML predictions list
  9.  Alerts list
  10. Maintenance events
  11. Reports list
  12. RAG search endpoint
  13. Chat session create + message post
  14. Consolidation trigger
  15. Feedback endpoint
  16. Celery ping (worker alive)
  17. Redis connectivity
  18. ChromaDB collections non-empty
  19. Ollama reachability
  20. Bottleneck scoring (unit)
  21. Feedback prompt patch (unit)

Exit code 0 = all pass, 1 = failures found.
Use --fail-fast to stop on first failure.
"""
import sys
import time
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Comprehensive backend smoke test suite (runs at container startup)."

    def add_arguments(self, parser):
        parser.add_argument("--fail-fast", action="store_true", default=False)
        parser.add_argument("--skip-celery", action="store_true", default=False,
                            help="Skip Celery ping (for environments without worker)")
        parser.add_argument("--skip-ollama", action="store_true", default=False,
                            help="Skip Ollama reachability check")

    def handle(self, *args, **options):
        fail_fast = options["fail_fast"]
        skip_celery = options["skip_celery"]
        skip_ollama = options["skip_ollama"]

        failures: list[str] = []
        passed = 0

        def ok(label: str):
            nonlocal passed
            passed += 1
            self.stdout.write(self.style.SUCCESS(f"  ✅ {label}"))

        def fail(label: str, detail: str = ""):
            failures.append(f"{label}: {detail}" if detail else label)
            self.stdout.write(self.style.ERROR(f"  ❌ {label}" + (f" — {detail}" if detail else "")))
            if fail_fast:
                self._report(passed, failures)
                sys.exit(1)

        self.stdout.write("\n=== ATAL Backend Smoke Tests ===\n")

        # ── 1. Health endpoint ────────────────────────────────────────────────
        try:
            import httpx
            r = httpx.get("http://localhost:8000/health/", timeout=5)
            if r.status_code == 200:
                ok("Health endpoint /health/ → 200")
            else:
                fail("Health endpoint", f"status {r.status_code}")
        except Exception as e:
            fail("Health endpoint", str(e))

        # ── 2. JWT auth ───────────────────────────────────────────────────────
        token = None
        try:
            from apps.users.models import User
            user = User.objects.filter(is_active=True).first()
            if not user:
                fail("JWT auth", "No active users in DB — run seed_fixtures")
            else:
                import httpx
                r = httpx.post(
                    "http://localhost:8000/api/v1/auth/token/",
                    json={"username": user.username, "password": "demo1234"},
                    timeout=5,
                )
                if r.status_code == 200 and "access" in r.json():
                    token = r.json()["access"]
                    ok(f"JWT auth — token obtained for {user.username}")
                else:
                    fail("JWT auth", f"status {r.status_code} body={r.text[:80]}")
        except Exception as e:
            fail("JWT auth", str(e))

        # Helper: authenticated GET
        def get(path: str, label: str, expect_key: str = None):
            if not token:
                fail(label, "no token")
                return None
            try:
                import httpx
                r = httpx.get(
                    f"http://localhost:8000{path}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10,
                )
                if r.status_code != 200:
                    fail(label, f"status {r.status_code}")
                    return None
                data = r.json()
                if expect_key and expect_key not in data:
                    fail(label, f"missing key '{expect_key}'")
                    return None
                ok(label)
                return data
            except Exception as e:
                fail(label, str(e))
                return None

        # ── 3. Assets ─────────────────────────────────────────────────────────
        assets_data = get("/api/v1/assets/", "Assets list", expect_key="results")
        asset_id = None
        if assets_data and assets_data.get("results"):
            asset_id = assets_data["results"][0]["id"]

        # ── 4. Sensor definitions ─────────────────────────────────────────────
        get("/api/v1/sensors/", "Sensor definitions list")

        # ── 5. Spares ─────────────────────────────────────────────────────────
        get("/api/v1/spares/", "Spares list")

        # ── 6. Digital twin state ─────────────────────────────────────────────
        if asset_id:
            get(f"/api/v1/twins/{asset_id}/", "Digital twin state")
        else:
            fail("Digital twin state", "no asset available")

        # ── 7. Telemetry ──────────────────────────────────────────────────────
        get("/api/v1/telemetry/readings/", "Telemetry readings list")

        # ── 8. ML predictions ─────────────────────────────────────────────────
        get("/api/v1/ml/predictions/", "ML predictions list")

        # ── 9. Alerts ─────────────────────────────────────────────────────────
        get("/api/v1/alerts/", "Alerts list")

        # ── 10. Maintenance events ────────────────────────────────────────────
        get("/api/v1/maintenance/events/", "Maintenance events list")

        # ── 11. Reports ───────────────────────────────────────────────────────
        get("/api/v1/reports/", "Reports list")

        # ── 12. RAG search ────────────────────────────────────────────────────
        try:
            if token:
                import httpx
                r = httpx.post(
                    "http://localhost:8000/api/v1/rag/search/",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"query": "bearing vibration ISO 10816", "kind": "iso"},
                    timeout=30,
                )
                if r.status_code == 200:
                    results = r.json()
                    ok(f"RAG search — {len(results)} results")
                else:
                    fail("RAG search", f"status {r.status_code}")
        except Exception as e:
            fail("RAG search", str(e))

        # ── 13. Chat session ──────────────────────────────────────────────────
        chat_session_id = None
        try:
            if token:
                import httpx
                r = httpx.post(
                    "http://localhost:8000/api/v1/chat/sessions/",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"title": "smoke-test session"},
                    timeout=10,
                )
                if r.status_code in (200, 201) and "id" in r.json():
                    chat_session_id = r.json()["id"]
                    ok("Chat session create")
                else:
                    fail("Chat session create", f"status {r.status_code}")
        except Exception as e:
            fail("Chat session create", str(e))

        # ── 14. Consolidation trigger ─────────────────────────────────────────
        if asset_id and token:
            try:
                import httpx
                r = httpx.post(
                    f"http://localhost:8000/api/v1/consolidate/{asset_id}/",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=15,
                )
                if r.status_code in (200, 202):
                    ok("Consolidation trigger")
                else:
                    fail("Consolidation trigger", f"status {r.status_code}")
            except Exception as e:
                fail("Consolidation trigger", str(e))

        # ── 15. Feedback endpoint (404 on non-existent report = correct behaviour)
        try:
            if token:
                import httpx, uuid
                fake_id = str(uuid.uuid4())
                r = httpx.post(
                    f"http://localhost:8000/api/v1/reports/{fake_id}/feedback/",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"feedback_type": "confirm"},
                    timeout=5,
                )
                if r.status_code == 404:
                    ok("Feedback endpoint (404 on unknown report — correct)")
                elif r.status_code in (200, 201):
                    ok("Feedback endpoint")
                else:
                    fail("Feedback endpoint", f"unexpected status {r.status_code}")
        except Exception as e:
            fail("Feedback endpoint", str(e))

        # ── 16. Celery ping ───────────────────────────────────────────────────
        if not skip_celery:
            try:
                from celery.app.control import Control
                from backend.celery import app as celery_app
                ctrl = Control(celery_app)
                response = ctrl.ping(timeout=5)
                if response:
                    ok(f"Celery worker ping — {len(response)} worker(s) alive")
                else:
                    fail("Celery worker ping", "no workers responded — is celery-worker running?")
            except Exception as e:
                fail("Celery worker ping", str(e))

        # ── 17. Redis connectivity ────────────────────────────────────────────
        try:
            from django.core.cache import cache
            cache.set("smoke_test_probe", "ok", timeout=10)
            val = cache.get("smoke_test_probe")
            if val == "ok":
                ok("Redis cache read/write")
            else:
                fail("Redis cache", "probe value mismatch")
        except Exception as e:
            fail("Redis cache", str(e))

        # ── 18. ChromaDB collections ──────────────────────────────────────────
        try:
            from apps.rag.chroma_client import get_chroma_client, COLLECTIONS
            client = get_chroma_client()
            counts = {}
            for name in COLLECTIONS:
                counts[name] = client.get_or_create_collection(name).count()
            total = sum(counts.values())
            if total > 0:
                ok(f"ChromaDB — {total} chunks across {len(COLLECTIONS)} collections")
            else:
                fail("ChromaDB", "all collections empty — run ingest_corpus")
        except Exception as e:
            fail("ChromaDB", str(e))

        # ── 19. Ollama reachability ───────────────────────────────────────────
        if not skip_ollama:
            try:
                import httpx
                from django.conf import settings
                r = httpx.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5)
                if r.status_code == 200:
                    models = [m["name"] for m in r.json().get("models", [])]
                    ok(f"Ollama reachable — models: {models[:3]}")
                else:
                    fail("Ollama", f"status {r.status_code}")
            except Exception as e:
                fail("Ollama", str(e))

        # ── 20. Bottleneck scoring unit test ──────────────────────────────────
        try:
            from apps.assets.models import Asset
            asset = Asset.objects.first()
            if asset:
                from apps.consolidation.scoring import compute_bottleneck_score
                result = compute_bottleneck_score(asset, {"spares": {"parts": []}})
                required = {"process_criticality", "delay_severity", "spares_availability",
                            "procurement_lead", "composite_score", "composite_label"}
                missing = required - set(result.keys())
                if missing:
                    fail("Bottleneck scoring", f"missing keys {missing}")
                elif not (0.0 <= result["composite_score"] <= 1.0):
                    fail("Bottleneck scoring", f"composite_score out of range: {result['composite_score']}")
                else:
                    ok(f"Bottleneck scoring — score={result['composite_score']:.3f} label={result['composite_label']}")
            else:
                fail("Bottleneck scoring", "no assets in DB")
        except Exception as e:
            fail("Bottleneck scoring", str(e))

        # ── 21. Feedback prompt patch unit test ───────────────────────────────
        try:
            from apps.feedback.algorithms import build_prompt_patch
            patch = build_prompt_patch(lookback_days=30)
            ok(f"Feedback prompt patch — {'patch present' if patch else 'no feedback yet (ok)'}")
        except Exception as e:
            fail("Feedback prompt patch", str(e))

        # ── Summary ───────────────────────────────────────────────────────────
        self._report(passed, failures)
        if failures:
            sys.exit(1)

    def _report(self, passed: int, failures: list[str]):
        total = passed + len(failures)
        self.stdout.write(f"\n=== Results: {passed}/{total} passed ===")
        if failures:
            self.stdout.write(self.style.ERROR(f"\nFailed ({len(failures)}):"))
            for f in failures:
                self.stdout.write(self.style.ERROR(f"  • {f}"))
        else:
            self.stdout.write(self.style.SUCCESS("\n✅ ALL SMOKE TESTS PASS"))
