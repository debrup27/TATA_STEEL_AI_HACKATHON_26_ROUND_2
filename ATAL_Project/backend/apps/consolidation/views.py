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
        from apps.agents.graph.runner import run_sansad_orchestration

        asset = get_object_or_404(Asset, pk=asset_id)
        payload = assemble_consolidated_payload(str(asset.id))
        decision = run_sansad_orchestration(str(asset.id), trigger="sync_api")
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
        from apps.assets.models import Asset
        from apps.assets.services import AssetHealthService
        from apps.consolidation.orchestrator import assemble_consolidated_payload
        from apps.consolidation.scoring import compute_bottleneck_score
        from apps.reports.models import MaintenanceReport

        assets = Asset.objects.select_related("factory").all()
        scores = []
        for rank, asset in enumerate(
            sorted(assets, key=lambda a: a.criticality_level or "medium"), start=1
        ):
            health = AssetHealthService.compute(asset)
            payload = assemble_consolidated_payload(str(asset.id))
            bottleneck = compute_bottleneck_score(asset, payload)
            report = (
                MaintenanceReport.objects.filter(asset=asset)
                .order_by("-created_at")
                .first()
            )

            spares_parts = payload.get("spares", {}).get("parts", [])
            spares_available = all(
                (p.get("quantity_in_stock") or 0) > 0 for p in spares_parts
            ) if spares_parts else True
            lead_days = max(
                [p.get("lead_time_days") or 0 for p in spares_parts if (p.get("quantity_in_stock") or 0) == 0],
                default=0,
            )

            composite = bottleneck["composite_score"]
            urgency_pct = round(composite * 100, 1)
            impact = (
                report.diagnosis[:200]
                if report and report.diagnosis
                else f"Health {health['health_score']:.0f}% — {bottleneck['composite_label']} bottleneck risk."
            )
            recommendation = (
                (report.immediate_actions or [""])[0]
                if report and report.immediate_actions
                else f"Prioritize {asset.name} — composite score {composite:.2f}."
            )

            scores.append({
                "asset_id": str(asset.id),
                "asset_name": asset.name,
                "factory": asset.factory.name,
                "urgency_score": urgency_pct,
                "health_score": health["health_score"],
                "criticality_level": asset.criticality_level,
                "risk_level": bottleneck["composite_label"],
                "bottleneck_rank": 0,
                "process_criticality": round(bottleneck["process_criticality"] * 100, 1),
                "delay_severity": round(bottleneck["delay_severity"] * 100, 1),
                "spares_available": spares_available,
                "procurement_lead_days": int(lead_days),
                "composite_score": composite,
                "impact": impact,
                "recommendation": recommendation,
            })

        scores.sort(key=lambda x: x["composite_score"], reverse=True)
        for i, row in enumerate(scores, start=1):
            row["bottleneck_rank"] = i
            row["urgency_score"] = round(row["composite_score"] * 100, 1)

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
