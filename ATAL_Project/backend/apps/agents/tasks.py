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
- Every numeric threshold, operating envelope limit, or standard value you state MUST appear \
verbatim in the retrieved context below.
- When using retrieved documentation, begin the relevant sentence with: \
"According to [Document Title] §[Section]:" or "Per [Standard Code] [Section]:".
- If a threshold is NOT in the retrieved context, state: \
"Threshold not found in available documentation — consult the original standard directly."
- Never fabricate sensor ranges, alarm setpoints, maintenance intervals, or chemical limits.

## Response Structure
For diagnostic responses:
1. **Probable Fault** — state the fault and confidence level
2. **Evidence** — cite specific retrieved content (document + section)
3. **Root Cause** — ranked causal factors
4. **Risk Level** — low/medium/high/critical + justification
5. **Recommended Actions** — numbered steps with safety notes (LOTO where applicable)
6. **Sources** — list all documents cited at the end

For general questions: answer concisely, cite sources inline.

## Retrieved Context
{rag_context}

Base your answer strictly on the retrieved context and conversation history. \
If context is insufficient, say so and specify what additional documentation would be needed.\
"""


def run_chat_logic(session_id: str, user_message_id: str, rag_collections: list) -> dict:
    """
    Core LLM pipeline. Safe to call from any thread — does NOT depend on Celery.
    Returns {"status": "ok", "message_id": str} on success or {"status": "error", "error": str}.
    """
    from apps.agents.models import ChatSession, ChatMessage
    from apps.rag.retrieval import (
        retrieve_asset_intelligence,
        retrieve_sop,
        retrieve_safety_codes,
        retrieve_iso_compliance,
    )
    from apps.rag.reranker import rerank
    from apps.agents.compaction import should_compact, compact_history
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

        # ── RAG context assembly ───────────────────────────────────────────
        raw_docs: list = []

        if session.asset_id:
            try:
                raw_docs += retrieve_asset_intelligence(str(session.asset_id), user_content)
            except Exception as _e:
                logger.warning("retrieve_asset_intelligence failed: %s", _e)

        try:
            raw_docs += retrieve_sop("", user_content)
        except Exception as _e:
            logger.warning("retrieve_sop failed: %s", _e)

        try:
            raw_docs += retrieve_iso_compliance(query=user_content)
        except Exception as _e:
            logger.warning("retrieve_iso_compliance failed: %s", _e)

        if "safety" in rag_collections:
            try:
                raw_docs += retrieve_safety_codes(query=user_content)
            except Exception as _e:
                logger.warning("retrieve_safety_codes failed: %s", _e)

        try:
            reranked = rerank(user_content, raw_docs, top_k=6)
        except Exception as _e:
            logger.warning("rerank failed: %s", _e)
            reranked = raw_docs[:6]

        snippets: list[str] = []
        citations: list[dict] = []
        for d in reranked:
            props = d.get("properties", {})
            content = props.get("content", "")
            if not content:
                continue
            doc_title = (
                props.get("title")
                or props.get("standard_code")
                or props.get("source_doc")
                or "Reference Document"
            )
            section = props.get("section", "")
            score = d.get("reranker_score") or 0.0
            source_header = f"[SOURCE: {doc_title}{f' §{section}' if section else ''} | relevance: {score:.2f}]"
            snippets.append(f"{source_header}\n{content}")
            if doc_title:
                citations.append({
                    "doc": doc_title,
                    "section": section,
                    "score": round(score, 3),
                })

        rag_context = "\n---\n".join(snippets) or "[No relevant documents retrieved]"
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

        model_name = settings.OLLAMA_MODEL
        full_response = ""
        input_tokens = 0
        output_tokens = 0

        # ── Stream from Ollama (native /api/chat — qwen3.5 puts output in reasoning on /v1)
        import time as _time

        ollama_url = f"{settings.OLLAMA_BASE_URL}/api/chat"
        ollama_payload = {
            "model": model_name,
            "messages": [{"role": "system", "content": system_prompt}] + messages,
            "stream": True,
            "think": False,
            "options": {"num_predict": 2048, "temperature": 0.2},
        }

        for _attempt in range(1, 4):
            try:
                logger.info("MANAS Ollama attempt %d — model=%s session=%s", _attempt, model_name, session_id[:8])
                _first_token = True
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
                            token = chunk.get("message", {}).get("content", "")
                            if token:
                                if _first_token:
                                    logger.info("MANAS first token received session=%s", session_id[:8])
                                    _first_token = False
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


def start_chat_thread(session_id: str, user_message_id: str, rag_collections: list) -> threading.Thread:
    """Spawn a daemon thread to run the chat pipeline outside Celery."""
    t = threading.Thread(
        target=run_chat_logic,
        args=(session_id, user_message_id, rag_collections),
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
