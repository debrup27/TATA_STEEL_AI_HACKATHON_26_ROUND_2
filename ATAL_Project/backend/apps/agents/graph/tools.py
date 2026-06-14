"""
SANSAD Tool Registry — REQ-SECURITY-003.

The LLM emits tool names + args as JSON. This module is the ONLY execution path.
- @sansad_tool registers a callable + JSON schema into TOOL_REGISTRY.
- dispatch_tool validates name + args against the registry, executes the whitelisted
  wrapper, and writes an AgentAuditLog row. Unknown names are rejected immediately.
- Tools wrap EXISTING backend functions only; no raw SQL / generic ORM writes exposed.
"""
from __future__ import annotations
import json
import logging
from functools import wraps
from typing import Any, Callable
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Global registry: name → {fn, arg_schema, description}
TOOL_REGISTRY: dict[str, dict] = {}

# Schema for the tools array we pass to Ollama in the supervisor request
TOOL_DEFINITIONS: list[dict] = []


def sansad_tool(name: str, description: str, arg_schema: dict):
    """
    Decorator that registers a tool function into the whitelist registry.
    arg_schema is a JSON Schema object describing the `args` dict the LLM should emit.
    """
    def decorator(fn: Callable):
        TOOL_REGISTRY[name] = {
            "fn": fn,
            "description": description,
            "arg_schema": arg_schema,
        }
        # Ollama function-calling format
        TOOL_DEFINITIONS.append({
            "type": "function",
            "function": {
                "name": name,
                "description": description,
                "parameters": arg_schema,
            },
        })

        @wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def dispatch_tool(name: str, args: dict, asset_id: str = "") -> dict:
    """
    Validate and execute a tool call from the supervisor.
    Returns {"result": ..., "error": None} or {"result": None, "error": "..."}.
    Always writes AgentAuditLog (even on rejection).
    """
    _log = {"tool": name, "args": args, "asset_id": asset_id}

    if name not in TOOL_REGISTRY:
        _audit(name, args, asset_id, result_summary="REJECTED: unknown tool", rejected=True)
        logger.warning("tool_dispatch_rejected name=%s", name)
        return {"result": None, "error": f"Unknown tool '{name}'. Allowed: {list(TOOL_REGISTRY)}"}

    entry = TOOL_REGISTRY[name]

    # Validate args against schema (basic required-field check)
    schema = entry["arg_schema"]
    required = schema.get("required", [])
    missing = [r for r in required if r not in args]
    if missing:
        msg = f"Missing required args {missing} for tool '{name}'"
        _audit(name, args, asset_id, result_summary=f"REJECTED: {msg}", rejected=True)
        return {"result": None, "error": msg}

    try:
        result = entry["fn"](**args)
        summary = str(result)[:200] if result is not None else "null"
        _audit(name, args, asset_id, result_summary=summary, rejected=False)
        return {"result": result, "error": None}
    except Exception as exc:
        msg = str(exc)
        _audit(name, args, asset_id, result_summary=f"ERROR: {msg}", rejected=False)
        logger.error("tool_dispatch_error name=%s error=%s", name, msg)
        return {"result": None, "error": msg}


def _audit(name: str, args: dict, asset_id: str, result_summary: str, rejected: bool):
    """Write an AgentAuditLog row. Non-fatal — log and continue if DB unavailable."""
    try:
        import uuid as _uuid
        from apps.agents.models import AgentAuditLog
        # Validate UUID — asset_id may be "" or non-UUID in tests
        try:
            parsed_asset_id = _uuid.UUID(str(asset_id)) if asset_id else None
        except (ValueError, AttributeError):
            parsed_asset_id = None
        AgentAuditLog.objects.create(
            tool_name=name,
            asset_id=parsed_asset_id,
            args=args,
            result_summary=result_summary,
            rejected=rejected,
        )
    except Exception as exc:
        logger.warning("audit_log_write_failed error=%s", str(exc))


# ---------------------------------------------------------------------------
# Whitelisted tool implementations
# ---------------------------------------------------------------------------

@sansad_tool(
    name="run_ml_inference",
    description="Run all ML models (RUL, anomaly, classifier, health) for an asset in parallel. "
                "Returns the latest prediction outputs. Call this to refresh stale predictions "
                "before analysing the consolidated payload.",
    arg_schema={
        "type": "object",
        "properties": {
            "asset_id": {"type": "string", "description": "Asset UUID"}
        },
        "required": ["asset_id"],
    },
)
def run_ml_inference(asset_id: str) -> dict:
    from apps.ml.tasks import run_all_asset_models
    result = run_all_asset_models.apply_async(args=[asset_id])
    return {"task_id": str(result.id), "queued": True}


@sansad_tool(
    name="request_retrain",
    description="Trigger retraining for a specific ML model type on an asset. "
                "Use only when drift is confirmed or prediction accuracy has degraded. "
                "Runs asynchronously via Celery.",
    arg_schema={
        "type": "object",
        "properties": {
            "asset_id": {"type": "string"},
            "model_type": {
                "type": "string",
                "enum": ["rul_predictor", "anomaly_detector", "classifier", "health_score"],
            },
        },
        "required": ["asset_id", "model_type"],
    },
)
def request_retrain(asset_id: str, model_type: str) -> dict:
    from apps.ml.tasks import trigger_retrain
    result = trigger_retrain.apply_async(args=[asset_id, model_type])
    logger.info("retrain_triggered asset_id=%s model_type=%s task=%s", asset_id, model_type, result.id)
    return {"task_id": str(result.id), "model_type": model_type, "queued": True}


@sansad_tool(
    name="check_drift",
    description="Run KS-test drift detection for a model type on an asset. "
                "Returns drift_ratio and whether retraining is recommended.",
    arg_schema={
        "type": "object",
        "properties": {
            "asset_id": {"type": "string"},
            "model_type": {
                "type": "string",
                "enum": ["rul_predictor", "anomaly_detector", "classifier", "health_score"],
            },
        },
        "required": ["asset_id", "model_type"],
    },
)
def check_drift(asset_id: str, model_type: str) -> dict:
    from apps.ml.tasks import check_model_drift
    return check_model_drift(asset_id, model_type)


@sansad_tool(
    name="query_twin_state",
    description="Fetch the current digital twin state for an asset, including "
                "all sensor envelope flags, health score, and last updated timestamp.",
    arg_schema={
        "type": "object",
        "properties": {"asset_id": {"type": "string"}},
        "required": ["asset_id"],
    },
)
def query_twin_state(asset_id: str) -> dict:
    from apps.twins.models import AssetTwinState
    twin = AssetTwinState.objects.filter(asset_id=asset_id).first()
    if not twin:
        return {"error": "No twin state found"}
    return {
        "state": twin.state,
        "health_score": twin.health_score,
        "updated_at": twin.updated_at.isoformat() if twin.updated_at else None,
    }


@sansad_tool(
    name="retrieve_docs",
    description="Search the RAG knowledge base for relevant SOPs, ISO standards, "
                "equipment manuals, or safety codes. Returns up to 5 reranked chunks "
                "with source citations.",
    arg_schema={
        "type": "object",
        "properties": {
            "query": {"type": "string"},
            "kind": {
                "type": "string",
                "enum": ["sop", "iso", "safety", "asset_intelligence"],
                "description": "Which collection to search",
            },
            "asset_id": {"type": "string", "description": "Optional asset filter"},
        },
        "required": ["query", "kind"],
    },
)
def retrieve_docs(query: str, kind: str, asset_id: str = "") -> list:
    from apps.rag.retrieval import (
        retrieve_sop,
        retrieve_asset_intelligence,
        retrieve_safety_codes,
    )
    try:
        from apps.rag.retrieval import retrieve_iso_compliance
        has_iso = True
    except ImportError:
        has_iso = False

    if kind == "sop":
        docs = retrieve_sop(asset_id or "", query)
    elif kind == "iso" and has_iso:
        docs = retrieve_iso_compliance(query=query)
    elif kind == "safety":
        docs = retrieve_safety_codes(query=query)
    else:
        docs = retrieve_asset_intelligence(asset_id or "", query)

    return [
        {
            "content": d.get("properties", {}).get("content", "")[:500],
            "title": d.get("properties", {}).get("title", ""),
            "section": d.get("properties", {}).get("section", ""),
            "score": d.get("reranker_score"),
        }
        for d in docs[:5]
    ]


@sansad_tool(
    name="create_work_order",
    description="Create a maintenance work order for an asset. Use this when the "
                "analysis confirms a high or critical risk requiring planned intervention. "
                "Requires diagnosis and specific recommended actions.",
    arg_schema={
        "type": "object",
        "properties": {
            "asset_id": {"type": "string"},
            "title": {"type": "string", "maxLength": 255},
            "summary": {"type": "string"},
            "priority": {
                "type": "string",
                "enum": ["1-critical", "2-high", "3-medium", "4-low"],
            },
            "actions": {
                "type": "array",
                "items": {"type": "object"},
            },
        },
        "required": ["asset_id", "title", "summary", "priority"],
    },
)
def create_work_order(asset_id: str, title: str, summary: str, priority: str, actions: list = None) -> dict:
    from apps.maintenance.models import WorkOrder
    from apps.assets.models import Asset
    asset = Asset.objects.get(id=asset_id)
    wo = WorkOrder.objects.create(
        asset=asset,
        title=title[:255],
        description=summary,
        priority=priority,
        recommended_actions=actions or [],
        source=WorkOrder.Source.AI_GENERATED,
    )
    logger.info("work_order_created wo_id=%s asset=%s priority=%s", wo.id, asset_id, priority)
    return {"work_order_id": str(wo.id), "title": wo.title, "priority": wo.priority}


@sansad_tool(
    name="escalate",
    description="Send an escalation notification to the operations supervisor. "
                "Use when risk is critical and immediate human intervention is needed.",
    arg_schema={
        "type": "object",
        "properties": {
            "asset_id": {"type": "string"},
            "reason": {"type": "string"},
        },
        "required": ["asset_id", "reason"],
    },
)
def escalate(asset_id: str, reason: str) -> dict:
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "admin_notifications",
        {
            "type": "escalation.alert",
            "asset_id": asset_id,
            "reason": reason,
        },
    )
    logger.warning("escalation_triggered asset_id=%s reason=%s", asset_id, reason[:100])
    return {"escalated": True, "asset_id": asset_id}
