"""
manage.py seed_fixtures

Creates the Horizon and Zephyr factories, assets, sensor definitions,
alarm thresholds, and initial twin states. Safe to re-run (uses get_or_create).
"""
from django.core.management.base import BaseCommand
from apps.assets.services import FactoryOnboardService
from apps.users.models import Organization


class Command(BaseCommand):
    help = "Seed Horizon and Zephyr factories with assets, sensors, and twin states."

    def add_arguments(self, parser):
        parser.add_argument(
            "--org-slug",
            default="tata-steel",
            help="Organization slug to attach factories to (created if absent).",
        )

    def handle(self, *args, **options):
        org, created = Organization.objects.get_or_create(
            slug=options["org_slug"],
            defaults={"name": "Tata Steel", "timezone": "Asia/Kolkata"},
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created org: {org.name}"))
        else:
            self.stdout.write(f"Using existing org: {org.name}")

        service = FactoryOnboardService(org=org)

        horizon = service.onboard("Horizon", "F1")
        self.stdout.write(self.style.SUCCESS(f"Horizon seeded: {horizon.asset_set.count()} assets"))

        zephyr = service.onboard("Zephyr", "F2")
        self.stdout.write(self.style.SUCCESS(f"Zephyr seeded: {zephyr.asset_set.count()} assets"))

        self.stdout.write(self.style.SUCCESS("Fixture seeding complete."))
