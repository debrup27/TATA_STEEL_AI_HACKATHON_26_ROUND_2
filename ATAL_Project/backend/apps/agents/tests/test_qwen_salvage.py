"""Tests for qwen3.5 Ollama reasoning salvage."""
from __future__ import annotations

from django.test import TestCase

from apps.agents.llm.client import finalize_manas_output, is_chain_of_thought_leak, salvage_qwen_output


class QwenSalvageTests(TestCase):
    def test_prefers_non_empty_content(self):
        text = salvage_qwen_output(
            "SRF bearing vibration is elevated versus the ISO envelope. "
            "Schedule a walk-down on the next shift.",
            "Thinking Process: ignored",
        )
        self.assertIn("SRF bearing", text)

    def test_salvages_final_answer_marker_from_reasoning(self):
        reasoning = (
            "Thinking Process:\n\n"
            "1. Analyze the request.\n\n"
            "Final answer: SRF health at 45% signals high bearing risk. "
            "Trend vibration RMS and schedule grease sampling before the next coil run."
        )
        text = salvage_qwen_output("", reasoning)
        self.assertIn("SRF health at 45%", text)
        self.assertNotIn("Thinking Process", text)

    def test_salvages_last_prose_paragraph(self):
        reasoning = (
            "Thinking Process:\n\n"
            "1. Analyze the request.\n\n"
            "2. Check constraints.\n\n"
            "Hydraulic AGC hysteresis deviation is outside the envelope. "
            "Verify servo response and oil cleanliness before the next rolling campaign."
        )
        text = salvage_qwen_output("", reasoning)
        self.assertIn("Hydraulic AGC", text)

    def test_chain_of_thought_leak_detected(self):
        junk = (
            "This looks like a directive for how I should format my output when using this "
            "specific context block. Wait, if I ignore the table request, is it helpful? "
            "Let's try to find a way that satisfies both:"
        )
        self.assertTrue(is_chain_of_thought_leak(junk))

    def test_finalize_manas_output_rejects_leak(self):
        junk = (
            "This looks like a directive for how I should format my output. "
            "Wait, if I ignore the table request, is it helpful?"
        )
        self.assertEqual(finalize_manas_output(junk, ""), "")

    def test_finalize_manas_output_keeps_real_answer(self):
        answer = (
            "Zephyr (Factory 2) plant health is 82% with two assets needing attention. "
            "FS-02 shows 48h RUL at high risk; verify sinter feed and HAGCC trip clearance."
        )
        self.assertEqual(finalize_manas_output(answer, ""), answer)
