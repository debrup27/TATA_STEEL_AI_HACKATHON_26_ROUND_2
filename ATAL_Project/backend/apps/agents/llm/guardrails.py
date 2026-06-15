"""Tiered input/output guardrails — LangChain Runnable + sync heuristics."""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

from django.conf import settings
from langchain_core.runnables import RunnableLambda

from apps.agents.llm.policy import (
    BORDERLINE_PATTERNS,
    CODING_PATTERNS,
    ESSAY_PATTERNS,
    MAINTENANCE_ALLOWLIST,
    MAINTENANCE_PATTERNS,
    PROFANITY_ALLOWLIST_TERMS,
    REFUSAL_MESSAGES,
    STEER_HINT,
)
from apps.agents.llm.schemas import (
    GuardrailAction,
    GuardrailCategory,
    GuardrailVerdict,
    ScopeClassifierResult,
)

logger = logging.getLogger(__name__)

_CLASSIFIER_SYSTEM = """You classify user messages for MANAS — ATAL steel-plant maintenance assistant.

IN SCOPE: equipment fault diagnosis, RCA, RUL, sensors/telemetry, anomalies, risk triage, \
maintenance/repair steps, SOPs/manuals, spares, work orders, assets SRF/HHPD/FS/HAGCC/APT/TCMS/CGP/HPAK.

OUT OF SCOPE: programming help, algorithms/data structures (Dijkstra, sorting, LeetCode, etc.), \
essays/homework, profanity/abuse, unrelated general chat.

Return JSON only:
{"action":"allow|block|steer","category":"none|off_topic|coding|essay|general","reason":"brief","steered_text":"if steer, rewritten maintenance question else empty"}

Rules:
- allow: clearly maintenance/plant related
- block: coding tutorials, essays, abuse (profanity already filtered upstream)
- steer: mild off-topic — rewrite toward maintenance while preserving intent when possible
"""


def _guardrails_enabled() -> bool:
    if os.environ.get("OLLAMA_MOCK") == "1":
        return False
    return bool(getattr(settings, "GUARDRAILS_ENABLED", True))


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def _scrub_profanity_allowlist(text: str) -> str:
    """Remove steel-plant terms that better_profanity misflags before checking."""
    scrubbed = text
    for term in PROFANITY_ALLOWLIST_TERMS:
        scrubbed = re.sub(rf"\b{re.escape(term)}\b", " ", scrubbed, flags=re.I)
    return scrubbed


def _contains_profanity(text: str) -> bool:
    try:
        from better_profanity import profanity

        if not profanity.CENSOR_WORDSET:
            profanity.load_censor_words()
        return profanity.contains_profanity(_scrub_profanity_allowlist(text))
    except Exception as exc:
        logger.warning("profanity_check_failed: %s", exc)
        return False


def _matches_any(patterns: list[re.Pattern], text: str) -> bool:
    return any(p.search(text) for p in patterns)


def _has_maintenance_signal(text: str) -> bool:
    lower = text.lower()
    if _matches_any(MAINTENANCE_PATTERNS, text):
        return True
    return any(term in lower for term in MAINTENANCE_ALLOWLIST)


def heuristic_classify(text: str) -> GuardrailVerdict:
    """Sync heuristic layer — returns verdict or borderline flag via action=allow with empty reason."""
    normalized = normalize_text(text)
    if not normalized:
        return GuardrailVerdict(
            action=GuardrailAction.BLOCK,
            category=GuardrailCategory.OFF_TOPIC,
            reason="empty",
            original_text=text,
        )

    if _contains_profanity(normalized):
        return GuardrailVerdict(
            action=GuardrailAction.BLOCK,
            category=GuardrailCategory.PROFANITY,
            reason="profanity_detected",
            original_text=text,
        )

    if _matches_any(CODING_PATTERNS, normalized) and not _has_maintenance_signal(normalized):
        return GuardrailVerdict(
            action=GuardrailAction.BLOCK,
            category=GuardrailCategory.CODING,
            reason="coding_request",
            original_text=text,
        )

    if _matches_any(ESSAY_PATTERNS, normalized):
        return GuardrailVerdict(
            action=GuardrailAction.BLOCK,
            category=GuardrailCategory.ESSAY,
            reason="essay_request",
            original_text=text,
        )

    if _has_maintenance_signal(normalized):
        return GuardrailVerdict(
            action=GuardrailAction.ALLOW,
            category=GuardrailCategory.NONE,
            original_text=text,
        )

    if _matches_any(BORDERLINE_PATTERNS, normalized):
        return GuardrailVerdict(
            action=GuardrailAction.STEER,
            category=GuardrailCategory.GENERAL,
            reason="borderline_general",
            steered_text=f"{normalized} — {STEER_HINT}",
            original_text=text,
        )

    # Uncertain — mark for LLM classifier via special reason
    return GuardrailVerdict(
        action=GuardrailAction.ALLOW,
        category=GuardrailCategory.NONE,
        reason="borderline_uncertain",
        original_text=text,
    )


def _parse_classifier_json(raw: str) -> ScopeClassifierResult | None:
    text = (raw or "").strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(text[start:end])
        return ScopeClassifierResult.model_validate(data)
    except Exception:
        return None


def _llm_classify_borderline(text: str) -> GuardrailVerdict:
    """0.8b structured classifier for uncertain messages."""
    if not getattr(settings, "GUARDRAILS_LLM_CLASSIFIER", True):
        return GuardrailVerdict(action=GuardrailAction.ALLOW, original_text=text)

    from apps.agents.llm.client import invoke_raw

    user = f"Classify this user message:\n\n{text[:1500]}"
    try:
        raw = invoke_raw(
            model_size="small",
            system=_CLASSIFIER_SYSTEM,
            user=user,
            max_tokens=220,
            temperature=0.0,
            skip_input_guard=True,
        )
    except Exception as exc:
        logger.warning("guardrail_classifier_failed: %s", exc)
        return GuardrailVerdict(action=GuardrailAction.ALLOW, original_text=text)

    parsed = _parse_classifier_json(raw)
    if not parsed:
        return GuardrailVerdict(action=GuardrailAction.ALLOW, original_text=text)

    action_map = {
        "allow": GuardrailAction.ALLOW,
        "block": GuardrailAction.BLOCK,
        "steer": GuardrailAction.STEER,
    }
    cat_map = {
        "none": GuardrailCategory.NONE,
        "profanity": GuardrailCategory.PROFANITY,
        "off_topic": GuardrailCategory.OFF_TOPIC,
        "coding": GuardrailCategory.CODING,
        "essay": GuardrailCategory.ESSAY,
        "general": GuardrailCategory.GENERAL,
    }
    steered = (parsed.steered_text or "").strip()
    if parsed.action == "steer" and not steered:
        steered = f"{text} — {STEER_HINT}"

    return GuardrailVerdict(
        action=action_map.get(parsed.action, GuardrailAction.ALLOW),
        category=cat_map.get(parsed.category, GuardrailCategory.NONE),
        reason=parsed.reason or "llm_classifier",
        steered_text=steered,
        original_text=text,
    )


def _run_guard_pipeline(payload: dict[str, Any]) -> GuardrailVerdict:
    text = payload.get("text", "")
    source = payload.get("source", "user")

    if source == "system" or not _guardrails_enabled():
        return GuardrailVerdict(action=GuardrailAction.ALLOW, original_text=text)

    normalized = normalize_text(text)
    verdict = heuristic_classify(normalized)

    if verdict.action == GuardrailAction.BLOCK:
        return verdict

    if verdict.action == GuardrailAction.STEER:
        return verdict

    if verdict.reason == "borderline_uncertain":
        return _llm_classify_borderline(normalized)

    return verdict


# LangChain Runnable entry (single-step chain)
input_guard_chain = RunnableLambda(_run_guard_pipeline)


def check_input_guard(
    text: str,
    *,
    source: str = "user",
) -> GuardrailVerdict:
    """Run full input guard pipeline synchronously."""
    return input_guard_chain.invoke({"text": text, "source": source})


def refusal_message(verdict: GuardrailVerdict) -> str:
    cat = verdict.category
    if cat == GuardrailCategory.PROFANITY:
        return REFUSAL_MESSAGES["profanity"]
    if cat == GuardrailCategory.CODING:
        return REFUSAL_MESSAGES["coding"]
    if cat == GuardrailCategory.ESSAY:
        return REFUSAL_MESSAGES["essay"]
    return REFUSAL_MESSAGES["off_topic"]


def check_output_guard(text: str) -> GuardrailVerdict:
    """Light post-generation filter — profanity and code-fence spam in general replies."""
    if not _guardrails_enabled():
        return GuardrailVerdict(action=GuardrailAction.ALLOW, original_text=text)

    normalized = normalize_text(text)
    if not normalized:
        return GuardrailVerdict(action=GuardrailAction.ALLOW, original_text=text)

    maintenance_output = _has_maintenance_signal(normalized)

    if not maintenance_output and _contains_profanity(normalized):
        return GuardrailVerdict(
            action=GuardrailAction.BLOCK,
            category=GuardrailCategory.PROFANITY,
            reason="output_profanity",
            original_text=text,
        )

    code_fence_count = normalized.count("```")
    if code_fence_count >= 2 and not maintenance_output:
        return GuardrailVerdict(
            action=GuardrailAction.BLOCK,
            category=GuardrailCategory.CODING,
            reason="output_code_dump",
            original_text=text,
        )

    return GuardrailVerdict(action=GuardrailAction.ALLOW, original_text=text)
