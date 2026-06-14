"""Universal abnormality / trip generator — propagates via plant snapshot flags."""
from __future__ import annotations

import logging
import random

from django.shortcuts import get_object_or_404

from apps.assets.diagnostics_service import build_diagnostic
from apps.assets.models import Asset
from apps.alerts.models import AlarmEvent
from apps.reports.models import MaintenanceReport
from apps.twins.models import AssetTwinState

logger = logging.getLogger(__name__)

FAULT_TYPES = ("bearing", "thermal", "crystallization", "general")

SIMULATED_ALARM_TYPE = "simulated_trip"


def resolve_trip_asset(asset_id: str | None = None) -> Asset:
    if asset_id:
        return get_object_or_404(Asset.objects.select_related("factory"), pk=asset_id)

    injected = (
        AssetTwinState.objects.filter(state__contains={"_fault_injected": True})
        .select_related("asset", "asset__factory")
        .first()
    )
    if injected:
        return injected.asset

    preferred = Asset.objects.filter(asset_type="HHPD").select_related("factory").first()
    if preferred:
        return preferred
    return get_object_or_404(Asset.objects.select_related("factory"))


def _queue_synthetic_and_ml(asset: Asset) -> None:
    try:
        from apps.synthetic.tasks import generate_batch

        generate_batch.apply_async(args=[str(asset.id)], kwargs={"n_samples": 30})
    except Exception as exc:
        logger.warning("trip synthetic batch failed asset=%s err=%s", asset.id, exc)

    try:
        from apps.ml.tasks import run_all_asset_models

        run_all_asset_models.apply_async(args=[str(asset.id)], queue="ml_inference")
    except Exception as exc:
        logger.warning("trip ml trigger failed asset=%s err=%s", asset.id, exc)

    try:
        import threading
        from apps.maintenance.tasks import regenerate_intelligence_on_anomaly_sync

        threading.Thread(
            target=regenerate_intelligence_on_anomaly_sync,
            args=(str(asset.id),),
            kwargs={"trigger": "anomaly"},
            daemon=True,
            name=f"intel-regen-{str(asset.id)[:8]}",
        ).start()
    except Exception as exc:
        logger.warning("trip intelligence regen failed asset=%s err=%s", asset.id, exc)

    try:
        from apps.consolidation.tasks import run_consolidation

        run_consolidation.apply_async(args=[str(asset.id)])
    except Exception as exc:
        logger.warning("trip consolidation failed asset=%s err=%s", asset.id, exc)


def _create_trip_alarm(asset: Asset, fault_type: str) -> AlarmEvent:
    return AlarmEvent.objects.create(
        asset=asset,
        alarm_type=SIMULATED_ALARM_TYPE,
        severity=AlarmEvent.Severity.TRIP,
        message=(
            f"Abnormality — simulated fault ({fault_type}) on {asset.name}. "
            "Sensor envelopes breached; MANAS consolidation queued."
        ),
    )


def _ensure_abnormal_report(asset: Asset, alarm: AlarmEvent, fault_type: str) -> MaintenanceReport:
    existing = (
        MaintenanceReport.objects.filter(
            asset=asset,
            report_type=MaintenanceReport.ReportType.ABNORMAL_ALERT,
            title__icontains="Simulated Trip",
        )
        .order_by("-created_at")
        .first()
    )
    if existing and (existing.created_at and existing.created_at.date() == alarm.created_at.date()):
        return existing

    alarms = AlarmEvent.objects.filter(asset=asset, acknowledged=False).order_by("-created_at")[:20]
    body_lines = [f"[{a.severity.upper()}] {a.message}" for a in alarms]
    if not body_lines:
        body_lines = [alarm.message]

    return MaintenanceReport.objects.create(
        asset=asset,
        source=MaintenanceReport.Source.AI_GENERATED,
        report_type=MaintenanceReport.ReportType.ABNORMAL_ALERT,
        title=f"Simulated Trip — {asset.name}",
        diagnosis=f"Active abnormality ({fault_type}) — trip generator engaged on {asset.asset_type}",
        report_text="\n".join(body_lines),
        risk_level="critical",
        urgency_score=92,
        immediate_actions=[
            "Verify live sensor readings against envelope limits.",
            "Confirm safe isolation before mechanical intervention.",
            "Review MANAS consolidation output for ranked root causes.",
        ],
    )


def trigger_anomaly_trip(asset_id: str | None = None, fault_type: str | None = None) -> dict:
    asset = resolve_trip_asset(asset_id)
    fault_type = fault_type or random.choice(FAULT_TYPES)

    from apps.synthetic.tasks import CAMPAIGN_MAX

    twin, _ = AssetTwinState.objects.get_or_create(asset=asset)
    state = dict(twin.state or {})
    target = CAMPAIGN_MAX.get(asset.asset_type, 5000.0) * 0.85
    state["_campaign_hours"] = target
    state["_fault_injected"] = True
    state["_fault_type"] = fault_type
    twin.state = state
    twin.health_score = min(twin.health_score or 100.0, 48.0)
    twin.save(update_fields=["state", "health_score", "updated_at"])

    alarm = _create_trip_alarm(asset, fault_type)
    report = _ensure_abnormal_report(asset, alarm, fault_type)
    _queue_synthetic_and_ml(asset)

    diag = build_diagnostic(asset)
    return {
        "status": "trip_queued",
        "asset_id": str(asset.id),
        "asset_name": asset.name,
        "asset_type": asset.asset_type,
        "fault_type": fault_type,
        "campaign_hours": round(target, 1),
        "alarm_id": str(alarm.id),
        "report_id": str(report.id),
        "anomalyActive": True,
        "tripActive": True,
        "faultInjected": True,
        "diagnostic": diag,
        "message": (
            f"Trip generated on {asset.name}. Unified snapshot flags updated; "
            "ML, consolidation, and abnormal report queued."
        ),
    }


def clear_anomaly_trip(asset_id: str | None = None) -> dict:
    if asset_id:
        assets = [get_object_or_404(Asset, pk=asset_id)]
    else:
        assets = list(Asset.objects.select_related("factory").all())

    cleared = 0
    for asset in assets:
        twin, _ = AssetTwinState.objects.get_or_create(asset=asset)
        state = dict(twin.state or {})
        if not state.get("_fault_injected") and twin.health_score >= 95:
            continue
        state["_campaign_hours"] = 0.0
        state["_fault_injected"] = False
        state["_fault_type"] = None
        state["_reset_requested"] = True
        twin.state = state
        twin.health_score = 100.0
        twin.save(update_fields=["state", "health_score", "updated_at"])
        AlarmEvent.objects.filter(
            asset=asset,
            alarm_type=SIMULATED_ALARM_TYPE,
            acknowledged=False,
        ).update(acknowledged=True)
        cleared += 1

    return {"status": "cleared", "assets_updated": cleared}
