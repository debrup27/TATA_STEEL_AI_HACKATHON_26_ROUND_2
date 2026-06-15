"""Plant domain context for all inline MANAS surfaces — logs, diagnostics, risk, maintenance."""
from __future__ import annotations

import re

# ── Asset registry (Horizon F1 + Zephyr F2) ──────────────────────────────────

_MODULE_CONTEXT: dict[str, str] = {
    "SRF": (
        "Slab Reheating Furnace — reheats slabs to 1150–1250°C before hot rolling. "
        "Key signals: zone temps, slab discharge temp, gas flow, O₂%, walking-beam stroke. "
        "Underheat propagates as high rolling force and gauge issues on FS/HAGCC downstream."
    ),
    "HHPD": (
        "High-Pressure Descaler — removes mill scale with ~380–400 bar header pressure. "
        "Key signals: header pressure, flow rate, pump vibration (ISO 10816), filter ΔP, acoustic emission. "
        "Low pressure or cavitation leaves scale on the slab and raises FS load."
    ),
    "FS": (
        "Finishing Stands — rolling force 10–20 MN reduces transfer bar to finished gauge. "
        "Key signals: rolling force, sideload, spindle torque, vibration RMS (ISO 10816-3), BPFO amplitude, gap position. "
        "Chock wear and bearing spallation cause chatter, wedge, and downstream HAGCC thickness drift."
    ),
    "HAGCC": (
        "Hydraulic Automatic Gauge Control (hydraulic AGC cylinders) — closed-loop roll-gap control "
        "for ±25 μm strip thickness. Key signals: gap position LVDT, oil pressure (250–350 bar), "
        "bypass flow, hysteresis_deviation_um, oil particle count (ISO 4406 target 15/13/10). "
        "hysteresis_deviation_um is gap-control error vs command — servovalve wear, seal bypass, or oil contamination."
    ),
    "APT": (
        "Acid Pickling Tanks — 12–18% HCl removes oxide scale before cold rolling. "
        "Key signals: free HCl %, tank temperature (65–85°C), FeCl₂ concentration (<120 g/L), rinse flow, wall thickness. "
        "Chemistry drift causes surface defects and raises TCMS rolling loads."
    ),
    "TCMS": (
        "Tandem Cold Mill Stands — cold reduction to 0.3–2 mm at up to 1200 m/min. "
        "Key signals: rolling force, interstand tension, emulsion flow/iron ppm/pH, BPFO at 142 Hz, chock temperature. "
        "Emulsion contamination accelerates bearing wear (ISO 13373-3)."
    ),
    "CGP": (
        "Continuous Galvanizing Pot — molten zinc bath 450–462°C for hot-dip coating. "
        "Key signals: pot temperature, Fe-in-zinc (<0.03%), pot level, roll torque, inductor power. "
        "High Fe causes dross, sink-roll scratches, and coating defects downstream at HPAK."
    ),
    "HPAK": (
        "High-Pressure Air Knives — wipe excess zinc for target coat weight (60–275 g/m²). "
        "Key signals: air pressure (0.3–1.2 bar), nozzle-to-strip distance (8–20 mm), blower speed, slot width. "
        "Zinc crystallization in nozzle slots causes coat-weight stripes (ISO 1460)."
    ),
}

_MODULE_ALIASES: dict[str, str] = {
    "HYDRAULIC AGC": "HAGCC",
    "HYDRAULIC AGC CYLINDERS": "HAGCC",
    "HYDRAULIC AUTOMATIC GAUGE CONTROL": "HAGCC",
    "SLAB REHEATING FURNACE": "SRF",
    "HIGH-PRESSURE DESCALER": "HHPD",
    "FINISHING STANDS": "FS",
    "ACID PICKLING TANKS": "APT",
    "TANDEM COLD MILL STANDS": "TCMS",
    "CONTINUOUS GALVANIZING POT": "CGP",
    "HIGH-PRESSURE AIR KNIVES": "HPAK",
}

_HORIZON_SEQUENCE = ("SRF", "HHPD", "FS", "HAGCC")
_ZEPHYR_SEQUENCE = ("APT", "TCMS", "CGP", "HPAK")

# ── Log event types ───────────────────────────────────────────────────────────

_LOG_EVENT_GUIDANCE: dict[str, str] = {
    "abnormality": (
        "Critical abnormality / trip-class event — envelope or interlock breach. "
        "Treat as production-impacting until verified; may require hold, LOTO, or crew dispatch."
    ),
    "warning": (
        "Warning / alert-class drift — parameter leaving nominal band but not yet tripped. "
        "Trend for 2+ hours, schedule inspection next shift, escalate if rising."
    ),
    "maintenance": (
        "Maintenance / work-order event — crew action, inspection, or repair closure. "
        "Explain what was done, whether condition is cleared, and what to re-check after restart."
    ),
    "predictive": (
        "Predictive maintenance / intelligence report emit — ML or threshold model flagged review. "
        "Translate health/RUL/urgency into a concrete next action, not a generic PdM mention."
    ),
    "health": (
        "Health-score or condition summary — composite degradation index. "
        "Link the score to the dominant sensor or fault mechanism on this asset."
    ),
    "info": (
        "Informational / cleared condition — routine activity or recovery. "
        "Confirm no open risk remains and note any handover items."
    ),
}

_INSIGHT_ANGLE_GUIDANCE: dict[str, str] = {
    "Log explanation": (
        "Explain the log in plant terms: what failed or drifted, why it matters for quality/safety/throughput, "
        "and 2–3 checks the shift engineer should run. Reference module, readings, and limits from the log."
    ),
    "Root-cause insight": (
        "Explain the root-cause chain from highest-weight factor through live sensors to the active diagnosis. "
        "End with ordered verification steps (LOTO if needed). Do not invent causes not in the data."
    ),
    "Defect correlation insight": (
        "Explain how upstream process deviations in the production sequence may have caused or worsened "
        "this asset's condition. Name the upstream stage and the propagation mechanism."
    ),
    "Risk insight": (
        "Explain why this asset ranks as a plant bottleneck: health, urgency, delay exposure, and spares lead time. "
        "Tell the supervisor what to approve or defer in the next shift."
    ),
    "Maintenance plan": (
        "Format the maintenance plan for a crew lead: immediate actions, monitoring thresholds, and spares — "
        "grounded in the asset's real sensors and ISO limits."
    ),
    "Work order": (
        "Draft executable maintenance steps with LOTO/isolation, real fault context, and spares from the feed."
    ),
}

# Sensor keywords → operator explanation (applied when found in log text)
_SENSOR_HINTS: list[tuple[str, str]] = [
    (r"hysteresis", "Hysteresis = control-loop lag/error vs commanded setpoint (not a standalone sensor glitch)."),
    (r"vibration|bpfo|chatter", "Vibration/BPFO spikes indicate bearing wear or mill chatter (ISO 10816-3 / ISO 13373-3)."),
    (r"rolling\s*force|sideload|torque", "Force/torque rise often reflects harder material, gap issues, or mechanical resistance."),
    (r"header\s*pressure|descaler", "Descaler header pressure loss reduces scale removal and raises FS loads."),
    (r"zone.*temp|slab.*temp|furnace", "Furnace temperature deficit causes underheat and high downstream rolling force."),
    (r"hcl|fecl2|pickl", "Pickling chemistry drift (HCl/FeCl₂) affects surface quality and acid tank integrity."),
    (r"pot\s*temp|fe.*zinc|dross|galvaniz", "Zinc pot conditions drive coating adhesion; Fe-in-zinc causes dross."),
    (r"air\s*pressure|nozzle|coat.*weight|hpak", "Air-knife pressure/distance controls zinc coat weight uniformity."),
    (r"iso\s*4406|particle|oil\s*clean", "ISO 4406 oil cleanliness breach accelerates seal and valve wear on hydraulics."),
    (r"health\s*\d|health_score|degraded", "Health score aggregates anomaly, RUL, and fault class — cite the dominant driver."),
    (r"rul|remaining", "RUL estimates hours/days to intervention threshold — tie to the wear mechanism."),
]


def normalize_module_code(module: str) -> str:
    raw = (module or "").strip().upper()
    if not raw:
        return ""
    if raw in _MODULE_CONTEXT:
        return raw
    for key, code in _MODULE_ALIASES.items():
        if key in raw or raw in key:
            return code
    return raw


def asset_module_context(module_or_code: str) -> str:
    code = normalize_module_code(module_or_code)
    base = _MODULE_CONTEXT.get(code, "")
    if not base:
        label = (module_or_code or "").strip() or "unknown"
        return f"Plant module: {label}."
    return f"{code} — {base}"


def production_line_context(module_or_code: str) -> str:
    code = normalize_module_code(module_or_code)
    if code in _HORIZON_SEQUENCE:
        seq = " → ".join(_HORIZON_SEQUENCE)
        return f"Horizon Foundry (hot rolling) sequence: {seq}. Upstream issues on earlier stages can cascade to {code}."
    if code in _ZEPHYR_SEQUENCE:
        seq = " → ".join(_ZEPHYR_SEQUENCE)
        return f"Zephyr Sinter (cold rolling/coating) sequence: {seq}. Upstream chemistry/mechanical drift propagates downstream."
    return ""


def classify_log_event(log_text: str) -> tuple[str, str]:
    upper = (log_text or "").upper()
    lower = (log_text or "").lower()
    if any(k in upper for k in ("ABNORMALITY", "TRIP", "CRITICAL", "SEV 1", "LIMIT EXCEEDED")):
        return "abnormality", _LOG_EVENT_GUIDANCE["abnormality"]
    if any(k in upper for k in ("WARNING", "ALERT", "SEV 2", "THRESHOLD EXCEEDED")):
        return "warning", _LOG_EVENT_GUIDANCE["warning"]
    if any(k in upper for k in ("[MAINT]", "MAINTENANCE", "WORK ORDER", "INSPECTION", "LOTO")):
        return "maintenance", _LOG_EVENT_GUIDANCE["maintenance"]
    if any(k in lower for k in ("predictive maintenance", "review available", "intelligence", "urgency")):
        return "predictive", _LOG_EVENT_GUIDANCE["predictive"]
    if "health" in lower and re.search(r"\d", log_text or ""):
        return "health", _LOG_EVENT_GUIDANCE["health"]
    return "info", _LOG_EVENT_GUIDANCE["info"]


def sensor_context_from_log(log_text: str, module_code: str = "") -> str:
    lower = (log_text or "").lower()
    hints: list[str] = []
    for pattern, explanation in _SENSOR_HINTS:
        if re.search(pattern, lower, flags=re.I):
            hints.append(explanation)
    if len(hints) > 2:
        hints = hints[:2]
    return " ".join(hints)


def insight_task_context(
    angle: str,
    *,
    module: str = "",
    asset_code: str = "",
    asset_name: str = "",
    log_text: str = "",
) -> str:
    """Unified context block prepended to all inline MANAS user prompts."""
    parts: list[str] = []
    code = normalize_module_code(asset_code or module or asset_name)
    if code in _MODULE_CONTEXT:
        parts.append(asset_module_context(code))
        line_ctx = production_line_context(code)
        if line_ctx:
            parts.append(line_ctx)
    if log_text.strip():
        _evt, evt_guidance = classify_log_event(log_text)
        parts.append(f"Log classification: {evt_guidance}")
        sensor_hint = sensor_context_from_log(log_text, code)
        if sensor_hint:
            parts.append(sensor_hint)
    angle_guidance = _INSIGHT_ANGLE_GUIDANCE.get(angle, "")
    if angle_guidance:
        parts.append(f"Task: {angle_guidance}")
    return "\n".join(parts)


def module_log_context(module: str, log_text: str = "") -> str:
    return insight_task_context("Log explanation", module=module, log_text=log_text)


def maintenance_asset_context(asset_type: str) -> str:
    ctx = asset_module_context(asset_type)
    line = production_line_context(asset_type)
    maint = (
        "Maintenance scope: use live health/RUL/fault/spares from the feed. "
        "Include LOTO per ISO 14118, cite relevant ISO limits for this asset's sensors, "
        "and list ordered technician steps — not vague advice."
    )
    parts = [ctx, line, maint]
    return "\n".join(p for p in parts if p)


# ── Deterministic log fallbacks (sensor + asset aware) ───────────────────────

def _extract_numeric_reading(log_text: str) -> str | None:
    for pattern in (
        r"\((\d+(?:\.\d+)?)\s*μ?m\)",
        r"=\s*(\d+(?:\.\d+)?)",
        r"(\d+(?:\.\d+)?)\s*μ?m",
        r"(\d+(?:\.\d+)?)\s*mm/s",
        r"(\d+(?:\.\d+)?)\s*bar",
        r"(\d+(?:\.\d+)?)\s*°c",
    ):
        match = re.search(pattern, log_text, flags=re.I)
        if match:
            return match.group(1)
    return None


def _fmt_reading(value: str | None, unit: str = "") -> str:
    if not value:
        return "an elevated reading"
    return f"{value}{(' ' + unit) if unit else ''}"


def specialized_log_template(*, module: str, text: str, time: str) -> str | None:
    """Domain-rich deterministic fallback matched by asset + log content."""
    code = normalize_module_code(module)
    upper = (text or "").upper()
    lower = (text or "").lower()
    reading = _extract_numeric_reading(text)
    evt, _ = classify_log_event(text)

    # ── HAGCC ──
    if code == "HAGCC" and "hysteresis" in lower:
        return (
            f"HAGCC (Hydraulic Automatic Gauge Control) logged hysteresis deviation at {time}: "
            f"{_fmt_reading(reading, 'μm')} versus the commanded roll-gap setpoint. "
            "This is AGC loop lag/overshoot — typically servovalve stiction, cylinder seal bypass, or ISO 4406 oil contamination. "
            "Threatens ±25 μm thickness accuracy and may trip interlocks. "
            "Run AGC step-response test, check bypass flow and particle count, trend gap LVDTs before line speed restore."
        )

    # ── FS ──
    if code == "FS" and any(k in lower for k in ("vibration", "bpfo", "chatter", "rolling force", "sideload")):
        return (
            f"FS (Finishing Stand) logged a mechanical alarm at {time}: {text[:200]}. "
            f"{'Reading ' + _fmt_reading(reading) + ' — ' if reading else ''}"
            "Elevated force or vibration (ISO 10816-3) usually indicates chock wear, bearing spallation, or gap asymmetry. "
            "This propagates thickness wedge and raises HAGCC correction demand. "
            "Walk down vibration RMS and BPFO, inspect chock liners, and verify roll gap before next coil."
        )

    # ── SRF ──
    if code == "SRF" and any(k in lower for k in ("temp", "zone", "slab", "furnace", "o2", "gas")):
        return (
            f"SRF (Slab Reheating Furnace) logged a thermal/combustion event at {time}: {text[:200]}. "
            "Zone or discharge temperature drift changes slab metallurgy and raises rolling force on FS downstream. "
            "Verify burner balance, air/fuel ratio (1.05–1.15), and walking-beam stroke before increasing throughput."
        )

    # ── HHPD ──
    if code == "HHPD" and any(k in lower for k in ("pressure", "header", "descaler", "pump", "cavitation", "flow")):
        return (
            f"HHPD (High-Pressure Descaler) logged a hydraulic event at {time}: {text[:200]}. "
            f"{'Pressure/flow reading ' + _fmt_reading(reading, 'bar') + ' — ' if reading else ''}"
            "Header pressure below ~380 bar leaves mill scale and increases FS rolling load. "
            "Check pump suction, filter ΔP, nozzle erosion, and ISO 4406 water cleanliness."
        )

    # ── APT ──
    if code == "APT" and any(k in lower for k in ("hcl", "fecl2", "pickl", "tank", "rinse", "acid")):
        return (
            f"APT (Acid Pickling) logged a chemistry/surface-treatment event at {time}: {text[:200]}. "
            "HCl strength, tank temperature, or FeCl₂ buildup affects strip surface and TCMS rolling stability. "
            "Sample acid chemistry, verify rinse flow, and inspect lining wear per OSHA 1910.119/NACE limits."
        )

    # ── TCMS ──
    if code == "TCMS" and any(k in lower for k in ("vibration", "bpfo", "emulsion", "tension", "rolling", "bearing")):
        return (
            f"TCMS (Tandem Cold Mill) logged a rolling/bearing event at {time}: {text[:200]}. "
            "Emulsion iron contamination or bearing wear (BPFO ~142 Hz) raises force and gauge variation. "
            "Check emulsion ppm/pH, chock temperature, and schedule bearing vibration walk-down per ISO 13373-3."
        )

    # ── CGP ──
    if code == "CGP" and any(k in lower for k in ("pot", "zinc", "dross", "fe", "galvaniz", "coating")):
        return (
            f"CGP (Galvanizing Pot) logged a bath/coating event at {time}: {text[:180]}. "
            "Pot temperature or Fe-in-zinc drift causes dross and sink-roll surface defects. "
            "Verify pot temp (450–462°C), Fe <0.03%, and roll torque before increasing line speed."
        )

    # ── HPAK ──
    if code == "HPAK" and any(k in lower for k in ("air", "nozzle", "coat", "knife", "pressure", "zinc")):
        return (
            f"HPAK (Air Knives) logged a coat-weight control event at {time}: {text[:200]}. "
            "Nozzle blockage or pressure drift causes zinc coat-weight stripes (ISO 1460). "
            "Inspect slot for zinc crystallization, verify nozzle distance (8–20 mm) and header pressure."
        )

    # ── Event-type templates (any module) ──
    if evt == "maintenance":
        return (
            f"{module} maintenance event at {time}: {text[:220]}. "
            "Confirm whether the intervention cleared the underlying condition, what measurements were recorded, "
            "and which sensors to re-trend for 48 hours after restart."
        )

    if evt == "predictive" or evt == "health":
        return (
            f"{module} condition review at {time}: {text[:220]}. "
            "This is a predictive-maintenance flag from ML/threshold models — translate it into the dominant "
            "wear or process mechanism on this asset and the next concrete crew action."
        )

    if evt == "abnormality":
        ctx = asset_module_context(module)
        return (
            f"{module} critical abnormality at {time}: {text[:220]}. "
            f"Context: {ctx} "
            "Hold or slow production if interlocks require it, dispatch maintenance, verify the mechanical/hydraulic path, "
            "and trend related readings for at least two hours after correction."
        )

    if evt == "warning":
        return (
            f"{module} warning at {time}: {text[:220]}. "
            "Parameter is drifting from nominal — schedule inspection next shift, trend for 2 hours, "
            "and escalate to abnormality response if the reading continues to rise."
        )

    return None
