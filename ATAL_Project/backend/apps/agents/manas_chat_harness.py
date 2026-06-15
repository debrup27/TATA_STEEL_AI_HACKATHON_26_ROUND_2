"""MANAS main-chat harness — intent classification, mode context, and tool guidance.

Covers all Ask MANAS chat paths:
- Plain chat (no RAG)
- RAG / document Q&A
- SANSAD-linked (/sansad) sessions
- Role lenses (technician / supervisor / admin / advice mode)
- Deep thinking
- SANSAD consolidation graph (supervisor tool/worker dispatch)
"""
from __future__ import annotations

import re
from typing import Any

from apps.agents.plant_module_context import (
    asset_module_context,
    normalize_module_code,
    production_line_context,
)

# All canonical asset codes + common aliases in user text
_ASSET_CODE_RE = re.compile(
    r"\b(SRF|HHPD|FS|HAGCC|APT|TCMS|CGP|HPAK|"
    r"slab reheating|descaler|finishing stand|hydraulic agc|pickling|cold mill|galvaniz|air knife)\b",
    re.I,
)

_ISO_RE = re.compile(r"\biso\s*\d{4,5}(?:-\d+)?\b", re.I)

_CHAT_INTENT_GUIDANCE: dict[str, str] = {
    "capabilities": (
        "User wants MANAS capabilities. Give a concise bullet list: diagnosis, RCA, RUL, risk triage, "
        "repair steps with LOTO, spares, cross-stage tracing, document-grounded answers. Under 150 words."
    ),
    "document_qa": (
        "User selected reference documents. Answer ONLY from numbered excerpts. "
        "Open with a direct answer; inline [n] citations on facts. No capability essay or asset inventory."
    ),
    "table_request": (
        "User asked for a table. Reply with a markdown table using real values from context/briefing — "
        "columns like Asset, Health, RUL, Risk, Fault. No empty tables."
    ),
    "factory_status": (
        "User wants plant/factory overview. Summarize Horizon (F1) and/or Zephyr (F2) health, "
        "priority assets, active faults, and open work from SANSAD briefing or conversation context."
    ),
    "historical_maintenance": (
        "User asks about maintenance history, logs, or past events. "
        "Use SANSAD briefing sections (Recent logs, 90d dossiers, alarm history) — never claim data is unavailable."
    ),
    "iso_compliance": (
        "User asks about standards/compliance. Cite ISO/IEC/OSHA limits only when present in excerpts or briefing; "
        "do not invent code numbers. Link standard to the asset sensor it governs."
    ),
    "rul_prediction": (
        "User asks about RUL/remaining life. Explain the wear mechanism, current health/RUL reading, "
        "and recommended intervention window. Distinguish prediction from live alarm."
    ),
    "risk_prioritization": (
        "User asks what to fix first / bottleneck / urgency. Rank by health, trip risk, production criticality, "
        "and spares lead time. Give one clear supervisor decision."
    ),
    "spares_procurement": (
        "User asks about spares/BOM/lead times. State in-stock vs order-needed parts and procurement urgency "
        "tied to the asset fault."
    ),
    "cross_stage": (
        "User asks about upstream/downstream or cascade. Use production sequence "
        "(SRF→HHPD→FS→HAGCC or APT→TCMS→CGP→HPAK) and name propagation mechanism."
    ),
    "diagnosis_rca": (
        "User asks why equipment is failing or wants RCA. State dominant fault mechanism, "
        "supporting sensor evidence, and ordered verification steps."
    ),
    "work_order_procedure": (
        "User wants repair/work-order steps. Provide ordered actions with LOTO/isolation first, "
        "then inspection, then parts/replacement. Shop-floor executable language."
    ),
    "sensor_interpretation": (
        "User asks what a reading/sensor means. Explain operational meaning, normal envelope, "
        "likely cause of deviation, and what to check next — not generic definitions."
    ),
    "log_explanation": (
        "User pasted or referenced a system log/alarm. Explain operational meaning, severity if ignored, "
        "and preventive checks — same depth as SANSAD log Ask MANAS."
    ),
    "general_maintenance": (
        "General steel-plant maintenance question. Answer directly using asset context below; "
        "no self-introduction or capability list unless asked."
    ),
}

_MODE_GUIDANCE: dict[str, str] = {
    "sansad": (
        "SANSAD mode active: treat the linked briefing as live plant data (faults, RUL, logs, work orders, KPIs). "
        "Never say historical or plant data is unavailable. No planning aloud — final answer only."
    ),
    "rag": (
        "Documents loaded: ground every technical claim in excerpts or say what is missing. "
        "Use [n] citations when citing documents."
    ),
    "no_rag": (
        "No documents selected: answer from conversation + plant context only. "
        "Do not use [n] markers or invent document quotes."
    ),
    "role_technician": (
        "Technician lens: emphasize hands-on steps, LOTO, tooling, observable symptoms, safe limits."
    ),
    "role_supervisor": (
        "Supervisor lens: emphasize crew coordination, downtime impact, escalation, and defer/hold decisions."
    ),
    "deep_thinking": (
        "Deep analysis requested: reason internally but output only the final polished answer — "
        "no debate about format, tables, or instructions."
    ),
}

# Intent → suggested SANSAD graph tools (supervisor consolidation path)
_INTENT_TOOL_HINTS: dict[str, str] = {
    "rul_prediction": "Consider refresh_ml_predictions or twin snapshot tools if RUL seems stale.",
    "risk_prioritization": "Consider compute_bottleneck_score and spares evaluation tools.",
    "spares_procurement": "Call evaluate_spares / list spares for the asset before recommending orders.",
    "work_order_procedure": "Use create_work_order after diagnosis is confirmed — include LOTO in actions.",
    "diagnosis_rca": "Pull sensor window summary and active alarms before final RCA JSON.",
    "historical_maintenance": "Use maintenance history / report retrieval tools when payload lacks events.",
    "iso_compliance": "Use retrieve_iso_compliance or RAG citation tools — never invent ISO classes.",
}


def detect_assets_in_text(text: str) -> list[str]:
    """Return unique canonical asset codes mentioned in user text."""
    found: list[str] = []
    for match in _ASSET_CODE_RE.finditer(text or ""):
        code = normalize_module_code(match.group(0))
        if code in {
            "SRF", "HHPD", "FS", "HAGCC", "APT", "TCMS", "CGP", "HPAK",
        } and code not in found:
            found.append(code)
    return found


def _wants_capabilities_overview(text: str) -> bool:
    lower = (text or "").lower()
    triggers = (
        "what can you do",
        "your capabilities",
        "explain yourself",
        "how do you work",
        "operational logic",
        "what are you",
        "who are you",
    )
    return any(t in lower for t in triggers)


def classify_chat_intent(
    user_question: str,
    *,
    has_citations: bool = False,
    sansad_mode: bool = False,
) -> str:
    q = (user_question or "").lower()
    if _wants_capabilities_overview(q):
        return "capabilities"
    if has_citations and not _wants_capabilities_overview(q):
        return "document_qa"
    if re.search(r"\btable\b", q):
        return "table_request"
    if re.search(r"\b(rul|remaining useful life|remaining life|life left)\b", q):
        return "rul_prediction"
    if sansad_mode and re.search(
        r"\b(historical|maintenance log|past maintenance|90\s*day|dossier|alarm history|work order history)\b",
        q,
    ):
        return "historical_maintenance"
    if re.search(
        r"\b(horizon|zephyr|factory\s*[12]|plant status|plant health|overview|briefing)\b",
        q,
    ):
        return "factory_status"
    if _ISO_RE.search(q) or re.search(r"\b(osha|iec\s*\d|astm|nace)\b", q):
        return "iso_compliance"
    if re.search(r"\b(bottleneck|urgency|prioriti[sz]e|what first|which asset|rank)\b", q):
        return "risk_prioritization"
    if re.search(r"\b(spare|spares|procurement|lead time|bom|bill of materials)\b", q):
        return "spares_procurement"
    if re.search(r"\b(upstream|downstream|cascade|propagat|cross.?stage|srf.?→|horizon sequence)\b", q):
        return "cross_stage"
    if re.search(r"(\[abnormality\]|\[warning\]|\[maint\]|system log|log entry|alarm message)", q):
        return "log_explanation"
    if re.search(r"\b(root cause|rca|why is|diagnos|fault|failing|abnormality|trip)\b", q):
        return "diagnosis_rca"
    if re.search(r"\b(loto|work order|repair step|how (to )?fix|procedure|inspect)\b", q):
        return "work_order_procedure"
    if re.search(r"\b(sensor|reading|what does .+ mean|threshold|envelope|deviation)\b", q):
        return "sensor_interpretation"
    return "general_maintenance"


def intent_guidance(intent: str) -> str:
    return _CHAT_INTENT_GUIDANCE.get(intent, _CHAT_INTENT_GUIDANCE["general_maintenance"])


def tool_hints_for_intent(intent: str) -> str:
    return _INTENT_TOOL_HINTS.get(intent, "")


def _asset_context_block(codes: list[str]) -> str:
    if not codes:
        return ""
    parts = [asset_module_context(c) for c in codes[:3]]
    if len(codes) == 1:
        line = production_line_context(codes[0])
        if line:
            parts.append(line)
    return "\n".join(parts)


def build_chat_harness_addendum(
    user_question: str,
    *,
    has_citations: bool = False,
    sansad_mode: bool = False,
    user_role: str = "",
    advice_mode: bool = False,
    deep_thinking: bool = False,
    session_asset_code: str | None = None,
) -> str:
    """Inject into 9b system prompt for every MANAS chat message."""
    intent = classify_chat_intent(
        user_question,
        has_citations=has_citations,
        sansad_mode=sansad_mode,
    )
    lines = [
        "\n\n[MANAS chat harness]",
        f"Detected intent: {intent}.",
        f"Task: {intent_guidance(intent)}",
    ]

    assets = detect_assets_in_text(user_question)
    if session_asset_code:
        code = normalize_module_code(session_asset_code)
        if code and code not in assets:
            assets.insert(0, code)
    asset_block = _asset_context_block(assets)
    if asset_block:
        lines.append(f"Relevant assets:\n{asset_block}")

    if sansad_mode:
        lines.append(f"Mode: {_MODE_GUIDANCE['sansad']}")
    if has_citations:
        lines.append(f"Mode: {_MODE_GUIDANCE['rag']}")
    else:
        lines.append(f"Mode: {_MODE_GUIDANCE['no_rag']}")

    role_key = (user_role or "").strip().lower()
    if advice_mode or role_key == "admin":
        lines.append(_MODE_GUIDANCE["role_technician"])
        lines.append(_MODE_GUIDANCE["role_supervisor"])
    elif role_key == "technician":
        lines.append(_MODE_GUIDANCE["role_technician"])
    elif role_key == "supervisor":
        lines.append(_MODE_GUIDANCE["role_supervisor"])

    if deep_thinking:
        lines.append(_MODE_GUIDANCE["deep_thinking"])

    return "\n".join(lines)


def build_role_advisory_context(user_question: str) -> str:
    """Extra plant context for 0.8b role worker prompts."""
    assets = detect_assets_in_text(user_question)
    intent = classify_chat_intent(user_question)
    parts = [f"Query intent: {intent}.", intent_guidance(intent)]
    block = _asset_context_block(assets)
    if block:
        parts.append(block)
    return "\n".join(parts)


def supervisor_payload_context(payload: dict[str, Any]) -> str:
    """Domain primer for SANSAD consolidation graph supervisor."""
    asset_type = (payload.get("asset_type") or payload.get("asset_code") or "").strip()
    asset_name = (payload.get("asset_name") or payload.get("asset") or "").strip()
    code = normalize_module_code(asset_type or asset_name)
    parts = [
        "## Plant asset context",
        asset_module_context(code) if code in {
            "SRF", "HHPD", "FS", "HAGCC", "APT", "TCMS", "CGP", "HPAK",
        } else asset_module_context(asset_name or "plant"),
    ]
    line = production_line_context(code) if code else ""
    if line:
        parts.append(line)
    parts.append(
        "Supervisor rules: cite ISO/SOP thresholds only from retrieved documents; "
        "use whitelisted tools for ML refresh, spares, work orders, and sensor windows; "
        "output DecisionOutput JSON when sufficient context is gathered."
    )
    intent = classify_chat_intent(
        str(payload.get("user_question") or payload.get("diagnosis") or ""),
        sansad_mode=True,
    )
    hint = tool_hints_for_intent(intent)
    if hint:
        parts.append(f"Tool hint: {hint}")
    return "\n".join(parts)
