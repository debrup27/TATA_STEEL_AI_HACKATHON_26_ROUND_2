"""Rewrite user drafts into MANAS-scoped maintenance prompts."""
from __future__ import annotations

import logging

import httpx
from django.conf import settings

from apps.agents.ollama_warmup import ollama_keep_alive_value

logger = logging.getLogger(__name__)

_OPTIMIZER_SYSTEM = """You rewrite user drafts into a single clear prompt for MANAS — a steel-plant \
maintenance diagnostics assistant (Tata Steel ATAL).

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
"""

_MAX_TOKENS = 220


def optimize_maintenance_prompt(
    draft: str,
    *,
    has_rag_context: bool = False,
    user_role: str = "",
) -> str:
    draft = (draft or "").strip()
    if not draft:
        return ""

    context_bits: list[str] = []
    if has_rag_context:
        context_bits.append("User has RAG documents loaded in this chat.")
    if user_role:
        context_bits.append(f"User role: {user_role}.")
    user_blob = draft if not context_bits else f"{draft}\n\n({' '.join(context_bits)})"

    try:
        resp = httpx.post(
            f"{settings.OLLAMA_BASE_URL}/api/chat",
            json={
                "model": settings.OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": _OPTIMIZER_SYSTEM},
                    {"role": "user", "content": user_blob},
                ],
                "stream": False,
                "think": False,
                "keep_alive": ollama_keep_alive_value(),
                "options": {"num_predict": _MAX_TOKENS, "temperature": 0.2},
            },
            timeout=90,
        )
        resp.raise_for_status()
        content = (resp.json().get("message") or {}).get("content") or ""
        optimized = content.strip().strip('"').strip()
        return optimized or draft
    except Exception as exc:
        logger.warning("prompt_optimizer failed: %s", exc)
        raise
