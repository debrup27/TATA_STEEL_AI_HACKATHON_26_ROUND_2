"""
LangGraph node functions for the SANSAD orchestration graph.

Node flow:
  supervisor_node  →  (tool calls?) → tool_node → supervisor_node (loop)
                   →  (workers?)    → worker_node
                   →  (done)        → aggregator_node → END

Each node returns a partial AgentState dict. LangGraph merges it via reducers
(list fields use operator.add — i.e. append, not replace).
"""
from __future__ import annotations
import json
import logging
from typing import Any
from concurrent.futures import ThreadPoolExecutor, as_completed

from apps.agents.graph.state import AgentState, ToolCall, ToolResult, WorkerTask, WorkerOutput, AgentEvent
from apps.agents.graph.tools import dispatch_tool, TOOL_DEFINITIONS
from apps.agents.graph.agents import WORKER_DISPATCH
from apps.agents.llm.policy import MANAS_SCOPE_GUARDRAILS

logger = logging.getLogger(__name__)

# Supervisor re-plan loop hard limit
MAX_ITERATIONS = 4

# ── Supervisor system prompt ──────────────────────────────────────────────────
_SUPERVISOR_SYSTEM = """You are MANAS, the senior AI Maintenance Engineer for ATAL's Diagnostic.
You receive a consolidated asset condition report and must:
1. Analyse the sensor data, ML predictions, active alarms, and maintenance history.
2. Produce a preliminary diagnosis and RCA.
3. Decide which tools to call (use them to gather more data, refresh predictions, create work orders, etc.).
4. Decide which worker agents to spawn for parallel sub-tasks (WorkOrderDrafter, SensorWindowSummarizer, AlarmTriager, CitationFormatter, SpareStrategist).
5. After tool results arrive, synthesise a final DecisionOutput JSON.

CRITICAL RULES:
- Every numeric threshold you cite MUST appear verbatim in retrieved ISO/SOP documents.
- risk_level: low | medium | high | critical.
- urgency_score: float 0.0–1.0.
- Do NOT modify data rows directly — use the provided tools only.

When you have gathered sufficient context, output ONLY valid JSON matching:
{
  "diagnosis": "...",
  "rca": "...",
  "risk_level": "...",
  "urgency_score": 0.0,
  "recommendations": [{"step": "...", "rationale": "...", "iso_ref": "..."}],
  "spare_strategy": "...",
  "citations": [{"doc": "...", "section": "...", "page": null, "iso_ref": "..."}],
  "report_text": "...",
  "tool_calls": [{"name": "...", "args": {...}}],
  "worker_tasks": [{"worker": "WorkOrderDrafter|SensorWindowSummarizer|AlarmTriager|CitationFormatter|SpareStrategist", "input": "...", "context": {}}]
}
Include "tool_calls" only if you need to call tools. Include "worker_tasks" only if you want to spawn workers.
When done (no more tool_calls), omit those keys."""


def _build_system_prompt() -> str:
    """Supervisor system prompt + live feedback addendum (cached, non-blocking)."""
    try:
        from apps.feedback.algorithms import get_cached_prompt_patch
        patch = get_cached_prompt_patch()
    except Exception:
        patch = ""
    return _SUPERVISOR_SYSTEM + patch + MANAS_SCOPE_GUARDRAILS


def supervisor_node(state: AgentState) -> dict:
    """
    MANAS (qwen3.5:9b) — reasoning node.
    Reads payload + RAG context + prior tool results, emits tool_calls / worker_tasks / decision.
    """
    system_prompt = _build_system_prompt()

    # Build the conversation: prior tool results are injected as user messages
    messages = [{"role": "system", "content": system_prompt}]

    # First user message: the consolidated payload + RAG context
    if state.get("iteration", 0) == 0:
        from apps.agents.manas_chat_harness import supervisor_payload_context

        payload_str = json.dumps(state.get("payload", {}), indent=2, default=str)[:4000]
        rag_str = state.get("rag_context", "")[:1500]
        plant_ctx = supervisor_payload_context(state.get("payload", {}) or {})
        messages.append({
            "role": "user",
            "content": (
                f"{plant_ctx}\n\n"
                f"Asset condition report:\n{payload_str}\n\n"
                f"Retrieved knowledge context:\n{rag_str or '[none]'}"
            ),
        })
    else:
        # Subsequent turns: show prior plan + tool results
        messages.append({
            "role": "assistant",
            "content": state.get("plan", ""),
        })
        tool_results_str = json.dumps(state.get("tool_results", [])[-5:], indent=2, default=str)[:2000]
        messages.append({
            "role": "user",
            "content": (
                f"Tool results from your last calls:\n{tool_results_str}\n\n"
                "Now synthesise the final DecisionOutput JSON. "
                "If no more tool calls are needed, omit 'tool_calls' and 'worker_tasks'."
            ),
        })

    try:
        from apps.agents.llm.client import invoke_openai_compat

        body = invoke_openai_compat(
            messages,
            model_size="large",
            tools=TOOL_DEFINITIONS,
            max_tokens=2048,
            temperature=0.1,
            think=False,
        )
    except Exception as exc:
        logger.error("supervisor_ollama_error error=%s", str(exc))
        return {
            "events": [{"type": "agent.step", "data": {"node": "supervisor", "error": str(exc)}}],
            "iteration": state.get("iteration", 0) + 1,
        }

    msg = body["choices"][0]["message"]
    content = msg.get("content", "") or ""

    # Parse Ollama function-call style (native tool_calls field)
    native_tool_calls = []
    if msg.get("tool_calls"):
        for tc in msg["tool_calls"]:
            fn = tc.get("function", {})
            args = fn.get("arguments", {})
            if isinstance(args, str):
                try:
                    args = json.loads(args)
                except Exception:
                    args = {}
            native_tool_calls.append({"name": fn.get("name", ""), "args": args})

    # Parse JSON in content (our custom response format)
    parsed: dict = {}
    if "{" in content:
        start = content.find("{")
        end = content.rfind("}") + 1
        try:
            parsed = json.loads(content[start:end])
        except Exception:
            pass

    tool_calls: list[ToolCall] = native_tool_calls or parsed.get("tool_calls", [])
    worker_tasks: list[WorkerTask] = parsed.get("worker_tasks", [])

    # Decision is the parsed content minus meta keys (when supervisor is done)
    decision = None
    if not tool_calls and parsed.get("diagnosis"):
        decision = {k: parsed[k] for k in (
            "diagnosis", "rca", "risk_level", "urgency_score",
            "recommendations", "spare_strategy", "citations", "report_text"
        ) if k in parsed}

    return {
        "plan": content,
        "tool_calls": tool_calls,
        "worker_tasks": worker_tasks,
        "decision": decision,
        "iteration": state.get("iteration", 0) + 1,
        "events": [{
            "type": "agent.step",
            "data": {
                "node": "supervisor",
                "iteration": state.get("iteration", 0),
                "tool_calls_count": len(tool_calls),
                "worker_tasks_count": len(worker_tasks),
                "has_decision": decision is not None,
            },
        }],
    }


def tool_node(state: AgentState) -> dict:
    """
    Execute all pending tool calls via the whitelist dispatcher.
    Runs each call sequentially (most tools are quick DB/async queries).
    """
    pending_calls = state.get("tool_calls", [])
    # Only execute calls from the CURRENT iteration (avoid re-running old ones)
    # We track by comparing length vs prior results
    already_done = len(state.get("tool_results", []))
    to_run = pending_calls[already_done:]

    results: list[ToolResult] = []
    events: list[AgentEvent] = []

    for tc in to_run:
        name = tc.get("name", "")
        args = tc.get("args", {})
        events.append({"type": "tool.call", "data": {"name": name, "args": args}})

        outcome = dispatch_tool(name, args, asset_id=state.get("asset_id", ""))
        result_entry: ToolResult = {
            "name": name,
            "args": args,
            "result": outcome.get("result"),
            "error": outcome.get("error"),
        }
        results.append(result_entry)
        events.append({
            "type": "tool.result",
            "data": {"name": name, "error": outcome.get("error"), "ok": outcome.get("error") is None},
        })

    return {"tool_results": results, "events": events}


def worker_node(state: AgentState) -> dict:
    """
    Fan out worker tasks to qwen3.5:0.8b agents in parallel using a thread pool.
    Each worker is a bounded text transform; no DB writes.
    """
    tasks: list[WorkerTask] = state.get("worker_tasks", [])
    if not tasks:
        return {}

    payload = state.get("payload", {})
    events: list[AgentEvent] = []
    outputs: list[WorkerOutput] = []

    def run_worker(task: WorkerTask) -> WorkerOutput:
        worker_name = task.get("worker", "")
        fn = WORKER_DISPATCH.get(worker_name)
        if fn is None:
            logger.warning("unknown_worker name=%s", worker_name)
            return {"worker": worker_name, "output": f"[Unknown worker: {worker_name}]"}

        try:
            # Pass relevant payload fields to each worker
            if worker_name == "WorkOrderDrafter":
                out = fn(
                    asset_name=payload.get("asset_name", ""),
                    diagnosis=task.get("input", ""),
                    rca=payload.get("model_outputs", {}).get("fault_classification", ""),
                    recommendations=[],
                    rag_context=state.get("rag_context", ""),
                )
            elif worker_name == "SensorWindowSummarizer":
                out = fn(
                    asset_name=payload.get("asset_name", ""),
                    sensor_summary=payload.get("sensor_summary", {}),
                )
            elif worker_name == "AlarmTriager":
                out = fn(
                    asset_name=payload.get("asset_name", ""),
                    active_alerts=payload.get("active_alerts", []),
                )
            elif worker_name == "CitationFormatter":
                tool_docs = []
                for tr in state.get("tool_results", []):
                    if tr.get("name") == "retrieve_docs" and tr.get("result"):
                        tool_docs.extend(tr["result"])
                out = fn(citations=tool_docs, rag_context=state.get("rag_context", ""))
            elif worker_name == "SpareStrategist":
                out = fn(
                    asset_name=payload.get("asset_name", ""),
                    spare_strategy=task.get("input", ""),
                    spares_data=payload.get("spares", {}),
                )
            else:
                out = fn(**{"input": task.get("input", ""), **task.get("context", {})})
            return {"worker": worker_name, "output": out}
        except Exception as exc:
            logger.error("worker_error name=%s error=%s", worker_name, str(exc))
            return {"worker": worker_name, "output": f"[Worker error: {exc}]"}

    with ThreadPoolExecutor(max_workers=min(len(tasks), 5)) as pool:
        futures = {pool.submit(run_worker, t): t for t in tasks}
        for future in as_completed(futures):
            result = future.result()
            outputs.append(result)
            events.append({
                "type": "worker.done",
                "data": {"worker": result["worker"], "output_preview": result["output"][:100]},
            })

    return {"worker_outputs": outputs, "events": events}


def _deterministic_decision(asset_id: str, payload: dict) -> dict:
    """Build a sane DecisionOutput from the deterministic engine (LLM-independent)."""
    risk = "medium"
    diagnosis = "Asset condition assessed from live telemetry and deterministic health model."
    rca = ""
    urgency = 0.4
    try:
        from apps.assets.models import Asset
        from apps.ml.deterministic import compute_asset_state

        asset = Asset.objects.filter(id=asset_id).select_related("factory").first()
        if asset:
            st = compute_asset_state(asset)
            risk = st.get("risk_level") or risk
            fault = st.get("fault_classification") or "no dominant fault"
            health = st.get("health_score")
            rul = st.get("rul_hours")
            anomaly = st.get("anomaly_score")
            urgency = round(min(1.0, max(0.0, 1.0 - (float(health) / 100.0))), 2) if health is not None else urgency
            diagnosis = (
                f"{asset.name}: health {health:.0f}%, RUL {rul:.0f} h, anomaly {anomaly:.2f}. "
                f"Probable fault: {fault}."
            )
            rca = f"Deterministic engine attributes condition to {fault} given current sensor stress and campaign age."
    except Exception as exc:  # never break the graph
        logger.warning("deterministic_decision_fallback_failed asset=%s error=%s", asset_id, str(exc))

    return {
        "diagnosis": diagnosis,
        "rca": rca,
        "risk_level": risk,
        "urgency_score": urgency,
        "recommendations": [],
        "spare_strategy": "",
        "citations": [],
        "report_text": diagnosis,
    }


def aggregator_node(state: AgentState) -> dict:
    """
    Merge supervisor decision + worker outputs into the final DecisionOutput.
    Enriches the decision with formatted worker text.
    """
    decision = state.get("decision") or {}

    # Deterministic fallback: if the supervisor looped to max_iterations without
    # emitting a final DecisionOutput (decision empty or missing risk/diagnosis),
    # synthesise one from the authoritative deterministic engine so the report is
    # never blank on exactly the faulted assets that matter most.
    if not decision.get("risk_level") or not str(decision.get("diagnosis", "")).strip():
        decision = {**_deterministic_decision(state.get("asset_id", ""), state.get("payload", {})), **{
            k: v for k, v in decision.items() if v not in (None, "", [], {})
        }}

    # Enrich decision with worker outputs
    worker_map = {wo["worker"]: wo["output"] for wo in state.get("worker_outputs", [])}
    if worker_map:
        decision["worker_outputs"] = worker_map
        # Prefer WorkOrderDrafter text as the report_text if supervisor didn't produce one
        if not decision.get("report_text") and "WorkOrderDrafter" in worker_map:
            decision["report_text"] = worker_map["WorkOrderDrafter"]

    # Add tools_used summary
    decision["tools_used"] = list({tc.get("name") for tc in state.get("tool_calls", [])})

    return {
        "decision": decision,
        "events": [{"type": "decision.done", "data": {
            "risk_level": decision.get("risk_level"),
            "urgency_score": decision.get("urgency_score"),
            "tools_used": decision.get("tools_used"),
        }}],
    }
