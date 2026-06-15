"""Tests for MANAS chat mode combinations (prompt building, deep thinking salvage)."""
from types import SimpleNamespace

import pytest

from apps.agents.chat_role_graph import resolve_manas_roles
from apps.agents.tasks import (
    _build_manas_system_prompt,
    _deep_thinking_system_addendum,
    _extract_answer_from_reasoning,
    _finalize_deep_thinking_response,
)


@pytest.fixture
def session():
    user = SimpleNamespace(role="admin")
    return SimpleNamespace(user=user, asset_id=None, session_metadata={})


class TestManasModeCombos:
    def test_plain_chat_no_role_no_advice(self):
        assert resolve_manas_roles("", advice_mode=False) == []

    def test_role_technician_with_docs(self, session):
        roles = resolve_manas_roles("technician", advice_mode=False)
        assert roles == ["technician"]
        prompt = _build_manas_system_prompt(
            rag_context="User question: temp?\n\n[1] SOP\nCheck pot temp [1]",
            citations=[{"index": 1, "doc": "CGP SOP"}],
            user_content="explain pot temperature",
            role_advisory="**Technician lens**\n- Check thermocouple\n- LOTO before access",
            session=session,
        )
        assert "Role Advisory" in prompt
        assert "Technician lens" in prompt
        assert "phrase procedures" in prompt
        assert "[1] SOP" in prompt

    def test_advice_only_with_docs(self, session):
        roles = resolve_manas_roles("", advice_mode=True)
        assert roles == ["technician", "supervisor"]
        prompt = _build_manas_system_prompt(
            rag_context="[1] Manual excerpt",
            citations=[{"index": 1}],
            user_content="what should we do?",
            role_advisory="**Technician lens**\n- hands-on\n\n**Supervisor lens**\n- escalate",
            session=session,
        )
        assert "Supervisor lens" in prompt

    def test_admin_role_both_lenses(self):
        assert resolve_manas_roles("admin") == ["technician", "supervisor"]

    def test_deep_thinking_addendum(self):
        assert "response body" in _deep_thinking_system_addendum(True).lower()
        assert _deep_thinking_system_addendum(False) == ""

    def test_extract_answer_from_reasoning_summary(self):
        reasoning = (
            "Let me think step by step.\n\n"
            "The pot temperature must stay in band.\n\n"
            "In summary, maintain 455–465 °C and verify thermocouple calibration weekly."
        )
        answer = _extract_answer_from_reasoning(reasoning)
        assert "455" in answer or "thermocouple" in answer

    def test_finalize_deep_thinking_prefers_content(self):
        body, think = _finalize_deep_thinking_response("Final answer here.", "thinking trace")
        assert body == "Final answer here."
        assert think == "thinking trace"

    def test_finalize_deep_thinking_salvages_empty_content(self):
        body, think = _finalize_deep_thinking_response(
            "",
            "Analysis...\n\nIn summary, drain the pot if FeCl2 exceeds 2 g/L.",
        )
        assert body
        assert "FeCl2" in body or "drain" in body.lower()
        assert think
