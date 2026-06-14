"""Unified notification feed for SANSAD tickers and workflow alerts."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.alerts.models import AlarmEvent
from apps.ml.models import MLPrediction
from apps.consolidation.models import ConsolidationResult


class NotificationFeedView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    limit = min(int(request.query_params.get("limit", 30)), 100)
    factory_id = request.query_params.get("factory_id")

    alarms_qs = AlarmEvent.objects.select_related("asset", "asset__factory").filter(
      acknowledged=False
    ).order_by("-created_at")
    if factory_id:
      alarms_qs = alarms_qs.filter(asset__factory_id=factory_id)

    preds_qs = MLPrediction.objects.select_related("asset", "asset__factory", "model").order_by(
      "-prediction_time"
    )
    if factory_id:
      preds_qs = preds_qs.filter(asset__factory_id=factory_id)

    consolidations = (
      ConsolidationResult.objects.filter(status__in=["pending", "running"])
      .select_related("asset")
      .order_by("-created_at")[:10]
    )

    alarms = []
    for a in alarms_qs[:limit]:
      alarms.append({
        "id": str(a.id),
        "kind": "alert",
        "asset_id": str(a.asset_id) if a.asset_id else None,
        "asset_name": a.asset.name if a.asset_id else "Plant",
        "factory": a.asset.factory.name if a.asset_id else None,
        "severity": a.severity,
        "message": a.message,
        "created_at": a.created_at.isoformat() if a.created_at else None,
      })

    predictions = []
    seen_assets: set[str] = set()
    for p in preds_qs:
      aid = str(p.asset_id)
      if aid in seen_assets:
        continue
      seen_assets.add(aid)
      out = p.prediction_output or {}
      predictions.append({
        "id": str(p.id),
        "kind": "prediction",
        "asset_id": aid,
        "asset_name": p.asset.name,
        "factory": p.asset.factory.name,
        "model_type": p.model.model_type if p.model_id else None,
        "rul_hours": out.get("rul_hours"),
        "health_score": out.get("health_score"),
        "anomaly_score": out.get("anomaly_score"),
        "created_at": p.prediction_time.isoformat() if p.prediction_time else None,
      })
      if len(predictions) >= limit:
        break

    orchestration = []
    for c in consolidations:
      orchestration.append({
        "id": str(c.id),
        "kind": "orchestration",
        "asset_id": str(c.asset_id) if c.asset_id else None,
        "asset_name": c.asset.name if c.asset_id else "Asset",
        "status": c.status,
        "task_id": c.celery_task_id,
      })

    ticker_items = []
    for item in alarms[:8]:
      ticker_items.append({
        "text": f"{item['asset_name']}: {item['message'][:80]}",
        "isSeparator": False,
      })
      ticker_items.append({"text": "✦", "isSeparator": True})
    for item in predictions[:6]:
      rul = item.get("rul_hours")
      if rul is not None:
        days = max(1, int(round(float(rul) / 24)))
        ticker_items.append({
          "text": f"{item['asset_name']}: RUL {days}d",
          "isSeparator": False,
        })
        ticker_items.append({"text": "✦", "isSeparator": True})

    return Response({
      "alerts": alarms,
      "predictions": predictions,
      "orchestration": orchestration,
      "ticker_items": ticker_items,
    })
