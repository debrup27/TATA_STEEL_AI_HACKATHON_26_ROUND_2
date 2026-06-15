"""Tests for universal LLM guardrails."""
from __future__ import annotations

from unittest.mock import patch

from django.test import TestCase, override_settings

from apps.agents.llm.guardrails import (
    check_input_guard,
    check_output_guard,
    heuristic_classify,
    refusal_message,
)
from apps.agents.llm.schemas import GuardrailAction, GuardrailCategory


@override_settings(GUARDRAILS_ENABLED=True, GUARDRAILS_LLM_CLASSIFIER=False)
class HeuristicGuardrailTests(TestCase):
    def test_profanity_blocks(self):
        with patch("apps.agents.llm.guardrails._contains_profanity", return_value=True):
            verdict = heuristic_classify("some bad words here")
        self.assertEqual(verdict.action, GuardrailAction.BLOCK)
        self.assertEqual(verdict.category, GuardrailCategory.PROFANITY)

    def test_help_with_code_blocks(self):
        for msg in (
            "can u help me with code",
            "can u help me with coding problems like python",
            "help me with programming",
            "can you help me with dijkstras algorithm",
            "explain quicksort algorithm",
            "can u help me understand dijkstras algorithm",
        ):
            verdict = heuristic_classify(msg)
            self.assertEqual(verdict.action, GuardrailAction.BLOCK, msg=msg)
            self.assertEqual(verdict.category, GuardrailCategory.CODING, msg=msg)

    def test_coding_request_blocks(self):
        verdict = heuristic_classify("Write me a Python sorting algorithm for a list")
        self.assertEqual(verdict.action, GuardrailAction.BLOCK)
        self.assertEqual(verdict.category, GuardrailCategory.CODING)

    def test_maintenance_query_allows(self):
        verdict = heuristic_classify("FS vibration trending high on finishing stand bearing")
        self.assertEqual(verdict.action, GuardrailAction.ALLOW)

    def test_weather_steers(self):
        verdict = heuristic_classify("What's the weather today in Jamshedpur?")
        self.assertEqual(verdict.action, GuardrailAction.STEER)
        self.assertIn("maintenance", verdict.steered_text.lower())

    def test_capabilities_allows(self):
        verdict = heuristic_classify("What can you do?")
        self.assertEqual(verdict.action, GuardrailAction.ALLOW)

    def test_essay_blocks(self):
        verdict = heuristic_classify("Write an essay about climate change")
        self.assertEqual(verdict.action, GuardrailAction.BLOCK)
        self.assertEqual(verdict.category, GuardrailCategory.ESSAY)


@override_settings(GUARDRAILS_ENABLED=True, GUARDRAILS_LLM_CLASSIFIER=True)
class InputGuardPipelineTests(TestCase):
    def test_borderline_general_returns_verdict(self):
        verdict = check_input_guard("random gibberish xyz123 unrelated topic")
        self.assertIn(verdict.action, (GuardrailAction.ALLOW, GuardrailAction.STEER))

    def test_refusal_message_for_coding(self):
        verdict = heuristic_classify("debug my javascript function")
        msg = refusal_message(verdict)
        self.assertIn("maintenance", msg.lower())


@override_settings(GUARDRAILS_ENABLED=True)
class OutputGuardTests(TestCase):
    def test_output_profanity_blocks(self):
        with patch("apps.agents.llm.guardrails._contains_profanity", return_value=True):
            verdict = check_output_guard("clean looking text")
        self.assertEqual(verdict.action, GuardrailAction.BLOCK)

    def test_maintenance_output_allows(self):
        verdict = check_output_guard(
            "Finishing stand vibration exceeds ISO 10816-3 alert threshold — inspect bearing clearance."
        )
        self.assertEqual(verdict.action, GuardrailAction.ALLOW)

    def test_apt_sop_strip_dwell_not_flagged(self):
        """Steel 'strip dwell' must not trip output profanity guard."""
        apt_sop = (
            "APT Acid Bath Replenishment SOP: Strip dwell time 15–25 seconds. "
            "Free acid 80–120 g/L. Warning thresholds for HCl and inhibitor."
        )
        verdict = check_output_guard(apt_sop)
        self.assertEqual(verdict.action, GuardrailAction.ALLOW)

    def test_strip_dwell_input_not_flagged(self):
        verdict = heuristic_classify("What is strip dwell time on the APT pickling line?")
        self.assertNotEqual(verdict.category, GuardrailCategory.PROFANITY)


@override_settings(GUARDRAILS_ENABLED=True)
class RunChatLogicBlockedTests(TestCase):
    def test_blocked_chat_skips_llm_and_persists_refusal(self):
        from apps.agents.models import ChatMessage, ChatSession
        from apps.agents.tasks import run_chat_logic
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = User.objects.create_user(username="guardtest", password="testpass123")
        session = ChatSession.objects.create(user=user)
        user_msg = ChatMessage.objects.create(
            session=session,
            role="user",
            content="Write me a Python sorting algorithm",
        )

        events: list[dict] = []

        def capture(_session_id, event):
            events.append(event)
            return True

        with patch("apps.agents.stream_registry.send_to_stream", side_effect=capture):
            with patch("apps.agents.stream_registry.arm_stream"):
                with patch("apps.agents.stream_registry.clear_cancel"):
                    with patch("apps.agents.stream_registry.is_cancelled", return_value=False):
                        result = run_chat_logic(
                            str(session.id),
                            str(user_msg.id),
                            [],
                        )

        self.assertEqual(result.get("status"), "blocked")
        types = [e.get("type") for e in events]
        self.assertIn("blocked", types)
        self.assertIn("done", types)
        done_evt = next(e for e in events if e.get("type") == "done")
        self.assertTrue(done_evt.get("blocked"))
        self.assertIn("maintenance", (done_evt.get("blocked_message") or "").lower())
        assistant = ChatMessage.objects.filter(session=session, role="assistant").first()
        self.assertIsNotNone(assistant)
        self.assertIn("maintenance", (assistant.content or "").lower())
