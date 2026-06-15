"""Inline risk / bottleneck insights — fast 0.8b with deterministic fallback."""
from __future__ import annotations

import logging

from apps.agents.diagnostics_insight import _generate_insight
from apps.agents.plant_module_context import insight_task_context

logger = logging.getLogger(__name__)

_RISK_INSIGHT_SYSTEM = """You are MANAS, a maintenance engineer assistant at a Tata Steel plant.
Explain why this asset is prioritised as a plant bottleneck using ONLY the urgency, health, delay, and spares facts provided.

Cover production impact, spares lead-time constraint, and what the supervisor should approve next shift. Plain prose only."""


def _template_bottleneck_insight(
    *,
    asset_name: str,
    factory: str,
    health: int,
    risk_level: str,
    urgency_score: float,
    process_criticality: float,
    delay_severity: float,
    procurement_lead_days: int,
    spares_available: bool,
    impact: str,
    recommendation: str,
) -> str:
    spares_bit = "Critical spares are in stock." if spares_available else (
        f"Procurement lead is ~{procurement_lead_days} days for out-of-stock parts."
    )
    return (
        f"{asset_name} ({factory}) ranks as {risk_level} plant risk with urgency {urgency_score:.0f}% "
        f"while health sits at {health}%. Process criticality is {process_criticality:.0f}% and "
        f"delay exposure is {delay_severity:.0f}% based on recent downtime and live degradation signals. "
        f"{spares_bit} {impact} Recommended action: {recommendation}"
    )


def generate_bottleneck_insight(
    *,
    asset_name: str,
    factory: str,
    health: int,
    risk_level: str,
    urgency_score: float,
    bottleneck_rank: int,
    process_criticality: float,
    delay_severity: float,
    procurement_lead_days: int,
    spares_available: bool,
    impact: str,
    recommendation: str,
    probable_fault: str = "",
    asset_type: str = "",
) -> dict:
    context = insight_task_context(
        "Risk insight",
        asset_code=asset_type,
        asset_name=asset_name,
    )
    user_blob = (
        f"{context}\n\n"
        f"Asset: {asset_name} ({factory})\n"
        f"Plant bottleneck rank: #{bottleneck_rank}\n"
        f"Health: {health}% | Risk class: {risk_level} | Urgency: {urgency_score:.1f}%\n"
        f"Process criticality: {process_criticality:.1f}%\n"
        f"Delay severity: {delay_severity:.1f}%\n"
        f"Procurement lead (out-of-stock parts): {procurement_lead_days} days\n"
        f"Spares in stock: {'yes' if spares_available else 'no'}\n"
        f"Diagnosis context: {probable_fault or impact}\n"
        f"Impact: {impact}\n"
        f"Recommendation: {recommendation}\n"
        "Using ONLY the facts above, explain why this asset is prioritised, how delay and spares "
        "constraints interact, and what the supervisor should do in the next shift. "
        "Start with the asset name. Write 4 sentences only."
    )
    template = _template_bottleneck_insight(
        asset_name=asset_name,
        factory=factory,
        health=health,
        risk_level=risk_level,
        urgency_score=urgency_score,
        process_criticality=process_criticality,
        delay_severity=delay_severity,
        procurement_lead_days=procurement_lead_days,
        spares_available=spares_available,
        impact=impact,
        recommendation=recommendation,
    )
    return _generate_insight(
        user_blob,
        template,
        system=_RISK_INSIGHT_SYSTEM,
        insight_angle="Risk insight",
    )
