"""
MANAS /sansad mode — plant-wide context harvest via 0.8b, persistent session briefing for 9b.
"""
from __future__ import annotations

import logging
from datetime import timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)

_SANSAD_META_KEYS = (
    "sansad_mode",
    "sansad_context_summary",
    "sansad_context_updated_at",
    "sansad_turn_count",
    "sansad_refresh_every",
)
_DEFAULT_REFRESH_EVERY = 5
# Ollama defaults requests to num_ctx=4096 regardless of the model's 256k max.
# Keep the raw bundle + system prompt well under that so the model has room to
# generate — an oversized bundle fills the window and yields near-empty output.
_BUNDLE_CHAR_LIMIT = 6_000
_DOSSIER_EXCERPT = 1_000
_QUERY_SUPPLEMENT_LIMIT = 3_500
_SUMMARY_MAX_TOKENS = 900

_SUMMARY_SYSTEM = """\
You are the SANSAD context subagent for ATAL MANAS (steel-plant maintenance AI).
Read the raw plant data bundle and produce a dense briefing for the main MANAS assistant (9b).

REQUIRED sections (markdown headers):
## Plant status
## Active faults & trips
## Priority assets (RUL / health / risk)
## Recent logs & maintenance
## Open work & action plans
## KPIs & cost signals
## Historical context (90d highlights)

The raw bundle includes maintenance event logs, maintenance reports, 90-day historical dossiers per factory, and alarm history. You MUST surface these in the briefing — never omit them or claim they are unavailable.

Rules:
- Preserve asset codes (SRF, HHPD, FS, HAGCC, APT, TCMS, CGP, HPAK) and numeric readings.
- List active unacknowledged alerts with severity.
- Flag trip/anomaly-injected assets explicitly.
- Under 1200 words; factual only — no pleasantries.
- On refresh: merge prior briefing with new bundle data and chat digest; drop stale items superseded by newer readings.
"""


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def collect_plant_context_bundle() -> dict:
    """Aggregate plant-wide operational data for 0.8b summarization."""
    from apps.assets.models import Factory
    from apps.assets.plant_snapshot import build_plant_snapshot
    from apps.assets.maintenance_snapshot import compute_factory_maintenance_snapshot
    from apps.assets.samvidhaan_service import build_historical_factory_dossier
    from apps.assets.pareto_maintenance import compute_factory_cost_analysis
    from apps.maintenance.action_plans import list_action_plans
    from apps.maintenance.models import MaintenanceEvent
    from apps.alerts.models import AlarmEvent
    from apps.reports.models import MaintenanceReport
    from apps.twins.models import AssetTwinState
    from apps.ml.models import MLPrediction
    from django.db.models import Avg

    snapshot = build_plant_snapshot()
    factories = list(Factory.objects.all())
    factory_snapshots = [compute_factory_maintenance_snapshot(f) for f in factories]

    alarms = list(
        AlarmEvent.objects.filter(acknowledged=False)
        .select_related("asset", "asset__factory")
        .order_by("-created_at")[:40]
    )
    events = list(
        MaintenanceEvent.objects.select_related("asset", "asset__factory")
        .order_by("-completed_date", "-scheduled_date")[:40]
    )
    reports = list(
        MaintenanceReport.objects.select_related("asset", "asset__factory")
        .order_by("-created_at")[:15]
    )

    dossiers = []
    for factory in factories:
        try:
            d = build_historical_factory_dossier(factory)
            dossiers.append({
                "factory": factory.name,
                "excerpt": _truncate(d.get("report_text") or "", _DOSSIER_EXCERPT),
            })
        except Exception as exc:
            logger.warning("sansad dossier skip factory=%s err=%s", factory.id, exc)

    cost_rows = []
    for factory in factories:
        try:
            cost_rows.append(compute_factory_cost_analysis(factory))
        except Exception as exc:
            logger.warning("sansad cost skip factory=%s err=%s", factory.id, exc)

    plans = list_action_plans()[:12]

    now = timezone.now()
    month_ago = now - timedelta(days=30)
    since_90d = now - timedelta(days=90)
    events_month = MaintenanceEvent.objects.filter(completed_date__gte=month_ago)
    predictive_count = events_month.filter(event_type="predictive").count()
    total_events = events_month.count()
    twin_health = AssetTwinState.objects.aggregate(avg=Avg("health_score"))["avg"] or 80.0
    total_alarms = AlarmEvent.objects.filter(created_at__gte=month_ago).count()
    alarm_history = list(
        AlarmEvent.objects.filter(created_at__gte=since_90d)
        .select_related("asset", "asset__factory")
        .order_by("-created_at")[:35]
    )

    kpis = {
        "proactive_maintenance_rate": round(predictive_count / max(total_events, 1), 3),
        "plant_health_score": round(float(twin_health), 1),
        "total_alarms_30d": total_alarms,
        "period_days": 30,
    }

    return {
        "generated_at": snapshot.get("generated_at"),
        "anomaly_flags": snapshot.get("anomaly_flags"),
        "asset_count": snapshot.get("count"),
        "factory_snapshots": factory_snapshots,
        "alarms": [
            {
                "severity": a.severity,
                "message": a.message or a.alarm_type,
                "asset": a.asset.name if a.asset_id else "Plant",
                "factory": a.asset.factory.name if a.asset_id else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alarms
        ],
        "alarm_history_90d": [
            {
                "severity": a.severity,
                "message": a.message or a.alarm_type,
                "asset": a.asset.name if a.asset_id else "Plant",
                "factory": a.asset.factory.name if a.asset_id else None,
                "acknowledged": a.acknowledged,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alarm_history
        ],
        "maintenance_events": [
            {
                "asset": e.asset.name if e.asset_id else "—",
                "factory": e.asset.factory.name if e.asset_id else None,
                "event_type": e.event_type,
                "description": (e.description or "")[:160],
                "downtime_hours": float(e.downtime_hours or 0),
                "date": (e.completed_date or e.scheduled_date or e.created_at),
            }
            for e in events
        ],
        "reports": [
            {
                "title": r.title,
                "asset": r.asset.name if r.asset_id else "—",
                "factory": r.asset.factory.name if r.asset_id else None,
                "risk_level": r.risk_level,
                "summary": _truncate((r.diagnosis or r.report_text or ""), 280),
            }
            for r in reports
        ],
        "historical_dossiers": dossiers,
        "cost_analysis": cost_rows,
        "action_plans": [
            {
                "asset": p["asset"],
                "factory": p["factory"],
                "risk": p["riskLevel"],
                "immediate": (p.get("immediateActions") or [])[:3],
                "summary": _truncate(p.get("optimizedPlanSummary") or "", 200),
            }
            for p in plans
        ],
        "kpis": kpis,
        "diagnostics_highlights": [
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "factory": a.get("factory"),
                "health": a.get("health"),
                "rul": a.get("rul"),
                "probable_fault": a.get("probableFault"),
                "trip": a.get("tripActive"),
                "anomaly": a.get("anomalyActive"),
            }
            for a in (snapshot.get("assets") or [])[:20]
        ],
    }


def bundle_to_fallback_summary(bundle: dict) -> str:
    """Raw plant bundle text when the 0.8b summarizer fails (factual context, not a canned answer)."""
    return bundle_to_text(bundle)


def sansad_llm_answer(
    user_question: str,
    briefing: str,
    *,
    deep_thinking: bool = False,
) -> str:
    """Generate a real MANAS answer from the linked SANSAD briefing via 9b."""
    from apps.agents.llm.client import (
        _invoke_ollama_chat_completions_parts,
        finalize_manas_output,
        is_chain_of_thought_leak,
    )

    briefing_text = (briefing or "").strip()
    question = (user_question or "").strip()
    if not briefing_text or not question:
        return ""

    system = """\
You are MANAS for Tata Steel plant maintenance with a live SANSAD briefing linked.

Rules:
- Answer ONLY from briefing facts. Do not invent readings, assets, alarms, or events.
- Write the final answer directly in markdown. Use markdown tables when the user asks for a table.
- Factory 1 / F1 / Horizon = same plant. Factory 2 / F2 / Zephyr = same plant.
- For anomaly questions, list assets with anomaly/trip flags and their health/RUL from the briefing.
- Never say plant or historical data is unavailable when it appears in the briefing.
- Put the complete answer in the response body — not only in thinking.
- No preamble, no planning aloud, no empty body.
"""
    user = f"Question:\n{question}\n\nSANSAD briefing:\n{briefing_text[:6000]}"

    for attempt, use_think in enumerate((False, False, deep_thinking)):
        try:
            content, reasoning = _invoke_ollama_chat_completions_parts(
                model_size="large",
                system=system,
                user=user,
                max_tokens=1200,
                temperature=0.12 if attempt else 0.15,
                think=use_think and deep_thinking,
            )
            cleaned = finalize_manas_output(content, reasoning).strip()
            if cleaned and not is_chain_of_thought_leak(cleaned) and len(cleaned) >= 20:
                return cleaned
        except Exception as exc:
            logger.warning("sansad_llm_answer attempt=%d err=%s", attempt + 1, exc)
    return ""


def sansad_briefing_excerpt(user_question: str, briefing: str) -> str:
    """Last resort: return the relevant briefing section verbatim (no LLM)."""
    import re

    text = (briefing or "").strip()
    if not text:
        return ""
    q = (user_question or "").lower()

    factory_terms: list[str] = []
    if re.search(r"\b(factory\s*1|f-?1|horizon)\b", q):
        factory_terms = ["factory 1", "horizon", "f-1", "f1"]
    elif re.search(r"\b(factory\s*2|f-?2|zephyr)\b", q):
        factory_terms = ["factory 2", "zephyr", "f-2", "f2"]

    wants_anomaly = bool(re.search(r"\banomal", q))

    subsections = [s.strip() for s in re.split(r"\n(?=### )", text) if s.strip()]
    picked: list[str] = []
    for sec in subsections:
        if not sec.startswith("### "):
            continue
        head = sec[:220].lower()
        body = sec.lower()
        if factory_terms and any(term in head for term in factory_terms):
            picked.append(sec)
        elif wants_anomaly and re.search(r"anomal|fault|trip", body):
            picked.append(sec)
    if picked:
        return _truncate("\n\n".join(picked[:3]), 2800)

    sections = [s.strip() for s in re.split(r"\n(?=## )", text) if s.strip()]
    for sec in sections:
        body = sec.lower()
        if factory_terms and any(term in body for term in factory_terms):
            return _truncate(sec, 2800)
        if wants_anomaly and re.search(r"anomal|fault|trip", body):
            return _truncate(sec, 2800)

    return _truncate(text, 2200)


def _historical_data_excerpt(bundle: dict) -> str:
    """Raw historical plant rows for LLM context — not a pre-written answer."""
    lines: list[str] = []
    events = bundle.get("maintenance_events") or []
    if events:
        lines.append("### Maintenance events")
        for e in events[:16]:
            lines.append(
                f"- {e.get('date')} | {e.get('factory')}/{e.get('asset')}: "
                f"{e.get('event_type')} — {e.get('description')} "
                f"({e.get('downtime_hours')}h downtime)"
            )

    reports = bundle.get("reports") or []
    if reports:
        lines.append("\n### Maintenance reports")
        for r in reports[:10]:
            lines.append(
                f"- [{r.get('risk_level')}] {r.get('factory')}/{r.get('asset')}: "
                f"{r.get('title')} — {r.get('summary')}"
            )

    dossiers = bundle.get("historical_dossiers") or []
    for d in dossiers:
        lines.append(f"\n### {d.get('factory')} — 90-day dossier excerpt")
        lines.append((d.get("excerpt") or "")[:1800])

    alarm_hist = bundle.get("alarm_history_90d") or []
    if alarm_hist:
        lines.append("\n### Alarm history (90d sample)")
        for a in alarm_hist[:12]:
            ack = "acknowledged" if a.get("acknowledged") else "open"
            lines.append(
                f"- [{a.get('severity')}/{ack}] {a.get('factory')}/{a.get('asset')}: "
                f"{a.get('message')}"
            )

    kpis = bundle.get("kpis") or {}
    if kpis:
        lines.append(
            f"\n### KPI signals\n"
            f"- Alarms last 30d: {kpis.get('total_alarms_30d', '—')}\n"
            f"- Proactive maintenance rate: {kpis.get('proactive_maintenance_rate', '—')}"
        )

    return _truncate("\n".join(lines), _QUERY_SUPPLEMENT_LIMIT)


def _is_usable_sansad_summary(text: str) -> bool:
    cleaned = (text or "").strip()
    if len(cleaned) < 80:
        return False
    lower = cleaned.lower()
    if lower in ("thinking", "thinking process"):
        return False
    if lower.startswith("thinking") and "## plant status" not in lower:
        return False
    junk = (
        "i do not have access",
        "unable to perform",
        "this simulation",
        "provided in the user message",
    )
    if any(marker in lower for marker in junk):
        return False
    if "## plant status" in lower or "factory" in lower or "health" in lower:
        return True
    return len(cleaned) >= 200


def bundle_to_text(bundle: dict) -> str:
    """Serialize bundle dict to bounded plain text for the small model."""
    lines: list[str] = [
        f"# Plant data bundle @ {bundle.get('generated_at', 'now')}",
        f"Assets: {bundle.get('asset_count', 0)}",
        f"Anomaly flags: {bundle.get('anomaly_flags')}",
        "",
        "## Factory snapshots",
    ]
    for fs in bundle.get("factory_snapshots") or []:
        label = fs.get("factory_label") or fs.get("factory_name")
        lines.append(f"### {label} — {fs.get('factory_name')} ({fs.get('factory_code')})")
        lines.append(fs.get("layman_summary") or "")
        needs = fs.get("assets_needing_attention", 0)
        lines.append(f"Assets needing attention: {needs}")
        for row in (fs.get("assets") or [])[:6]:
            lines.append(
                f"- {row.get('asset_name')}: health {row.get('health_score')}%, "
                f"RUL {row.get('rul_hours')}h, risk {row.get('risk_level')} — {row.get('action_label')}"
            )
        lines.append("")

    lines.append("## Active alarms")
    for a in bundle.get("alarms") or []:
        lines.append(f"- [{a.get('severity')}] {a.get('asset')}: {a.get('message')}")

    lines.append("\n## Recent maintenance events")
    for e in bundle.get("maintenance_events") or []:
        lines.append(
            f"- {e.get('asset')} ({e.get('event_type')}): {e.get('description')} "
            f"[{e.get('downtime_hours')}h downtime]"
        )

    lines.append("\n## Recent reports")
    for r in bundle.get("reports") or []:
        lines.append(f"- [{r.get('risk_level')}] {r.get('title')} — {r.get('summary')}")

    lines.append("\n## Action plans (priority)")
    for p in bundle.get("action_plans") or []:
        imm = "; ".join(p.get("immediate") or [])
        lines.append(f"- {p.get('asset')} ({p.get('risk')}): {imm} | {p.get('summary')}")

    lines.append("\n## KPIs (30d)")
    lines.append(str(bundle.get("kpis") or {}))

    lines.append("\n## Cost analysis")
    for c in bundle.get("cost_analysis") or []:
        lines.append(
            f"- {c.get('factory')}: loss ₹{c.get('predicted_loss_lakhs')}L, "
            f"savings ₹{c.get('pdm_savings_lakhs')}L — {c.get('summary', '')[:120]}"
        )

    lines.append("\n## Diagnostics highlights")
    for d in bundle.get("diagnostics_highlights") or []:
        trip = " TRIP" if d.get("trip") else ""
        anom = " ANOMALY" if d.get("anomaly") else ""
        lines.append(
            f"- {d.get('name')} ({d.get('factory')}): health {d.get('health')}, "
            f"RUL {d.get('rul')}h{trip}{anom} — {d.get('probable_fault') or 'nominal'}"
        )

    lines.append("\n## Historical dossiers (90d excerpts)")
    for d in bundle.get("historical_dossiers") or []:
        lines.append(f"### {d.get('factory')}")
        lines.append(d.get("excerpt") or "")

    lines.append("\n## Alarm history (90d sample)")
    for a in bundle.get("alarm_history_90d") or []:
        ack = "ack" if a.get("acknowledged") else "open"
        lines.append(
            f"- [{a.get('severity')}/{ack}] {a.get('factory')}/{a.get('asset')}: {a.get('message')}"
        )

    return _truncate("\n".join(lines), _BUNDLE_CHAR_LIMIT)


def _sansad_query_wants_historical(user_question: str) -> bool:
    import re

    q = (user_question or "").lower()
    return bool(
        re.search(
            r"\b(histor|past|archive|rca|dossier|samvidhaan|90\s*-?\s*day|"
            r"maintenance\s+log|maintenance\s+record|intervention|previous\s+work|"
            r"work\s+order\s+history|logs?\s+(i|we|to)\s+|records?\s+(i|we|to)\s+|"
            r"should\s+(i|we)\s+(know|aware))\b",
            q,
        )
    )


def build_sansad_query_supplement(user_question: str) -> str:
    """Inject raw historical plant rows for the main LLM — not a pre-written answer."""
    if not (user_question or "").strip():
        return ""
    if not _sansad_query_wants_historical(user_question):
        return ""
    try:
        bundle = collect_plant_context_bundle()
    except Exception as exc:
        logger.warning("sansad query supplement skipped: %s", exc)
        return ""
    body = _historical_data_excerpt(bundle)
    if not body.strip():
        return ""
    return f"\n[SANSAD query fetch — use this for the user's question]\n{body}"


def summarize_sansad_context(
    bundle: dict,
    *,
    previous_summary: str = "",
    chat_digest: str = "",
) -> str:
    from apps.agents.llm.client import invoke_guarded
    from apps.agents.llm.schemas import GuardrailAction

    bundle_text = bundle_to_text(bundle)
    user_parts = [f"## Raw plant bundle\n{bundle_text}"]
    if previous_summary:
        user_parts.append(f"## Prior MANAS briefing (merge & refresh)\n{previous_summary}")
    if chat_digest:
        user_parts.append(f"## Recent chat digest\n{chat_digest}")

    user_payload = "\n\n".join(user_parts)
    summary = ""
    for attempt in range(2):
        # 9b summarizer: the 0.8b model collapses to near-empty output on the dense
        # 14k plant bundle. This runs in a background thread, so 9b latency is fine.
        text, verdict = invoke_guarded(
            model_size="large",
            system=_SUMMARY_SYSTEM,
            user=user_payload,
            max_tokens=_SUMMARY_MAX_TOKENS,
            temperature=0.15 if attempt == 0 else 0.1,
            source="sansad_context",
            skip_input_guard=True,
            skip_output_guard=True,
        )
        if verdict and verdict.action == GuardrailAction.BLOCK:
            logger.warning("sansad summarizer blocked attempt=%d", attempt + 1)
            continue
        candidate = (text or "").strip()
        if _is_usable_sansad_summary(candidate):
            summary = candidate
            break

    if not summary:
        logger.warning("sansad summarizer unusable after retries — storing raw plant bundle")
        summary = bundle_to_fallback_summary(bundle)
    return summary


def _patch_session_metadata(session, patch: dict) -> None:
    meta = dict(session.session_metadata or {})
    meta.update(patch)
    session.session_metadata = meta
    session.save(update_fields=["session_metadata"])


def _clear_sansad_metadata(session) -> None:
    meta = dict(session.session_metadata or {})
    for key in _SANSAD_META_KEYS:
        meta.pop(key, None)
    session.session_metadata = meta
    session.save(update_fields=["session_metadata"])


def _chat_digest_for_session(session_id: str) -> str:
    from apps.agents.models import ChatMessage

    rows = list(
        ChatMessage.objects.filter(session_id=session_id)
        .order_by("-timestamp")[:6]
    )
    rows.reverse()
    parts: list[str] = []
    for m in rows:
        if m.role == "system" and m.content.startswith("[Context compacted"):
            parts.append(f"COMPACTION: {m.content[:800]}")
        elif m.role in ("user", "assistant"):
            parts.append(f"{m.role.upper()}: {m.content[:400]}")
    return "\n".join(parts)


def _sync_sansad_context(
    session_id: str,
    *,
    is_refresh: bool = False,
    replace: bool = False,
) -> None:
    from apps.agents.models import ChatSession
    from apps.agents.stream_registry import send_to_stream

    send_to_stream(session_id, {
        "type": "sansad_syncing",
        "refresh": is_refresh,
        "replace": replace,
    })
    try:
        session = ChatSession.objects.get(id=session_id)
        meta = session.session_metadata or {}
        bundle = collect_plant_context_bundle()
        if replace:
            previous = ""
            digest = ""
        else:
            previous = meta.get("sansad_context_summary") or ""
            digest = _chat_digest_for_session(session_id) if is_refresh else ""
        summary = summarize_sansad_context(
            bundle,
            previous_summary=previous if is_refresh and not replace else "",
            chat_digest=digest,
        )
        updated_at = timezone.now().isoformat()
        _patch_session_metadata(session, {
            "sansad_mode": True,
            "sansad_context_summary": summary,
            "sansad_context_updated_at": updated_at,
            "sansad_turn_count": int(meta.get("sansad_turn_count") or 0),
            "sansad_refresh_every": int(meta.get("sansad_refresh_every") or _DEFAULT_REFRESH_EVERY),
        })
        send_to_stream(session_id, {
            "type": "sansad_synced",
            "updated_at": updated_at,
            "preview": summary[:200],
            "refresh": is_refresh,
            "replace": replace,
        })
    except Exception as exc:
        logger.exception("sansad sync failed session=%s err=%s", session_id, exc)
        send_to_stream(session_id, {
            "type": "sansad_synced",
            "error": str(exc),
            "preview": "",
            "refresh": is_refresh,
            "replace": replace,
        })


def activate_sansad_mode(session_id: str) -> None:
    from apps.agents.models import ChatSession

    session = ChatSession.objects.get(id=session_id)
    _patch_session_metadata(session, {
        "sansad_mode": True,
        "sansad_turn_count": 0,
        "sansad_refresh_every": _DEFAULT_REFRESH_EVERY,
    })
    _sync_sansad_context(session_id, is_refresh=False)


def deactivate_sansad_mode(session_id: str) -> None:
    from apps.agents.models import ChatSession
    from apps.agents.stream_registry import send_to_stream

    session = ChatSession.objects.get(id=session_id)
    _clear_sansad_metadata(session)
    send_to_stream(session_id, {"type": "sansad_deactivated"})


def update_sansad_context(session_id: str) -> None:
    """Manual /update — re-harvest plant data and replace the stored briefing."""
    from apps.agents.models import ChatSession

    session = ChatSession.objects.get(id=session_id)
    meta = session.session_metadata or {}
    if not meta.get("sansad_mode"):
        raise ValueError("SANSAD mode is not active — use /sansad first")
    _sync_sansad_context(session_id, is_refresh=True, replace=True)


def maybe_refresh_sansad_context(session_id: str) -> None:
    from apps.agents.compaction import compact_history

    _sync_sansad_context(session_id, is_refresh=True)
    compact_history(session_id)


def increment_sansad_turn_and_maybe_refresh(session_id: str) -> None:
    """Called from run_chat_logic on each user message while sansad_mode is active."""
    import threading

    from apps.agents.models import ChatSession

    session = ChatSession.objects.select_related().get(id=session_id)
    meta = session.session_metadata or {}
    if not meta.get("sansad_mode"):
        return

    count = int(meta.get("sansad_turn_count") or 0) + 1
    refresh_every = int(meta.get("sansad_refresh_every") or _DEFAULT_REFRESH_EVERY)
    _patch_session_metadata(session, {"sansad_turn_count": count})

    if count > 0 and count % refresh_every == 0:
        def _refresh(sid: str):
            import django.db
            try:
                maybe_refresh_sansad_context(sid)
            finally:
                django.db.connections.close_all()

        threading.Thread(
            target=_refresh,
            args=(session_id,),
            daemon=True,
            name=f"sansad-refresh-{session_id[:8]}",
        ).start()
