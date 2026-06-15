"""
MANAS chat: RAG retrieval → Ollama stream → WS emit → save.

run_chat_logic() contains the full pipeline and is called either:
  - directly from a daemon thread in views.py (primary path, bypasses Celery queue)
  - via the Celery task wrapper process_chat_message (fallback / future use)
"""
import json
import logging
import threading
import httpx
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from apps.agents.llm.policy import MANAS_SCOPE_GUARDRAILS

logger = logging.getLogger(__name__)

_STOPPED_MESSAGE = "Generation stopped."

_DEEP_THINKING_ADDENDUM = """
[Deep reasoning mode]
Use the thinking channel for private chain-of-thought. Then you MUST write a complete user-facing answer in the response body (not in thinking).
The response body must directly answer the user's question in at least 2 sentences. Never finish with an empty response body.
"""


def _extract_answer_from_reasoning(reasoning: str) -> str:
    """Salvage user-facing text when Ollama leaves message.content empty after think=true."""
    text = (reasoning or "").strip()
    if not text:
        return ""
    lower = text.lower()
    for marker in ("**answer:**", "**final answer:**", "## answer", "in summary,", "to summarize,"):
        if marker in lower:
            idx = lower.index(marker)
            tail = text[idx:].split("\n\n")[0]
            for m in ("**Answer:**", "**Final answer:**", "## Answer", "In summary,", "To summarize,"):
                tail = tail.replace(m, "").replace(m.lower(), "")
            cleaned = tail.strip(" :#-*")
            if len(cleaned) > 30:
                return cleaned
    paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 50]
    if paragraphs:
        return paragraphs[-1]
    return text[:2500]


def _finalize_deep_thinking_response(content: str, reasoning: str) -> tuple[str, str]:
    body = (content or "").strip()
    think = (reasoning or "").strip()
    if body:
        return body, think
    if think:
        salvaged = _extract_answer_from_reasoning(think)
        if salvaged:
            return salvaged, think
    return body, think


def _stopped_content(text: str, *, cancelled: bool) -> str:
    body = (text or "").strip()
    if not cancelled:
        return text or ""
    if not body:
        return _STOPPED_MESSAGE
    if _STOPPED_MESSAGE in body:
        return text
    return f"{body}\n\n*{_STOPPED_MESSAGE}*"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _doc_title_from_chunk(props: dict, fallback_titles: list[str] | None = None) -> str:
    """Resolve a human-readable source label for citations."""
    for key in ("title", "standard_code", "source_doc"):
        val = (props.get(key) or "").strip()
        if val and val.lower() not in ("reference document", "uploaded documents"):
            return val
    if fallback_titles:
        for t in fallback_titles:
            if t and t.strip():
                return t.strip()
    content = (props.get("content") or "").strip()
    if content:
        first = content.split("\n", 1)[0].strip()
        if 10 <= len(first) <= 140:
            return first
    return "Loaded document"


def _custom_docs_to_raw(custom_documents: list | None, custom_rag_context: str) -> list[dict]:
    """Turn uploaded files into RAG chunks with per-file titles for citations."""
    raw: list[dict] = []
    for item in custom_documents or []:
        if not isinstance(item, dict):
            continue
        name = (item.get("name") or "Uploaded document").strip()
        text = (item.get("text") or "").strip()
        if not text:
            continue
        raw.append({
            "properties": {
                "title": name,
                "content": text[:12000],
                "source_doc": name,
                "section": "upload",
                "doc_type": "upload",
            },
            "source": "upload",
        })

    if raw:
        return raw

    # Legacy: parse --- filename --- blocks from custom_rag_context
    blob = (custom_rag_context or "").strip()
    if not blob:
        return raw

    import re
    parts = re.split(r"\n--- (.+?) ---\n", blob)
    if len(parts) > 1:
        for i in range(1, len(parts), 2):
            name = parts[i].strip()
            text = parts[i + 1].strip() if i + 1 < len(parts) else ""
            if name and text and not text.startswith("data:"):
                raw.append({
                    "properties": {
                        "title": name,
                        "content": text[:12000],
                        "source_doc": name,
                        "section": "upload",
                        "doc_type": "upload",
                    },
                    "source": "upload",
                })
    elif not blob.startswith("data:"):
        raw.append({
            "properties": {
                "title": "Uploaded documents",
                "content": blob[:12000],
                "source_doc": "upload",
                "section": "upload",
                "doc_type": "upload",
            },
            "source": "upload",
        })
    return raw


def _citation_from_chunk(
    props: dict,
    d: dict,
    *,
    index: int,
    excerpt: str,
    fallback_titles: list[str] | None = None,
) -> dict:
    doc_title = _doc_title_from_chunk(props, fallback_titles)
    section = props.get("section", "") or ""
    score = d.get("reranker_score") or d.get("rrf_score", 0) or (1.0 - d.get("distance", 1.0))
    source = "upload" if props.get("doc_type") == "upload" or d.get("source") == "upload" else "library"
    clean_section = "" if section in ("", "upload") else section
    doc_id = (props.get("document_id") or "").strip()
    cite = {
        "index": index,
        "doc": doc_title,
        "section": clean_section,
        "excerpt": (excerpt or "")[:500],
        "score": round(float(score), 3),
        "source": source,
    }
    if doc_id:
        cite["document_id"] = doc_id
    return cite

def _sansad_context_addendum(session, user_question: str = "") -> str:
    """Inject latest SANSAD plant context when session carries asset or metadata from §5 pages."""
    from apps.agents.sansad_context_mode import build_sansad_query_supplement

    meta = session.session_metadata or {}
    lines: list[str] = []
    if meta.get("sansad_mode") and meta.get("sansad_context_summary"):
        updated = meta.get("sansad_context_updated_at")
        if updated:
            lines.append(f"SANSAD linked briefing (updated {updated}):")
        lines.append(
            "Use the briefing below as live plant data from the SANSAD hub. "
            "Answer factory and asset state questions from it. "
            "Factory 1 / F1 = Horizon; Factory 2 / F2 = Zephyr. "
            "Historical maintenance logs, 90-day dossiers, reports, and alarm history ARE in this context — "
            "summarize them when asked. Never say historical data is unavailable or out of scope. "
            "Write your answer directly — no planning aloud. "
            "If the user asks for a table, reply with a markdown table using briefing values. "
            "Never return an empty response when this briefing is present."
        )
        lines.append(meta["sansad_context_summary"])
        supplement = build_sansad_query_supplement(user_question)
        if supplement:
            lines.append(supplement.strip())
    source = meta.get("sansad_source")
    if source:
        lines.append(f"User navigated from SANSAD section: {source}.")
    initial = meta.get("initial_prompt")
    if initial:
        lines.append(f"Suggested focus: {initial}")
    asset_id = session.asset_id
    if not asset_id and not lines:
        return ""
    if asset_id:
        try:
            from apps.reports.models import MaintenanceReport
            from apps.alerts.models import AlarmEvent

            report = (
                MaintenanceReport.objects.filter(asset_id=asset_id)
                .order_by("-created_at")
                .first()
            )
            if report:
                diag = (report.diagnosis or report.report_text or "")[:600]
                lines.append(
                    f"Latest maintenance report ({report.risk_level}): {diag}"
                )
            for alarm in AlarmEvent.objects.filter(
                asset_id=asset_id, acknowledged=False
            ).order_by("-created_at")[:3]:
                lines.append(
                    f"Active alert [{alarm.severity}]: {alarm.message or alarm.alarm_type}"
                )
        except Exception as exc:
            logger.warning("sansad context skipped: %s", exc)
    if not lines:
        return ""
    return "\n\n[SANSAD plant context]\n" + "\n".join(lines)

# System prompts — document mode is minimal; general mode has no capability essay
# ---------------------------------------------------------------------------
_MANAS_DOCUMENT_PROMPT = """\
You are MANAS. The user selected maintenance documents. Answer ONLY from the numbered excerpts below.

FORBIDDEN:
- Describing MANAS, your capabilities, "operational logic", diagnostic pipeline, or how you work
- Headers like "Operational Scope", "Diagnostic Logic", "Limitations of Current Context", "How shall we proceed"
- Listing all plant assets (SRF, HHPD, FS, …) unless an excerpt names them
- More than one sentence apologising for missing numeric thresholds

REQUIRED:
- Open with a direct answer to the user's question using a fact from the excerpts
- Inline citations: [1], [2] glued to the sentence — e.g. "Roll changes maintain surface quality [1]."
- NEVER write "1 Reference Document", "specification 1", or put [n] on its own line
- Summarise what the document says (purpose, procedure, checks) even when numbers are absent
- 80–220 words unless the user explicitly asked for exhaustive detail

GOOD (user: "explain this document in detail"):
"The Finishing Stand SOP covers when and why to change work rolls and backup rolls — to keep surface quality and dimensional tolerances within product specification [1]. It describes the change procedure and the wear/quality triggers that justify a roll swap [1]."

BAD (never output this):
"To explain my capabilities I must first clarify that thresholds are not available…" followed by a MANAS capability list.

## Excerpts
{rag_context}
"""

_MANAS_GENERAL_PROMPT = """\
You are MANAS, the ATAL's Diagnostic for steel-plant maintenance (SRF, HHPD, FS, HAGCC, APT, TCMS, CGP, HPAK).

- Answer the user's question directly and concisely.
- Do NOT introduce yourself or list capabilities unless they explicitly ask what you can do.
- No [n] citations unless numbered excerpts appear below.
- Do not invent numeric thresholds or standard values.
- Never output planning, debate, or meta-commentary about how you will answer — only the final answer.
- If the user asks for a table, use a markdown table with real values from context.

## Retrieved Context
{rag_context}
"""


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


_MANAS_CAPABILITIES_PROMPT = """\
You are MANAS, the ATAL's Diagnostic for steel-plant maintenance.

The user asked about your capabilities. Give a concise bullet list (max 8 bullets):
diagnosis, RCA, RUL interpretation, risk triage, repair steps with LOTO, spares strategy, \
cross-stage defect tracing (SRF→HAGCC→…), and document-grounded answers when they load manuals/SOPs.

Do not fabricate thresholds. Keep under 150 words.

## Retrieved Context
{rag_context}
"""


def _session_asset_code(session) -> str | None:
    asset_id = getattr(session, "asset_id", None)
    if not asset_id:
        return None
    try:
        from apps.assets.models import Asset

        return Asset.objects.filter(pk=asset_id).values_list("asset_type", flat=True).first()
    except Exception:
        return None


def _build_manas_system_prompt(
    *,
    rag_context: str,
    citations: list,
    user_content: str,
    role_advisory: str = "",
    session,
    user_role: str = "",
    advice_mode: bool = False,
    deep_thinking: bool = False,
) -> str:
    if citations:
        prompt = _MANAS_DOCUMENT_PROMPT.replace("{rag_context}", rag_context)
    elif _wants_capabilities_overview(user_content):
        prompt = _MANAS_CAPABILITIES_PROMPT.replace("{rag_context}", rag_context)
    else:
        prompt = _MANAS_GENERAL_PROMPT.replace("{rag_context}", rag_context)

    if role_advisory:
        prompt += (
            "\n\n## Role Advisory (from 0.8b workers — tailor your answer)\n"
            f"{role_advisory}\n"
            "Follow the role lenses above when choosing emphasis (hands-on steps vs crew coordination). "
            "Do not describe MANAS or list all plant assets."
        )
        if citations:
            prompt += (
                " When citing document excerpts, keep [n] markers and apply the role lens to how you "
                "phrase procedures and escalation — still ground every fact in the excerpts."
            )
    sansad_addendum = _sansad_context_addendum(session, user_content)
    if sansad_addendum:
        prompt += sansad_addendum
    from apps.agents.manas_chat_harness import build_chat_harness_addendum

    meta = session.session_metadata or {}
    harness = build_chat_harness_addendum(
        user_content,
        has_citations=bool(citations),
        sansad_mode=bool(meta.get("sansad_mode")),
        user_role=user_role,
        advice_mode=advice_mode,
        deep_thinking=deep_thinking,
        session_asset_code=_session_asset_code(session),
    )
    if harness:
        prompt += harness
    if not citations:
        try:
            from apps.agents.preference_profile import get_preference_patch

            prompt += get_preference_patch(session.user)
        except Exception:
            pass
    prompt += MANAS_SCOPE_GUARDRAILS
    return prompt


def _deep_thinking_system_addendum(deep_thinking: bool) -> str:
    return _DEEP_THINKING_ADDENDUM if deep_thinking else ""


class _CancelledStream(Exception):
    """User requested stop via WebSocket cancel."""


def run_chat_logic(
    session_id: str,
    user_message_id: str,
    rag_collections: list,
    *,
    rag_document_titles: list | None = None,
    rag_document_ids: list | None = None,
    custom_rag_context: str = "",
    custom_documents: list | None = None,
    user_role: str = "",
    advice_mode: bool = False,
    deep_thinking: bool = False,
) -> dict:
    """
    Core LLM pipeline. Safe to call from any thread — does NOT depend on Celery.
    Returns {"status": "ok", "message_id": str} on success or {"status": "error", "error": str}.
    """
    from apps.agents.models import ChatSession, ChatMessage
    from apps.rag.retrieval import retrieve_for_collections, retrieve_by_document_titles
    from apps.agents.compaction import should_compact, compact_history
    from apps.agents.ollama_warmup import ollama_keep_alive_value
    from django.conf import settings

    from apps.agents.stream_registry import (
        arm_stream,
        clear_cancel,
        is_cancelled,
        send_to_stream,
    )

    group_name = f"llm_stream_{session_id}"
    channel_layer = None
    session = None
    full_response = ""
    full_reasoning = ""
    citations: list[dict] = []
    model_name = ""

    def _get_channel_layer():
        nonlocal channel_layer
        if channel_layer is False:
            return None
        if channel_layer is not None:
            return channel_layer
        try:
            channel_layer = get_channel_layer()
        except Exception as exc:
            logger.warning("channel_layer init failed: %s", exc)
            channel_layer = False
            return None
        return channel_layer

    def _send(event: dict):
        # Primary: in-process asyncio.Queue (no Redis round-trip, no timeout)
        if send_to_stream(session_id, event):
            return
        logger.warning(
            "send_to_stream: no queue for session %s (type=%s) — WS not connected?",
            session_id,
            event.get("type"),
        )
        cl = _get_channel_layer()
        if cl:
            try:
                async_to_sync(cl.group_send)(group_name, event)
            except Exception as _e:
                logger.warning("channel_layer fallback failed: %s", _e)

    def _raise_if_cancelled() -> None:
        if is_cancelled(session_id):
            raise _CancelledStream()

    try:
        arm_stream(session_id)
        session = ChatSession.objects.select_related("user").get(id=session_id)
        user_msg = ChatMessage.objects.get(id=user_message_id)
        user_content = user_msg.content

        from apps.agents.sansad_context_mode import increment_sansad_turn_and_maybe_refresh

        increment_sansad_turn_and_maybe_refresh(session_id)
        session.refresh_from_db(fields=["session_metadata"])

        logger.info("MANAS thread alive — session=%s msg=%s", session_id[:8], user_message_id[:8])
        # Immediate heartbeat — frontend knows the thread is alive
        _send({"type": "started"})

        # ── Input guardrails (profanity / off-topic / steer) ─────────────────
        from apps.agents.llm.guardrails import check_input_guard, refusal_message
        from apps.agents.llm.schemas import GuardrailAction

        _send({"type": "phase", "phase": "guard"})
        guard_verdict = check_input_guard(user_content, source="user")
        if guard_verdict.action == GuardrailAction.BLOCK:
            refusal = refusal_message(guard_verdict)
            _send({
                "type": "blocked",
                "category": guard_verdict.category.value,
                "message": refusal,
            })
            assistant_msg = ChatMessage.objects.create(
                session=session,
                role="assistant",
                content=refusal,
                citations=[],
                model_used="guardrail",
            )
            session.last_active = assistant_msg.timestamp
            session.save(update_fields=["last_active"])
            _send({
                "type": "done",
                "message_id": str(assistant_msg.id),
                "citations": [],
                "blocked": True,
                "blocked_message": refusal,
            })
            clear_cancel(session_id)
            return {"status": "blocked", "message_id": str(assistant_msg.id)}
        _send({"type": "phase", "phase": "guard_done"})
        if guard_verdict.action == GuardrailAction.STEER and guard_verdict.steered_text:
            user_content = guard_verdict.steered_text

        # ── RAG context assembly (opt-in: only when user selected library/upload docs) ─
        raw_docs: list = []
        custom_text = (custom_rag_context or "").strip()
        titles = [t for t in (rag_document_titles or []) if t]
        doc_ids = [str(i).strip() for i in (rag_document_ids or []) if str(i).strip()]
        has_rag_request = bool(rag_collections or titles or doc_ids or custom_text or custom_documents)

        if has_rag_request:
            _send({"type": "phase", "phase": "rag"})
            _raise_if_cancelled()

        if titles:
            try:
                raw_docs += retrieve_by_document_titles(user_content, titles)
            except Exception as _e:
                logger.warning("retrieve_by_document_titles failed: %s", _e)
            _raise_if_cancelled()

        if rag_collections or titles or doc_ids:
            try:
                chroma_hits = retrieve_for_collections(
                    user_content,
                    rag_collections,
                    asset_id=str(session.asset_id) if session.asset_id else None,
                    document_titles=titles or None,
                    document_ids=doc_ids or None,
                )
                seen = {
                    (h.get("properties", {}).get("content", "")[:200],)
                    for h in raw_docs
                }
                for hit in chroma_hits:
                    key = (hit.get("properties", {}).get("content", "")[:200],)
                    if key not in seen:
                        raw_docs.append(hit)
                        seen.add(key)
            except Exception as _e:
                logger.warning("retrieve_for_collections failed: %s", _e)
            _raise_if_cancelled()

        raw_docs += _custom_docs_to_raw(custom_documents, custom_text)
        _raise_if_cancelled()

        if not raw_docs and titles:
            try:
                raw_docs += retrieve_by_document_titles("", titles, limit=8)
            except Exception as _e:
                logger.warning("retrieve_by_document_titles fallback failed: %s", _e)

        if not raw_docs:
            if has_rag_request:
                rag_context = (
                    "[User selected reference documents but no matching excerpts were retrieved. "
                    "Say which documents were requested, ask one clarifying question about asset or symptom, "
                    "and do not fabricate document content or [n] citations.]"
                )
            else:
                rag_context = (
                    "[No reference documents selected for this message. "
                    "Answer from conversation history and general maintenance reasoning only. "
                    "Do not use [n] citation markers. "
                    "Do not invent numeric thresholds or standard values.]"
                )
            snippets: list[str] = []
            citations: list[dict] = []
        else:
            top_k = 8 if (titles or custom_documents) else (4 if deep_thinking else 6)
            if settings.RAG_USE_RERANKER:
                from apps.rag.reranker import rerank
                try:
                    reranked = rerank(user_content, raw_docs, top_k=top_k)
                except Exception as _e:
                    logger.warning("rerank failed: %s", _e)
                    reranked = raw_docs[:top_k]
            else:
                reranked = sorted(
                    raw_docs,
                    key=lambda x: x.get("rrf_score", 0) or (1.0 - x.get("distance", 1.0)),
                    reverse=True,
                )[:top_k]

            snippets = []
            citations = []
            seen_citations: set[tuple[str, str]] = set()
            cite_index = 0
            for d in reranked:
                props = d.get("properties", {})
                content = props.get("content", "")
                if not content:
                    continue
                doc_title = _doc_title_from_chunk(props, titles or None)
                section = props.get("section", "") or ""
                cite_key = (doc_title, section)
                if cite_key in seen_citations:
                    continue
                seen_citations.add(cite_key)
                cite_index += 1
                header = f"[{cite_index}] {doc_title}"
                if section and section not in ("", "upload"):
                    header += f" — {section}"
                snippets.append(f"{header}\n{content}")
                citations.append(
                    _citation_from_chunk(
                        props, d, index=cite_index, excerpt=content, fallback_titles=titles or None,
                    )
                )

            focus = user_content.strip()[:300]
            body = "\n---\n".join(snippets)
            rag_context = (
                f"User question: {focus}\n\n{body}"
                if body
                else (
                    "[Documents are loaded but no excerpts matched this query. "
                    "Summarise what topics the loaded documents cover and ask one focused follow-up. "
                    "Do not describe MANAS capabilities.]"
                )
            )

        if has_rag_request:
            _send({"type": "phase", "phase": "rag_done"})
            if citations:
                _send({"type": "citations", "citations": citations})

        logger.info("MANAS RAG done — %d docs, %d snippets, session=%s", len(raw_docs), len(snippets), session_id[:8])
        _raise_if_cancelled()

        # ── Build message history ──────────────────────────────────────────
        all_history = list(
            ChatMessage.objects.filter(session=session)
            .exclude(id=user_message_id)
            .order_by("timestamp")
            .values("id", "role", "content")
        )
        history_for_estimate = [
            {"content": m["content"]} for m in all_history if m["role"] in ("user", "assistant", "system")
        ]
        if should_compact(history_for_estimate):
            compact_history(session_id)
        _raise_if_cancelled()

        history = list(
            ChatMessage.objects.filter(session=session)
            .exclude(id=user_message_id)
            .order_by("-timestamp")[:20]
        )
        history.reverse()

        messages = []
        for m in history:
            # Compaction/status system rows are UI-only — do not feed back to the LLM
            if m.role in ("user", "assistant"):
                messages.append({"role": m.role, "content": m.content})
        messages.append({"role": "user", "content": user_content})

        role_advisory = ""
        from apps.agents.chat_role_graph import resolve_manas_roles, run_role_advisory

        manas_roles = resolve_manas_roles(user_role, advice_mode=advice_mode)
        if manas_roles:
            _send({"type": "phase", "phase": "role"})
            _raise_if_cancelled()
            rag_snippet = rag_context[:2000] if (citations or has_rag_request) else ""
            try:
                role_advisory = run_role_advisory(user_content, manas_roles, rag_snippet)
            except Exception as exc:
                logger.warning("role_advisory_graph failed: %s", exc)
            _raise_if_cancelled()

        if manas_roles:
            import time as _time

            _time.sleep(1.5)

        system_prompt = _build_manas_system_prompt(
            rag_context=rag_context,
            citations=citations,
            user_content=user_content,
            role_advisory=role_advisory,
            session=session,
            user_role=user_role,
            advice_mode=advice_mode,
            deep_thinking=deep_thinking,
        ) + _deep_thinking_system_addendum(deep_thinking)

        if is_cancelled(session_id):
            raise _CancelledStream()

        model_name = settings.OLLAMA_MODEL
        full_response = ""
        full_reasoning = ""
        input_tokens = 0
        output_tokens = 0

        # ── Stream from Ollama (native /api/chat — qwen3.5 streams thinking separately)
        import time as _time

        ollama_url = f"{settings.OLLAMA_BASE_URL}/api/chat"
        predict_budget = 4096 if deep_thinking else (1200 if citations else 2048)
        rag_temperature = 0.1 if citations else 0.2
        if deep_thinking:
            _send({"type": "phase", "phase": "thinking"})
        ollama_payload = {
            "model": model_name,
            "messages": [{"role": "system", "content": system_prompt}] + messages,
            "stream": True,
            "think": bool(deep_thinking),
            "keep_alive": ollama_keep_alive_value(),
            "options": {"num_predict": predict_budget, "temperature": rag_temperature},
        }

        for _attempt in range(1, 4):
            try:
                logger.info(
                    "MANAS Ollama attempt %d — model=%s think=%s session=%s",
                    _attempt,
                    model_name,
                    deep_thinking,
                    session_id[:8],
                )
                _first_content = True
                with httpx.Client(timeout=httpx.Timeout(connect=180, read=300, write=30, pool=5)) as client:
                    with client.stream("POST", ollama_url, json=ollama_payload) as resp:
                        resp.raise_for_status()
                        logger.info(
                            "MANAS Ollama HTTP %s — streaming started session=%s",
                            resp.status_code,
                            session_id[:8],
                        )
                        for line in resp.iter_lines():
                            if is_cancelled(session_id):
                                logger.info("MANAS stream cancelled session=%s", session_id[:8])
                                break
                            if not line:
                                continue
                            try:
                                chunk = json.loads(line)
                            except json.JSONDecodeError:
                                continue
                            msg = chunk.get("message", {})
                            think_token = msg.get("thinking", "")
                            if think_token:
                                full_reasoning += think_token
                                if deep_thinking:
                                    _send({"type": "think_token", "token": think_token})
                            token = msg.get("content", "")
                            if token:
                                if _first_content:
                                    logger.info("MANAS first content token session=%s", session_id[:8])
                                    _first_content = False
                                full_response += token
                                _send({"type": "token", "token": token})
                            if chunk.get("done"):
                                break

                if deep_thinking:
                    full_response, full_reasoning = _finalize_deep_thinking_response(
                        full_response, full_reasoning,
                    )

                meta = session.session_metadata or {}
                from apps.agents.llm.client import is_chain_of_thought_leak, salvage_qwen_output

                briefing = str(meta.get("sansad_context_summary") or "")
                if not full_response.strip() and full_reasoning.strip():
                    salvaged = salvage_qwen_output(full_response, full_reasoning).strip()
                    if salvaged:
                        full_response = salvaged

                # Treat trivially short bodies (e.g. "**", stray markdown) as empty:
                # qwen3.5 occasionally emits near-nothing when fed the large SANSAD
                # briefing. Recover from the linked briefing via the 9b answer path.
                _resp_stripped = full_response.strip().strip("*#`-_ \n\t")
                needs_sansad_recovery = meta.get("sansad_mode") and (
                    len(_resp_stripped) < 15
                    or is_chain_of_thought_leak(full_response)
                )
                if needs_sansad_recovery:
                    from apps.agents.sansad_context_mode import (
                        sansad_briefing_excerpt,
                        sansad_llm_answer,
                    )

                    recovered = sansad_llm_answer(
                        user_content,
                        briefing,
                        deep_thinking=False,
                    )
                    if not recovered.strip():
                        recovered = sansad_briefing_excerpt(user_content, briefing)
                    if recovered.strip():
                        full_response = recovered.strip()
                        if _first_content:
                            _send({"type": "token", "token": full_response})
                        logger.info(
                            "MANAS SANSAD recovery session=%s chars=%d",
                            session_id[:8],
                            len(full_response),
                        )

                logger.info(
                    "MANAS Ollama done — %d chars (reasoning %d) session=%s",
                    len(full_response),
                    len(full_reasoning),
                    session_id[:8],
                )
                break
            except (httpx.RemoteProtocolError, httpx.ConnectError, httpx.HTTPStatusError) as _retry_err:
                if isinstance(_retry_err, httpx.HTTPStatusError) and _retry_err.response.status_code != 500:
                    raise
                if _attempt < 3:
                    logger.warning("Ollama attempt %d failed (%s) — retrying in 10s", _attempt, _retry_err)
                    _time.sleep(10)
                else:
                    raise

        # ── Persist assistant message ──────────────────────────────────────
        cancelled = is_cancelled(session_id)
        full_response = _stopped_content(full_response, cancelled=cancelled)

        assistant_msg = ChatMessage.objects.create(
            session=session,
            role="assistant",
            content=full_response,
            reasoning=full_reasoning,
            citations=citations,
            model_used=model_name,
            token_usage={"input": input_tokens, "output": output_tokens},
        )
        session.last_active = assistant_msg.timestamp
        session.save(update_fields=["last_active"])

        _send({
            "type": "done",
            "message_id": str(assistant_msg.id),
            "citations": citations,
            "cancelled": cancelled,
            "content": full_response,
            "reasoning": full_reasoning if deep_thinking else "",
        })

        clear_cancel(session_id)
        return {"status": "ok", "message_id": str(assistant_msg.id)}

    except _CancelledStream:
        partial = _stopped_content(full_response, cancelled=True)
        msg_id = None
        if session is not None:
            try:
                assistant_msg = ChatMessage.objects.create(
                    session=session,
                    role="assistant",
                    content=partial,
                    reasoning=full_reasoning,
                    citations=citations,
                    model_used=model_name,
                )
                session.last_active = assistant_msg.timestamp
                session.save(update_fields=["last_active"])
                msg_id = str(assistant_msg.id)
            except Exception:
                msg_id = None
        _send({
            "type": "done",
            "message_id": msg_id,
            "citations": citations,
            "cancelled": True,
        })
        clear_cancel(session_id)
        return {"status": "cancelled", "message_id": msg_id}

    except Exception as exc:
        logger.error("run_chat_logic failed session_id=%s error=%s", session_id, exc, exc_info=True)
        _send({
            "type": "done",
            "message_id": None,
            "citations": [],
            "error": f"Processing failed: {exc}",
        })
        clear_cancel(session_id)
        return {"status": "error", "error": str(exc)}


def start_chat_thread(
    session_id: str,
    user_message_id: str,
    rag_collections: list,
    *,
    rag_document_titles: list | None = None,
    rag_document_ids: list | None = None,
    custom_rag_context: str = "",
    custom_documents: list | None = None,
    user_role: str = "",
    advice_mode: bool = False,
    deep_thinking: bool = False,
) -> threading.Thread:
    """Spawn a daemon thread to run the chat pipeline outside Celery."""

    def _target(*args, **kwargs):
        import django.db
        try:
            run_chat_logic(*args, **kwargs)
        finally:
            # Release this thread's PostgreSQL connection so high chat concurrency
            # cannot exhaust max_connections (threads aren't request-scoped).
            django.db.connections.close_all()

    t = threading.Thread(
        target=_target,
        args=(session_id, user_message_id, rag_collections),
        kwargs={
            "rag_document_titles": rag_document_titles,
            "rag_document_ids": rag_document_ids,
            "custom_rag_context": custom_rag_context,
            "custom_documents": custom_documents,
            "user_role": user_role,
            "advice_mode": advice_mode,
            "deep_thinking": deep_thinking,
        },
        daemon=True,
        name=f"manas-chat-{session_id[:8]}",
    )
    t.start()
    return t


@shared_task(queue="rag", bind=True, max_retries=2)
def process_chat_message(self, session_id: str, user_message_id: str, rag_collections: list):
    """Celery wrapper — kept for compatibility. Primary path uses start_chat_thread."""
    result = run_chat_logic(session_id, user_message_id, rag_collections)
    if result["status"] == "error":
        raise self.retry(exc=Exception(result["error"]), countdown=5)
    return result


@shared_task(name="apps.agents.keep_ollama_warm")
def keep_ollama_warm():
    """Periodic ping so Ollama models stay resident (belt-and-suspenders with keep_alive=-1)."""
    from apps.agents.ollama_warmup import warm_ollama_models

    return warm_ollama_models()

