"""Tests for RCA junk filtering and sensor-derived fallbacks."""
from __future__ import annotations

from django.test import TestCase

from apps.agents.diagnostics_insight import _template_rca_insight
from apps.assets.rca_sanitize import (
    derive_sensor_root_causes,
    is_junk_diagnosis_hint,
    is_junk_rca_factor,
    sanitize_root_causes,
)

_JUNK_RCA = (
    "Unable to perform root cause analysis without specific asset data including: "
    "(1) Asset UUID identification, (2) Current digital twin state with sensor envelope flags, "
    "(3) Latest RUL/anomaly/classifier"
)


class RcaSanitizeTests(TestCase):
    def test_is_junk_rca_factor_detects_refusal(self):
        self.assertTrue(is_junk_rca_factor(_JUNK_RCA))
        self.assertFalse(is_junk_rca_factor("Hysteresis deviation envelope breach"))

    def test_sanitize_root_causes_drops_junk_and_renormalizes(self):
        factors = [
            {"factor": _JUNK_RCA, "weight": 1.0, "evidence": "MaintenanceReport.rca"},
            {"factor": "Oil pressure decline", "weight": 0.2, "evidence": "SHAP"},
        ]
        cleaned = sanitize_root_causes(factors)
        self.assertEqual(len(cleaned), 1)
        self.assertEqual(cleaned[0]["factor"], "Oil pressure decline")
        self.assertEqual(cleaned[0]["weight"], 1.0)

    def test_derive_sensor_root_causes_from_warning_readings(self):
        sensors = [
            {"label": "Hysteresis Deviation Um", "value": "4150.17 μm", "status": "warning"},
            {"label": "Gap Position", "value": "20.02 mm", "status": "nominal"},
        ]
        causes = derive_sensor_root_causes(sensors)
        self.assertEqual(len(causes), 1)
        self.assertIn("Hysteresis Deviation Um", causes[0]["factor"])
        self.assertIn("envelope", causes[0]["factor"].lower())

    def test_is_junk_diagnosis_hint_rejects_normal_op_with_warning_sensors(self):
        self.assertTrue(
            is_junk_diagnosis_hint(
                "Normal operation — no dominant fault class detected",
                has_warning_sensors=True,
            )
        )

    def test_template_rca_insight_uses_sensor_when_root_cause_is_junk(self):
        text = _template_rca_insight(
            asset_name="Hydraulic AGC Cylinders",
            probable_fault="Hydraulic pressure loss with health at 95%",
            root_causes=[{"factor": _JUNK_RCA, "weight": 1.0, "evidence": "bad"}],
            sensors=[
                {"label": "Hysteresis Deviation Um", "value": "4150.17 μm", "status": "warning"},
            ],
        )
        self.assertNotIn("Unable to perform", text)
        self.assertIn("Hysteresis Deviation Um", text)
        self.assertIn("4150.17", text)
