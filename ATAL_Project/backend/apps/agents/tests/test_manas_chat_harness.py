"""Tests for MANAS main-chat harness (intent, mode context, tool hints)."""
from __future__ import annotations

from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.agents.manas_chat_harness import (
    build_chat_harness_addendum,
    build_role_advisory_context,
    classify_chat_intent,
    detect_assets_in_text,
    supervisor_payload_context,
    tool_hints_for_intent,
)
from apps.agents.tasks import _build_manas_system_prompt


class ManasChatHarnessTests(SimpleTestCase):
    def test_detect_hagcc_and_fs(self):
        assets = detect_assets_in_text("Why is HAGCC hysteresis high and FS vibration elevated?")
        self.assertIn("HAGCC", assets)
        self.assertIn("FS", assets)

    def test_classify_rul_intent(self):
        self.assertEqual(
            classify_chat_intent("What is the RUL on finishing stand F1?"),
            "rul_prediction",
        )

    def test_classify_document_qa_when_citations(self):
        self.assertEqual(
            classify_chat_intent("explain roll change procedure", has_citations=True),
            "document_qa",
        )

    def test_classify_historical_sansad(self):
        self.assertEqual(
            classify_chat_intent(
                "summarize historical maintenance logs for Horizon",
                sansad_mode=True,
            ),
            "historical_maintenance",
        )

    def test_classify_iso(self):
        self.assertEqual(
            classify_chat_intent("What ISO 4406 class applies to HAGCC oil?"),
            "iso_compliance",
        )

    def test_classify_log_explanation(self):
        self.assertEqual(
            classify_chat_intent("[ABNORMALITY] Hysteresis deviation limit exceeded on HAGCC"),
            "log_explanation",
        )

    def test_harness_includes_asset_context(self):
        block = build_chat_harness_addendum(
            "Explain HAGCC hysteresis at 3629 um",
            sansad_mode=True,
        )
        self.assertIn("[MANAS chat harness]", block)
        self.assertIn("HAGCC", block)
        self.assertIn("Hydraulic Automatic Gauge Control", block)
        self.assertIn("SANSAD mode active", block)

    def test_harness_rag_mode(self):
        block = build_chat_harness_addendum("pot temperature target", has_citations=True)
        self.assertIn("document_qa", block)
        self.assertIn("Documents loaded", block)

    def test_harness_technician_role(self):
        block = build_chat_harness_addendum(
            "How do I inspect the bearing?",
            user_role="technician",
        )
        self.assertIn("Technician lens", block)

    def test_role_advisory_context_has_intent(self):
        ctx = build_role_advisory_context("FS vibration above ISO 10816 limit")
        self.assertIn("FS", ctx)
        self.assertIn("intent", ctx.lower())

    def test_supervisor_payload_context(self):
        ctx = supervisor_payload_context({
            "asset_type": "HAGCC",
            "asset_name": "Hydraulic AGC Cylinders",
            "diagnosis": "hysteresis deviation",
        })
        self.assertIn("HAGCC", ctx)
        self.assertIn("Supervisor rules", ctx)

    def test_tool_hints_for_rul(self):
        hint = tool_hints_for_intent("rul_prediction")
        self.assertIn("refresh_ml_predictions", hint)

    def test_system_prompt_includes_harness(self):
        session = SimpleNamespace(
            user=SimpleNamespace(role="admin"),
            asset_id=None,
            session_metadata={"sansad_mode": True, "sansad_context_summary": "## Plant status\n- FS health 72%"},
        )
        prompt = _build_manas_system_prompt(
            rag_context="[No reference documents]",
            citations=[],
            user_content="Give me a table of Horizon assets with health and RUL",
            session=session,
        )
        self.assertIn("[MANAS chat harness]", prompt)
        self.assertIn("table_request", prompt)


class ManasChatHarnessBuildTests(SimpleTestCase):
    def test_build_prompt_passes_role_and_deep_thinking(self):
        session = SimpleNamespace(
            user=SimpleNamespace(role="tech"),
            asset_id=None,
            session_metadata={},
        )
        prompt = _build_manas_system_prompt(
            rag_context="",
            citations=[{"index": 1}],
            user_content="CGP pot temperature procedure",
            session=session,
            user_role="technician",
            deep_thinking=True,
        )
        self.assertIn("Technician lens", prompt)
        self.assertIn("Deep analysis requested", prompt)
