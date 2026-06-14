"""Samvidhaan live graph series + factory historical dossiers for SANSAD context."""
from __future__ import annotations

from collections import defaultdict
from datetime import timedelta

from django.utils import timezone

from apps.assets.models import Asset, Factory, SensorDefinition
from apps.assets.rul_calculator import SIM_MAX_RUL_HOURS
from apps.assets.services import AssetHealthService, FactoryHealthService
from apps.maintenance.models import MaintenanceEvent
from apps.ml.models import MLPrediction
from apps.reports.models import MaintenanceReport
from apps.telemetry.models import SensorReading
from apps.alerts.models import AlarmEvent

BUCKET_MINUTES = 10
GRAPH_HOURS = 12
MAX_BUCKETS = 72  # 12h @ 10min

HISTORICAL_TITLE = "Historical Plant Dossier — {factory}"


def _floor_bucket(ts):
    discard = ts.minute % BUCKET_MINUTES
    return ts.replace(minute=ts.minute - discard, second=0, microsecond=0)


def _bucket_sensor_series(asset: Asset, hours: int = GRAPH_HOURS) -> list[dict]:
    since = timezone.now() - timedelta(hours=hours)
    until = timezone.now() + timedelta(minutes=2)
    sensors = list(SensorDefinition.objects.filter(asset=asset))
    if not sensors:
        return []

    readings = (
        SensorReading.objects.filter(
            asset=asset,
            time__gte=since,
            time__lte=until,
        )
        .select_related("sensor_def")
        .order_by("time")
    )

    # bucket_key -> sensor_name -> [values]
    buckets: dict = defaultdict(lambda: defaultdict(list))
    for r in readings:
        bk = _floor_bucket(r.time)
        buckets[bk][r.sensor_def.sensor_name].append(float(r.value))

    sorted_keys = sorted(buckets.keys())[-MAX_BUCKETS:]
    series_out: list[dict] = []

    for sdef in sensors[:4]:
        name = sdef.sensor_name
        points = []
        for bk in sorted_keys:
            vals = buckets[bk].get(name, [])
            if vals:
                points.append({
                    "time": bk.isoformat(),
                    "value": round(sum(vals) / len(vals), 3),
                })
        if not points and readings.exists():
            # Fallback: latest single reading repeated for visibility
            latest = (
                SensorReading.objects.filter(asset=asset, sensor_def=sdef)
                .order_by("-time")
                .first()
            )
            if latest:
                points = [{"time": latest.time.isoformat(), "value": float(latest.value)}]

        if points:
            series_out.append({
                "sensor_name": name,
                "label": name.replace("_", " ").title(),
                "unit": sdef.unit or "",
                "points": points,
            })

    return series_out


def _rul_live_series(asset: Asset, hours: int = GRAPH_HOURS) -> list[dict]:
    since = timezone.now() - timedelta(hours=hours)
    preds = list(
        MLPrediction.objects.filter(
            asset=asset,
            model__model_type="rul_predictor",
            prediction_time__gte=since,
        )
        .order_by("prediction_time")[:MAX_BUCKETS]
    )

    points = []
    for p in preds:
        out = p.prediction_output or {}
        rul = out.get("rul_hours")
        if rul is None and "rul_days" in out:
            rul = float(out["rul_days"]) * 24.0
        if rul is not None:
            points.append({
                "time": p.prediction_time.isoformat(),
                "value": round(min(float(rul), 12000.0), 1),
            })

    if len(points) >= 3:
        return points

    from apps.assets.rul_calculator import compute_rul

    bundle = compute_rul(asset)
    current_rul = float(bundle.get("rul_hours") or 2400.0)
    # Cap display series — raw ML artifacts can be unrealistic for chart scale
    current_rul = min(current_rul, 12000.0)
    components = bundle.get("components") or {}
    n = min(24, MAX_BUCKETS)
    now = timezone.now()
    synth = []
    for i in range(n):
        t = now - timedelta(minutes=BUCKET_MINUTES * (n - 1 - i))
        stress_drift = float(components.get("sensor_stress") or 0) * 50 * (n - 1 - i) / max(n, 1)
        synth.append({
            "time": t.isoformat(),
            "value": round(max(0.0, current_rul + stress_drift), 1),
        })
    return synth


def build_asset_live_graph(asset: Asset) -> dict:
    from apps.assets.pareto_maintenance import compute_pareto_maintenance

    health = AssetHealthService.compute(asset)
    rul_series = _rul_live_series(asset)
    sensor_series = _bucket_sensor_series(asset)
    raw_rul = rul_series[-1]["value"] if rul_series else health.get("rul_hours")
    current_rul = min(float(raw_rul or 0), 12000.0) if raw_rul is not None else None

    return {
        "asset_id": str(asset.id),
        "asset_name": asset.name,
        "asset_type": asset.asset_type,
        "factory": asset.factory.name,
        "factory_id": str(asset.factory_id),
        "health_score": round(float(health["health_score"]), 1),
        "current_rul_hours": current_rul,
        "bucket_minutes": BUCKET_MINUTES,
        "updated_at": timezone.now().isoformat(),
        "rul_series": rul_series,
        "sensor_series": sensor_series,
        "pareto_maintenance": compute_pareto_maintenance(asset),
    }


def build_samvidhaan_graphs_payload() -> dict:
    from apps.assets.models import Factory
    from apps.assets.maintenance_snapshot import compute_factory_maintenance_snapshot

    factories = Factory.objects.order_by("code")
    return {
        "refresh_interval_seconds": 600,
        "updated_at": timezone.now().isoformat(),
        "sim_max_rul_hours": SIM_MAX_RUL_HOURS,
        "factories": [compute_factory_maintenance_snapshot(f) for f in factories],
    }


def build_historical_factory_dossier(factory: Factory) -> dict:
    """Factory-level historical markdown for Samvidhaan reports + MANAS context."""
    assets = list(factory.assets.all())
    fh = FactoryHealthService.compute(factory)
    since_90d = timezone.now() - timedelta(days=90)

    events = MaintenanceEvent.objects.filter(
        asset__factory=factory,
        completed_date__gte=since_90d,
    )
    event_rows = list(events.order_by("-completed_date")[:12])
    alarms = AlarmEvent.objects.filter(
        asset__factory=factory,
        created_at__gte=since_90d,
    ).count()

    downtime = sum(float(e.downtime_hours or 0) for e in events)
    by_type: dict[str, int] = defaultdict(int)
    for e in events:
        by_type[e.event_type or "other"] += 1

    asset_lines = []
    for a in assets:
        h = AssetHealthService.compute(a)
        ev_count = events.filter(asset=a).count()
        asset_lines.append(
            f"| {a.name} | {a.asset_type} | {h['health_score']:.0f}% | "
            f"{h.get('rul_hours') or '—'} h | {ev_count} events |"
        )

    maint_table = "\n".join(
        f"- **{e.completed_date}** — {e.asset.name}: {e.event_type} "
        f"({e.downtime_hours or 0}h downtime) — {(e.description or '')[:80]}"
        for e in event_rows[:8]
    ) or "- No logged maintenance in the last 90 days."

    mix_lines = "\n".join(
        f"- {k.replace('_', ' ').title()}: {v}" for k, v in sorted(by_type.items(), key=lambda x: -x[1])
    ) or "- No event type breakdown available."

    report_text = f"""# Historical Plant Dossier — {factory.name}

**Period:** Last 90 days | **Assets:** {len(assets)} | **Plant health:** {fh['health_score']:.0f}%

## Fleet snapshot
| Asset | Type | Health | RUL | Maint. events |
|-------|------|--------|-----|---------------|
{chr(10).join(asset_lines)}

## Maintenance history (recent)
{maint_table}

## Event mix
{mix_lines}

## Alarms & downtime
- Total alarms (90d): **{alarms}**
- Aggregate downtime: **{downtime:.1f} h**
- Bottleneck asset: **{next((a.name for a in assets if str(a.id) == str(fh.get('bottleneck_asset_id'))), assets[0].name if assets else '—')}**

## Sensor & RUL context for MANAS
- Live telemetry buckets every **{BUCKET_MINUTES} min** feed Samvidhaan graphs.
- RUL regressors run on campaign hours + vibration/temperature features per asset type.
- Use this dossier when ranking interventions and drafting intelligence reports.
"""

    worst = min(assets, key=lambda a: AssetHealthService.compute(a)["health_score"], default=None)
    risk = "critical" if worst and AssetHealthService.compute(worst)["health_score"] < 35 else "medium"

    return {
        "title": HISTORICAL_TITLE.format(factory=factory.name),
        "diagnosis": (
            f"{factory.name} — 90-day ops dossier: {len(event_rows)} maintenance records, "
            f"{alarms} alarms, {downtime:.0f}h downtime."
        ),
        "risk_level": risk,
        "urgency_score": round(max(0.2, 1.0 - fh["health_score"] / 100.0), 2),
        "report_text": report_text,
        "anchor_asset_id": str(worst.id) if worst else (str(assets[0].id) if assets else None),
        "immediate_actions": [
            f"Review 90-day maintenance mix on {factory.name} before next outage window.",
            "Cross-check alarm repeat offenders against sensor envelope trends.",
        ],
        "recommendations": [],
        "long_term_monitoring": [],
        "spare_strategy": {"strategy": "Historical spares consumption in maintenance logs.", "parts": []},
    }


def get_historical_context_for_factory(factory: Factory) -> str:
    report = (
        MaintenanceReport.objects.filter(
            asset__factory=factory,
            title=HISTORICAL_TITLE.format(factory=factory.name),
        )
        .order_by("-created_at")
        .first()
    )
    return report.report_text if report else build_historical_factory_dossier(factory)["report_text"]


def upsert_historical_factory_report(factory: Factory) -> MaintenanceReport:
    dossier = build_historical_factory_dossier(factory)
    title = dossier["title"]
    anchor_id = dossier.get("anchor_asset_id")
    anchor = factory.assets.filter(pk=anchor_id).first() or factory.assets.first()
    if not anchor:
        raise ValueError(f"No assets for factory {factory.name}")

    MaintenanceReport.objects.filter(asset__factory=factory, title=title).delete()

    return MaintenanceReport.objects.create(
        asset=anchor,
        source=MaintenanceReport.Source.AI_GENERATED,
        report_type=MaintenanceReport.ReportType.DECISION_SUMMARY,
        title=title,
        diagnosis=dossier["diagnosis"],
        risk_level=dossier["risk_level"],
        urgency_score=dossier["urgency_score"],
        immediate_actions=dossier["immediate_actions"],
        recommendations=dossier.get("recommendations", []),
        long_term_monitoring=dossier.get("long_term_monitoring", []),
        spare_strategy=dossier.get("spare_strategy", {}),
        report_text=dossier["report_text"],
    )
