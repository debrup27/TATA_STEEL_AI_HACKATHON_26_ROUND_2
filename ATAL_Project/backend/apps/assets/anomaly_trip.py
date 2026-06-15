"""Universal abnormality / trip generator — propagates via plant snapshot flags."""
from __future__ import annotations

import logging
import random

from django.shortcuts import get_object_or_404
from django.utils import timezone as dj_timezone

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

        def _regen(aid: str):
            import django.db
            try:
                regenerate_intelligence_on_anomaly_sync(aid, trigger="anomaly")
            finally:
                django.db.connections.close_all()

        threading.Thread(
            target=_regen,
            args=(str(asset.id),),
            daemon=True,
            name=f"intel-regen-{str(asset.id)[:8]}",
        ).start()
    except Exception as exc:
        logger.warning("trip intelligence regen failed asset=%s err=%s", asset.id, exc)

    # NOTE: no Celery consolidation here — that ran the LLM inside a Celery worker.
    # Human-readable regen is handled by the inline intelligence-regen thread above; the
    # rapid-degrade loop (spawned in trigger_anomaly_trip) drives the live 5 s recompute.


def _rapid_degrade_loop(asset_id: str, fault_type: str, ticks: int = 18, interval_s: float = 5.0) -> None:
    """Drive visible rapid degradation every `interval_s` for ~`ticks` cycles (no Celery).

    Each tick: aggressively advance campaign_hours, regenerate synthetic data (fault-aware) inline,
    recompute the authoritative deterministic state, write twin + MLPrediction, broadcast telemetry.
    Stops early if the fault is cleared (toggle off). All pages polling the snapshot see health
    fall, anomaly rise and RUL collapse in real time.
    """
    import time

    import django.db
    from apps.assets.models import Asset
    from apps.twins.models import AssetTwinState
    from apps.ml.models import MLPrediction
    from apps.ml.deterministic import compute_asset_state
    from apps.synthetic.tasks import CAMPAIGN_MAX, generate_readings_sync

    try:
        asset = Asset.objects.get(id=asset_id)
    except Asset.DoesNotExist:
        return

    cmax = float(CAMPAIGN_MAX.get(asset.asset_type, 5000.0))
    step = cmax * 0.02  # ~2% of life per tick → fast, visible collapse

    for _ in range(ticks):
        try:
            twin = AssetTwinState.objects.filter(asset=asset).first()
            state = dict(twin.state or {}) if twin else {}
            # Stop only on an explicit clear (toggle off sets _reset_requested). We must NOT rely on
            # _fault_injected, because the live synthetic beat one-shot-clears that flag every ~10s.
            if state.get("_reset_requested"):
                break

            # Re-assert the fault each tick so the synthetic beat's one-shot clear can't truncate the
            # degradation — the abnormality stays active until the user clears it.
            state["_fault_injected"] = True
            state["_fault_type"] = fault_type
            state["_campaign_hours"] = min(round(float(state.get("_campaign_hours") or 0.0) + step, 2), cmax * 0.99)
            twin.state = state
            twin.save(update_fields=["state", "updated_at"])

            generate_readings_sync(asset, n_samples=12)

            consolidated = compute_asset_state(asset)
            MLPrediction.objects.create(
                asset=asset,
                model=None,
                input_features={},
                prediction_output=consolidated,
                confidence=consolidated.get("fault_confidence"),
            )
            twin.health_score = consolidated["health_score"]
            twin.save(update_fields=["health_score", "updated_at"])

            try:
                from apps.telemetry.tasks import broadcast_cells
                broadcast_cells()
            except Exception:
                pass
        except Exception as exc:
            logger.warning("rapid_degrade_tick_failed asset=%s err=%s", asset_id, exc)
        finally:
            django.db.close_old_connections()
        time.sleep(interval_s)


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

    # Spawn the live 5 s rapid-degrade loop (no Celery) — guard against duplicates per asset.
    import threading

    loop_name = f"rapid-degrade-{str(asset.id)[:8]}"
    if not any(t.name == loop_name for t in threading.enumerate()):
        threading.Thread(
            target=_rapid_degrade_loop,
            args=(str(asset.id), fault_type),
            daemon=True,
            name=loop_name,
        ).start()

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
        # Ack ALL unacked alarms for the asset — not just the simulated_trip marker. The rapid
        # degrade loop fires real sensor-threshold alarms each tick; if those linger unacked they
        # keep active_alerts>=3 and cap RUL low after the fault is cleared (stale-state bug).
        AlarmEvent.objects.filter(asset=asset, acknowledged=False).update(
            acknowledged=True, resolved_at=dj_timezone.now()
        )
        cleared += 1

    return {"status": "cleared", "assets_updated": cleared}
