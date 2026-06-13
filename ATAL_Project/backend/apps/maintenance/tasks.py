import gzip
import os
import subprocess
from datetime import datetime
from pathlib import Path

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="apps.maintenance.backup_postgres", bind=True, max_retries=3)
def backup_postgres(self):
    """Daily PostgreSQL backup — gzip + timestamp; retain 30 days."""
    backup_dir = Path(os.environ.get("BACKUP_DIR", "/backups/postgres"))
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = backup_dir / f"atal_db_{timestamp}.sql.gz"

    db_host = os.environ.get("POSTGRES_HOST", "postgres-db")
    db_name = os.environ.get("POSTGRES_DB", "atal_db")
    db_user = os.environ.get("POSTGRES_USER", "atal_user")
    db_pass = os.environ.get("POSTGRES_PASSWORD", "")

    env = {**os.environ, "PGPASSWORD": db_pass}
    try:
        with gzip.open(filename, "wb") as f:
            result = subprocess.run(
                ["pg_dump", "-h", db_host, "-U", db_user, db_name],
                capture_output=True,
                env=env,
                timeout=300,
            )
            if result.returncode != 0:
                raise RuntimeError(result.stderr.decode())
            f.write(result.stdout)

        size_mb = filename.stat().st_size / (1024 * 1024)
        logger.info("postgres_backup_complete path=%s size_mb=%.2f", filename, size_mb)

        cutoff = datetime.utcnow().timestamp() - (30 * 86400)
        for old in backup_dir.glob("atal_db_*.sql.gz"):
            if old.stat().st_mtime < cutoff:
                old.unlink()
                logger.info("postgres_backup_pruned path=%s", old)

    except Exception as exc:
        logger.error("postgres_backup_failed error=%s", exc)
        raise self.retry(exc=exc, countdown=300)


@shared_task(name="apps.maintenance.backup_chroma", bind=True, max_retries=2)
def backup_chroma(self):
    """Weekly ChromaDB backup — tar.gz of persist dir; retain 4 copies."""
    from django.conf import settings
    backup_dir = Path(os.environ.get("BACKUP_DIR", "/backups/chroma"))
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = backup_dir / f"atal_chroma_{timestamp}.tar.gz"
    chroma_dir = settings.CHROMA_PERSIST_DIR

    try:
        result = subprocess.run(
            ["tar", "-czf", str(filename), "-C", str(Path(chroma_dir).parent), Path(chroma_dir).name],
            capture_output=True,
            timeout=120,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.decode())

        size_mb = filename.stat().st_size / (1024 * 1024)
        logger.info("chroma_backup_complete path=%s size_mb=%.2f", filename, size_mb)

        # Retain 4 most recent
        backups = sorted(backup_dir.glob("atal_chroma_*.tar.gz"), key=lambda f: f.stat().st_mtime)
        for old in backups[:-4]:
            old.unlink()
            logger.info("chroma_backup_pruned path=%s", old)

    except Exception as exc:
        logger.error("chroma_backup_failed error=%s", exc)
        raise self.retry(exc=exc, countdown=600)


@shared_task(name="apps.maintenance.draft_logbook_entry")
def draft_logbook_entry(event_id: str):
    from apps.maintenance.services import AutoLogbookService
    from apps.maintenance.models import MaintenanceEvent
    from apps.reports.models import MaintenanceReport

    entry = AutoLogbookService.draft_entry(event_id)
    event = MaintenanceEvent.objects.get(id=event_id)

    MaintenanceReport.objects.create(
        asset=event.asset,
        source=MaintenanceReport.Source.AI_GENERATED,
        report_text=entry,
        diagnosis="Maintenance completed — auto-generated logbook entry.",
    )
