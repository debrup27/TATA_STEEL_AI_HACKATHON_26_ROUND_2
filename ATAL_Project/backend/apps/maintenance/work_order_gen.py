"""Generate a structured maintenance Work Order for an asset from live SANSAD feeds.

Uses qwen (0.8b worker, serialized via OLLAMA_SMALL_LOCK) with a dedicated work-order system
prompt. Inputs are the same deterministic SANSAD signals the rest of the suite uses: health, RUL,
anomaly, probable fault, criticality, and spares. Output is persisted as a WorkOrder (AI_GENERATED).
"""
from __future__ import annotations

import json
import logging
import re

import httpx
from django.conf import settings

from apps.agents.ollama_warmup import ollama_keep_alive_value, OLLAMA_SMALL_LOCK

logger = logging.getLogger(__name__)

_WO_SYSTEM = """You are MANAS, drafting a formal maintenance WORK ORDER for a steel-plant asset \
(Tata Steel ATAL). You receive the live condition feed (health, RUL, anomaly, probable fault, \
criticality, spares). Produce a concrete, safe, actionable work order.

Return ONLY valid JSON (no preamble, no markdown fences) with EXACTLY these keys:
{
  "title": "<short imperative work-order title>",
  "priority": "1-critical" | "2-high" | "3-medium" | "4-low",
  "description": "<2-3 sentence scope referencing the actual condition signals>",
  "recommended_actions": ["<ordered concrete step>", "..."],   // 3-6 steps, include LOTO/isolation
  "spare_requirements": ["<part — qty — order/in-stock>", "..."],
  "estimated_duration_hrs": <number>,
  "safety_notes": "<key safety/LOTO note>"
}

Rules:
- Priority MUST reflect the feed: fault active or health<35 or RUL<48h → 1-critical; health<55 → 2-high.
- Reference the asset's real fault/sensor context. Cite ISO/LOTO where relevant.
- Steps must be executable by a maintenance technician. No vague advice.
"""

_PRIORITY_BY_SIGNAL = [
    ("1-critical", lambda h, r, fault: fault or h < 35 or (r is not None and r < 48)),
    ("2-high", lambda h, r, fault: h < 55),
    ("3-medium", lambda h, r, fault: h < 75),
]


def _fallback_priority(health: float, rul_hours, fault_active: bool) -> str:
    for prio, cond in _PRIORITY_BY_SIGNAL:
        if cond(health, rul_hours, fault_active):
            return prio
    return "4-low"


def _parse_json(text: str) -> dict | None:
    if not text:
        return None
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                return None
    return None


def _gather_feed(asset) -> dict:
    from apps.assets.services import AssetHealthService
    from apps.assets.diagnostics_service import build_diagnostic
    from apps.maintenance.action_plans import _spares_for_asset

    health = AssetHealthService.compute(asset)
    diag = build_diagnostic(asset)
    spares = _spares_for_asset(asset, None)
    return {
        "asset": asset.name,
        "asset_type": asset.asset_type,
        "factory": asset.factory.name,
        "criticality": asset.criticality_level,
        "health_score": round(float(health.get("health_score") or 0.0), 1),
        "rul_hours": health.get("rul_hours"),
        "anomaly_score": health.get("anomaly_score"),
        "fault_active": bool((health.get("twin_state_summary") or {}).get("_fault_injected")),
        "probable_fault": diag.get("probableFault", ""),
        "spares": [
            {"part": s["part"], "in_stock_qty": s.get("stockQty", 0), "decision": s.get("orderDecision")}
            for s in spares
        ],
    }


def generate_work_order_sync(asset_id: str, *, user=None) -> dict:
    """Generate + persist a WorkOrder for the asset from live feeds. Returns the WO as a dict."""
    from apps.assets.models import Asset
    from apps.maintenance.models import WorkOrder

    asset = Asset.objects.select_related("factory").get(pk=asset_id)
    feed = _gather_feed(asset)
    health = float(feed["health_score"])
    rul = feed["rul_hours"]
    fault = feed["fault_active"]

    llm: dict | None = None
    payload = {
        "model": settings.OLLAMA_SMALL_MODEL,
        "messages": [
            {"role": "system", "content": _WO_SYSTEM},
            {"role": "user", "content": f"LIVE CONDITION FEED:\n{json.dumps(feed, default=str)[:2200]}"},
        ],
        "stream": False,
        "think": False,
        "keep_alive": ollama_keep_alive_value(),
        "options": {"num_predict": 420, "temperature": 0.1},
    }
    try:
        with OLLAMA_SMALL_LOCK:
            with httpx.Client(timeout=60) as client:
                resp = client.post(f"{settings.OLLAMA_BASE_URL}/api/chat", json=payload)
                resp.raise_for_status()
        content = (resp.json().get("message") or {}).get("content") or ""
        llm = _parse_json(content)
    except Exception as exc:
        logger.warning("work_order_llm_failed asset=%s err=%s", asset.id, exc)

    # Deterministic fallback so a WO is always produced even if the LLM is unavailable.
    fb_priority = _fallback_priority(health, rul, fault)
    order_parts = [
        f"{s['part']} — {'order' if s.get('decision') == 'order' else 'in stock'}"
        for s in feed["spares"]
    ]
    data = {
        "title": (llm or {}).get("title") or f"Maintenance — {asset.name} ({feed['probable_fault'] or 'condition-based'})",
        "priority": (llm or {}).get("priority") if (llm or {}).get("priority") in dict(WorkOrder.Priority.choices) else fb_priority,
        "description": (llm or {}).get("description")
        or f"Condition-based work order for {asset.name}: health {health:.0f}%, "
        f"RUL {rul if rul is not None else '—'}h, fault {'active' if fault else 'nominal'}.",
        "recommended_actions": (llm or {}).get("recommended_actions")
        or [
            "Apply LOTO and verify zero-energy state before intervention.",
            f"Inspect {feed['probable_fault'] or 'primary wear components'} against OEM limits.",
            "Replace/repair per findings; record measurements in the digital logbook.",
        ],
        "spare_requirements": (llm or {}).get("spare_requirements") or order_parts,
        "estimated_duration_hrs": float((llm or {}).get("estimated_duration_hrs") or (8 if fault else 4)),
        "safety_notes": (llm or {}).get("safety_notes") or "Follow plant LOTO (ISO 14118) and PPE SOP.",
    }

    wo = WorkOrder.objects.create(
        asset=asset,
        priority=data["priority"],
        title=data["title"][:255],
        description=data["description"],
        recommended_actions=data["recommended_actions"],
        spare_requirements=data["spare_requirements"],
        estimated_duration_hrs=data["estimated_duration_hrs"],
        status=WorkOrder.Status.OPEN,
        source=WorkOrder.Source.AI_GENERATED,
        created_by=user if (user and getattr(user, "is_authenticated", False)) else None,
    )
    logger.info("work_order_generated asset=%s wo=%s priority=%s", asset.name, wo.id, wo.priority)

    return {
        "id": str(wo.id),
        "asset": asset.name,
        "assetId": str(asset.id),
        "factory": asset.factory.name,
        "title": wo.title,
        "priority": wo.priority,
        "description": wo.description,
        "recommendedActions": wo.recommended_actions,
        "spareRequirements": wo.spare_requirements,
        "estimatedDurationHrs": wo.estimated_duration_hrs,
        "safetyNotes": data["safety_notes"],
        "status": wo.status,
        "source": wo.source,
        "createdAt": wo.created_at.isoformat(),
    }
