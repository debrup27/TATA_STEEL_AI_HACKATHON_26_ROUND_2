"""
run_sansad_orchestration — entry point for the SANSAD agentic pipeline.

1. Assemble consolidated payload (with fresh ML inference).
2. Build initial AgentState.
3. Invoke the LangGraph (supervisor → tool/worker → aggregator).
4. Stream events to WS group `orchestration_{asset_id}`.
5. Return the final DecisionOutput dict.

Called from apps/consolidation/tasks.py replacing the single run_consolidation_llm call.
"""
from __future__ import annotations
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def run_sansad_orchestration(asset_id: str, trigger: str = "manual") -> Optional[dict]:
    """
    Run the full two-tier SANSAD agentic pipeline for an asset.
    Returns DecisionOutput dict or None on failure.
    """
    from apps.agents.graph.builder import get_graph
    from apps.consolidation.orchestrator import assemble_consolidated_payload
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    channel_layer = get_channel_layer()
    group_name = f"orchestration_{asset_id}"

    def push_event(event: dict):
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {"type": "orchestration.event", **event},
            )
        except Exception as exc:
            logger.warning("ws_push_failed event_type=%s error=%s", event.get("type"), str(exc))

    try:
        # Step 1: Assemble payload (also triggers fresh ML inference via orchestrator fix)
        push_event({"type": "agent.step", "data": {"node": "payload_assembly", "asset_id": asset_id}})
        payload = assemble_consolidated_payload(asset_id)
        logger.info("sansad_orchestration_started asset_id=%s trigger=%s", asset_id, trigger)

        # Step 2: Build initial state
        initial_state = {
            "asset_id": asset_id,
            "trigger": trigger,
            "payload": payload,
            "rag_context": "",
            "plan": "",
            "tool_calls": [],
            "tool_results": [],
            "worker_tasks": [],
            "worker_outputs": [],
            "decision": None,
            "events": [],
            "iteration": 0,
            "max_iterations": 4,
        }

        # Step 3: Run graph
        graph = get_graph()
        final_state = graph.invoke(initial_state)

        # Step 4: Stream all accumulated events to WS
        for event in final_state.get("events", []):
            push_event(event)

        decision = final_state.get("decision")
        if decision:
            # Surface graph execution detail so consumers/tests can see the two-tier
            # path (which tools ran, which 0.8b workers produced output).
            decision.setdefault("tools_used", [
                r.get("name") for r in final_state.get("tool_results", []) if isinstance(r, dict) and r.get("name")
            ])
            decision.setdefault("worker_outputs", final_state.get("worker_outputs", []))
            push_event({"type": "decision.done", "data": decision})
            logger.info(
                "sansad_orchestration_complete asset_id=%s risk=%s urgency=%.2f tools=%s",
                asset_id,
                decision.get("risk_level"),
                decision.get("urgency_score", 0),
                decision.get("tools_used", []),
            )
        else:
            logger.warning("sansad_orchestration_no_decision asset_id=%s", asset_id)
            push_event({"type": "agent.step", "data": {"node": "runner", "error": "no decision produced"}})

        return decision

    except Exception as exc:
        logger.error("sansad_orchestration_error asset_id=%s error=%s", asset_id, str(exc))
        push_event({"type": "agent.step", "data": {"node": "runner", "error": str(exc)}})
        return None
