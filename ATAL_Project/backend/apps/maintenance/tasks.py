import gzip
import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path

from celery import shared_task
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

REGEN_CACHE_KEY = "sansad:maintenance_plan_regen"

_FACTORY_MAINT_TITLE = "Plant Maintenance Intelligence — {factory}"
_FACTORY_DECISION_TITLE = "Executive Decision Summary — {factory}"


def _set_regen_status(*, active: bool, completed: int = 0, total: int = 0, trigger: str = "") -> None:
    cache.set(
        REGEN_CACHE_KEY,
        {
            "active": active,
            "completed": completed,
            "total": total,
            "trigger": trigger,
            "updated_at": timezone.now().isoformat(),
        },
        timeout=7200,
    )


def get_regen_status() -> dict:
    status = cache.get(REGEN_CACHE_KEY) or {
        "active": False,
        "completed": 0,
        "total": 0,
        "trigger": "",
        "updated_at": None,
    }
    if not status.get("active"):
        return status
    updated_at = status.get("updated_at")
    if not updated_at:
        return status
    try:
        from datetime import timedelta
        from django.utils.dateparse import parse_datetime

        ts = parse_datetime(updated_at)
        if ts and timezone.now() - ts > timedelta(minutes=25):
            logger.warning("clearing stale maintenance regen status updated_at=%s", updated_at)
            cleared = {**status, "active": False}
            cache.set(REGEN_CACHE_KEY, cleared, timeout=7200)
            return cleared
    except Exception as exc:
        logger.warning("regen status stale check failed: %s", exc)
    return status


def regenerate_asset_plan_sync(asset_id: str, trigger: str = "manual") -> dict:
    """Run Ollama plan generation inline on django-backend (not Celery)."""
    from apps.assets.models import Asset
    from apps.assets.spares_catalog import ensure_asset_spares
    from apps.maintenance.intelligence_report import build_asset_intelligence_plan

    asset = Asset.objects.select_related("factory").get(pk=asset_id)
    ensure_asset_spares(asset)
    plan = build_asset_intelligence_plan(asset, use_llm=True)
    report = _replace_asset_maintenance_report(asset, plan)
    logger.info("asset_plan_saved asset=%s trigger=%s sync=1", asset.name, trigger)
    return {"asset_id": str(asset.id), "report_id": str(report.id), "status": "complete"}


def regenerate_factory_intel_sync(factory_id: str, trigger: str = "startup") -> dict:
    """Factory intelligence reports — inline Ollama on django-backend."""
    from apps.assets.models import Factory
    from apps.assets.spares_catalog import ensure_all_asset_spares
    from apps.maintenance.intelligence_report import (
        build_factory_decision_report,
        build_factory_maintenance_report,
    )
    from apps.reports.models import MaintenanceReport

    ensure_all_asset_spares()
    factory = Factory.objects.prefetch_related("assets").get(pk=factory_id)

    maint = build_factory_maintenance_report(factory, use_llm=True)
    decision = build_factory_decision_report(factory, use_llm=True)

    maint_title = _FACTORY_MAINT_TITLE.format(factory=factory.name)
    decision_title = _FACTORY_DECISION_TITLE.format(factory=factory.name)

    r1 = _replace_factory_reports(
        factory, MaintenanceReport.ReportType.MAINTENANCE, maint_title, maint,
    )
    r2 = _replace_factory_reports(
        factory, MaintenanceReport.ReportType.DECISION_SUMMARY, decision_title, decision,
    )

    logger.info(
        "factory_intelligence_saved factory=%s trigger=%s sync=1 maint=%s decision=%s",
        factory.name, trigger, r1.id if r1 else None, r2.id if r2 else None,
    )
    return {
        "factory_id": str(factory.id),
        "maintenance_report_id": str(r1.id) if r1 else None,
        "decision_report_id": str(r2.id) if r2 else None,
        "trigger": trigger,
    }


def regenerate_intelligence_on_anomaly_sync(asset_id: str, trigger: str = "anomaly") -> dict:
    from apps.assets.models import Asset

    asset = Asset.objects.select_related("factory").get(pk=asset_id)
    factory_id = str(asset.factory_id)
    regenerate_factory_intel_sync(factory_id, trigger=trigger)
    regenerate_asset_plan_sync(asset_id, trigger=trigger)
    return {"asset_id": asset_id, "factory_id": factory_id, "trigger": trigger}


def seed_intelligence_reports_sync(trigger: str = "startup") -> dict:
    """Generate factory + asset intelligence inline (django thread, not Celery)."""
    from apps.assets.models import Asset, Factory
    from apps.assets.spares_catalog import ensure_all_asset_spares

    ensure_all_asset_spares()
    removed = _clean_stale_reports()
    if removed:
        logger.info("stale_reports_removed count=%s", removed)

    from apps.assets.samvidhaan_service import upsert_historical_factory_report

    for factory in Factory.objects.all():
        try:
            upsert_historical_factory_report(factory)
        except Exception as exc:
            logger.warning("historical_dossier_failed factory=%s err=%s", factory.name, exc)

    factories = list(Factory.objects.all())
    assets = list(Asset.objects.select_related("factory").all())
    total = len(factories) * 2 + len(assets)
    done = 0
    _set_regen_status(active=True, completed=0, total=total, trigger=trigger)

    try:
        for factory in factories:
            try:
                regenerate_factory_intel_sync(str(factory.id), trigger=trigger)
                done += 2
                _set_regen_status(active=True, completed=done, total=total, trigger=trigger)
            except Exception as exc:
                logger.warning("factory_intel_failed factory=%s err=%s", factory.name, exc)

        for asset in assets:
            try:
                regenerate_asset_plan_sync(str(asset.id), trigger=trigger)
                done += 1
                _set_regen_status(active=True, completed=done, total=total, trigger=trigger)
            except Exception as exc:
                logger.warning("asset_plan_failed asset=%s err=%s", asset.id, exc)
    finally:
        _set_regen_status(active=False, completed=done, total=total, trigger=trigger)

    return {"generated": done, "total": total, "trigger": trigger}


def _save_report(asset, report_type: str, title: str, plan: dict):
    from apps.reports.models import MaintenanceReport

    strategy = plan.get("spare_strategy") or {}
    if isinstance(strategy, str):
        strategy = {"strategy": strategy, "parts": []}

    return MaintenanceReport.objects.create(
        asset=asset,
        source=MaintenanceReport.Source.AI_GENERATED,
        report_type=report_type,
        title=title,
        diagnosis=plan.get("diagnosis", ""),
        risk_level=plan.get("risk_level"),
        urgency_score=plan.get("urgency_score"),
        recommendations=plan.get("recommendations", []),
        immediate_actions=plan.get("immediate_actions", []),
        long_term_monitoring=plan.get("long_term_monitoring", []),
        spare_strategy=strategy,
        report_text=plan.get("report_text", ""),
    )


def _replace_factory_reports(factory, report_type: str, title: str, plan: dict):
    from apps.assets.models import Asset
    from apps.reports.models import MaintenanceReport

    anchor_id = plan.get("anchor_asset_id")
    anchor = Asset.objects.filter(pk=anchor_id).first() if anchor_id else factory.assets.first()
    if not anchor:
        return None

    MaintenanceReport.objects.filter(
        asset__factory=factory,
        report_type=report_type,
        title=title,
    ).delete()

    return _save_report(anchor, report_type, title, plan)


def _clean_stale_reports():
    from apps.reports.models import MaintenanceReport

    stale_qs = MaintenanceReport.objects.filter(
        report_type=MaintenanceReport.ReportType.MAINTENANCE,
        title__startswith="Maintenance Report —",
    )
    stale_count = stale_qs.count()
    stale_qs.delete()

    gibberish_markers = (
        "INCOMPLETE",
        "cannot proceed",
        "Data Required",
        "No consolidated asset",
        "without valid asset",
    )
    for report in MaintenanceReport.objects.filter(
        report_type=MaintenanceReport.ReportType.MAINTENANCE,
    ).only("id", "report_text", "immediate_actions", "title"):
        body = (report.report_text or "").strip()
        if body and not any(m.lower() in body.lower() for m in gibberish_markers):
            continue
        if body and len(body) > 80 and report.immediate_actions:
            continue
        if not body and not (report.immediate_actions or []):
            report.delete()

    return stale_count


def _replace_asset_maintenance_report(asset, plan: dict):
    from apps.reports.models import MaintenanceReport

    MaintenanceReport.objects.filter(
        asset=asset,
        report_type=MaintenanceReport.ReportType.MAINTENANCE,
        title__startswith="Maintenance Plan —",
    ).delete()

    return _save_report(
        asset,
        MaintenanceReport.ReportType.MAINTENANCE,
        f"Maintenance Plan — {asset.name}",
        plan,
    )


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
        report_type=MaintenanceReport.ReportType.DIGITAL_LOG,
        title=f"Digital Log — {event.event_type}",
        report_text=entry,
        diagnosis="Maintenance completed — auto-generated logbook entry.",
    )


@shared_task(name="apps.maintenance.generate_quick_plan", bind=True, time_limit=300, soft_time_limit=270)
def generate_quick_maintenance_plan_task(self, asset_id: str, trigger: str = "manual"):
    return regenerate_asset_plan_sync(asset_id, trigger=trigger)


@shared_task(name="apps.maintenance.generate_factory_intelligence", time_limit=180)
def generate_factory_intelligence_reports(factory_id: str, trigger: str = "startup"):
    return regenerate_factory_intel_sync(factory_id, trigger=trigger)


@shared_task(name="apps.maintenance.seed_intelligence_reports", time_limit=900)
def seed_intelligence_reports(trigger: str = "startup"):
    return seed_intelligence_reports_sync(trigger=trigger)


@shared_task(name="apps.maintenance.regenerate_on_anomaly", time_limit=300)
def regenerate_intelligence_on_anomaly(asset_id: str, trigger: str = "anomaly"):
    return regenerate_intelligence_on_anomaly_sync(asset_id, trigger=trigger)


# Legacy alias — disabled in beat; kept for manual invocations
@shared_task(name="apps.maintenance.regenerate_all_plans", time_limit=900)
def regenerate_all_maintenance_plans(trigger: str = "scheduled"):
    return seed_intelligence_reports_sync(trigger=trigger)
