"""
SANSAD LangGraph graph builder.

Graph topology:
  context_injector → supervisor → [tool_node / worker_node / aggregator]
                               ↑──────────────────────────────┘ (re-plan loop)

Routing:
  - supervisor emits tool_calls → go to tool_node then back to supervisor
  - supervisor emits worker_tasks → go to worker_node then to aggregator
  - supervisor emits decision (no more calls) → go to aggregator
  - max_iterations guard → force aggregator if loop runs too long
"""
from __future__ import annotations
from langgraph.graph import StateGraph, END
from apps.agents.graph.state import AgentState
from apps.agents.graph.nodes import (
    supervisor_node,
    tool_node,
    worker_node,
    aggregator_node,
    MAX_ITERATIONS,
)
import logging

logger = logging.getLogger(__name__)


def _route_after_supervisor(state: AgentState) -> str:
    """
    Conditional edge: decide where to go after the supervisor node.
    """
    iteration = state.get("iteration", 0)
    tool_calls = state.get("tool_calls", [])
    worker_tasks = state.get("worker_tasks", [])
    has_decision = state.get("decision") is not None

    # Hard-stop guard
    if iteration >= MAX_ITERATIONS:
        logger.warning("sansad_graph_max_iterations reached, forcing aggregator")
        return "aggregator"

    # Pending tool calls that haven't been executed yet
    already_done = len(state.get("tool_results", []))
    pending_tools = tool_calls[already_done:]

    if pending_tools:
        return "tool_node"

    if worker_tasks and not state.get("worker_outputs"):
        return "worker_node"

    if has_decision:
        return "aggregator"

    # No decision yet, no pending work — send back to supervisor for another turn
    return "supervisor"


def _route_after_tool(state: AgentState) -> str:
    """After running tools, always return to supervisor for re-evaluation."""
    return "supervisor"


def _route_after_worker(state: AgentState) -> str:
    """After workers complete, go to aggregator."""
    return "aggregator"


def _context_injector(state: AgentState) -> dict:
    """
    Pre-populate RAG context from the payload before supervisor runs.
    Uses sop + iso retrieval for quick ambient context injection.
    """
    from apps.agents.graph.tools import retrieve_docs

    asset_id = state.get("asset_id", "")
    asset_name = state.get("payload", {}).get("asset_name", "")
    asset_type = state.get("payload", {}).get("asset_type", "")
    query = f"{asset_name} {asset_type} maintenance fault diagnosis"

    context_parts = []
    try:
        iso_docs = retrieve_docs(query=query, kind="iso", asset_id=asset_id)
        for d in iso_docs[:3]:
            if d.get("content"):
                context_parts.append(f"[ISO] {d.get('title','')} §{d.get('section','')}: {d['content'][:300]}")
    except Exception as exc:
        logger.warning("context_injector_iso_error error=%s", str(exc))

    try:
        sop_docs = retrieve_docs(query=query, kind="sop", asset_id=asset_id)
        for d in sop_docs[:2]:
            if d.get("content"):
                context_parts.append(f"[SOP] {d.get('title','')} §{d.get('section','')}: {d['content'][:300]}")
    except Exception as exc:
        logger.warning("context_injector_sop_error error=%s", str(exc))

    return {"rag_context": "\n\n".join(context_parts)}


def build_graph():
    """Compile and return the SANSAD StateGraph."""
    g = StateGraph(AgentState)

    g.add_node("context_injector", _context_injector)
    g.add_node("supervisor", supervisor_node)
    g.add_node("tool_node", tool_node)
    g.add_node("worker_node", worker_node)
    g.add_node("aggregator", aggregator_node)

    g.set_entry_point("context_injector")
    g.add_edge("context_injector", "supervisor")

    g.add_conditional_edges(
        "supervisor",
        _route_after_supervisor,
        {
            "tool_node": "tool_node",
            "worker_node": "worker_node",
            "aggregator": "aggregator",
            "supervisor": "supervisor",
        },
    )

    g.add_conditional_edges(
        "tool_node",
        _route_after_tool,
        {"supervisor": "supervisor"},
    )

    g.add_conditional_edges(
        "worker_node",
        _route_after_worker,
        {"aggregator": "aggregator"},
    )

    g.add_edge("aggregator", END)

    return g.compile()


# Module-level singleton (compiled once per worker process)
_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph
