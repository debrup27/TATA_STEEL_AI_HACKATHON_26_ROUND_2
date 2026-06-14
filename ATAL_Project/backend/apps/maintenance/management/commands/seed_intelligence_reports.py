from django.core.management.base import BaseCommand

from apps.maintenance.tasks import seed_intelligence_reports


class Command(BaseCommand):
    help = "Generate intelligence reports: 2 per factory + per-asset maintenance plans."

    def add_arguments(self, parser):
        parser.add_argument(
            "--async",
            action="store_true",
            dest="run_async",
            help="Queue Celery task instead of running synchronously.",
        )

    def handle(self, *args, **options):
        if options["run_async"]:
            task = seed_intelligence_reports.delay(trigger="manual")
            self.stdout.write(self.style.SUCCESS(f"Queued seed_intelligence_reports task={task.id}"))
            return

        result = seed_intelligence_reports(trigger="manual")
        self.stdout.write(self.style.SUCCESS(f"Intelligence reports seeded: {result}"))
