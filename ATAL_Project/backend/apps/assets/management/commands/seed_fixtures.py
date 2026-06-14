"""
manage.py seed_fixtures

Creates the Horizon and Zephyr factories, assets, sensor definitions,
alarm thresholds, and initial twin states.
"""
from django.core.management.base import BaseCommand
from apps.assets.models import Factory
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

        if not Factory.objects.filter(org=org, code="F1").exists():
            horizon = FactoryOnboardService.onboard({
                "org_id": str(org.id),
                "name": "Horizon",
                "code": "F1",
                "factory_type": "horizon",
            })
            self.stdout.write(self.style.SUCCESS(
                f"Horizon seeded: {len(horizon['assets_created'])} assets"
            ))
        else:
            self.stdout.write("Horizon factory already exists — skipping.")

        if not Factory.objects.filter(org=org, code="F2").exists():
            zephyr = FactoryOnboardService.onboard({
                "org_id": str(org.id),
                "name": "Zephyr",
                "code": "F2",
                "factory_type": "zephyr",
            })
            self.stdout.write(self.style.SUCCESS(
                f"Zephyr seeded: {len(zephyr['assets_created'])} assets"
            ))
        else:
            self.stdout.write("Zephyr factory already exists — skipping.")

        self.stdout.write(self.style.SUCCESS("Fixture seeding complete."))
