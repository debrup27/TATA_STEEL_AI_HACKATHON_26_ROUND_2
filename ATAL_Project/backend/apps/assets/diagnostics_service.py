"""§5.1 diagnostic aggregator — composes health, ML, reports, alerts, cross-stage."""
from __future__ import annotations

import re

from apps.assets.models import Asset, SensorDefinition
from apps.assets.services import AssetHealthService
from apps.alerts.models import AlarmEvent
from apps.ml.models import MLPrediction
from apps.reports.models import MaintenanceReport
from apps.ml.cross_stage import get_cross_stage_correlations, PRODUCTION_SEQUENCE
from apps.ml.inference import MAX_SANE_RUL_HOURS
from apps.telemetry.models import SensorReading
from django.db.models import Avg
from django.utils import timezone
from datetime import timedelta

_FAULT_LABELS = {
    0: "Normal operation — no dominant fault class detected",
    1: "Bearing degradation — elevated vibration and temperature signature",
    2: "Hydraulic pressure loss — seal or pump efficiency decline",
    3: "Thermal excursion — furnace or process heat imbalance",
    4: "Mechanical misalignment — coupling or drive train issue",
    5: "Lubrication contamination — ISO 4406 particle count elevated",
}


def _format_contributing_sensor(entry) -> str:
    if isinstance(entry, dict):
        name = entry.get("sensor") or entry.get("name") or "sensor"
        dev = entry.get("deviation_pct")
        if dev is not None:
            dev_f = min(200.0, max(0.0, float(dev)))
            if dev_f < 5.0:
                return ""
            return f"{name} — {dev_f:.1f}% deviation (24h)"
        return str(name)
    return str(entry)


def _sanitize_rul_hours(rul_hours) -> float | None:
    if rul_hours is None:
        return None
    try:
        hours = float(rul_hours)
    except (TypeError, ValueError):
        return None
    if hours < 0:
        return 0.0
    if hours > MAX_SANE_RUL_HOURS:
        return None
    return hours


def _rul_days_from_hours(rul_hours: float | None) -> int | None:
    if rul_hours is None:
        return None
    return max(0, int(round(rul_hours / 24)))


def _meaningful_sensor_defect(sensors: list) -> str:
    """Pick the top contributing sensor with a real envelope breach."""
    ranked = sorted(
        (s for s in sensors if isinstance(s, dict)),
        key=lambda x: float(x.get("deviation_pct") or 0),
        reverse=True,
    )
    for row in ranked:
        dev = float(row.get("deviation_pct") or 0)
        if dev < 5.0:
            continue
        text = _format_contributing_sensor(row)
        if text:
            return text
    return ""


def _format_flagged_parameter(entry) -> str:
    if isinstance(entry, dict):
        return _format_contributing_sensor(entry)
    return str(entry)


def _stage_label(asset_type: str) -> str:
    names = {
        "SRF": "Slab Reheating Furnace",
        "HHPD": "High-Pressure Descaler",
        "FS": "Finishing Stands",
        "HAGCC": "Hydraulic AGC",
        "APT": "Acid Pickling",
        "TCMS": "Tandem Cold Mill",
        "CGP": "Galvanizing Pot",
        "HPAK": "Air Knives",
    }
    return names.get(asset_type, asset_type)


def _sensor_status(dev_pct: float) -> str:
    if dev_pct >= 40:
        return "critical"
    if dev_pct >= 15:
        return "warning"
    return "nominal"


def _parse_rca(rca_text: str, diagnosis: str) -> list[dict]:
    factors: list[dict] = []
    text = (rca_text or "").strip()
    if text:
        for line in text.split("\n"):
            line = line.strip().lstrip("-•*#").strip()
            if not line:
                continue
            weight = 0.33
            m = re.search(r"(\d+)%", line)
            if m:
                weight = float(m.group(1)) / 100.0
            factors.append({"factor": line[:200], "weight": round(weight, 2), "evidence": "MaintenanceReport.rca"})
    if not factors and diagnosis:
        for i, line in enumerate(diagnosis.split(".")[:3]):
            line = line.strip()
            if line:
                factors.append({
                    "factor": line,
                    "weight": round(0.5 - i * 0.1, 2),
                    "evidence": "MaintenanceReport.diagnosis",
                })
    if not factors:
        return []
    total = sum(f["weight"] for f in factors) or 1.0
    for f in factors:
        f["weight"] = round(f["weight"] / total, 2)
    return factors[:5]


def _shap_root_causes(pred: MLPrediction | None) -> list[dict]:
    if not pred or not pred.shap_values:
        return []
    shap = pred.shap_values
    items = shap.get("top_features") or shap.get("features") or shap.get("contributions") or []
    if isinstance(items, dict):
        items = [{"feature": k, "shap_value": v} for k, v in items.items()]
    ranked: list[tuple[str, float]] = []
    for row in items:
        if not isinstance(row, dict):
            continue
        name = row.get("feature") or row.get("name") or row.get("feature_name")
        if not name:
            continue
        val = abs(float(row.get("shap_value", row.get("value", row.get("shap", 0)))))
        if val <= 0:
            continue
        ranked.append((str(name), val))
    ranked.sort(key=lambda x: x[1], reverse=True)
    if not ranked:
        return []
    total = sum(v for _, v in ranked) or 1.0
    model_label = "RUL predictor"
    if pred.model_id and pred.model:
        model_label = pred.model.model_type or model_label
    out = []
    for name, val in ranked[:3]:
        out.append({
            "factor": name.replace("_", " ").title(),
            "weight": round(val / total, 2),
            "evidence": f"SHAP attribution — {model_label}",
        })
    return out


def _is_active_fault(
    fault_idx: int,
    probable_fault: str,
    early_warning: str | None,
    health_score: float,
    anomaly_score,
) -> bool:
    if fault_idx > 0:
        return True
    if early_warning:
        return True
    if health_score < 55:
        return True
    if anomaly_score is not None and float(anomaly_score) > 0.55:
        return True
    pf = (probable_fault or "").lower()
    if any(k in pf for k in ("degradation", "loss", "excursion", "misalignment", "contamination", "failure")):
        return True
    return False


def _prioritize_sensors(sensors: list[dict], limit: int = 3) -> list[dict]:
    order = {"critical": 0, "warning": 1, "nominal": 2}
    ranked = sorted(sensors, key=lambda s: order.get(s.get("status", "nominal"), 2))
    return ranked[:limit]


def build_diagnostic(asset: Asset) -> dict:
    health = AssetHealthService.compute(asset)
    last_pred = (
        MLPrediction.objects.filter(asset=asset)
        .select_related("model")
        .order_by("-prediction_time")
        .first()
    )
    pred_out = last_pred.prediction_output if last_pred else {}
    fault_class = pred_out.get("fault_classification")
    if fault_class is None:
        fault_class = health.get("fault_classification")
    try:
        fault_idx = int(fault_class) if fault_class is not None else 0
    except (TypeError, ValueError):
        fault_idx = 0

    report = (
        MaintenanceReport.objects.filter(asset=asset)
        .order_by("-created_at")
        .first()
    )

    root_causes = _shap_root_causes(last_pred)
    if not root_causes and report:
        root_causes = _parse_rca(report.rca, report.diagnosis)
    elif report and report.rca:
        parsed = _parse_rca(report.rca, "")
        root_causes = (root_causes + parsed)[:5]

    has_ml_fault = fault_class is not None or last_pred is not None
    has_report_dx = bool(report and report.diagnosis)

    if has_report_dx:
        probable_fault = report.diagnosis[:300]
    elif has_ml_fault and fault_idx in _FAULT_LABELS:
        probable_fault = _FAULT_LABELS[fault_idx]
    else:
        probable_fault = ""

    confidence = 0.0
    if pred_out.get("fault_confidence") is not None:
        confidence = float(pred_out.get("fault_confidence"))
    elif last_pred and last_pred.confidence is not None and fault_idx > 0:
        confidence = float(last_pred.confidence)
    elif pred_out.get("fault_confidence") is not None or pred_out.get("confidence") is not None:
        confidence = float(pred_out.get("fault_confidence") or pred_out.get("confidence") or 0)
    elif fault_idx > 0 and pred_out.get("classifier_health") is not None:
        confidence = max(0.5, min(0.95, float(pred_out["classifier_health"]) / 100.0))
    elif health.get("anomaly_score") is not None and has_ml_fault and fault_idx > 0:
        confidence = min(0.99, float(health["anomaly_score"]))

    critical_alarm = (
        AlarmEvent.objects.filter(asset=asset, acknowledged=False)
        .order_by("-created_at")
        .first()
    )
    early_warning = None
    if critical_alarm and critical_alarm.severity in ("critical", "trip", "high"):
        early_warning = critical_alarm.message
    elif health.get("anomaly_score") and float(health["anomaly_score"]) > 0.75:
        early_warning = (
            f"Anomaly score {float(health['anomaly_score']):.2f} — "
            "elevated catastrophic failure risk on critical equipment."
        )
    elif health.get("health_score", 100) < 35:
        early_warning = (
            f"Health score {health['health_score']:.0f}% — schedule intervention before unplanned outage."
        )

    active_fault = _is_active_fault(
        fault_idx,
        probable_fault,
        early_warning,
        float(health.get("health_score", 100)),
        health.get("anomaly_score"),
    )

    if not active_fault:
        root_causes = []

    cross = get_cross_stage_correlations(str(asset.id))
    process_defects = []
    if active_fault:
        for up in cross.get("upstream_correlations", [])[:4]:
            sensors = up.get("contributing_sensors") or []
            dev_score = float(up.get("deviation_score") or 0)
            defect = _meaningful_sensor_defect(sensors)
            if not defect:
                if dev_score <= 0.1:
                    continue
                defect = f"Aggregate upstream deviation {dev_score * 100:.0f}%"
            process_defects.append({
                "stage": _stage_label(up.get("upstream_asset_type", "")),
                "defect": defect,
                "link": f"Influence weight {up.get('influence_weight', 0):.2f} — {up.get('upstream_asset_name', '')}",
            })
        for flagged in cross.get("process_parameters_flagged", [])[:2]:
            defect = _format_flagged_parameter(flagged)
            if not defect:
                continue
            process_defects.append({
                "stage": _stage_label(asset.asset_type),
                "defect": defect,
                "link": "Local sensor envelope breach (24h window)",
            })
        process_defects = process_defects[:4]
        root_causes = root_causes[:3]

    since = timezone.now() - timedelta(hours=2)
    sensors = []
    for sdef in SensorDefinition.objects.filter(asset=asset)[:6]:
        reading = (
            SensorReading.objects.filter(asset=asset, sensor_def=sdef, time__gte=since)
            .order_by("-time")
            .first()
        )
        if not reading:
            continue
        nmin, nmax = sdef.normal_min, sdef.normal_max
        dev = 0.0
        if nmin is not None and nmax is not None and nmax > nmin:
            if reading.value < nmin:
                dev = ((nmin - reading.value) / (nmax - nmin)) * 100
            elif reading.value > nmax:
                dev = ((reading.value - nmax) / (nmax - nmin)) * 100
        unit = sdef.unit or ""
        sensors.append({
            "label": sdef.sensor_name.replace("_", " ").title()[:24],
            "value": f"{reading.value:.2f}{(' ' + unit) if unit else ''}",
            "status": _sensor_status(dev),
        })
    sensors = _prioritize_sensors(sensors, limit=3)

    rul_hours = _sanitize_rul_hours(health.get("rul_hours"))
    rul_days = _rul_days_from_hours(rul_hours)

    pos = -1
    try:
        pos = PRODUCTION_SEQUENCE.index(asset.asset_type)
    except ValueError:
        pass

    return {
        "id": str(asset.id),
        "name": asset.name,
        "factory": asset.factory.name,
        "stage": _stage_label(asset.asset_type),
        "health": int(round(health.get("health_score", 100))),
        "rulDays": rul_days,
        "rulHours": round(rul_hours, 1) if rul_hours is not None else None,
        "probableFault": probable_fault,
        "faultConfidence": round(min(0.99, confidence), 2),
        "faultClass": fault_idx,
        "isNormalOperation": not active_fault,
        "rootCauses": root_causes,
        "earlyWarning": early_warning,
        "processDefects": process_defects,
        "sensors": sensors,
        "assetType": asset.asset_type,
        "productionPosition": pos,
        "cascadeRisk": cross.get("cascade_risk"),
        "reportId": str(report.id) if report else None,
    }


def list_diagnostics(factory_id: str | None = None) -> list[dict]:
    qs = Asset.objects.select_related("factory").order_by("factory__name", "name")
    if factory_id:
        qs = qs.filter(factory_id=factory_id)
    return [build_diagnostic(a) for a in qs]
