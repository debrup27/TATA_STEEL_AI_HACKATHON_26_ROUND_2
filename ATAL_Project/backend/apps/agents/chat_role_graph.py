"""
MANAS chat role advisory — lightweight LangGraph using qwen 0.8b workers.

Not the full SANSAD consolidation graph. When the user picks a persona (or is
admin), 0.8b workers draft role-specific briefing bullets that are injected into
the 9b supervisor prompt. Direct chat with no role skips this entirely.
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import TypedDict

from langgraph.graph import END, StateGraph

from apps.agents.graph.agents import _call_small_model

logger = logging.getLogger(__name__)

_ROLE_SYSTEMS: dict[str, str] = {
    "technician": (
        "You advise a field maintenance technician at Tata Steel. "
        "Given the user question and optional document excerpt, output 3–5 bullet points "
        "the main assistant should emphasize: hands-on repair steps, LOTO/safety, tooling, "
        "observable symptoms. Under 100 words. Bullets only, no greeting."
    ),
    "supervisor": (
        "You advise a maintenance supervisor at Tata Steel. "
        "Given the user question and optional document excerpt, output 3–5 bullet points "
        "for crew coordination, escalation criteria, downtime impact, and delegation. "
        "Under 100 words. Bullets only, no greeting."
    ),
}

_STATIC_FALLBACK: dict[str, str] = {
    "technician": (
        "Prioritise hands-on repair steps, tooling, LOTO/safety checks, and observable symptoms. "
        "Keep language concise and shop-floor practical."
    ),
    "supervisor": (
        "Balance technical detail with crew coordination, shift planning, escalation criteria, "
        "and downtime impact."
    ),
}


class RoleAdvisoryState(TypedDict, total=False):
    user_question: str
    rag_snippet: str
    roles: list[str]
    advisories: dict[str, str]
    combined: str


def resolve_manas_roles(user_role: str, django_user) -> list[str]:
    """Map UI / auth role to 0.8b worker personas. Admin gets both lenses."""
    key = (user_role or "").strip().lower().replace(" ", "_").replace("-", "_")
    if not key and django_user is not None:
        key = (getattr(django_user, "role", "") or "").strip().lower()
    if key == "admin":
        return ["technician", "supervisor"]
    if key in _ROLE_SYSTEMS:
        return [key]
    return []


def _advise_one_role(role: str, user_question: str, rag_snippet: str) -> tuple[str, str]:
    system = _ROLE_SYSTEMS[role]
    user = f"User question:\n{user_question[:1500]}"
    if rag_snippet.strip():
        user += f"\n\nDocument excerpt (reference only):\n{rag_snippet[:1000]}"
    try:
        text = _call_small_model(system, user)
        if text and len(text.strip()) > 20:
            return role, text.strip()
    except Exception as exc:
        logger.warning("role_advisory_0.8b_failed role=%s err=%s", role, exc)
    return role, _STATIC_FALLBACK.get(role, "")


def _workers_node(state: RoleAdvisoryState) -> dict:
    roles = state.get("roles") or []
    if not roles:
        return {"advisories": {}, "combined": ""}

    advisories: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=min(len(roles), 2)) as pool:
        futures = [
            pool.submit(_advise_one_role, role, state.get("user_question", ""), state.get("rag_snippet", ""))
            for role in roles
        ]
        for fut in futures:
            role, text = fut.result()
            if text:
                advisories[role] = text

    return {"advisories": advisories}


def _merge_node(state: RoleAdvisoryState) -> dict:
    parts: list[str] = []
    for role in state.get("roles") or []:
        text = (state.get("advisories") or {}).get(role, "").strip()
        if text:
            label = "Technician" if role == "technician" else "Supervisor"
            parts.append(f"**{label} lens**\n{text}")
    combined = "\n\n".join(parts)
    return {"combined": combined}


def _build_role_graph():
    g = StateGraph(RoleAdvisoryState)
    g.add_node("workers", _workers_node)
    g.add_node("merge", _merge_node)
    g.set_entry_point("workers")
    g.add_edge("workers", "merge")
    g.add_edge("merge", END)
    return g.compile()


_role_graph = None


def _get_role_graph():
    global _role_graph
    if _role_graph is None:
        _role_graph = _build_role_graph()
    return _role_graph


def run_role_advisory(user_question: str, roles: list[str], rag_snippet: str = "") -> str:
    """Run 0.8b role workers via LangGraph; returns text for 9b system prompt."""
    if not roles:
        return ""
    result = _get_role_graph().invoke({
        "user_question": user_question,
        "rag_snippet": rag_snippet,
        "roles": roles,
    })
    return (result.get("combined") or "").strip()
