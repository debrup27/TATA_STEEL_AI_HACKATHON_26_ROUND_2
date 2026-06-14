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
        from apps.ml.models import MLPrediction
        from apps.twins.models import AssetTwinState
        from django.db.models import Avg, Count, Q
        from datetime import timedelta
        from django.utils import timezone
        import json

        now = timezone.now()
        month_ago = now - timedelta(days=30)

        # Proactive vs total maintenance
        events = MaintenanceEvent.objects.filter(completed_date__gte=month_ago)
        predictive_count = events.filter(event_type="predictive").count()
        total_count = events.count()
        proactive_rate = predictive_count / max(total_count, 1)
        avg_downtime = events.aggregate(avg=Avg("downtime_hours"))["avg"] or 0.0

        # Average RUL at time of intervention (from ML predictions near maintenance events)
        rul_values = []
        for event in events.select_related("asset").filter(asset__isnull=False):
            pred = (
                MLPrediction.objects.filter(
                    asset=event.asset,
                    prediction_time__lte=event.scheduled_date or now,
                )
                .order_by("-prediction_time")
                .first()
            )
            if pred and pred.prediction_output:
                rul = pred.prediction_output.get("rul_hours")
                if rul is not None:
                    rul_values.append(float(rul))

        avg_rul_at_intervention = round(sum(rul_values) / len(rul_values), 1) if rul_values else None

        # False alarm rate: alarms resolved within 10 min / total alarms (nuisance indicator)
        total_alarms = AlarmEvent.objects.filter(created_at__gte=month_ago).count()
        from django.db.models import ExpressionWrapper, DurationField, F as Fexpr
        short_lived = AlarmEvent.objects.filter(
            created_at__gte=month_ago,
            resolved_at__isnull=False,
        ).annotate(
            resolve_duration=ExpressionWrapper(
                Fexpr("resolved_at") - Fexpr("created_at"),
                output_field=DurationField(),
            )
        ).filter(resolve_duration__lt=timedelta(minutes=10)).count()
        false_alarm_rate = round(short_lived / max(total_alarms, 1), 3)

        # Current plant health (mean of all twin states)
        twin_health = AssetTwinState.objects.aggregate(avg=Avg("health_score"))["avg"] or 80.0

        # Latest RUL across all assets (min = most critical)
        latest_rul = []
        for pred in (
            MLPrediction.objects
            .filter(prediction_time__gte=month_ago)
            .order_by("asset", "-prediction_time")
            .distinct("asset")
        ):
            rul = pred.prediction_output.get("rul_hours") if pred.prediction_output else None
            if rul is not None:
                latest_rul.append(float(rul))

        return Response({
            "proactive_maintenance_rate": round(proactive_rate, 3),
            "avg_rul_at_intervention": avg_rul_at_intervention,
            "false_alarm_rate": false_alarm_rate,
            "mean_time_to_repair_hrs": round(float(avg_downtime), 2),
            "plant_health_score": round(float(twin_health), 1),
            "min_asset_rul_hours": round(min(latest_rul), 1) if latest_rul else None,
            "avg_asset_rul_hours": round(sum(latest_rul) / len(latest_rul), 1) if latest_rul else None,
            "total_alarms_30d": total_alarms,
            "period_days": 30,
        })
