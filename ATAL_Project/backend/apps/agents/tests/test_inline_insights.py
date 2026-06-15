"""Tests for SANSAD inline Ask MANAS insights (0.8b)."""
from __future__ import annotations

from unittest.mock import patch

from django.test import TestCase, override_settings

from apps.agents.diagnostics_insight import (
    _finalize_insight_text,
    _generate_insight,
    _insight_sentence_usable,
    _is_usable_insight,
    _log_insight_anchored_to_source,
    generate_log_insight,
)
from apps.agents.llm.client import _plant_signal_score


@override_settings(OLLAMA_MOCK=1)
class InlineInsightTests(TestCase):
    @patch("apps.agents.diagnostics_insight._invoke_small_insight")
    def test_generate_insight_uses_llm_when_usable(self, mock_invoke):
        mock_invoke.return_value = (
            "SRF bearing vibration is elevated versus the ISO envelope. "
            "This pattern often precedes inner-race wear on the backup roll. "
            "Verify grease sampling and schedule a vibration walk-down on the next shift."
        )
        result = _generate_insight("context blob", "fallback text")
        self.assertNotEqual(result["router"], "deterministic-fallback")
        self.assertIn("SRF bearing", result["insight"])
        mock_invoke.assert_called()

    @patch("apps.agents.diagnostics_insight._invoke_small_insight")
    def test_generate_insight_falls_back_after_retries(self, mock_invoke):
        mock_invoke.return_value = "short"
        result = _generate_insight("context", "Deterministic fallback paragraph for the engineer.")
        self.assertEqual(result["router"], "deterministic-fallback")
        self.assertEqual(result["insight"], "Deterministic fallback paragraph for the engineer.")
        self.assertEqual(mock_invoke.call_count, 3)

    def test_is_usable_insight_rejects_thinking_prefix(self):
        self.assertFalse(_is_usable_insight("Thinking about the problem...\n\nOnly this."))

    def test_is_usable_insight_rejects_prompt_meta_reasoning(self):
        junk = (
            "an anomaly detected in real-time data (FeCl2 GPL). "
            "* Live Sensors: Hcl Free Pct, Tank Temp. Wait, the prompt says "
            "`Hcl Free Pct` is nominal? No, it says `Live sensors`."
        )
        self.assertFalse(_is_usable_insight(junk))

    def test_finalize_insight_text_strips_meta_and_keeps_prose(self):
        content = (
            "Wait, the prompt says Live sensors. "
            "APT GPL shows elevated FeCl2 with tank temperature drifting high. "
            "This pattern indicates pickle-line chemistry imbalance and rising drag-out risk. "
            "Verify HCl free strength, sample FeCl2, and schedule a pot drain if above 140 g/L."
        )
        finalized = _finalize_insight_text(content, "")
        self.assertNotIn("prompt says", finalized.lower())
        self.assertIn("FeCl2", finalized)

    def test_finalize_strips_rca_instruction_echo(self):
        content = (
            "Early warning threshold breached (hysteresis_deviation_um = 3629.2797 µm). "
            "Cite specific sensor names, percentages, stages, fault labels, asset codes? "
            'Need to verify the prompt data against this constraint (e.g., "hysteresis_deviation_um = 3629.2797 µm").'
        )
        self.assertFalse(_is_usable_insight(content))
        finalized = _finalize_insight_text(content, "")
        self.assertNotIn("cite specific", finalized.lower())
        self.assertNotIn("verify the prompt", finalized.lower())

    def test_plant_signal_score_ignores_rul_inside_rules(self):
        self.assertEqual(_plant_signal_score("No instructions, rules, or input field names repeated."), 0)

    def test_compliance_echo_sentence_rejected(self):
        junk = "No instructions, rules, or input field names repeated."
        self.assertFalse(_insight_sentence_usable(junk))

    def test_finalize_strips_log_compliance_opening(self):
        content = (
            "No instructions, rules, or input field names repeated. "
            "HAGCC hysteresis deviation at 3629 μm exceeds the abnormality limit and indicates "
            "a serious thickness-control fault. Dispatch maintenance immediately and hold further coil moves "
            "until the gauge loop is verified."
        )
        finalized = _finalize_insight_text(content, "")
        self.assertNotIn("input field names", finalized.lower())
        self.assertIn("3629", finalized)
        self.assertIn("hagcc", finalized.lower())

    def test_log_insight_anchor_requires_log_context(self):
        self.assertTrue(
            _log_insight_anchored_to_source(
                module="HAGCC",
                text="[ABNORMALITY] Hysteresis Deviation μm — limit exceeded (3629 μm)",
                insight="HAGCC hysteresis at 3629 μm is a critical thickness-control breach.",
            )
        )
        self.assertFalse(
            _log_insight_anchored_to_source(
                module="HAGCC",
                text="[ABNORMALITY] Hysteresis Deviation μm — limit exceeded (3629 μm)",
                insight="Plant equipment can develop faults when sensors drift over time.",
            )
        )

    @patch("apps.agents.diagnostics_insight._invoke_small_insight")
    def test_log_insight_rejects_unanchored_llm_output(self, mock_invoke):
        mock_invoke.return_value = (
            "No instructions, rules, or input field names repeated. "
            "Industrial systems sometimes log events when parameters drift."
        )
        result = generate_log_insight(
            module="HAGCC",
            text="[ABNORMALITY] Hysteresis Deviation μm — limit exceeded (3629 μm)",
            time="10:17:14",
        )
        self.assertEqual(result["router"], "deterministic-fallback")
        self.assertIn("HAGCC", result["insight"])
        self.assertIn("3629", result["insight"])

    @patch("apps.agents.diagnostics_insight._invoke_small_insight")
    def test_log_insight_returns_explanation(self, mock_invoke):
        mock_invoke.return_value = (
            "This maintenance event records a completed bearing inspection on FS. "
            "The crew likely closed a preventive work order after elevated vibration. "
            "Severity is moderate — production can continue with closer trending. "
            "Continue oil analysis weekly and re-check vibration RMS after 48 hours."
        )
        result = generate_log_insight(
            module="FS",
            text="[MAINT] Bearing inspection completed — vibration within limits",
            time="14:32:01",
        )
        self.assertIn("insight", result)
        self.assertTrue(len(result["insight"]) > 40)
