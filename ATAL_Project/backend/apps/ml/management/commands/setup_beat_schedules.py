"""
Management command: seed Celery Beat periodic tasks in the database.
Safe to run repeatedly — uses update_or_create.

Called from entrypoint.sh after migrate.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed Celery Beat periodic task schedules into the database"

    def handle(self, *args, **options):
        try:
            from django_celery_beat.models import PeriodicTask, IntervalSchedule, CrontabSchedule
        except ImportError:
            self.stderr.write(self.style.ERROR("django_celery_beat not installed"))
            return

        # ── 7-day retrain schedule (Sunday 02:00 UTC) ──────────────────────────
        retrain_cron, _ = CrontabSchedule.objects.get_or_create(
            minute="0",
            hour="2",
            day_of_week="0",
            day_of_month="*",
            month_of_year="*",
        )
        PeriodicTask.objects.update_or_create(
            name="weekly-ml-retrain",
            defaults={
                "crontab": retrain_cron,
                "task": "apps.ml.generate_dataset_and_retrain",
                "enabled": True,
                "description": "Weekly ML model retrain with rich synthetic dataset",
            },
        )

        # ── 7-day synthetic dataset refresh ────────────────────────────────────
        dataset_cron, _ = CrontabSchedule.objects.get_or_create(
            minute="30",
            hour="1",
            day_of_week="0",
            day_of_month="*",
            month_of_year="*",
        )
        PeriodicTask.objects.update_or_create(
            name="weekly-synthetic-dataset-refresh",
            defaults={
                "crontab": dataset_cron,
                "task": "apps.synthetic.generate_training_dataset",
                "enabled": True,
                "description": "Weekly rich synthetic dataset generation for ML retraining",
            },
        )

        # ── Telemetry WS broadcast every 30 seconds ───────────────────────────
        telemetry_ws_interval, _ = IntervalSchedule.objects.get_or_create(
            every=30, period=IntervalSchedule.SECONDS
        )
        PeriodicTask.objects.update_or_create(
            name="telemetry-ws-broadcast",
            defaults={
                "interval": telemetry_ws_interval,
                "task": "apps.telemetry.broadcast_cells",
                "enabled": True,
                "description": "Broadcast latest sensor cells to /ws/telemetry subscribers",
            },
        )

        # ── Live telemetry simulation every 30 seconds ─────────────────────────
        telemetry_interval, _ = IntervalSchedule.objects.get_or_create(
            every=30, period=IntervalSchedule.SECONDS
        )
        PeriodicTask.objects.update_or_create(
            name="synthetic-telemetry-live",
            defaults={
                "interval": telemetry_interval,
                "task": "apps.synthetic.orchestrate_all",
                "kwargs": '{"n_samples": 6}',
                "enabled": True,
                "description": "Live telemetry simulation — writes to TimescaleDB every 30s",
            },
        )

        # ── Drift check every 6 hours ───────────────────────────────────────────
        drift_cron, _ = CrontabSchedule.objects.get_or_create(
            minute="0",
            hour="*/6",
            day_of_week="*",
            day_of_month="*",
            month_of_year="*",
        )
        PeriodicTask.objects.update_or_create(
            name="model-drift-check",
            defaults={
                "crontab": drift_cron,
                "task": "apps.ml.check_all_drift",
                "enabled": True,
                "description": "KS-test drift check on recent predictions for all assets",
            },
        )

        # ── Weekly feedback training dataset export (Saturday 03:00 UTC) ──────
        feedback_export_cron, _ = CrontabSchedule.objects.get_or_create(
            minute="0",
            hour="3",
            day_of_week="6",
            day_of_month="*",
            month_of_year="*",
        )
        PeriodicTask.objects.update_or_create(
            name="weekly-feedback-training-export",
            defaults={
                "crontab": feedback_export_cron,
                "task": "apps.feedback.export_training_dataset",
                "kwargs": '{"days_back": 7, "max_pairs": 500}',
                "enabled": True,
                "description": "Weekly: compress last 7 days of conversations into training JSONL (≤500 pairs)",
            },
        )

        # ── ML inference every 5 minutes (uses fresh 60-min telemetry window) ──
        inference_interval, _ = IntervalSchedule.objects.get_or_create(
            every=5, period=IntervalSchedule.MINUTES
        )
        PeriodicTask.objects.update_or_create(
            name="ml-inference-all-assets",
            defaults={
                "interval": inference_interval,
                "task": "apps.ml.run_inference_all_assets",
                "enabled": True,
                "description": "Run consolidated ML inference (RUL+anomaly+classifier) for all assets every 5 min",
            },
        )

        # ── Consolidation + LangGraph analysis every 15 minutes for critical assets ─
        consolidation_interval, _ = IntervalSchedule.objects.get_or_create(
            every=15, period=IntervalSchedule.MINUTES
        )
        PeriodicTask.objects.update_or_create(
            name="consolidation-critical-assets",
            defaults={
                "interval": consolidation_interval,
                "task": "apps.consolidation.run_critical_consolidation",
                "enabled": True,
                "description": "Run LangGraph consolidation for high/critical health assets every 15 min",
            },
        )

        # ── Ollama keep-alive ping every 15 minutes ─────────────────────────────
        ollama_keepalive_interval, _ = IntervalSchedule.objects.get_or_create(
            every=15, period=IntervalSchedule.MINUTES
        )
        PeriodicTask.objects.update_or_create(
            name="ollama-keepalive",
            defaults={
                "interval": ollama_keepalive_interval,
                "task": "apps.agents.keep_ollama_warm",
                "enabled": True,
                "description": "Ping Ollama so qwen models stay loaded in VRAM",
            },
        )

        self.stdout.write(self.style.SUCCESS(
            "[setup_beat_schedules] Periodic tasks seeded: "
            "weekly-ml-retrain, weekly-synthetic-dataset-refresh, "
            "telemetry-ws-broadcast, synthetic-telemetry-live, model-drift-check, "
            "weekly-feedback-training-export, ml-inference-all-assets, "
            "consolidation-critical-assets"
        ))
