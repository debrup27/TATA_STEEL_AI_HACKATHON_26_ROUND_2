"""
ConsolidationLLMBridge — sends ConsolidatedAssetPayload to Ollama (Qwen3.5:9b)
and receives a structured DecisionOutput.

REQ-FUNCTIONAL-040/041, REQ-LLM-006. All inference is self-hosted via Ollama.
No external API calls permitted (REQ-SECURITY-005).
"""
import json
import logging
from typing import Optional
from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert industrial maintenance engineer specializing in steel manufacturing.
You are analyzing a consolidated asset condition report from an ATAL's Diagnostic plant deployment.

CRITICAL RULES:
1. Every numeric threshold you cite MUST appear verbatim in the provided ISO standard references.
   If a threshold is not in the provided data, state: "Threshold not found in available documentation."
2. Recommendations must be step-by-step with specific actions, not generic advice.
3. Citations must reference specific documents, sections, and page numbers where available.
4. risk_level must be one of: low, medium, high, critical.
5. urgency_score must be a float between 0.0 (no urgency) and 1.0 (immediate action required).

Return ONLY valid JSON matching the DecisionOutput schema:
{
  "diagnosis": "string — specific fault or condition identified",
  "rca": "string — root cause analysis with causal chain",
  "risk_level": "low|medium|high|critical",
  "urgency_score": 0.0,
  "recommendations": [{"step": "string", "rationale": "string", "iso_ref": "string|null"}],
  "spare_strategy": "string — specific procurement/stock recommendation",
  "citations": [{"doc": "string", "section": "string", "page": "string|null", "iso_ref": "string|null"}],
  "report_text": "string — full plain-language maintenance report"
}"""


def run_consolidation_llm(payload: dict) -> Optional[dict]:
    """
    Send consolidated payload to Ollama and return DecisionOutput dict.
    Returns None on failure.
    """
    try:
        return _call_ollama(payload)
    except Exception as exc:
        logger.error("llm_bridge_error error=%s", str(exc))
        return None


def _call_ollama(payload: dict) -> Optional[dict]:
    from apps.agents.llm.client import invoke_raw

    user_content = (
        f"Analyze the following consolidated asset condition report and return "
        f"a DecisionOutput JSON:\n\n{json.dumps(payload, indent=2, default=str)}"
    )

    text = invoke_raw(
        model_size="large",
        system=SYSTEM_PROMPT,
        user=user_content,
        max_tokens=4096,
        temperature=0.1,
        skip_input_guard=True,
        source="system",
    )
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        return json.loads(text[start:end])

    logger.warning("llm_bridge_no_json raw=%s", text[:200])
    return None
