import logging
from celery import shared_task
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


@shared_task(name="apps.consolidation.run", bind=True, time_limit=120)
def run_consolidation(self, asset_id: str):
    from apps.consolidation.orchestrator import assemble_consolidated_payload
    from apps.consolidation.models import ConsolidationResult
    from apps.reports.models import MaintenanceReport
    from apps.maintenance.models import WorkOrder
    from apps.assets.models import Asset
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    result_rec = ConsolidationResult.objects.create(
        asset_id=asset_id,
        celery_task_id=self.request.id,
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
                diagnosis=summary or _humanize_report_text(decision.get("diagnosis", ""), asset),
                rca=decision.get("rca", ""),
                risk_level=decision.get("risk_level"),
                urgency_score=decision.get("urgency_score"),
                recommendations=decision.get("recommendations", []),
                immediate_actions=decision.get("immediate_actions", []),
                spare_strategy={"strategy": decision.get("spare_strategy", "")},
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
                        "task_id": self.request.id,
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


@shared_task(name="apps.consolidation.run_critical_consolidation")
def run_critical_consolidation():
    """
    Periodic task: trigger consolidation analysis for assets below health threshold.
    Beat: every 15 minutes. Targets assets with health_score < 70 (warning/critical state).
    """
    from apps.twins.models import AssetTwinState
    dispatched = 0
    # Assets below 70% health get full LangGraph analysis
    for twin in AssetTwinState.objects.filter(health_score__lt=70.0).select_related("asset"):
        run_consolidation.apply_async(args=[str(twin.asset.id)], queue="default")
        dispatched += 1
        logger.info(
            "critical_consolidation_triggered asset=%s health=%.1f",
            twin.asset.asset_type, twin.health_score,
        )
    return {"dispatched": dispatched}
