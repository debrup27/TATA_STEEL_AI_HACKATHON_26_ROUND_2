"""Apply pending DB migrations and fail fast if models drift from migration files."""
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Run migrate --noinput, verify no pending migrations, and optionally "
        "fail if models changed without a new migration file."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-model-check",
            action="store_true",
            help="Do not run makemigrations --check (use in CI after makemigrations step).",
        )

    def handle(self, *args, **options):
        self.stdout.write("[ensure_migrations] Applying pending migrations...")
        call_command("migrate", "--noinput", verbosity=1)
        call_command("migrate", "--check", verbosity=0)

        if not options["skip_model_check"]:
            self.stdout.write("[ensure_migrations] Checking models match migration files...")
            call_command("makemigrations", "--check", "--dry-run", verbosity=0)

        self.stdout.write(self.style.SUCCESS("[ensure_migrations] Database schema is up to date."))
