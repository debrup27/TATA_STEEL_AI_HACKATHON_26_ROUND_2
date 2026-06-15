"""Threshold-based intelligence reports — markdown draft + optional 0.8b polish."""
from __future__ import annotations

import json
import logging
import os
import re

from django.conf import settings

from apps.assets.models import Asset, Factory
from apps.assets.services import FactoryHealthService
from apps.maintenance.threshold_scorer import score_asset

logger = logging.getLogger(__name__)

_POLISH_SYSTEM = """You are MANAS report formatter for ATAL's Diagnostic.
You receive a DRAFT computed from sklearn threshold models. Your job is ONLY to:
1) verify numbers and asset names match the draft
2) reformat report_text as clean markdown
3) return compact JSON (no markdown fences, no thinking)

Return ONLY:
{
  "report_text": "markdown body",
  "diagnosis": "one sentence",
  "immediate_actions": ["..."],
  "recommendations": [{"step":"...","rationale":"...","duration":"..."}],
  "long_term_monitoring": [{"sensor":"...","threshold":"...","rationale":"..."}],
  "spare_strategy": {"strategy":"...","parts":[{"part_name":"...","qty":1,"lead_time_days":14,"in_stock":false}]},
  "risk_level": "low|medium|high|critical",
  "urgency_score": 0.5
}
Do NOT invent assets, sensors, or numbers not in the draft. Max 4 items per list."""


def _risk_rank(level: str) -> int:
    return {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(level, 2)


def _parse_json(text: str) -> dict | None:
    if not text:
        return None
    start = text.find("{")
    end = text.rfind("}") + 1
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(text[start:end])
    except json.JSONDecodeError:
        return None


def _is_gibberish(text: str) -> bool:
    if not text or len(text.strip()) < 40:
        return True
    lower = text.lower()
    bad = ("thinking", "as an ai", "i cannot", "here is the json", "```")
    return any(b in lower for b in bad)


def _ollama_polish(draft_markdown: str, base: dict, extra_context: str = "") -> dict | None:
    if os.environ.get("OLLAMA_MOCK") == "1":
        return None
    user = (
        "Polish this draft. Keep all facts.\n\n"
        f"DRAFT MARKDOWN:\n{draft_markdown}\n\n"
        f"STRUCTURED BASE:\n{json.dumps({k: base[k] for k in base if k != 'report_text'}, default=str)[:2000]}"
    )
    if extra_context:
        user += f"\n\nHISTORICAL PLANT CONTEXT (reference only, do not contradict):\n{extra_context[:2200]}"
    try:
        from apps.agents.llm.client import invoke_raw

        content = invoke_raw(
            model_size="small",
            system=_POLISH_SYSTEM,
            user=user,
            max_tokens=380,
            temperature=0.05,
            skip_input_guard=True,
            source="system",
        )
        if _is_gibberish(content):
            return None
        return _parse_json(content)
    except Exception as exc:
        logger.warning("intelligence_polish_failed: %s", exc)
        return None


def _parts_for_strategy(parts: list[dict]) -> list[dict]:
    return [
        {
            "part_name": p.get("part_name") or "Spare part",
            "qty": 1,
            "lead_time_days": int(p.get("lead_time_days") or 14),
            "in_stock": bool(p.get("in_stock", (p.get("quantity_in_stock") or 0) > 0)),
        }
        for p in parts[:6]
    ]


def _asset_plan_struct(scored: dict) -> dict:
    parts = _parts_for_strategy(scored.get("parts") or [])
    oos = [p for p in parts if not p["in_stock"]]
    lead = scored.get("max_lead_days") or 21
    proc = (
        f"Procure {oos[0]['part_name']} ({oos[0]['lead_time_days']}d lead) before next planned outage."
        if oos
        else f"Buffer stock adequate; longest lead time {lead} days."
    )
    health = scored["health_score"]
    name = scored["asset_name"]
    risk = scored["risk_level"]

    immediate = [
        f"Verify live envelopes on {name} — health {health:.0f}%, risk {risk}.",
        "Confirm LOTO / isolation permits before mechanical work.",
    ]
    if risk in ("high", "critical"):
        immediate.append(f"Schedule inspection within 24h — anomaly trend on {scored['asset_type']}.")

    recommendations = [
        {
            "step": f"Inspect primary wear path ({scored['asset_type']})",
            "rationale": f"Logistic risk model: {risk} priority at {health:.0f}% health.",
            "duration": "45 min",
        },
        {
            "step": "Trend vibration RMS and temperature for 24h post-work",
            "rationale": "Validates intervention effectiveness per ISO 17359.",
            "duration": "ongoing",
        },
    ]
    monitoring = [
        {"sensor": "Vibration RMS", "threshold": "ISO 10816 zone C", "rationale": "Bearing defect early warning"},
        {"sensor": "Oil cleanliness", "threshold": "ISO 4406 ≤ 18/16/13", "rationale": "Lubrication system health"},
    ]

    report_text = (
        f"## {name} — Predictive Maintenance\n\n"
        f"| Metric | Value |\n|--------|-------|\n"
        f"| Health | {health:.0f}% |\n| RUL | {scored.get('rul_hours') or '—'} h |\n"
        f"| Anomaly | {scored['anomaly_score']} |\n| Risk | {risk.upper()} |\n"
        f"| Urgency | {scored['urgency_score']:.0%} |\n\n"
        f"### Immediate actions\n"
        + "\n".join(f"- {a}" for a in immediate)
        + f"\n\n### Spare procurement\n{proc}\n"
    )

    return {
        "immediate_actions": immediate,
        "recommendations": recommendations,
        "long_term_monitoring": monitoring,
        "spare_strategy": {"strategy": proc, "parts": parts},
        "diagnosis": f"{name}: health {health:.0f}%, {risk} maintenance priority (threshold model).",
        "risk_level": risk,
        "urgency_score": scored["urgency_score"],
        "report_text": report_text,
    }


def _factory_scores(factory: Factory) -> list[dict]:
    assets = list(factory.assets.select_related("factory").all())
    rows = [score_asset(a) for a in assets]
    rows.sort(key=lambda r: (_risk_rank(r["risk_level"]), r["health_score"]))
    return rows


def _factory_maintenance_struct(factory: Factory, rows: list[dict]) -> dict:
    fh = FactoryHealthService.compute(factory)
    plant_health = fh["health_score"]
    worst = rows[0] if rows else None
    risk = worst["risk_level"] if worst else "medium"
    urgency = round(max(r["urgency_score"] for r in rows), 2) if rows else 0.35

    lines = [
        f"# Plant Maintenance Intelligence — {factory.name}",
        "",
        f"**Plant health:** {plant_health:.0f}% | **Highest risk:** {worst['asset_name'] if worst else '—'}",
        "",
        "| Asset | Type | Health | RUL (h) | Anomaly | Risk |",
        "|-------|------|--------|---------|---------|------|",
    ]
    for r in rows:
        rul = r.get("rul_hours")
        rul_s = f"{rul:.0f}" if rul is not None else "—"
        lines.append(
            f"| {r['asset_name']} | {r['asset_type']} | {r['health_score']:.0f}% | "
            f"{rul_s} | {r['anomaly_score']} | {r['risk_level'].upper()} |"
        )

    top_assets = [r["asset_name"] for r in rows[:3]]
    immediate = [
        f"Prioritise {top_assets[0]} — lowest composite health in {factory.name} sequence.",
        "Review out-of-stock spares across the line before next campaign window.",
        "Confirm vibration and oil trending dashboards are within ISO limits.",
    ]
    recommendations = [
        {
            "step": f"Line walk-down on {', '.join(top_assets[:2])}",
            "rationale": "Threshold logistic model ranks these assets highest urgency.",
            "duration": "2 h",
        },
        {
            "step": "Cross-check procurement lead times vs planned outages",
            "rationale": f"Max lead across plant: {max((r['max_lead_days'] for r in rows), default=21)} days.",
            "duration": "30 min",
        },
    ]
    monitoring = [
        {"sensor": "Plant vibration envelope", "threshold": "ISO 10816", "rationale": "Line-wide mechanical health"},
        {"sensor": "Oil cleanliness", "threshold": "ISO 4406", "rationale": "Shared lube/hydraulic systems"},
    ]

    all_parts: list[dict] = []
    for r in rows:
        all_parts.extend(_parts_for_strategy(r.get("parts") or []))
    seen = set()
    unique_parts = []
    for p in all_parts:
        key = p["part_name"]
        if key not in seen:
            seen.add(key)
            unique_parts.append(p)
    strategy = (
        f"Stage orders for {len([p for p in unique_parts if not p['in_stock']])} "
        f"out-of-stock SKUs across {factory.name} equipment."
    )

    lines.extend(["", "### Immediate actions"] + [f"- {a}" for a in immediate])
    lines.extend(["", "### Spare procurement", strategy])
    report_text = "\n".join(lines)

    return {
        "immediate_actions": immediate,
        "recommendations": recommendations,
        "long_term_monitoring": monitoring,
        "spare_strategy": {"strategy": strategy, "parts": unique_parts[:8]},
        "diagnosis": (
            f"{factory.name} plant health {plant_health:.0f}% — "
            f"{len(rows)} assets assessed, focus on {top_assets[0]}."
        ),
        "risk_level": risk,
        "urgency_score": urgency,
        "report_text": report_text,
        "anchor_asset_id": worst["asset_id"] if worst else None,
    }


def _factory_decision_struct(factory: Factory, rows: list[dict]) -> dict:
    fh = FactoryHealthService.compute(factory)
    bottleneck_id = fh.get("bottleneck_asset_id")
    bottleneck = next((r for r in rows if r["asset_id"] == str(bottleneck_id)), rows[0] if rows else None)

    critical = [r for r in rows if r["risk_level"] in ("critical", "high")]
    risk = "critical" if any(r["risk_level"] == "critical" for r in rows) else (
        "high" if critical else "medium"
    )

    lines = [
        f"# Executive Decision Summary — {factory.name}",
        "",
        f"**Audience:** Operations supervisor | **Assets covered:** {len(rows)}",
        "",
        "## Priority ranking",
    ]
    for i, r in enumerate(rows, start=1):
        lines.append(
            f"{i}. **{r['asset_name']}** ({r['asset_type']}) — "
            f"health {r['health_score']:.0f}%, urgency {r['urgency_score']:.0%}, risk {r['risk_level']}"
        )

    lines.extend([
        "",
        "## Recommended decisions",
        f"- **Run or defer:** {'Defer non-critical work on ' + critical[0]['asset_name'] if critical else 'Continue production — no deferral required'}.",
        f"- **Bottleneck focus:** {bottleneck['asset_name'] if bottleneck else '—'} drives line throughput risk.",
        "- **Spares:** Align procurement with 14–45 day leads before next outage window.",
        "",
        "## Monitoring cadence",
        "- Daily: vibration RMS on ranked top-3 assets",
        "- Weekly: oil ISO 4406 sample on lubricated paths",
    ])

    immediate = [
        f"Approve maintenance window for {bottleneck['asset_name'] if bottleneck else factory.name} if health < 50%.",
        "Brief shift supervisors on ranked asset list and escalation paths.",
    ]
    recommendations = [
        {
            "step": "Operations review — ranked bottleneck list",
            "rationale": "Linear urgency model aggregated across all equipment.",
            "duration": "15 min",
        },
    ]

    return {
        "immediate_actions": immediate,
        "recommendations": recommendations,
        "long_term_monitoring": [
            {"sensor": "Throughput KPI", "threshold": "≥ 95% nameplate", "rationale": "Production impact"},
            {"sensor": "Composite health", "threshold": f"≥ {fh['health_score']:.0f}% plant average", "rationale": "Fleet baseline"},
        ],
        "spare_strategy": {"strategy": "Consolidated SKU review for ranked assets.", "parts": []},
        "diagnosis": f"{factory.name}: {len(critical)} high/critical assets of {len(rows)} total.",
        "risk_level": risk,
        "urgency_score": round(max((r["urgency_score"] for r in rows), default=0.4), 2),
        "report_text": "\n".join(lines),
        "anchor_asset_id": bottleneck["asset_id"] if bottleneck else (rows[0]["asset_id"] if rows else None),
    }


def _normalize_report_markdown(text: str) -> str:
    if not text:
        return text
    out = text.replace("\r\n", "\n").replace("\r", "\n")
    out = re.sub(r"\|\s*\|(?=-)", "|\n|", out)
    out = re.sub(r"\|\s*\|(?=\|)", "|\n|", out)
    return out


def _merge_polish(base: dict, polished: dict | None) -> dict:
    if not polished:
        return base
    out = dict(base)
    for key in (
        "report_text", "diagnosis", "immediate_actions", "recommendations",
        "long_term_monitoring", "spare_strategy", "risk_level", "urgency_score",
    ):
        val = polished.get(key)
        if val is None:
            continue
        if key == "report_text" and _is_gibberish(str(val)):
            continue
        if key == "report_text" and isinstance(val, str):
            val = _normalize_report_markdown(val)
        if key in ("immediate_actions", "recommendations", "long_term_monitoring") and (
            not isinstance(val, list) or not val
        ):
            continue
        if key == "spare_strategy":
            if not isinstance(val, dict):
                continue
            strategy = str(val.get("strategy") or "").strip()
            parts = val.get("parts") or val.get("required_parts") or []
            if not strategy and not parts:
                continue
        if key == "risk_level" and str(val).lower() not in {"low", "medium", "high", "critical"}:
            continue
        out[key] = val

    if isinstance(out.get("spare_strategy"), dict) and not out["spare_strategy"].get("parts"):
        out["spare_strategy"]["parts"] = base.get("spare_strategy", {}).get("parts", [])
    if isinstance(out.get("report_text"), str):
        out["report_text"] = _normalize_report_markdown(out["report_text"])
    return out


def build_asset_intelligence_plan(asset: Asset, *, use_llm: bool = True) -> dict:
    from apps.agents.plant_module_context import maintenance_asset_context

    scored = score_asset(asset)
    base = _asset_plan_struct(scored)
    base["report_text"] = _normalize_report_markdown(base["report_text"])
    if use_llm:
        asset_ctx = maintenance_asset_context(asset.asset_type)
        polished = _ollama_polish(base["report_text"], base, extra_context=asset_ctx)
        return _merge_polish(base, polished)
    return base


def build_factory_maintenance_report(factory: Factory, *, use_llm: bool = True) -> dict:
    from apps.assets.samvidhaan_service import get_historical_context_for_factory

    rows = _factory_scores(factory)
    base = _factory_maintenance_struct(factory, rows)
    hist = get_historical_context_for_factory(factory)
    if use_llm:
        polished = _ollama_polish(base["report_text"], base, extra_context=hist)
        return _merge_polish(base, polished)
    return base


def build_factory_decision_report(factory: Factory, *, use_llm: bool = True) -> dict:
    from apps.assets.samvidhaan_service import get_historical_context_for_factory

    rows = _factory_scores(factory)
    base = _factory_decision_struct(factory, rows)
    hist = get_historical_context_for_factory(factory)
    if use_llm:
        polished = _ollama_polish(base["report_text"], base, extra_context=hist)
        return _merge_polish(base, polished)
    return base


def generate_quick_maintenance_plan(asset: Asset) -> dict:
    """Backward-compatible entry for action plans — uses threshold pipeline."""
    return build_asset_intelligence_plan(asset, use_llm=True)
