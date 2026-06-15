"""Inline SANSAD insights — 0.8b (qwen small) with deterministic fallback only after retries."""
from __future__ import annotations

import logging
import re

from django.conf import settings

logger = logging.getLogger(__name__)

_INSIGHT_SYSTEM = """You are MANAS, a maintenance engineer assistant at a Tata Steel plant.
Write 3–5 plain sentences for a shift engineer using the plant module context and live data provided.

State what the signal means, the likely cause, and the first checks or actions. Plain prose only."""

_RCA_INSIGHT_SYSTEM = """You are MANAS, a maintenance engineer assistant at a Tata Steel plant.
Explain the root-cause chain for the diagnosed fault using the weighted factors and live sensors provided.

Cover: dominant mechanism, supporting evidence, production-line impact, and ordered verification steps (include LOTO if hazardous work). Plain prose only."""

_DEFECT_INSIGHT_SYSTEM = """You are MANAS, a maintenance engineer assistant at a Tata Steel plant.
Explain how upstream process deviations in the production sequence relate to this asset's condition.

Name upstream stages, the propagation mechanism (thermal, mechanical, chemical), and what to monitor first. Plain prose only."""

_LOG_INSIGHT_SYSTEM = """You are MANAS, a maintenance engineer assistant at a Tata Steel plant.
Explain the log event in 4–6 plain sentences using the plant module context and log classification provided.

Cover operational meaning, likely cause, severity if ignored, and concrete checks/actions. Plain prose only."""

_INSIGHT_META_MARKERS = (
    "simulation",
    "don't have access",
    "do not have access",
    "provided text",
    "user provided",
    "since there is no actual",
    "i must rely on",
    "however, since it says",
    "this usually means",
    "formatting commentary",
    "looking closely",
    "hypothetical",
    "these prompts",
    "provided in the user message",
    "let's look at",
    "constraint check",
    "*wait*",
    "explain this log entry",
    "write a concise operational insight",
    "required in 4–6 sentences",
    "the prompt says",
    "wait,",
    "wait ",
    "however, since",
    "looking at the",
    "let me ",
    "i need to ",
    "the user wants",
    "live sensors:",
    "live sensor:",
    "local sensors:",
    "it lists",
    "outputs like",
    "no, it says",
    "is nominal?",
    "synthesise how",
    "root causes:",
    "process defect links:",
    "log text:",
    "timestamp:",
    "module / asset:",
    "cite specific sensor",
    "cite specific",
    "fault labels",
    "asset codes?",
    "asset codes",
    "verify the prompt",
    "against this constraint",
    "need to verify",
    "percentages, stages",
    "output only",
    "never repeat",
    "these instructions",
    "plain sentences",
    "shift engineer",
    "no instructions",
    "input field names",
    "field names repeated",
    "or input field",
    "no bullets",
    "no headers",
    "meta-commentary",
    "e.g.,",
)


def _strip_thinking_artifacts(text: str) -> str:
    cleaned = (text or "").strip()
    if cleaned.lower().startswith("thinking"):
        parts = cleaned.split("\n\n", 1)
        if len(parts) > 1:
            cleaned = parts[1].strip()
    return cleaned


def _sentences_from_text(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", (text or "").strip()) if s.strip()]


def _is_compliance_echo_sentence(sentence: str) -> bool:
    """Model sometimes opens with a sentence affirming it followed the prompt rules."""
    lower = sentence.strip().lower()
    if not lower:
        return True
    if re.match(r"^no\s+(instructions|bullets|headers|rules)\b", lower):
        return True
    if re.match(r"^(output|plain prose)\s+only\b", lower):
        return True
    if "input field names" in lower or "never repeat" in lower:
        return True
    if lower.startswith(("i will ", "i'll ", "as requested")):
        return True
    return False


def _insight_sentence_usable(sentence: str) -> bool:
    line = sentence.strip()
    if len(line) < 28:
        return False
    if _is_compliance_echo_sentence(line):
        return False
    lower = line.lower()
    if line.startswith(("*", "-", "•", "#", "`")):
        return False
    if re.match(r"^\d+\.\s", line):
        return False
    if any(marker in lower for marker in _INSIGHT_META_MARKERS):
        return False
    if "`" in line and ("prompt" in lower or "nominal" in lower):
        return False
    if lower.count("?") >= 2:
        return False
    if "?" in lower and any(
        phrase in lower
        for phrase in ("cite ", "verify the prompt", "constraint", "instructions", "should i")
    ):
        return False
    from apps.agents.llm.client import _plant_signal_score

    if _plant_signal_score(line) < 1:
        return False
    return True


def _compose_insight_from_sentences(
    sentences: list[str],
    *,
    min_sentences: int = 2,
    max_sentences: int = 6,
) -> str:
    usable = [s for s in sentences if _insight_sentence_usable(s)]
    if len(usable) >= min_sentences:
        return " ".join(usable[:max_sentences])
    if len(usable) == 1 and min_sentences <= 1:
        return usable[0]
    return ""


def _polish_insight_output(text: str) -> str:
    """Keep only engineer-facing sentences; drop instruction echo and prompt debate."""
    sentences = _sentences_from_text(_strip_thinking_artifacts(text))
    usable = [s for s in sentences if _insight_sentence_usable(s)]
    if len(usable) >= 2:
        return " ".join(usable[:6])
    if len(usable) == 1:
        from apps.agents.llm.client import _plant_signal_score

        line = usable[0]
        if len(line) >= 45 and _plant_signal_score(line) >= 1:
            return line
    return ""


def _finalize_insight_text(content: str, reasoning: str = "") -> str:
    """Drop chain-of-thought / prompt-regurgitation; keep engineer-facing prose only."""
    polished = _polish_insight_output(content)
    if polished and _is_usable_insight(polished):
        return polished

    for source in (_strip_thinking_artifacts(reasoning),):
        if not source:
            continue
        polished = _polish_insight_output(source)
        if polished and _is_usable_insight(polished):
            return polished
        composed = _compose_insight_from_sentences(_sentences_from_text(source))
        if composed and _is_usable_insight(composed):
            return composed
    return ""


def _invoke_small_insight(
    system: str,
    user: str,
    *,
    max_tokens: int = 520,
    temperature: float = 0.25,
) -> str:
    """Call qwen 0.8b via direct Ollama API with insight-specific output cleanup."""
    from apps.agents.llm.client import _invoke_ollama_chat_completions_parts, _ollama_mock
    from apps.agents.llm.client import _retry_invoke
    from apps.agents.ollama_warmup import OLLAMA_SMALL_LOCK

    if _ollama_mock():
        return ""

    def _call() -> str:
        content, reasoning = _invoke_ollama_chat_completions_parts(
            model_size="small",
            system=system,
            user=user,
            max_tokens=max_tokens,
            temperature=temperature,
            think=False,
        )
        return _finalize_insight_text(content, reasoning)

    with OLLAMA_SMALL_LOCK:
        return _retry_invoke(_call)


def _insight_meets_minimum_quality(text: str, *, angle: str) -> bool:
    if not _is_usable_insight(text):
        return False
    sentences = _sentences_from_text(text)
    if len(sentences) >= 2:
        return True
    if angle in ("Root-cause insight", "Defect correlation insight", "Risk insight", "Log explanation"):
        return len(text) >= 110 and len(sentences) == 1
    return bool(sentences)


def _is_usable_insight(text: str) -> bool:
    from apps.agents.llm.client import _plant_signal_score

    cleaned = _strip_thinking_artifacts(text)
    if len(cleaned) < 30:
        return False
    head = cleaned[:140].lower()
    if head.startswith("thinking") or "thinking process" in head:
        return False
    lower = cleaned.lower()
    if any(marker in lower for marker in _INSIGHT_META_MARKERS):
        return False
    if cleaned.count("*") >= 2:
        return False
    if cleaned.rstrip().endswith(":"):
        return False
    if lower.count("?") >= 2:
        return False
    if any(not _insight_sentence_usable(s) for s in _sentences_from_text(cleaned)):
        polished = _polish_insight_output(cleaned)
        if not polished:
            return False
        cleaned = polished
        lower = cleaned.lower()
    if _plant_signal_score(cleaned) < 2:
        return False
    return True


def _sensor_lines(sensors: list[dict]) -> str:
    if not sensors:
        return "[no live sensor readings]"
    return "\n".join(
        f"- {s.get('label', 'sensor')}: {s.get('value', '—')} ({s.get('status', 'nominal')})"
        for s in sensors[:3]
    )


def _template_rca_insight(
    *,
    asset_name: str,
    probable_fault: str,
    root_causes: list[dict],
    sensors: list[dict],
    early_warning: str | None = None,
) -> str:
    from apps.assets.rca_sanitize import sanitize_root_causes

    causes = sanitize_root_causes(root_causes)
    warn_bit = ""
    if early_warning and str(early_warning).strip().lower() not in ("none", "—", "-"):
        warn_bit = f" Early warning: {early_warning}."
    sensor_bit = ""
    if sensors:
        parts = [f"{s.get('label')}={s.get('value')}" for s in sensors[:3]]
        sensor_bit = f" Key live readings: {', '.join(parts)}."

    if not causes and sensors:
        top_sensor = sensors[0]
        return (
            f"On {asset_name}, {top_sensor.get('label')} at {top_sensor.get('value')} "
            f"({top_sensor.get('status')}) is the dominant live signal driving the current diagnosis: "
            f"{probable_fault}.{warn_bit}{sensor_bit} "
            "Prioritise verifying envelope breaches on the top sensor, then confirm whether vibration or pressure trends align with the fault class before scheduling intervention."
        )

    if not causes:
        return (
            f"On {asset_name}, the active diagnosis is {probable_fault}.{warn_bit}{sensor_bit} "
            "Prioritise verifying envelope breaches on the top sensor, then confirm whether vibration or pressure trends align with the fault class before scheduling intervention."
        )

    top = causes[0]
    others = ", ".join(rc.get("factor", "") for rc in causes[1:3] if rc.get("factor"))
    chain = f" Secondary factors: {others}." if others else ""
    return (
        f"On {asset_name}, {top.get('factor')} is the primary contributor ({int(float(top.get('weight', 0)) * 100)}%) "
        f"to the current diagnosis: {probable_fault}.{warn_bit}{sensor_bit}{chain} "
        "Prioritise verifying envelope breaches on the top sensor, then confirm whether vibration or pressure trends align with the fault class before scheduling intervention."
    )


def _template_defect_insight(
    *,
    asset_name: str,
    stage: str,
    probable_fault: str,
    process_defects: list[dict],
) -> str:
    links = "; ".join(
        f"{d.get('stage')}: {d.get('defect')}"
        for d in process_defects[:3]
    )
    return (
        f"Cross-stage analysis for {asset_name} ({stage}) links upstream process deviations to the present condition ({probable_fault}). "
        f"Flagged correlations: {links}. "
        "These upstream envelope breaches can propagate through the production sequence — monitor the highest-influence upstream stage first and confirm whether local sensors on the target asset are reacting to the same disturbance."
    )


def _template_log_insight(*, module: str, text: str, time: str) -> str:
    from apps.agents.plant_module_context import specialized_log_template

    specialized = specialized_log_template(module=module, text=text, time=time)
    if specialized:
        return specialized

    upper = text.upper()
    if "ABNORMALITY" in upper or "CRITICAL" in upper or "SEV 1" in upper or "TRIP" in upper:
        return (
            f"{module} logged a critical abnormality at {time}: {text[:220]}. "
            "This indicates an envelope breach that can affect product quality or trip interlocks if it persists. "
            "Dispatch maintenance to verify the sensor and mechanical path, confirm whether production should be held, "
            "and trend the related readings for at least two hours after correction."
        )
    if "WARNING" in upper or "SEV 2" in upper:
        return (
            f"This warning on {module} at {time} indicates drifting parameters that could escalate if left unchecked. "
            f"Log detail: {text[:200]}. "
            "Schedule a calibration or inspection on the next shift, trend the related sensors for two hours, and raise a maintenance note if values do not stabilise."
        )
    return (
        f"This informational log from {module} at {time} records normal system activity or a cleared condition. "
        f"Detail: {text[:200]}. "
        "No urgent intervention is required — continue routine monitoring and keep the entry in the shift handover log."
    )


def _log_insight_anchored_to_source(*, module: str, text: str, insight: str) -> bool:
    """Reject generic prose that never references the actual log content."""
    lower = insight.lower()
    mod = (module or "").strip().lower()
    if mod and len(mod) >= 2 and mod in lower:
        return True
    log_lower = (text or "").lower()
    for token in (
        "abnormality", "hysteresis", "critical", "warning", "trip", "maintenance",
        "bearing", "vibration", "deviation", "μm", "micrometer", "limit exceeded",
        "thickness", "gauge", "agc", "gap control", "gap-control",
        "pressure", "temperature", "temp", "hcl", "fecl2", "zinc", "pot",
        "descaler", "furnace", "emulsion", "coat", "nozzle", "health",
    ):
        if token in log_lower and token in lower:
            return True
    for match in re.findall(r"\d{2,}", text or ""):
        if match in insight:
            return True
    return False


def _generate_insight(
    user_blob: str,
    template_fallback: str,
    *,
    system: str = _INSIGHT_SYSTEM,
    insight_angle: str = "Operational insight",
    quality_check=None,
) -> dict:
    insight = ""
    router = "deterministic-fallback"

    for attempt in range(3):
        temp = 0.2 + attempt * 0.08
        try:
            text = _invoke_small_insight(system, user_blob, temperature=temp)
            if _insight_meets_minimum_quality(text, angle=insight_angle):
                if quality_check and not quality_check(text):
                    logger.info("insight attempt %d failed quality_check", attempt + 1)
                    continue
                insight = text
                router = "manas"
                break
            logger.info(
                "insight attempt %d returned short/unusable text (len=%d)",
                attempt + 1,
                len(text),
            )
        except Exception as exc:
            logger.warning("insight attempt %d failed: %s", attempt + 1, exc)

    if not insight:
        logger.warning("insight using deterministic fallback for angle=%s", insight_angle)
        insight = template_fallback

    return {
        "insight_angle": insight_angle,
        "insight": insight,
        "router": router,
    }


def generate_rca_overview_insight(
    *,
    asset_name: str,
    factory: str,
    stage: str,
    probable_fault: str,
    health: int,
    rul_days: int | None,
    root_causes: list[dict],
    sensors: list[dict] | None = None,
    early_warning: str | None = None,
) -> dict:
    if not root_causes:
        raise ValueError("no root causes to analyse")

    sensors = sensors or []
    from apps.assets.rca_sanitize import derive_sensor_root_causes, sanitize_root_causes

    root_causes = sanitize_root_causes(root_causes)
    if not root_causes:
        root_causes = derive_sensor_root_causes(sensors, early_warning)
    if not root_causes:
        raise ValueError("no root causes to analyse")

    lines = "\n".join(
        f"- {rc.get('factor')} ({rc.get('weight', 0):.0%}): {rc.get('evidence', '')}"
        for rc in root_causes[:3]
    )
    from apps.agents.plant_module_context import insight_task_context

    context = insight_task_context(
        "Root-cause insight",
        asset_code=stage,
        asset_name=asset_name,
    )
    user_blob = (
        f"{context}\n\n"
        f"Asset: {asset_name} ({factory}, {stage})\n"
        f"Health: {health}% | RUL: {rul_days if rul_days is not None else 'unknown'} days\n"
        f"Diagnosis: {probable_fault}\n"
        f"Early warning: {early_warning or 'none'}\n"
        f"Root causes:\n{lines}\n"
        f"Sensor readings:\n{_sensor_lines(sensors)}\n"
        "Explain the root-cause chain and the first verification steps for the operator."
    )
    template = _template_rca_insight(
        asset_name=asset_name,
        probable_fault=probable_fault,
        root_causes=root_causes,
        sensors=sensors,
        early_warning=early_warning,
    )
    return _generate_insight(
        user_blob,
        template,
        system=_RCA_INSIGHT_SYSTEM,
        insight_angle="Root-cause insight",
    )


def generate_defect_correlation_insight(
    *,
    asset_name: str,
    factory: str,
    stage: str,
    probable_fault: str,
    process_defects: list[dict],
    sensors: list[dict] | None = None,
    cascade_risk: str | None = None,
) -> dict:
    if not process_defects:
        raise ValueError("no process defects to analyse")

    sensors = sensors or []
    lines = "\n".join(
        f"- {d.get('stage')}: {d.get('defect')} | {d.get('link', '')}"
        for d in process_defects[:4]
    )
    from apps.agents.plant_module_context import insight_task_context

    context = insight_task_context(
        "Defect correlation insight",
        asset_code=stage,
        asset_name=asset_name,
    )
    user_blob = (
        f"{context}\n\n"
        f"Asset: {asset_name} ({factory}, {stage})\n"
        f"Diagnosis: {probable_fault}\n"
        f"Cascade risk: {cascade_risk or 'unknown'}\n"
        f"Process defect links:\n{lines}\n"
        f"Sensor readings:\n{_sensor_lines(sensors)}\n"
        "Explain how upstream process parameters relate to this asset's condition."
    )
    template = _template_defect_insight(
        asset_name=asset_name,
        stage=stage,
        probable_fault=probable_fault,
        process_defects=process_defects,
    )
    return _generate_insight(
        user_blob,
        template,
        system=_DEFECT_INSIGHT_SYSTEM,
        insight_angle="Defect correlation insight",
    )


def generate_log_insight(
    *,
    module: str,
    text: str,
    time: str,
) -> dict:
    from apps.agents.plant_module_context import module_log_context

    context = module_log_context(module, text)
    user_blob = (
        f"{context}\n\n"
        f"At {time}, {module} reported:\n{text}\n\n"
        "Explain what this means for the operator and what to check next."
    )
    template = _template_log_insight(module=module, text=text, time=time)
    return _generate_insight(
        user_blob,
        template,
        system=_LOG_INSIGHT_SYSTEM,
        insight_angle="Log explanation",
        quality_check=lambda insight: _log_insight_anchored_to_source(
            module=module, text=text, insight=insight
        ),
    )
