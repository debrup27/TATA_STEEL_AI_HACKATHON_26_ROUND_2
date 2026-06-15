"""LangChain ChatOllama client with guardrails and 0.8b serialization."""
from __future__ import annotations

import logging
import os
import re
import time
from collections.abc import Iterator
from typing import Any, Literal

from django.conf import settings
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage, HumanMessage, SystemMessage

from apps.agents.llm.guardrails import (
    check_input_guard,
    check_output_guard,
    refusal_message,
)
from apps.agents.llm.schemas import GuardrailAction, GuardrailVerdict
from apps.agents.ollama_warmup import OLLAMA_SMALL_LOCK, ollama_keep_alive_value

logger = logging.getLogger(__name__)

ModelSize = Literal["large", "small"]


def _model_name(size: ModelSize) -> str:
    return settings.OLLAMA_MODEL if size == "large" else settings.OLLAMA_SMALL_MODEL


def _ollama_mock() -> bool:
    return os.environ.get("OLLAMA_MOCK") == "1"


def is_chain_of_thought_leak(text: str) -> bool:
    """Detect Qwen planning / prompt-debate text that must not be shown to users."""
    lower = (text or "").lower().strip()
    if not lower:
        return False
    markers = (
        "this looks like a directive",
        "wait,",
        "wait ",
        "let's try to",
        "let me ",
        "okay, i will",
        "i must follow",
        "downstream expectations",
        "formatting rule",
        "context block",
        "how i should format",
        "ensure consistency",
        "if i ignore",
        "is it helpful?",
        "side-by-side comparison",
        "usually wants",
        "satisfies both",
        "the prompt says",
        "i will write in prose",
        "ignore the table request",
        "format my output",
    )
    hits = sum(1 for marker in markers if marker in lower)
    if hits >= 2:
        return True
    if hits >= 1 and ("?" in lower or lower.rstrip().endswith(":") or " * " in lower):
        return True
    if lower.startswith(("okay,", "wait,", "this looks like", "let's ", "* okay")):
        return True
    return False


def finalize_manas_output(content: str, reasoning: str = "") -> str:
    """Return user-facing MANAS prose; reject chain-of-thought leaks."""
    import re

    body = (content or "").strip()
    think = (reasoning or "").strip()

    if body and not is_chain_of_thought_leak(body) and _looks_like_answer(body, min_len=40):
        return body

    if think:
        salvaged = salvage_qwen_output("", think)
        if salvaged and not is_chain_of_thought_leak(salvaged) and _looks_like_answer(salvaged, min_len=40):
            return salvaged

        sentences = re.split(r"(?<=[.!?])\s+", think)
        good = [
            s.strip()
            for s in sentences
            if s.strip()
            and not is_chain_of_thought_leak(s)
            and _looks_like_answer(s, min_len=35)
        ]
        if len(good) >= 2:
            return " ".join(good[:8])
        if len(good) == 1:
            return good[0]

    if think:
        relaxed_candidates = [
            block.strip()
            for block in think.split("\n\n")
            if len(block.strip()) >= 24
            and _plant_signal_score(block) >= 2
            and not is_chain_of_thought_leak(block)
            and not block.lower().startswith(
                ("thinking", "**analyze", "analyze the", "constraint", "role:", "task:")
            )
        ]
        if relaxed_candidates:
            return max(relaxed_candidates, key=lambda c: (_plant_signal_score(c), len(c)))

    return ""


def _looks_like_answer(text: str, *, min_len: int = 24) -> bool:
    cleaned = (text or "").strip()
    if len(cleaned) < min_len:
        return False
    if is_chain_of_thought_leak(cleaned):
        return False
    head = cleaned[:160].lower()
    if head.startswith("thinking") or "thinking process" in head:
        return False
    if head.startswith(("1.", "2.", "**analyze", "analyze the request")):
        return False
    lower = cleaned.lower()
    junk_markers = (
        "markdown",
        "no `**`",
        "standard interpretation",
        "constraint:",
        "analyze the request",
        "the user wants",
        "role constraint",
        "formatting rules",
        "plain text). however",
        "this looks like a directive",
        "how i should format",
        "downstream expectations",
        "formatting rule",
        "context block",
        "let's try to find",
        "if i ignore",
        "is it helpful?",
    )
    if any(marker in lower for marker in junk_markers):
        return False
    return True


def _plant_signal_score(text: str) -> int:
    lower = (text or "").lower()
    signals = (
        "health", "risk", "asset", "bearing", "vibration", "sensor", "maintenance",
        "schedule", "shift", "pressure", "furnace", "rul", "anomaly", "bottleneck",
        "spare", "inspection", "urgency", "deviation", "envelope", "crew", "plant",
        "hagcc", "hhpd", "srf", "warning", "critical", "hysteresis", "abnormality",
    )
    score = 0
    for signal in signals:
        if re.search(rf"\b{re.escape(signal)}\b", lower):
            score += 1
    # Short asset codes (FS, SR) — word boundary only, not substrings inside other words.
    for code in ("fs", "sr", "log"):
        if re.search(rf"\b{re.escape(code)}\b", lower):
            score += 1
    return score


def _best_answer_candidate(candidates: list[str]) -> str:
    usable = [c.strip() for c in candidates if _looks_like_answer(c)]
    if not usable:
        return ""
    return max(usable, key=lambda c: (_plant_signal_score(c), len(c)))


def _extract_insight_sentences(think: str) -> str:
    import re

    sentences = re.split(r"(?<=[.!?])\s+", think)
    good: list[str] = []
    for sentence in sentences:
        line = sentence.strip()
        if len(line) < 40:
            continue
        lower = line.lower()
        if lower.startswith(
            ("the user", "since i", "however", "i must", "analyze", "constraint", "this usually means")
        ):
            continue
        if not _looks_like_answer(line):
            continue
        if _plant_signal_score(line) < 2:
            continue
        good.append(line)
    if len(good) >= 2:
        return " ".join(good[:5])
    if good:
        return good[0]
    return ""


def salvage_qwen_output(content: str, reasoning: str = "") -> str:
    """qwen3.5 via Ollama often leaves `content` empty and puts prose in `reasoning`."""
    import re

    body = (content or "").strip()
    if _looks_like_answer(body):
        return body

    think = (reasoning or "").strip()
    if not think:
        return body

    if think.lower().startswith("thinking"):
        tail = think.split("\n\n", 1)
        if len(tail) > 1 and _looks_like_answer(tail[1]):
            return tail[1].strip()

    markers = (
        "final answer:",
        "final response:",
        "final output:",
        "draft response:",
        "draft:",
        "output:",
        "answer:",
        "response:",
        "here is the",
        "here are the",
        "plain sentences:",
    )
    lower = think.lower()
    marker_candidates: list[str] = []
    for marker in markers:
        idx = lower.rfind(marker)
        if idx < 0:
            continue
        marker_candidates.append(think[idx + len(marker):].strip().lstrip(":-* \n"))
    best_marker = _best_answer_candidate(marker_candidates)
    if best_marker:
        return best_marker

    quote_candidates = [next((g for g in groups if g), "") for groups in re.findall(r'"([^"]{30,})"|\'([^\']{30,})\'', think)]
    best_quote = _best_answer_candidate(quote_candidates)
    if best_quote:
        return best_quote

    paragraphs: list[str] = []
    for block in think.split("\n\n"):
        paragraph = block.strip()
        if not _looks_like_answer(paragraph):
            continue
        if re.match(r"^\d+\.", paragraph):
            continue
        if paragraph.lower().startswith(
            ("thinking", "**analyze", "analyze the", "constraint", "role:", "task:", "input data")
        ):
            continue
        paragraphs.append(paragraph)
    best_paragraph = _best_answer_candidate(paragraphs)
    if best_paragraph:
        return best_paragraph

    line_candidates = [ln.strip() for ln in think.splitlines()]
    best_line = _best_answer_candidate(line_candidates)
    if best_line:
        return best_line

    if "in summary" in lower:
        idx = lower.rfind("in summary")
        tail = think[idx:].split(":", 1)[-1].strip()
        if _looks_like_answer(tail):
            return tail

    sentence_insight = _extract_insight_sentences(think)
    if sentence_insight and not is_chain_of_thought_leak(sentence_insight):
        return sentence_insight

    fallback = think[:1200].strip()
    if is_chain_of_thought_leak(fallback) or not _looks_like_answer(fallback):
        return body
    return fallback


def _build_ollama_messages(
    system: str,
    messages: list[dict[str, str]],
) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    if system:
        out.append({"role": "system", "content": system})
    for item in messages:
        role = item.get("role", "user")
        if role in ("user", "assistant", "system"):
            out.append({"role": role, "content": item.get("content", "")})
    return out


def _stream_ollama_v1_chat_completions(
    *,
    model_size: ModelSize,
    system: str,
    messages: list[dict[str, str]],
    max_tokens: int = 2048,
    temperature: float = 0.2,
    think: bool = False,
) -> Iterator[tuple[str, str]]:
    """Native Ollama /api/chat streaming — surfaces qwen reasoning deltas LangChain drops.

    Uses /api/chat (not the OpenAI-compat /v1 endpoint) because /v1 ignores think=false
    for qwen3.5 thinking models, leaving the content body empty (all output in reasoning).
    """
    import json

    import httpx

    payload: dict[str, Any] = {
        "model": _model_name(model_size),
        "messages": _build_ollama_messages(system, messages),
        "stream": True,
        "think": bool(think),
        "keep_alive": ollama_keep_alive_value(),
        "options": {"temperature": temperature, "num_predict": max_tokens},
    }
    url = f"{settings.OLLAMA_BASE_URL}/api/chat"

    with httpx.Client(timeout=180) as client:
        with client.stream(
            "POST",
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
        ) as resp:
            resp.raise_for_status()
            for raw_line in resp.iter_lines():
                if not raw_line:
                    continue
                line = raw_line.decode() if isinstance(raw_line, bytes) else raw_line
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                msg = data.get("message") or {}
                content = str(msg.get("content") or "")
                reasoning = str(
                    msg.get("reasoning")
                    or msg.get("reasoning_content")
                    or msg.get("thinking")
                    or ""
                )
                if content or reasoning:
                    yield content, reasoning
                if data.get("done"):
                    break


def _invoke_ollama_chat_completions(
    *,
    model_size: ModelSize,
    system: str,
    user: str,
    history: list[dict[str, str]] | None = None,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    think: bool = False,
) -> str:
    """Direct Ollama chat API — required for qwen3.5:0.8b reasoning/thinking salvage."""
    content, reasoning = _invoke_ollama_chat_completions_parts(
        model_size=model_size,
        system=system,
        user=user,
        history=history,
        max_tokens=max_tokens,
        temperature=temperature,
        think=think,
    )
    return salvage_qwen_output(content, reasoning)


def _invoke_ollama_chat_completions_parts(
    *,
    model_size: ModelSize,
    system: str,
    user: str,
    history: list[dict[str, str]] | None = None,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    think: bool = False,
) -> tuple[str, str]:
    """Raw Ollama message body + reasoning channel (no salvage)."""
    import httpx

    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    for item in history or []:
        role = item.get("role", "user")
        if role in ("user", "assistant", "system"):
            messages.append({"role": role, "content": item.get("content", "")})
    if user:
        messages.append({"role": "user", "content": user})

    # Native /api/chat for BOTH sizes. The OpenAI-compat /v1 endpoint ignores
    # think=false for qwen3.5 thinking models, so the model dumps everything into
    # the reasoning channel and returns an empty content body. /api/chat honors it.
    payload: dict[str, Any] = {
        "model": _model_name(model_size),
        "messages": messages,
        "stream": False,
        "think": bool(think),
        "keep_alive": ollama_keep_alive_value(),
        "options": {"temperature": temperature, "num_predict": max_tokens},
    }
    url = f"{settings.OLLAMA_BASE_URL}/api/chat"

    with httpx.Client(timeout=180) as client:
        resp = client.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        message = data.get("message", {})
        content = str(message.get("content") or "")
        reasoning = str(
            message.get("reasoning")
            or message.get("reasoning_content")
            or message.get("thinking")
            or ""
        )
        return content, reasoning


def _to_lc_messages(
    system: str,
    user: str,
    history: list[dict[str, str]] | None = None,
) -> list[BaseMessage]:
    msgs: list[BaseMessage] = []
    if system:
        msgs.append(SystemMessage(content=system))
    for item in history or []:
        role = item.get("role", "user")
        content = item.get("content", "")
        if role == "assistant":
            msgs.append(AIMessage(content=content))
        elif role == "system":
            msgs.append(SystemMessage(content=content))
        else:
            msgs.append(HumanMessage(content=content))
    if user:
        msgs.append(HumanMessage(content=user))
    return msgs


def get_chat_model(
    size: ModelSize = "large",
    *,
    temperature: float = 0.2,
    num_predict: int = 2048,
    think: bool = False,
):
    """Return configured ChatOllama instance."""
    from langchain_ollama import ChatOllama

    kwargs: dict[str, Any] = {
        "base_url": settings.OLLAMA_BASE_URL,
        "model": _model_name(size),
        "temperature": temperature,
        "num_predict": num_predict,
        "keep_alive": ollama_keep_alive_value(),
    }
    if think:
        kwargs["reasoning"] = True
    return ChatOllama(**kwargs)


def invoke_raw(
    *,
    model_size: ModelSize,
    system: str,
    user: str,
    history: list[dict[str, str]] | None = None,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    think: bool = False,
    skip_input_guard: bool = False,
    skip_output_guard: bool = False,
    source: str = "system",
) -> str:
    """Low-level invoke — used by classifier and internal calls."""
    if _ollama_mock():
        return ""

    if model_size == "small":
        def _small_call() -> str:
            return _invoke_ollama_chat_completions(
                model_size=model_size,
                system=system,
                user=user,
                history=history,
                max_tokens=max_tokens,
                temperature=temperature,
                think=think,
            )

        with OLLAMA_SMALL_LOCK:
            text = _retry_invoke(_small_call)
    else:
        def _large_call() -> str:
            return _invoke_ollama_chat_completions(
                model_size=model_size,
                system=system,
                user=user,
                history=history,
                max_tokens=max_tokens,
                temperature=temperature,
                think=think,
            )

        text = _retry_invoke(_large_call)

    if not skip_output_guard:
        out_verdict = check_output_guard(text)
        if out_verdict.action == GuardrailAction.BLOCK:
            return refusal_message(out_verdict)

    return text


def _retry_invoke(fn, attempts: int = 3) -> str:
    last_exc: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except Exception as exc:
            last_exc = exc
            logger.warning("ollama_invoke attempt=%d error=%s", attempt, exc)
            if attempt < attempts:
                time.sleep(3 * attempt)
    assert last_exc is not None
    raise last_exc


def invoke_guarded(
    *,
    model_size: ModelSize,
    system: str,
    user: str,
    history: list[dict[str, str]] | None = None,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    think: bool = False,
    source: str = "user",
    skip_input_guard: bool = False,
    skip_output_guard: bool = False,
) -> tuple[str, GuardrailVerdict | None]:
    """
    Invoke with input guard. Returns (text, guard_verdict).
    If blocked, text is refusal message and verdict is set.
    """
    verdict: GuardrailVerdict | None = None
    effective_user = user

    if not skip_input_guard:
        verdict = check_input_guard(user, source=source)
        if verdict.action == GuardrailAction.BLOCK:
            return refusal_message(verdict), verdict
        if verdict.action == GuardrailAction.STEER and verdict.steered_text:
            effective_user = verdict.steered_text

    text = invoke_raw(
        model_size=model_size,
        system=system,
        user=effective_user,
        history=history,
        max_tokens=max_tokens,
        temperature=temperature,
        think=think,
        skip_input_guard=True,
        skip_output_guard=skip_output_guard,
        source=source,
    )
    return text, verdict


class StreamChunk:
    """Normalized streaming chunk from Ollama via LangChain."""

    __slots__ = ("token", "thinking", "done")

    def __init__(self, *, token: str = "", thinking: str = "", done: bool = False):
        self.token = token
        self.thinking = thinking
        self.done = done


def stream_guarded(
    *,
    model_size: ModelSize,
    system: str,
    messages: list[dict[str, str]],
    max_tokens: int = 2048,
    temperature: float = 0.2,
    think: bool = False,
    user_text: str = "",
    source: str = "user",
    skip_input_guard: bool = False,
) -> tuple[Iterator[StreamChunk], GuardrailVerdict | None]:
    """
    Stream with optional input guard on last user message.
    Returns (iterator, guard_verdict). If blocked, iterator yields single refusal chunk.
    """
    verdict: GuardrailVerdict | None = None
    effective_messages = list(messages)

    if not skip_input_guard and user_text:
        verdict = check_input_guard(user_text, source=source)
        if verdict.action == GuardrailAction.BLOCK:
            def _blocked():
                yield StreamChunk(token=refusal_message(verdict), done=True)
            return _blocked(), verdict
        if verdict.action == GuardrailAction.STEER and verdict.steered_text:
            if effective_messages and effective_messages[-1].get("role") == "user":
                effective_messages[-1] = {
                    **effective_messages[-1],
                    "content": verdict.steered_text,
                }

    if _ollama_mock():
        def _empty():
            yield StreamChunk(done=True)
        return _empty(), verdict

    lc_messages: list[BaseMessage] = []
    if system:
        lc_messages.append(SystemMessage(content=system))
    for item in effective_messages:
        role = item.get("role", "user")
        content = item.get("content", "")
        if role == "assistant":
            lc_messages.append(AIMessage(content=content))
        elif role == "system":
            lc_messages.append(SystemMessage(content=content))
        else:
            lc_messages.append(HumanMessage(content=content))

    def _stream() -> Iterator[StreamChunk]:
        full = ""
        full_reasoning = ""
        try:
            if model_size == "large":
                for content_delta, reasoning_delta in _stream_ollama_v1_chat_completions(
                    model_size=model_size,
                    system=system,
                    messages=effective_messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    think=think,
                ):
                    if reasoning_delta:
                        full_reasoning += reasoning_delta
                        yield StreamChunk(thinking=reasoning_delta)
                    if content_delta:
                        full += content_delta
                        yield StreamChunk(token=content_delta)
            else:
                model = get_chat_model(
                    model_size,
                    temperature=temperature,
                    num_predict=max_tokens,
                    think=think,
                )
                for chunk in model.stream(lc_messages):
                    token = ""
                    thinking = ""
                    if isinstance(chunk, AIMessageChunk):
                        content = chunk.content
                        if isinstance(content, str):
                            token = content
                        elif isinstance(content, list):
                            for block in content:
                                if isinstance(block, dict):
                                    btype = str(block.get("type", "")).lower()
                                    text = block.get("text", "") or block.get("thinking", "") or ""
                                    if btype in ("thinking", "reasoning"):
                                        thinking += text
                                    else:
                                        token += text
                                else:
                                    token += str(block)
                        additional = getattr(chunk, "additional_kwargs", {}) or {}
                        thinking = thinking or str(
                            additional.get("reasoning_content")
                            or additional.get("reasoning")
                            or additional.get("thinking")
                            or ""
                        )
                    else:
                        token = str(getattr(chunk, "content", "") or "")

                    if thinking:
                        full_reasoning += thinking
                        yield StreamChunk(thinking=thinking)
                    if token:
                        full += token
                        yield StreamChunk(token=token)

            cleaned = finalize_manas_output(full, full_reasoning)
            if cleaned.strip():
                if not full.strip():
                    yield StreamChunk(token=cleaned)
                full = cleaned.strip()
            elif full.strip() and not is_chain_of_thought_leak(full):
                full = full.strip()
            else:
                full = ""

            out_verdict = check_output_guard(full)
            if out_verdict.action == GuardrailAction.BLOCK:
                # Do not append refusal after a full streamed answer — log only.
                logger.warning(
                    "output_guard_blocked_post_stream reason=%s chars=%d",
                    out_verdict.reason,
                    len(full),
                )
            yield StreamChunk(done=True)
        except Exception as exc:
            logger.error("stream_guarded_failed: %s", exc)
            raise

    return _stream(), verdict


def invoke_openai_compat(
    messages: list[dict[str, str]],
    *,
    model_size: ModelSize = "large",
    tools: list[dict] | None = None,
    max_tokens: int = 2048,
    temperature: float = 0.1,
    think: bool = False,
) -> dict:
    """OpenAI-compatible /v1/chat/completions — tool-calling paths (consolidation supervisor)."""
    import httpx

    if _ollama_mock():
        return {"choices": [{"message": {"content": "{}"}}]}

    payload: dict[str, Any] = {
        "model": _model_name(model_size),
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False,
        "think": think,
        "keep_alive": ollama_keep_alive_value(),
    }
    if tools:
        payload["tools"] = tools

    with httpx.Client(timeout=180) as client:
        resp = client.post(
            f"{settings.OLLAMA_BASE_URL}/v1/chat/completions",
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()
