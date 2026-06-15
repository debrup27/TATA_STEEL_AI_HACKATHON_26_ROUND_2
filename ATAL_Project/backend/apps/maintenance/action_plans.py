"""§5.3 maintenance action plan aggregator."""
from __future__ import annotations

from apps.assets.models import Asset, SparesPart
from apps.assets.spares_catalog import catalog_for_asset, ensure_asset_spares
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


def _order_decision(stock_qty: int, reorder_level: int) -> str:
  """Decide whether to raise a procurement order: order when at/below the reorder level."""
  if stock_qty <= 0:
    return "order"
  if reorder_level and stock_qty <= reorder_level:
    return "order"
  return "in_stock"


def _spares_for_asset(asset: Asset, report: MaintenanceReport | None) -> list[dict]:
  ensure_asset_spares(asset)
  # DB stock lookup by part name so LLM-strategy parts can be enriched with real on-hand quantity.
  db_by_name = {s.part_name: s for s in SparesPart.objects.filter(asset=asset)}

  def _row(part_name: str, qty: int, lead_days: int, stock_qty: int | None, reorder: int) -> dict:
    sq = int(stock_qty if stock_qty is not None else 0)
    decision = _order_decision(sq, reorder)
    return {
      "part": part_name,
      "qty": qty,
      "leadDays": lead_days,
      "stockQty": sq,
      "reorderLevel": int(reorder or 0),
      "orderDecision": decision,          # "order" | "in_stock"
      "inStock": decision == "in_stock",  # kept for back-compat
    }

  strategy = (report.spare_strategy if report else {}) or {}
  if isinstance(strategy, str):
    strategy = {"strategy": strategy, "parts": []}
  parts = strategy.get("parts") or strategy.get("required_parts") or []
  if parts:
    out = []
    for p in parts:
      if not isinstance(p, dict):
        continue
      name = p.get("part_name") or p.get("part") or "Part"
      db = db_by_name.get(name)
      stock_qty = (
        p.get("quantity_in_stock")
        if p.get("quantity_in_stock") is not None
        else (db.quantity_in_stock if db else (0 if not p.get("in_stock", True) else 1))
      )
      reorder = db.reorder_level if db else int(p.get("reorder_level") or 0)
      out.append(_row(
        name,
        int(p.get("qty") or p.get("quantity") or 1),
        int(p.get("lead_time_days") or p.get("leadDays") or (db.lead_time_days if db else 0)),
        stock_qty,
        reorder,
      ))
    if out:
      return out

  db_rows = list(SparesPart.objects.filter(asset=asset)[:6])
  if db_rows:
    return [
      _row(s.part_name, 1, s.lead_time_days, s.quantity_in_stock, s.reorder_level)
      for s in db_rows
    ]
  return [
    _row(p["part_name"], 1, p["lead_time_days"], p.get("quantity_in_stock") or 0, p.get("reorder_level") or 0)
    for p in catalog_for_asset(asset)[:4]
  ]


def _long_term_from_report(report: MaintenanceReport | None) -> list[str]:
  if not report:
    return []
  out = []
  for m in report.long_term_monitoring or []:
    if isinstance(m, dict):
      out.append(
        f"{m.get('sensor', 'Sensor')}: {m.get('threshold', '—')} — {m.get('rationale', '')}".strip(" —")
      )
    else:
      out.append(str(m))
  return out


def build_action_plan(asset: Asset) -> dict:
  report = (
    MaintenanceReport.objects.filter(
      asset=asset,
      report_type=MaintenanceReport.ReportType.MAINTENANCE,
      title__startswith="Maintenance Plan —",
    )
    .order_by("-created_at", "-id")
    .first()
  )
  if not report:
    report = (
      MaintenanceReport.objects.filter(
        asset=asset,
        report_type=MaintenanceReport.ReportType.MAINTENANCE,
      )
      .exclude(title__startswith="Plant Maintenance Intelligence")
      .order_by("-created_at")
      .first()
    )
  wo = WorkOrder.objects.filter(asset=asset).order_by("-created_at").first()

  immediate = list(report.immediate_actions) if report else []
  if wo and wo.recommended_actions:
    for a in wo.recommended_actions:
      if isinstance(a, str) and a not in immediate:
        immediate.append(a)

  long_term = _long_term_from_report(report)
  if not long_term:
    long_term = [
      "Trend vibration RMS daily — escalate if ISO 10816 zone C breached.",
      "Review oil cleanliness ISO 4406 weekly on lubricated paths.",
    ]

  summary = ""
  if report and report.report_text:
    summary = report.report_text.strip()
  elif report and report.diagnosis:
    summary = report.diagnosis[:280]
  elif wo and wo.description:
    summary = wo.description[:280]

  spares = _spares_for_asset(asset, report)
  strategy_text = ""
  if report and isinstance(report.spare_strategy, dict):
    strategy_text = str(report.spare_strategy.get("strategy") or "")
  if strategy_text and strategy_text not in summary:
    summary = f"{summary} {strategy_text}".strip()

  return {
    "id": f"plan-{asset.id}",
    "assetId": str(asset.id),
    "asset": asset.name,
    "factory": asset.factory.name,
    "riskLevel": (report.risk_level if report and report.risk_level else "medium"),
    "immediateActions": immediate or ["Review latest telemetry and confirm safe operating limits."],
    "steps": _steps_from_report(report) if report else [],
    "longTermMonitoring": long_term,
    "spares": spares,
    "optimizedPlanSummary": summary or "Predictive maintenance plan — regenerate if fields are empty.",
    "workOrderId": str(wo.id) if wo else None,
    "reportId": str(report.id) if report else None,
    "generatedAt": report.created_at.isoformat() if report else None,
  }


def list_action_plans(factory_id: str | None = None) -> list[dict]:
  qs = Asset.objects.select_related("factory").order_by("factory__name", "name")
  if factory_id:
    qs = qs.filter(factory_id=factory_id)
  plans = [build_action_plan(asset) for asset in qs]
  plans.sort(key=lambda p: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(p["riskLevel"], 4))
  return plans
