import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


def _humanize_report_text(text: str, asset) -> str:
    """Replace UUIDs and ML jargon with operator-readable phrasing."""
    import re

    if not text:
        return ""
    out = text.replace(str(asset.id), asset.name)
    out = re.sub(
        r"health_score\s*=\s*(\d+(?:\.\d+)?)",
        lambda m: f"health {float(m.group(1)):.0f}%",
        out,
        flags=re.IGNORECASE,
    )
    out = out.replace("(severely degraded)", "(critically low)")
    return re.sub(r"\s{2,}", " ", out).strip()


def _report_summary(decision: dict, asset) -> str:
    recs = decision.get("recommendations") or []
    if recs and isinstance(recs[0], dict) and recs[0].get("step"):
        return recs[0]["step"]
    return _humanize_report_text(decision.get("diagnosis", ""), asset)


def _normalise_spare_strategy(decision: dict, asset) -> dict:
    from apps.assets.spares_catalog import ensure_asset_spares
    from apps.assets.models import SparesPart

    ensure_asset_spares(asset)
    raw = decision.get("spare_strategy")
    if isinstance(raw, dict) and raw.get("parts"):
        return raw
    if isinstance(raw, str) and raw.strip():
        parts = [
            {
                "part_name": s.part_name,
                "qty": 1,
                "lead_time_days": s.lead_time_days,
                "in_stock": s.quantity_in_stock > 0,
            }
            for s in SparesPart.objects.filter(asset=asset)[:4]
        ]
        return {"strategy": raw, "parts": parts}
    parts = [
        {
            "part_name": s.part_name,
            "qty": 1,
            "lead_time_days": s.lead_time_days,
            "in_stock": s.quantity_in_stock > 0,
        }
        for s in SparesPart.objects.filter(asset=asset)[:4]
    ]
    return {"strategy": "Maintain critical spares per OEM lead times.", "parts": parts}


def run_consolidation_inline(asset_id: str, *, celery_task_id: str = "") -> dict:
    """Run the agentic consolidation graph + persist results. NOT a Celery task.

    The 9B+0.8B orchestration must never execute inside a Celery worker (project
    rule). This plain function is called from a request-spawned daemon thread; the
    Celery wrapper below exists only for the dormant async/beat API surface.
    """
    from apps.consolidation.orchestrator import assemble_consolidated_payload
    from apps.consolidation.models import ConsolidationResult
    from apps.reports.models import MaintenanceReport
    from apps.maintenance.models import WorkOrder
    from apps.assets.models import Asset
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    result_rec = ConsolidationResult.objects.create(
        asset_id=asset_id,
        celery_task_id=celery_task_id,
        status=ConsolidationResult.Status.RUNNING,
    )

    try:
        payload = assemble_consolidated_payload(asset_id)
        result_rec.consolidated_payload = payload
        result_rec.save(update_fields=["consolidated_payload"])

        # Two-tier agentic orchestration: supervisor (9B) + workers (0.8B)
        from apps.agents.graph.runner import run_sansad_orchestration
        decision = run_sansad_orchestration(asset_id, trigger="consolidation")

        if decision:
            result_rec.decision_output = decision
            result_rec.status = ConsolidationResult.Status.COMPLETE
            result_rec.completed_at = timezone.now()
            result_rec.save()

            # Persist to MaintenanceReport
            asset = Asset.objects.get(id=asset_id)
            summary = _report_summary(decision, asset)
            report = MaintenanceReport.objects.create(
                asset=asset,
                source=MaintenanceReport.Source.AI_GENERATED,
                report_type=MaintenanceReport.ReportType.MAINTENANCE,
                title=f"Maintenance Report — {asset.name}",
                diagnosis=summary or _humanize_report_text(decision.get("diagnosis", ""), asset),
                rca=decision.get("rca", ""),
                risk_level=decision.get("risk_level"),
                urgency_score=decision.get("urgency_score"),
                recommendations=decision.get("recommendations", []),
                immediate_actions=decision.get("immediate_actions", []),
                long_term_monitoring=decision.get("long_term_monitoring", []),
                spare_strategy=_normalise_spare_strategy(decision, asset),
                citations=decision.get("citations", []),
                report_text=decision.get("report_text", ""),
            )

            # Auto-generate WorkOrder for high/critical risk
            if decision.get("risk_level") in ("high", "critical"):
                priority_map = {"high": "2-high", "critical": "1-critical"}
                WorkOrder.objects.create(
                    asset=asset,
                    priority=priority_map[decision["risk_level"]],
                    title=(summary or f"{asset.name} maintenance required")[:255],
                    description=decision.get("rca", ""),
                    recommended_actions=decision.get("recommendations", []),
                    source=WorkOrder.Source.AI_GENERATED,
                )

            # Push WS notification to orchestration group (frontend listens on /ws/orchestration/)
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"orchestration_{asset_id}",
                {
                    "type": "decision.done",
                    "data": {
                        "task_id": celery_task_id,
                        "decision_output": decision,
                        "report_id": str(report.id),
                    },
                },
            )

            return {"status": "complete", "report_id": str(report.id)}
        else:
            result_rec.status = ConsolidationResult.Status.FAILED
            result_rec.error_message = "LLM returned no decision."
            result_rec.completed_at = timezone.now()
            result_rec.save()
            return {"status": "failed", "error": "LLM returned no decision."}

    except Exception as exc:
        result_rec.status = ConsolidationResult.Status.FAILED
        result_rec.error_message = str(exc)
        result_rec.completed_at = timezone.now()
        result_rec.save()
        logger.error("consolidation_error asset_id=%s error=%s", asset_id, str(exc))
        raise

# NOTE: there is intentionally NO Celery task wrapping the consolidation graph.
# The agentic supervisor (qwen3.5:9b) + workers (0.8b) must never run inside a
# Celery worker — every live caller invokes run_consolidation_inline() from a
# request-spawned daemon thread instead. See apps/assets/diagnostics_views.py and
# apps/consolidation/views.py (ConsolidationSyncView).
