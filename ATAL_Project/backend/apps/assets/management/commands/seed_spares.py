from django.core.management.base import BaseCommand

from apps.assets.spares_catalog import ensure_all_asset_spares, sync_spares_from_catalog


class Command(BaseCommand):
    help = "Seed/sync spare parts catalog for all assets (mixed stock levels per equipment)."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Recreate missing rows and overwrite quantities from catalog.")
        parser.add_argument("--sync", action="store_true", help="Sync quantities from catalog for existing rows.")

    def handle(self, *args, **options):
        created = ensure_all_asset_spares(force=options["force"])
        synced = 0
        if options["sync"] or options["force"]:
            synced = sync_spares_from_catalog(force=options["force"])
        self.stdout.write(self.style.SUCCESS(
            f"Spares catalog — {created} new rows, {synced} synced from catalog."
        ))
