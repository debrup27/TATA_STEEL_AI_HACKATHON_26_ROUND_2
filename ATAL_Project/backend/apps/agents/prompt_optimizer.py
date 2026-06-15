"""Rewrite user drafts into MANAS-scoped maintenance prompts."""
from __future__ import annotations

import logging

from django.conf import settings

from apps.agents.llm.client import invoke_guarded
from apps.agents.llm.guardrails import check_input_guard, refusal_message
from apps.agents.llm.schemas import GuardrailAction

logger = logging.getLogger(__name__)

_OPTIMIZER_SYSTEM = """You rewrite user drafts into a single clear prompt for MANAS — the ATAL's Diagnostic for steel-plant maintenance.

MANAS scope ONLY:
- Equipment fault diagnosis, RCA, sensor/telemetry interpretation
- RUL, anomaly detection, risk/urgency triage for plant assets
- Maintenance/repair steps, spares, SOP/manual questions over loaded documents
- Assets: SRF, HHPD, FS, HAGCC, APT, TCMS, CGP, HPAK

Rules:
- Output ONE concise user prompt (1–4 sentences). No preamble, no "Optimized prompt:" label.
- Preserve the user's intent, asset names, symptoms, readings, and document focus.
- If the draft is off-topic (code, essays, general chat), steer it toward a valid MANAS question \
while keeping their underlying goal when possible.
- Do NOT answer the question — only rewrite the prompt.
- Do NOT mention MANAS capabilities or introduce yourself.
- Do NOT rewrite into programming, algorithms, or general CS homework prompts.
"""

from apps.agents.llm.policy import MANAS_SCOPE_GUARDRAILS

_OPTIMIZER_SYSTEM += MANAS_SCOPE_GUARDRAILS

_MAX_TOKENS = 220


def optimize_maintenance_prompt(
    draft: str,
    *,
    has_rag_context: bool = False,
    user_role: str = "",
) -> dict:
    """
    Rewrite draft via guarded 0.8b client.
    Returns dict with action, optimized, draft, message (on block).
    """
    draft = (draft or "").strip()
    if not draft:
        return {"action": "allow", "optimized": "", "draft": "", "message": ""}

    verdict = check_input_guard(draft, source="user")
    if verdict.action == GuardrailAction.BLOCK:
        return {
            "action": "block",
            "optimized": draft,
            "draft": draft,
            "message": refusal_message(verdict),
            "category": verdict.category.value,
        }

    effective_draft = draft
    action = "allow"
    if verdict.action == GuardrailAction.STEER and verdict.steered_text:
        effective_draft = verdict.steered_text
        action = "steer"

    context_bits: list[str] = []
    if has_rag_context:
        context_bits.append("User has RAG documents loaded in this chat.")
    if user_role:
        context_bits.append(f"User role: {user_role}.")
    user_blob = effective_draft if not context_bits else f"{effective_draft}\n\n({' '.join(context_bits)})"

    try:
        optimized, _ = invoke_guarded(
            model_size="small",
            system=_OPTIMIZER_SYSTEM,
            user=user_blob,
            max_tokens=_MAX_TOKENS,
            temperature=0.2,
            skip_input_guard=True,
        )
        optimized = optimized.strip().strip('"').strip()
        return {
            "action": action,
            "optimized": optimized or effective_draft,
            "draft": draft,
            "message": "",
        }
    except Exception as exc:
        logger.warning("prompt_optimizer failed: %s", exc)
        raise
