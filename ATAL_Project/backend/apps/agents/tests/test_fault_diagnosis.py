"""Tests for probable fault diagnosis narrative."""
from __future__ import annotations

from django.test import SimpleTestCase

from apps.agents.fault_diagnosis import (
    _is_usable_diagnosis,
    _strip_markdown_noise,
    _template_narrative,
)


class FaultDiagnosisTests(SimpleTestCase):
    def test_rejects_task_instruction_echo(self):
        junk = "* **Task:** Write a probable fault diagnosis line for SANSAD diagnostics panel (ATAL's Diagnostic)."
        self.assertFalse(_is_usable_diagnosis(junk))

    def test_accepts_plain_narrative(self):
        text = (
            "FS-02 shows hydraulic hysteresis deviation with health at 72%. "
            "Live vibration reads 4.2 mm/s (warning), with bearing wear the strongest contributor (48%)."
        )
        self.assertTrue(_is_usable_diagnosis(text))

    def test_strip_markdown_noise(self):
        raw = "* **Task:** Bearing wear on backup roll with elevated vibration."
        cleaned = _strip_markdown_noise(raw)
        self.assertNotIn("**", cleaned)
        self.assertNotIn("Task:", cleaned)

    def test_template_is_usable(self):
        text = _template_narrative(
            asset_name="FS-02",
            fault_label_hint="Hydraulic hysteresis deviation",
            health=72,
            confidence=0.88,
            sensors=[{"label": "Vibration", "value": "4.2 mm/s", "status": "warning"}],
            root_causes=[{"factor": "Bearing wear", "weight": 0.48}],
            rul_days=19,
            anomaly_score=0.42,
            simulation_fault_type=None,
        )
        self.assertTrue(_is_usable_diagnosis(text))
        self.assertIn("FS-02", text)
