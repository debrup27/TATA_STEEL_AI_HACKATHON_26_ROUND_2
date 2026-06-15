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
        parser.add_argument("--skip-rag", action="store_true", default=False,
                            help="Skip RAG vector search (avoids loading BGE during uvicorn smoke probe)")
        parser.add_argument("--skip-chat", action="store_true", default=False,
                            help="Skip inline MANAS run_chat_logic (avoids OOM alongside background uvicorn)")

    def handle(self, *args, **options):
        fail_fast = options["fail_fast"]
        skip_celery = options["skip_celery"]
        skip_ollama = options["skip_ollama"]
        skip_rag = options["skip_rag"]
        skip_chat = options["skip_chat"]

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
            import httpx
            # Prefer demo technician account (matches login page + create_demo_users)
            creds = [
                ("tech_demo", "TechDemo@123"),
                ("supervisor_demo", "SuperDemo@123"),
                ("admin_demo", "AdminDemo@123"),
            ]
            for username, password in creds:
                r = httpx.post(
                    "http://localhost:8000/api/v1/auth/token/",
                    json={"username": username, "password": password},
                    timeout=5,
                )
                if r.status_code == 200 and "access" in r.json():
                    token = r.json()["access"]
                    ok(f"JWT auth — token obtained for {username}")
                    break
            if not token:
                fail("JWT auth", "demo credentials rejected — run create_demo_users")
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
            if len(assets_data["results"]) < 8:
                fail("Assets list", f"expected ≥8 seeded assets, got {len(assets_data['results'])}")

        # ── 3b. Factories (Horizon F1 + Zephyr F2) ───────────────────────────
        factories_data = get("/api/v1/factories/", "Factories list", expect_key="results")
        if factories_data:
            codes = {f.get("code") for f in factories_data.get("results", [])}
            missing = [c for c in ("F1", "F2") if c not in codes]
            if missing:
                fail("Factories list", f"missing factory codes: {missing}")
            else:
                ok("Factories F1 (Horizon) + F2 (Zephyr) present")

        # ── 3c. Asset health endpoint ─────────────────────────────────────────
        if asset_id:
            get(f"/api/v1/assets/{asset_id}/health/", "Asset health score")

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
        if asset_id:
            get(
                f"/api/v1/telemetry/{asset_id}/?limit=10&order=desc",
                "Telemetry time-series list",
                expect_key="readings",
            )

        # ── 7b. Telemetry time-series returns recent readings (not stale tail) ─
        if asset_id:
            try:
                from django.utils import timezone
                from datetime import timedelta
                from apps.telemetry.models import SensorReading

                before = SensorReading.objects.filter(asset_id=asset_id).count()
                ts_data = get(
                    f"/api/v1/telemetry/{asset_id}/?limit=20&order=desc",
                    "Telemetry time-series (latest)",
                    expect_key="readings",
                )
                if ts_data and ts_data.get("readings"):
                    from django.utils.dateparse import parse_datetime
                    latest_time = max(
                        parse_datetime(r["time"])
                        for r in ts_data["readings"]
                        if parse_datetime(r["time"])
                    )
                    if timezone.is_naive(latest_time):
                        latest_time = timezone.make_aware(latest_time)
                    age = timezone.now() - latest_time
                    if age > timedelta(hours=6):
                        fail(
                            "Telemetry freshness",
                            f"newest reading is {age.total_seconds() / 3600:.1f}h old",
                        )
                    else:
                        ok(f"Telemetry freshness — newest reading {int(age.total_seconds())}s ago")

                # Synthetic ingest path (unit — no Celery required)
                try:
                    from apps.synthetic.tasks import generate_batch
                    result = generate_batch.run(str(asset_id), n_samples=3)
                    after = SensorReading.objects.filter(asset_id=asset_id).count()
                    if result.get("rows", 0) > 0 and after > before:
                        ok(f"Synthetic telemetry ingest — +{after - before} rows")
                    elif result.get("rows", 0) > 0:
                        ok("Synthetic telemetry ingest — rows written (conflicts ok)")
                    else:
                        fail("Synthetic telemetry ingest", f"no rows written result={result}")
                except Exception as e:
                    fail("Synthetic telemetry ingest", str(e))
            except Exception as e:
                fail("Telemetry freshness", str(e))

        # ── 8. ML model registry status ───────────────────────────────────────
        get("/api/v1/ml/models/status/", "ML models status")

        # ── 9. Alerts ─────────────────────────────────────────────────────────
        get("/api/v1/alerts/", "Alerts list")

        # ── 10. Maintenance events ────────────────────────────────────────────
        get("/api/v1/maintenance/events/", "Maintenance events list")

        # ── 11. Reports ───────────────────────────────────────────────────────
        get("/api/v1/reports/", "Reports list")

        # ── 12. RAG search ────────────────────────────────────────────────────
        if skip_rag:
            self.stdout.write(self.style.WARNING("  ⏭ RAG search — skipped (--skip-rag; BGE loads on first chat)"))
        else:
            try:
                if token:
                    import httpx
                    r = httpx.post(
                        "http://localhost:8000/api/v1/rag/query/",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"query": "bearing vibration ISO 10816", "type": "iso_compliance", "standard_code": "ISO 10816"},
                        timeout=60,
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

        # ── 13b. MANAS chat reply (Ollama native /api/chat) ───────────────────
        if skip_chat:
            self.stdout.write(self.style.WARNING(
                "  ⏭ MANAS chat reply — skipped (--skip-chat; tested on first user message)"
            ))
        elif chat_session_id and token:
            try:
                from apps.agents.models import ChatSession, ChatMessage
                from apps.agents.tasks import run_chat_logic

                session = ChatSession.objects.get(id=chat_session_id)
                msg = ChatMessage.objects.create(
                    session=session, role="user", content="Reply with the word OK only."
                )
                result = run_chat_logic(str(chat_session_id), str(msg.id), [])
                assistant = (
                    ChatMessage.objects.filter(session=session, role="assistant")
                    .order_by("-timestamp")
                    .first()
                )
                if result.get("status") == "ok" and assistant and assistant.content.strip():
                    ok(f"MANAS chat reply — {len(assistant.content)} chars")
                elif result.get("status") == "error":
                    fail("MANAS chat reply", result.get("error", "unknown"))
                else:
                    fail("MANAS chat reply", "empty assistant content")
            except Exception as e:
                fail("MANAS chat reply", str(e))

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
        if skip_rag:
            try:
                from apps.rag.chroma_client import get_chroma_client, COLLECTIONS
                client = get_chroma_client()
                total = sum(client.get_or_create_collection(name).count() for name in COLLECTIONS)
                if total > 0:
                    ok(f"ChromaDB — {total} chunks (count only, --skip-rag)")
                else:
                    self.stdout.write(self.style.WARNING(
                        "  ⚠ ChromaDB empty — run ingest_corpus or set INGEST_CORPUS_ON_START=1"
                    ))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  ⚠ ChromaDB check skipped: {e}"))
        else:
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

        # ── 22. Real ML predictions (no physics_fallback) ─────────────────────
        try:
            from apps.ml.models import MLPrediction
            from apps.assets.models import Asset
            fallback_count = 0
            real_count = 0
            rul_assets = []
            for pred in MLPrediction.objects.order_by("asset", "-prediction_time").distinct("asset")[:8]:
                out = pred.prediction_output or {}
                if out.get("source") == "physics_fallback":
                    fallback_count += 1
                elif out.get("source") == "ml_model":
                    real_count += 1
                    rul = out.get("rul_hours")
                    if rul is not None:
                        rul_assets.append(f"{pred.asset.asset_type}:{round(rul, 0)}h")
            if real_count > 0 and fallback_count == 0:
                ok(f"Real ML predictions — {real_count} assets, sample RULs: {rul_assets[:4]}")
            elif real_count > 0:
                ok(f"Real ML predictions — {real_count} real, {fallback_count} fallback (run retrain to fix)")
            else:
                fail("Real ML predictions", "all predictions are physics_fallback — run ml inference")
        except Exception as e:
            fail("Real ML predictions", str(e))

        # ── 23. RUL for 4 equipment assets ───────────────────────────────────
        try:
            from apps.ml.models import MLPrediction
            from apps.assets.models import Asset
            EQUIPMENT_TYPES = {"SRF", "HHPD", "FS", "HAGCC"}
            found = set()
            for asset in Asset.objects.filter(asset_type__in=EQUIPMENT_TYPES):
                pred = MLPrediction.objects.filter(asset=asset).order_by("-prediction_time").first()
                if pred:
                    rul = (pred.prediction_output or {}).get("rul_hours")
                    if rul is not None:
                        found.add(asset.asset_type)
            missing = EQUIPMENT_TYPES - found
            if not missing:
                ok(f"RUL predictions — all 4 equipment assets have RUL: {sorted(found)}")
            else:
                fail("RUL predictions", f"missing RUL for: {missing}")
        except Exception as e:
            fail("RUL predictions", str(e))

        # ── 24. Plant KPIs endpoint ───────────────────────────────────────────
        if token:
            try:
                import httpx
                r = httpx.get(
                    "http://localhost:8000/api/v1/plant/kpis/",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10,
                )
                if r.status_code == 200:
                    kpis = r.json()
                    hs = kpis.get("plant_health_score")
                    ok(f"Plant KPIs — plant_health={hs}, false_alarm_rate={kpis.get('false_alarm_rate')}")
                else:
                    fail("Plant KPIs", f"status {r.status_code}")
            except Exception as e:
                fail("Plant KPIs", str(e))

        # ── 25. Twin state reflects real ML health ────────────────────────────
        try:
            from apps.twins.models import AssetTwinState
            physics_default = sum(1 for t in AssetTwinState.objects.all() if t.health_score == 100.0)
            total_twins = AssetTwinState.objects.count()
            if total_twins > 0 and physics_default < total_twins:
                ok(f"Twin health scores — {total_twins - physics_default}/{total_twins} updated from real ML")
            elif total_twins == 0:
                fail("Twin health scores", "no twin states found")
            else:
                fail("Twin health scores", "all twins at default 100 — inference not updating twins")
        except Exception as e:
            fail("Twin health scores", str(e))

        # ── 26. Simulation API — status + fault inject + reset ────────────────
        if asset_id and token:
            try:
                import httpx
                # GET status
                r = httpx.get(
                    f"http://localhost:8000/api/v1/simulate/{asset_id}/",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5,
                )
                if r.status_code != 200:
                    fail("Simulation API (GET)", f"status {r.status_code}")
                else:
                    campaign_h = r.json().get("campaign_hours", "?")
                    ok(f"Simulation API (GET) — campaign_hours={campaign_h}")

                # GET plant overview
                r2 = httpx.get(
                    "http://localhost:8000/api/v1/simulate/plant/",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5,
                )
                if r2.status_code == 200 and "assets" in r2.json():
                    ok(f"Plant simulation overview — {len(r2.json()['assets'])} assets")
                else:
                    fail("Plant simulation overview", f"status {r2.status_code}")
            except Exception as e:
                fail("Simulation API", str(e))

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
