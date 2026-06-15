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
        celery_status = result.status
        db_status = db_rec.status if db_rec else None
        done = celery_status in ("SUCCESS",) or db_status == ConsolidationResult.Status.COMPLETE
        failed = celery_status in ("FAILURE",) or db_status == ConsolidationResult.Status.FAILED
        return Response({
            "task_id": task_id,
            "status": "SUCCESS" if done else "FAILURE" if failed else celery_status,
            "celery_status": celery_status,
            "db_status": db_status,
            "result": result.result if result.ready() else None,
            "decision_output": db_rec.decision_output if db_rec else None,
            "error": db_rec.error_message if db_rec and failed else None,
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
        for asset in sorted(assets, key=lambda a: a.criticality_level or "medium"):
            health = AssetHealthService.compute(asset)
            payload = assemble_consolidated_payload(str(asset.id))
            bottleneck = compute_bottleneck_score(asset, payload)
            report = (
                MaintenanceReport.objects.filter(asset=asset)
                .order_by("-created_at")
                .first()
            )

            spares_parts = payload.get("spares", {}).get("parts", [])
            from apps.assets.spares_status import evaluate_spares

            spare_eval = evaluate_spares(spares_parts)
            spares_available = spare_eval["spares_available"]
            spares_status = spare_eval["spares_status"]

            lead_days = bottleneck.get("procurement_lead_days", 0)
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
                "spares_status": spares_status,
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


class BottleneckInsightView(APIView):
    """POST — inline bottleneck / risk insight (no chat session)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, asset_id):
        from apps.agents.risk_insight import generate_bottleneck_insight
        from apps.assets.diagnostics_service import build_diagnostic
        from apps.assets.services import AssetHealthService
        from apps.consolidation.orchestrator import assemble_consolidated_payload
        from apps.consolidation.scoring import compute_bottleneck_score
        from apps.reports.models import MaintenanceReport

        asset = get_object_or_404(Asset.objects.select_related("factory"), pk=asset_id)
        health = AssetHealthService.compute(asset)
        payload = assemble_consolidated_payload(str(asset.id))
        bottleneck = compute_bottleneck_score(asset, payload)
        diag = build_diagnostic(asset)
        report = (
            MaintenanceReport.objects.filter(asset=asset)
            .order_by("-created_at")
            .first()
        )

        spares_parts = payload.get("spares", {}).get("parts", [])
        from apps.assets.spares_status import evaluate_spares

        spare_eval = evaluate_spares(spares_parts)
        spares_available = spare_eval["spares_available"]

        impact = (
            report.diagnosis[:200]
            if report and report.diagnosis
            else f"Health {health['health_score']:.0f}% — {bottleneck['composite_label']} bottleneck risk."
        )
        recommendation = (
            (report.immediate_actions or [""])[0]
            if report and report.immediate_actions
            else f"Prioritize {asset.name} — composite score {bottleneck['composite_score']:.2f}."
        )

        rank = int(request.data.get("bottleneck_rank") or 1)

        try:
            result = generate_bottleneck_insight(
                asset_name=asset.name,
                factory=asset.factory.name,
                health=int(round(health["health_score"])),
                risk_level=bottleneck["composite_label"],
                urgency_score=round(bottleneck["composite_score"] * 100, 1),
                bottleneck_rank=rank,
                process_criticality=round(bottleneck["process_criticality"] * 100, 1),
                delay_severity=round(bottleneck["delay_severity"] * 100, 1),
                procurement_lead_days=int(bottleneck.get("procurement_lead_days", 0)),
                spares_available=spares_available,
                impact=impact,
                recommendation=recommendation,
                probable_fault=diag.get("probableFault", ""),
            )
        except Exception as exc:
            return Response({"error": f"insight unavailable: {exc}"}, status=503)

        return Response({
            "asset_id": str(asset.id),
            "insight_angle": result["insight_angle"],
            "insight": result["insight"],
            "router": result["router"],
        })


class PlantCostAnalysisView(APIView):
    """GET — factory-level predictive cost analysis (loss-if-no-action vs PdM savings, ₹ lakhs)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.assets.models import Factory
        from apps.assets.pareto_maintenance import compute_factory_cost_analysis

        factory_id = request.query_params.get("factory_id")
        factories = (
            Factory.objects.filter(id=factory_id) if factory_id else Factory.objects.all()
        )
        results = []
        for factory in factories:
            try:
                results.append(compute_factory_cost_analysis(factory))
            except Exception as exc:  # never 500 the dashboard
                results.append({"factory_id": str(factory.id), "factory": factory.name, "error": str(exc)})

        totals = {
            "predicted_loss_lakhs": round(sum(r.get("predicted_loss_lakhs", 0) for r in results), 2),
            "pdm_savings_lakhs": round(sum(r.get("pdm_savings_lakhs", 0) for r in results), 2),
        }
        return Response({"factories": results, "plant_totals": totals})


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
