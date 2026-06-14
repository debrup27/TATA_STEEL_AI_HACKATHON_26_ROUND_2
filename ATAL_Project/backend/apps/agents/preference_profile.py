"""Learn MANAS response style from thumbs-up/down on chat messages."""
from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_TRAIT_KEYS = (
    "concise",
    "detailed",
    "step_by_step",
    "technical_depth",
    "citation_heavy",
    "action_oriented",
)

_DEFAULT_PROFILE: dict[str, Any] = {
    "feedback_count": 0,
    "traits": {k: 0.5 for k in _TRAIT_KEYS},
    "summary": "",
}


def _clamp(v: float) -> float:
    return max(0.0, min(1.0, v))


def analyze_response_traits(content: str) -> dict[str, float]:
    """Heuristic trait vector for a single assistant reply."""
    text = (content or "").strip()
    if not text:
        return {k: 0.5 for k in _TRAIT_KEYS}

    words = len(text.split())
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    bullet_lines = sum(1 for ln in lines if re.match(r"^[-*•]\s", ln))
    numbered = sum(1 for ln in lines if re.match(r"^\d+[.)]\s", ln))
    citations = len(re.findall(r"\[\d+\]", text))
    bold_headers = len(re.findall(r"\*\*[^*]+\*\*", text))
    chem_math = len(re.findall(r"\$[^$]+\$|FeCl|ISO[_\s]?\d|β|≥|≤", text, re.I))
    action_verbs = len(
        re.findall(
            r"\b(inspect|replace|drain|flush|calibrat|shutdown|isolate|verify|monitor|schedule)\w*\b",
            text,
            re.I,
        ),
    )

    concise = _clamp(1.0 - (words - 80) / 320) if words > 80 else _clamp(0.65 + (80 - words) / 160)
    detailed = _clamp((words - 60) / 280) if words > 60 else _clamp(words / 120)
    step_by_step = _clamp((bullet_lines + numbered * 1.2) / 6)
    technical_depth = _clamp((chem_math + bold_headers * 0.35) / 5)
    citation_heavy = _clamp(citations / 4)
    action_oriented = _clamp(action_verbs / 5)

    return {
        "concise": concise,
        "detailed": detailed,
        "step_by_step": step_by_step,
        "technical_depth": technical_depth,
        "citation_heavy": citation_heavy,
        "action_oriented": action_oriented,
    }


def _load_profile(user) -> dict[str, Any]:
    prefs = user.notification_prefs if isinstance(user.notification_prefs, dict) else {}
    raw = prefs.get("manas_style")
    if not isinstance(raw, dict):
        return {**_DEFAULT_PROFILE, "traits": dict(_DEFAULT_PROFILE["traits"])}
    traits = raw.get("traits") if isinstance(raw.get("traits"), dict) else {}
    merged_traits = {k: float(traits.get(k, 0.5)) for k in _TRAIT_KEYS}
    return {
        "feedback_count": int(raw.get("feedback_count", 0)),
        "traits": merged_traits,
        "summary": str(raw.get("summary", "")),
    }


def _save_profile(user, profile: dict[str, Any]) -> None:
    prefs = dict(user.notification_prefs or {})
    prefs["manas_style"] = profile
    user.notification_prefs = prefs
    user.save(update_fields=["notification_prefs"])


def _summarize_traits(traits: dict[str, float]) -> str:
    hints: list[str] = []
    if traits["concise"] >= 0.62 and traits["detailed"] < 0.55:
        hints.append("Keep answers short (roughly 3–6 sentences) unless the user asks for depth.")
    elif traits["detailed"] >= 0.62:
        hints.append("Provide fuller context and structured sections when diagnosing issues.")
    if traits["step_by_step"] >= 0.55:
        hints.append("Use numbered steps for corrective actions and inspections.")
    if traits["technical_depth"] >= 0.55:
        hints.append("Include technical thresholds, units, and standard references when available.")
    if traits["citation_heavy"] >= 0.5:
        hints.append("Cite loaded documents with inline [n] markers when making factual claims.")
    if traits["action_oriented"] >= 0.55:
        hints.append("Lead with actionable maintenance steps, not background essays.")
    if not hints:
        hints.append("Stay direct, maintenance-focused, and grounded in retrieved documents.")
    return " ".join(hints)


def record_message_feedback(user, message, rating: str) -> dict[str, Any]:
    """Update rolling style profile from a thumbs up/down."""
    rating = (rating or "").strip().lower()
    if rating not in ("up", "down"):
        raise ValueError("rating must be 'up' or 'down'")

    traits = analyze_response_traits(message.content)
    profile = _load_profile(user)
    alpha = 0.22 if profile["feedback_count"] < 8 else 0.12

    for key in _TRAIT_KEYS:
        observed = traits[key]
        current = profile["traits"][key]
        target = observed if rating == "up" else 1.0 - observed
        profile["traits"][key] = _clamp(current + alpha * (target - current))

    profile["feedback_count"] = profile["feedback_count"] + 1
    profile["summary"] = _summarize_traits(profile["traits"])
    _save_profile(user, profile)
    return profile


def get_preference_patch(user) -> str:
    """Prompt addendum derived from learned user style."""
    if user is None:
        return ""
    profile = _load_profile(user)
    if profile["feedback_count"] < 1 or not profile["summary"]:
        return ""
    return (
        "\n\n## User Response Style (learned from feedback)\n"
        f"{profile['summary']}\n"
        "Adapt tone and structure to match — do not mention this profile to the user."
    )
