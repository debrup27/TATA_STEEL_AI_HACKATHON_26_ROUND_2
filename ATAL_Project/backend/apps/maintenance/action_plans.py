"""§5.3 maintenance action plan aggregator."""
from __future__ import annotations

from apps.assets.models import Asset, SparesPart
from apps.maintenance.models import WorkOrder
from apps.reports.models import MaintenanceReport


def _steps_from_report(report: MaintenanceReport) -> list[dict]:
  steps = []
  for i, rec in enumerate(report.recommendations or []):
    if isinstance(rec, dict):
      steps.append({
        "order": i + 1,
        "action": rec.get("step") or rec.get("action") or str(rec),
        "safety": rec.get("iso_ref") or rec.get("rationale") or "Follow plant SOP",
        "duration": rec.get("duration") or "—",
      })
    elif isinstance(rec, str):
      steps.append({
        "order": i + 1,
        "action": rec,
        "safety": "Follow plant SOP",
        "duration": "—",
      })
  return steps


def _spares_for_asset(asset: Asset, report: MaintenanceReport | None) -> list[dict]:
  strategy = (report.spare_strategy if report else {}) or {}
  parts = strategy.get("parts") or strategy.get("required_parts") or []
  if parts:
    out = []
    for p in parts:
      if isinstance(p, dict):
        out.append({
          "part": p.get("part_name") or p.get("part") or "Part",
          "qty": int(p.get("qty") or p.get("quantity") or 1),
          "leadDays": int(p.get("lead_time_days") or p.get("leadDays") or 0),
          "inStock": bool(p.get("in_stock", p.get("inStock", True))),
        })
    return out
  return [
    {
      "part": s.part_name,
      "qty": 1,
      "leadDays": s.lead_time_days,
      "inStock": s.quantity_in_stock > 0,
    }
    for s in SparesPart.objects.filter(asset=asset)[:6]
  ]


def build_action_plan(asset: Asset) -> dict | None:
  report = (
    MaintenanceReport.objects.filter(asset=asset)
    .order_by("-created_at")
    .first()
  )
  wo = WorkOrder.objects.filter(asset=asset).order_by("-created_at").first()

  if not report and not wo:
    return None

  immediate = list(report.immediate_actions) if report else []
  if wo and wo.recommended_actions:
    for a in wo.recommended_actions:
      if isinstance(a, str) and a not in immediate:
        immediate.append(a)

  long_term = []
  if report:
    for m in report.long_term_monitoring or []:
      if isinstance(m, dict):
        long_term.append(
          f"{m.get('sensor', 'Sensor')}: {m.get('threshold', '')} — {m.get('rationale', '')}"
        )
      else:
        long_term.append(str(m))

  summary = ""
  if report and report.report_text:
    summary = report.report_text[:280].replace("\n", " ")
  elif wo and wo.description:
    summary = wo.description[:280]

  return {
    "id": f"plan-{asset.id}",
    "assetId": str(asset.id),
    "asset": asset.name,
    "factory": asset.factory.name,
    "riskLevel": (report.risk_level if report and report.risk_level else "medium"),
    "immediateActions": immediate or ["Review latest telemetry and confirm safe operating limits."],
    "steps": _steps_from_report(report) if report else [],
    "longTermMonitoring": long_term,
    "spares": _spares_for_asset(asset, report),
    "optimizedPlanSummary": summary or "No consolidated plan text — trigger SANSAD consolidation.",
    "workOrderId": str(wo.id) if wo else None,
    "reportId": str(report.id) if report else None,
  }


def list_action_plans(factory_id: str | None = None) -> list[dict]:
  qs = Asset.objects.select_related("factory").order_by("factory__name", "name")
  if factory_id:
    qs = qs.filter(factory_id=factory_id)
  plans = []
  for asset in qs:
    plan = build_action_plan(asset)
    if plan:
      plans.append(plan)
  plans.sort(key=lambda p: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(p["riskLevel"], 4))
  return plans
