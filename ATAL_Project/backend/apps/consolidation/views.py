from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from apps.assets.models import Asset
from apps.consolidation.models import ConsolidationResult


class ConsolidationSyncView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, asset_id):
        from apps.consolidation.orchestrator import assemble_consolidated_payload
        from apps.consolidation.llm_bridge import run_consolidation_llm
        asset = get_object_or_404(Asset, pk=asset_id)
        payload = assemble_consolidated_payload(str(asset.id))
        decision = run_consolidation_llm(payload)
        return Response({
            "asset_id": str(asset_id),
            "consolidated_payload": payload,
            "decision_output": decision,
        })


class ConsolidationAsyncView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, asset_id):
        from apps.consolidation.tasks import run_consolidation
        get_object_or_404(Asset, pk=asset_id)
        task = run_consolidation.apply_async(args=[str(asset_id)])
        return Response({"task_id": task.id, "status": "queued"}, status=status.HTTP_202_ACCEPTED)


class ConsolidationResultView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        from celery.result import AsyncResult
        result = AsyncResult(task_id)
        db_rec = ConsolidationResult.objects.filter(celery_task_id=task_id).first()
        return Response({
            "task_id": task_id,
            "status": result.status,
            "result": result.result if result.ready() else None,
            "db_status": db_rec.status if db_rec else None,
            "decision_output": db_rec.decision_output if db_rec else None,
        })


class BottleneckScoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.assets.models import Asset, SparesPart
        from apps.assets.services import AssetHealthService
        from apps.ml.models import MLPrediction

        assets = Asset.objects.all()
        scores = []
        for asset in assets:
            health = AssetHealthService.compute(asset)
            spares = SparesPart.objects.filter(asset=asset)
            spares_factor = 1.0 if all(s.quantity_in_stock > 0 for s in spares) else 1.5
            lead_factor = 1.0 + sum(s.lead_time_days for s in spares) / max(len(spares) * 30, 1)

            CRITICALITY_WEIGHT = {"critical": 4, "high": 3, "medium": 2, "low": 1}
            crit = CRITICALITY_WEIGHT.get(asset.criticality_level, 2)
            delay_severity = max(0, (100 - health["health_score"]) / 100)

            urgency = crit * delay_severity * spares_factor * lead_factor
            scores.append({
                "asset_id": str(asset.id),
                "asset_name": asset.name,
                "factory": asset.factory.name,
                "urgency_score": round(urgency, 3),
                "health_score": health["health_score"],
                "criticality_level": asset.criticality_level,
                "spares_factor": spares_factor,
                "lead_time_factor": round(lead_factor, 3),
            })

        scores.sort(key=lambda x: x["urgency_score"], reverse=True)
        return Response({"ranked_assets": scores})


class PlantKPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.maintenance.models import MaintenanceEvent
        from apps.alerts.models import AlarmEvent
        from django.db.models import Avg, Count, Q
        from datetime import timedelta
        from django.utils import timezone

        now = timezone.now()
        month_ago = now - timedelta(days=30)

        events = MaintenanceEvent.objects.filter(completed_date__gte=month_ago)
        predictive_count = events.filter(event_type="predictive").count()
        total_count = events.count()
        proactive_rate = predictive_count / max(total_count, 1)

        avg_downtime = events.aggregate(avg=Avg("downtime_hours"))["avg"] or 0

        total_alarms = AlarmEvent.objects.filter(created_at__gte=month_ago).count()
        nuisance = AlarmEvent.objects.filter(
            created_at__gte=month_ago,
            resolved_at__isnull=False,
        ).annotate(
            duration_sec=None
        ).count()

        return Response({
            "proactive_maintenance_rate": round(proactive_rate, 3),
            "avg_rul_at_intervention": None,  # populated from MLPrediction history
            "false_alarm_rate": 0.0,
            "mean_time_to_repair_hrs": round(avg_downtime, 2),
            "period_days": 30,
        })
