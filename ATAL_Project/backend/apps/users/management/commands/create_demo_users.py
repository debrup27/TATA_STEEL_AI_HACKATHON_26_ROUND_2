from django.core.management.base import BaseCommand
from django.db import transaction
from apps.users.models import Organization, User

DEMO_ORG = {"name": "Tata Steel Demo", "slug": "tata-steel-demo", "timezone": "Asia/Kolkata"}

DEMO_USERS = [
    {"username": "tech_demo",        "email": "tech@atal.demo",        "password": "TechDemo@123",  "first_name": "Demo", "last_name": "Technician", "role": User.Role.TECHNICIAN},
    {"username": "supervisor_demo",  "email": "supervisor@atal.demo",  "password": "SuperDemo@123", "first_name": "Demo", "last_name": "Supervisor",  "role": User.Role.SUPERVISOR},
    {"username": "admin_demo",       "email": "admin@atal.demo",       "password": "AdminDemo@123", "first_name": "Demo", "last_name": "Admin",       "role": User.Role.ADMIN, "is_staff": True},
]


class Command(BaseCommand):
    help = "Idempotent — create demo org + 3 role accounts (Technician / Supervisor / Admin)."

    def handle(self, *args, **options):
        with transaction.atomic():
            org, _ = Organization.objects.get_or_create(slug=DEMO_ORG["slug"], defaults=DEMO_ORG)

            for spec in DEMO_USERS:
                password = spec.pop("password")
                is_staff = spec.pop("is_staff", False)
                user, created = User.objects.get_or_create(
                    username=spec["username"],
                    defaults={**spec, "org": org, "factory_access": ["F1","F2","F3","F4","F5","F6"], "is_active": True, "is_staff": is_staff},
                )
                if created:
                    user.set_password(password)
                    user.save()
                    self.stdout.write(f"  Created {user.username} ({user.role})")
                else:
                    # Ensure password is correct even on re-runs
                    user.set_password(password)
                    user.org = org
                    user.is_active = True
                    user.save(update_fields=["password", "org", "is_active"])
                    self.stdout.write(f"  Updated {user.username} ({user.role})")

        self.stdout.write(self.style.SUCCESS("[demo] Demo users ready."))
