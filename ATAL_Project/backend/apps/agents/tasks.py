"""
MANAS chat task: RAG retrieval → hybrid search + rerank → vLLM call → WS stream → save.
"""
import json
import logging
import httpx
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


@shared_task(queue="rag", bind=True, max_retries=2)
def process_chat_message(self, session_id: str, user_message_id: str, rag_collections: list):
    from apps.agents.models import ChatSession, ChatMessage
    from apps.rag.retrieval import retrieve_asset_intelligence, retrieve_sop, retrieve_safety_codes
    from apps.rag.reranker import rerank
    from django.conf import settings

    try:
        session = ChatSession.objects.get(id=session_id)
        user_msg = ChatMessage.objects.get(id=user_message_id)
        user_content = user_msg.content

        # RAG context assembly with reranking
        raw_docs = []
        if session.asset_id:
            raw_docs += retrieve_asset_intelligence(str(session.asset_id), user_content)
        if "sop" in rag_collections:
            raw_docs += retrieve_sop("", user_content)
        if "safety" in rag_collections:
            raw_docs += retrieve_safety_codes(query=user_content)

        reranked = rerank(user_content, raw_docs, top_k=6)
        rag_snippets = [d.get("properties", {}).get("content", "") for d in reranked]

        # Build citation list from reranked docs
        citations = []
        for d in reranked:
            props = d.get("properties", {})
            if props.get("title") or props.get("standard_code"):
                citations.append({
                    "doc": props.get("title") or props.get("standard_code", ""),
                    "section": props.get("section", ""),
                    "score": d.get("reranker_score"),
                })

        rag_context = "\n---\n".join(s for s in rag_snippets if s)

        # Build message history (last 10 exchanges)
        history = list(
            ChatMessage.objects.filter(session=session)
            .exclude(id=user_message_id)
            .order_by("-timestamp")[:20]
        )
        history.reverse()

        messages = [{"role": m.role, "content": m.content} for m in history if m.role in ("user", "assistant")]
        messages.append({"role": "user", "content": user_content})

        system_prompt = (
            "You are MANAS, an AI Maintenance Wizard for Tata Steel plant operations. "
            "Answer based ONLY on the retrieved context below. "
            "Every numeric threshold you cite MUST appear verbatim in retrieved documents. "
            "Cite your sources explicitly. "
            "If context is insufficient, say so explicitly.\n\n"
            f"Retrieved context:\n{rag_context or '[no documents retrieved]'}"
        )

        channel_layer = get_channel_layer()
        group_name = f"llm_stream_{session_id}"
        model_name = settings.VLLM_MODEL

        full_response = ""
        input_tokens = 0
        output_tokens = 0

        # Stream from vLLM OpenAI-compatible endpoint
        with httpx.Client(timeout=120) as client:
            with client.stream(
                "POST",
                f"{settings.VLLM_BASE_URL}/v1/chat/completions",
                json={
                    "model": model_name,
                    "messages": [{"role": "system", "content": system_prompt}] + messages,
                    "max_tokens": 2048,
                    "temperature": 0.2,
                    "stream": True,
                },
                headers={"Content-Type": "application/json"},
            ) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue
                    delta = chunk["choices"][0].get("delta", {})
                    token = delta.get("content", "")
                    if token:
                        full_response += token
                        async_to_sync(channel_layer.group_send)(
                            group_name,
                            {"type": "llm.token", "token": token},
                        )
                    usage = chunk.get("usage") or {}
                    if usage:
                        input_tokens = usage.get("prompt_tokens", 0)
                        output_tokens = usage.get("completion_tokens", 0)

        # Save assistant message
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

        async_to_sync(channel_layer.group_send)(
            group_name,
            {"type": "llm.done", "message_id": str(assistant_msg.id)},
        )

        return {"status": "ok", "message_id": str(assistant_msg.id)}

    except Exception as exc:
        logger.error("chat_task_failed", session_id=session_id, error=str(exc))
        raise self.retry(exc=exc, countdown=5)
