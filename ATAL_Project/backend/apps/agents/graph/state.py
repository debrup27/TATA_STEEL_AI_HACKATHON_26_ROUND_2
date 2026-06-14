"""
AgentState — the shared mutable state flowing through the SANSAD LangGraph.
Each node reads from and writes to this TypedDict. LangGraph merges reducer
output per key; list keys use add-reducer (append semantics).
"""
from __future__ import annotations
from typing import Any, Optional
from typing_extensions import TypedDict, Annotated
import operator


class ToolCall(TypedDict):
    name: str
    args: dict


class ToolResult(TypedDict):
    name: str
    args: dict
    result: Any
    error: Optional[str]


class WorkerTask(TypedDict):
    worker: str          # e.g. "WorkOrderDrafter"
    input: str
    context: dict


class WorkerOutput(TypedDict):
    worker: str
    output: str


class AgentEvent(TypedDict):
    type: str            # "agent.step" | "tool.call" | "tool.result" | "worker.done" | "decision.done"
    data: dict


class AgentState(TypedDict):
    # Core identifiers
    asset_id: str
    trigger: str                       # "manual" | "alarm" | "drift" | "scheduled"

    # Assembled payload from orchestrator
    payload: dict

    # RAG context injected by context_injector
    rag_context: str

    # Supervisor plan + tool interactions (append-only)
    plan: str                          # supervisor's reasoning text
    tool_calls: Annotated[list[ToolCall], operator.add]
    tool_results: Annotated[list[ToolResult], operator.add]

    # Worker agent tasks + outputs (append-only)
    worker_tasks: Annotated[list[WorkerTask], operator.add]
    worker_outputs: Annotated[list[WorkerOutput], operator.add]

    # Final decision
    decision: Optional[dict]           # DecisionOutput schema

    # WS streaming events (append-only)
    events: Annotated[list[AgentEvent], operator.add]

    # Loop control
    iteration: int
    max_iterations: int
