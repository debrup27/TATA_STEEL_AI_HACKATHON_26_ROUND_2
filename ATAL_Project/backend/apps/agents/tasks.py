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

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _doc_title_from_chunk(props: dict) -> str:
    """Resolve a human-readable source label for citations."""
    for key in ("title", "standard_code", "source_doc"):
        val = (props.get(key) or "").strip()
        if val:
            return val
    content = (props.get("content") or "").strip()
    if content:
        first = content.split("\n", 1)[0].strip()
        if 10 <= len(first) <= 140:
            return first
    return "Reference Document"


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


def _citation_from_chunk(props: dict, d: dict, *, index: int, excerpt: str) -> dict:
    doc_title = _doc_title_from_chunk(props)
    section = props.get("section", "") or ""
    score = d.get("reranker_score") or d.get("rrf_score", 0) or (1.0 - d.get("distance", 1.0))
    source = "upload" if props.get("doc_type") == "upload" or d.get("source") == "upload" else "library"
    clean_section = "" if section in ("", "upload") else section
    return {
        "index": index,
        "doc": doc_title,
        "section": clean_section,
        "excerpt": (excerpt or "")[:500],
        "score": round(float(score), 3),
        "source": source,
    }

# System prompt — grounded in hackathon problem statement §4/§5/§6
# ---------------------------------------------------------------------------
_MANAS_SYSTEM_PROMPT = """\
You are MANAS (Maintenance Agentic Neural Advisory System), an intelligent Maintenance Wizard \
deployed at Tata Steel's industrial plant. You are the primary decision-support interface for \
maintenance engineers.

## Your Capabilities
- Fault diagnosis from sensor data, delay logs, error messages, and failure analysis reports
- Root Cause Analysis (RCA) of failures and abnormal conditions
- Interpretation of Remaining Useful Life (RUL) predictions and degradation trajectories
- Early warning assessment for potential catastrophic failures
- Risk classification: low | medium | high | critical
- Urgency and bottleneck prioritisation based on: process criticality, delay severity, \
spares availability, and procurement lead time
- Step-by-step maintenance and repair recommendations (include LOTO/safety precautions where applicable)
- Spare parts procurement strategy with part names, quantities, and timing
- Cross-stage defect association across the production sequence: \
SRF → HHPD → FS → HAGCC → APT → TCMS → CGP → HPAK

## Assets in Scope
Slab Reheating Furnace (SRF), High-Pressure Descaler (HHPD), Finishing Stands (FS), \
Hydraulic AGC Cylinders (HAGCC), Acid Pickling Tanks (APT), Tandem Cold Mill Stands (TCMS), \
Continuous Galvanizing Pot (CGP), High-Pressure Air Knives (HPAK).

## Source Citation Rules (MANDATORY)
- Retrieved sources below are numbered [1], [2], [3], etc.
- When a sentence or claim uses retrieved documentation, append the matching source number in \
square brackets immediately after that sentence or clause, e.g. \
"Cylinder pressure must not exceed 210 bar [1]."
- Use ONLY source numbers that appear in the retrieved context. Do not invent citations.
- Every numeric threshold or standard value MUST appear verbatim in a cited source.
- If a threshold is NOT in the retrieved context, state: \
"Threshold not found in available documentation — consult the original standard directly."
- Never fabricate sensor ranges, alarm setpoints, maintenance intervals, or chemical limits.
- Do NOT add a separate "Sources" list at the end — citations are inline [n] markers only.

## Response Structure
For diagnostic responses:
1. **Probable Fault** — state the fault and confidence level
2. **Evidence** — cite specific retrieved content with [n] markers
3. **Root Cause** — ranked causal factors
4. **Risk Level** — low/medium/high/critical + justification
5. **Recommended Actions** — numbered steps with safety notes (LOTO where applicable)

For general questions: answer concisely with inline [n] citations where applicable.

## Retrieved Context
{rag_context}

Base your answer strictly on the retrieved context and conversation history. \
If context is insufficient, say so and specify what additional documentation would be needed.\
"""

_ROLE_ADDENDA: dict[str, str] = {
    "technician": (
        "The user is a **field maintenance technician**. Prioritise hands-on repair steps, "
        "tooling, LOTO/safety checks, and observable symptoms. Keep language concise and "
        "shop-floor practical; avoid executive summaries."
    ),
    "supervisor": (
        "The user is a **maintenance supervisor**. Balance technical detail with crew "
        "coordination, shift planning, escalation criteria, and downtime impact. Highlight "
        "what to delegate vs. what needs specialist support."
    ),
    "reliability_engineer": (
        "The user is a **reliability engineer**. Emphasise root-cause patterns, failure "
        "modes, degradation trends, RUL interpretation, and data-driven recommendations. "
        "Reference statistical or condition-monitoring reasoning where relevant."
    ),
    "maintenance_planner": (
        "The user is a **maintenance planner**. Focus on work-order scope, spares, lead times, "
        "outage windows, and sequencing of tasks. Include checklist-style planning outputs."
    ),
    "operations_manager": (
        "The user is an **operations manager**. Summarise production risk, bottleneck impact, "
        "urgency trade-offs, and business-critical decisions. Keep recommendations actionable "
        "at plant level."
    ),
    "safety_officer": (
        "The user is a **safety officer**. Lead with hazard identification, permit/LOTO "
        "requirements, ISO/safety standard alignment, and risk mitigation before procedural detail."
    ),
}


def _role_system_addendum(role: str | None) -> str:
    if not role or not str(role).strip():
        return ""
    key = str(role).strip().lower().replace(" ", "_").replace("-", "_")
    text = _ROLE_ADDENDA.get(key)
    if text:
        return f"\n\n## Active User Role\n{text}"
    label = role.replace("_", " ").title()
    return (
        f"\n\n## Active User Role\nThe user is acting as **{label}**. "
        "Tailor tone, depth, and recommendations to that responsibility."
    )


def run_chat_logic(
    session_id: str,
    user_message_id: str,
    rag_collections: list,
    *,
    rag_document_titles: list | None = None,
    custom_rag_context: str = "",
    custom_documents: list | None = None,
    user_role: str = "",
    deep_thinking: bool = False,
) -> dict:
    """
    Core LLM pipeline. Safe to call from any thread — does NOT depend on Celery.
    Returns {"status": "ok", "message_id": str} on success or {"status": "error", "error": str}.
    """
    from apps.agents.models import ChatSession, ChatMessage
    from apps.rag.retrieval import retrieve_for_collections
    from apps.agents.compaction import should_compact, compact_history
    from apps.agents.ollama_warmup import ollama_keep_alive_value
    from django.conf import settings

    from apps.agents.stream_registry import send_to_stream

    group_name = f"llm_stream_{session_id}"
    channel_layer = None  # lazy — primary path uses in-process stream_registry

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

    try:
        session = ChatSession.objects.get(id=session_id)
        user_msg = ChatMessage.objects.get(id=user_message_id)
        user_content = user_msg.content

        logger.info("MANAS thread alive — session=%s msg=%s", session_id[:8], user_message_id[:8])
        # Immediate heartbeat — frontend knows the thread is alive
        _send({"type": "started"})

        # ── RAG context assembly (opt-in: only when user selected library/upload docs) ─
        raw_docs: list = []
        custom_text = (custom_rag_context or "").strip()
        titles = [t for t in (rag_document_titles or []) if t]

        if rag_collections or titles:
            try:
                raw_docs += retrieve_for_collections(
                    user_content,
                    rag_collections,
                    asset_id=str(session.asset_id) if session.asset_id else None,
                    document_titles=titles or None,
                )
            except Exception as _e:
                logger.warning("retrieve_for_collections failed: %s", _e)

        raw_docs += _custom_docs_to_raw(custom_documents, custom_text)

        if not raw_docs:
            rag_context = (
                "[No reference documents selected for this message. "
                "Answer from conversation history and general maintenance reasoning only. "
                "Do not invent numeric thresholds or standard values.]"
            )
            snippets: list[str] = []
            citations: list[dict] = []
        else:
            if settings.RAG_USE_RERANKER:
                from apps.rag.reranker import rerank
                try:
                    reranked = rerank(user_content, raw_docs, top_k=6)
                except Exception as _e:
                    logger.warning("rerank failed: %s", _e)
                    reranked = raw_docs[:6]
            else:
                reranked = sorted(
                    raw_docs,
                    key=lambda x: x.get("rrf_score", 0) or (1.0 - x.get("distance", 1.0)),
                    reverse=True,
                )[:6]

            snippets = []
            citations = []
            seen_citations: set[tuple[str, str]] = set()
            cite_index = 0
            for d in reranked:
                props = d.get("properties", {})
                content = props.get("content", "")
                if not content:
                    continue
                doc_title = _doc_title_from_chunk(props)
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
                citations.append(_citation_from_chunk(props, d, index=cite_index, excerpt=content))

            rag_context = "\n---\n".join(snippets) or "[No relevant document excerpts retrieved]"

        logger.info("MANAS RAG done — %d docs, %d snippets, session=%s", len(raw_docs), len(snippets), session_id[:8])

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

        history = list(
            ChatMessage.objects.filter(session=session)
            .exclude(id=user_message_id)
            .order_by("-timestamp")[:20]
        )
        history.reverse()

        messages = []
        for m in history:
            if m.role == "system":
                messages.append({"role": "system", "content": m.content})
            elif m.role in ("user", "assistant"):
                messages.append({"role": m.role, "content": m.content})
        messages.append({"role": "user", "content": user_content})

        system_prompt = _MANAS_SYSTEM_PROMPT.format(rag_context=rag_context)
        system_prompt += _role_system_addendum(user_role)

        model_name = settings.OLLAMA_MODEL
        full_response = ""
        full_reasoning = ""
        input_tokens = 0
        output_tokens = 0

        # ── Stream from Ollama (native /api/chat — qwen3.5 streams thinking separately when think=true)
        import time as _time

        ollama_url = f"{settings.OLLAMA_BASE_URL}/api/chat"
        ollama_payload = {
            "model": model_name,
            "messages": [{"role": "system", "content": system_prompt}] + messages,
            "stream": True,
            "think": bool(deep_thinking),
            "keep_alive": ollama_keep_alive_value(),
            "options": {"num_predict": 2048, "temperature": 0.2},
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
                        logger.info("MANAS Ollama HTTP %s — streaming started session=%s", resp.status_code, session_id[:8])
                        for line in resp.iter_lines():
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
                logger.info("MANAS Ollama done — %d chars session=%s", len(full_response), session_id[:8])
                break
            except (httpx.RemoteProtocolError, httpx.ConnectError) as _retry_err:
                if _attempt < 3:
                    logger.warning("Ollama attempt %d failed (%s) — retrying in 10s", _attempt, _retry_err)
                    _time.sleep(10)
                else:
                    raise

        # ── Persist assistant message ──────────────────────────────────────
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
        })

        return {"status": "ok", "message_id": str(assistant_msg.id)}

    except Exception as exc:
        logger.error("run_chat_logic failed session_id=%s error=%s", session_id, exc, exc_info=True)
        _send({
            "type": "done",
            "message_id": None,
            "citations": [],
            "error": f"Processing failed: {exc}",
        })
        return {"status": "error", "error": str(exc)}


def start_chat_thread(
    session_id: str,
    user_message_id: str,
    rag_collections: list,
    *,
    rag_document_titles: list | None = None,
    custom_rag_context: str = "",
    custom_documents: list | None = None,
    user_role: str = "",
    deep_thinking: bool = False,
) -> threading.Thread:
    """Spawn a daemon thread to run the chat pipeline outside Celery."""
    t = threading.Thread(
        target=run_chat_logic,
        args=(session_id, user_message_id, rag_collections),
        kwargs={
            "rag_document_titles": rag_document_titles,
            "custom_rag_context": custom_rag_context,
            "custom_documents": custom_documents,
            "user_role": user_role,
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

