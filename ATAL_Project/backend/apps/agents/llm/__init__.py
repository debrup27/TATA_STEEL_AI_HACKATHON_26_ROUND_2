"""Centralized LangChain Ollama client and input/output guardrails for MANAS."""

from apps.agents.llm.client import (
    get_chat_model,
    invoke_guarded,
    stream_guarded,
)
from apps.agents.llm.guardrails import check_input_guard, check_output_guard
from apps.agents.llm.schemas import GuardrailVerdict, GuardrailAction

__all__ = [
    "GuardrailAction",
    "GuardrailVerdict",
    "check_input_guard",
    "check_output_guard",
    "get_chat_model",
    "invoke_guarded",
    "stream_guarded",
]
