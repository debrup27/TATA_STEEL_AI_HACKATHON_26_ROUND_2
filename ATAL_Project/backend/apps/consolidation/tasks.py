import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="apps.consolidation.run", bind=True, time_limit=120)
def run_consolidation(self, asset_id: str):
    from apps.consolidation.orchestrator import assemble_consolidated_payload
    from apps.consolidation.llm_bridge import run_consolidation_llm
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

        decision = run_consolidation_llm(payload)

        if decision:
            result_rec.decision_output = decision
            result_rec.status = ConsolidationResult.Status.COMPLETE
            result_rec.completed_at = timezone.now()
            result_rec.save()

            # Persist to MaintenanceReport
            asset = Asset.objects.get(id=asset_id)
            report = MaintenanceReport.objects.create(
                asset=asset,
                source=MaintenanceReport.Source.AI_GENERATED,
                diagnosis=decision.get("diagnosis", ""),
                rca=decision.get("rca", ""),
                risk_level=decision.get("risk_level"),
                urgency_score=decision.get("urgency_score"),
                recommendations=decision.get("recommendations", []),
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
                    title=decision.get("diagnosis", "AI-generated work order")[:255],
                    description=decision.get("rca", ""),
                    recommended_actions=decision.get("recommendations", []),
                    source=WorkOrder.Source.AI_GENERATED,
                )

            # Push WS notification
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"consolidation_{asset_id}",
                {
                    "type": "consolidation.complete",
                    "task_id": self.request.id,
                    "decision_output": decision,
                    "report_id": str(report.id),
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
        logger.error("consolidation_error", asset_id=asset_id, error=str(exc))
        raise
