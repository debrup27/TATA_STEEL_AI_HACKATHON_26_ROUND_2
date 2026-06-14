"""Generate an initial batch of synthetic sensor readings for all assets."""
from django.core.management.base import BaseCommand
from apps.assets.models import Asset
from apps.synthetic.tasks import generate_batch


class Command(BaseCommand):
    help = "Seed TimescaleDB with initial synthetic telemetry for every asset."

    def add_arguments(self, parser):
        parser.add_argument(
            "--samples",
            type=int,
            default=30,
            help="Number of samples per asset (default: 30).",
        )

    def handle(self, *args, **options):
        n_samples = options["samples"]
        assets = Asset.objects.all()
        if not assets.exists():
            self.stdout.write(self.style.WARNING("No assets found — run seed_fixtures first."))
            return

        total_rows = 0
        for asset in assets:
            result = generate_batch.run(str(asset.id), n_samples=n_samples)
            rows = (result or {}).get("rows", 0)
            total_rows += rows
            self.stdout.write(f"  {asset.name}: {rows} readings")

        self.stdout.write(self.style.SUCCESS(
            f"[telemetry] Seeded {total_rows} readings across {assets.count()} assets."
        ))
