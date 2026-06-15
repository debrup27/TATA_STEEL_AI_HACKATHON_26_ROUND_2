"""Filter junk LLM refusal text from RCA factors and derive sensor-based causes."""
from __future__ import annotations

_JUNK_MARKERS = (
    "unable to perform",
    "cannot perform",
    "asset uuid",
    "provide consolidated",
    "digital twin state",
    "without specific asset data",
    "sensor_readings",
    "ml_predictions",
    "maintenance_history",
    "active_alarms",
    "as an ai",
    "you are a",
    "do not have access",
    "insufficient data",
    "i need more",
    "please provide",
    "latest rul/anomaly/classifier",
)

_NORMAL_OP_MARKERS = (
    "normal operation",
    "no dominant fault",
)


def is_junk_rca_factor(text: str) -> bool:
    lower = (text or "").strip().lower()
    if not lower or len(lower) < 4:
        return True
    return any(marker in lower for marker in _JUNK_MARKERS)


def is_junk_diagnosis_hint(
    text: str,
    *,
    fault_injected: bool = False,
    has_warning_sensors: bool = False,
) -> bool:
    lower = (text or "").strip().lower()
    if not lower:
        return True
    if any(marker in lower for marker in _JUNK_MARKERS):
        return True
    if (fault_injected or has_warning_sensors) and any(m in lower for m in _NORMAL_OP_MARKERS):
        return True
    return False


def sanitize_root_causes(factors: list[dict]) -> list[dict]:
    cleaned = [
        dict(f)
        for f in factors
        if not is_junk_rca_factor(str(f.get("factor", "")))
    ]
    if not cleaned:
        return []
    total = sum(float(f.get("weight", 0)) for f in cleaned) or 1.0
    for f in cleaned:
        f["weight"] = round(float(f.get("weight", 0)) / total, 2)
    return cleaned[:5]


def derive_sensor_root_causes(
    sensors: list[dict],
    early_warning: str | None = None,
) -> list[dict]:
    causes: list[dict] = []
    for sensor in sensors:
        status = sensor.get("status", "nominal")
        if status not in ("warning", "critical"):
            continue
        label = sensor.get("label", "Sensor")
        value = sensor.get("value", "—")
        causes.append({
            "factor": f"{label} outside normal envelope ({value})",
            "weight": 0.65 if status == "critical" else 0.5,
            "evidence": "Live sensor envelope breach",
        })
    if not causes and early_warning:
        warning = early_warning.strip()
        if warning and not is_junk_rca_factor(warning):
            causes.append({
                "factor": warning[:150],
                "weight": 0.55,
                "evidence": "Active plant alert",
            })
    return sanitize_root_causes(causes)[:3]
