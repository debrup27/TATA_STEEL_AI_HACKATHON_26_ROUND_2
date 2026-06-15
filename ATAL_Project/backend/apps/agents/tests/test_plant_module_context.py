"""Tests for plant module context used across Ask MANAS surfaces."""
from __future__ import annotations

from django.test import SimpleTestCase

from apps.agents.plant_module_context import (
    asset_module_context,
    classify_log_event,
    insight_task_context,
    module_log_context,
    normalize_module_code,
    specialized_log_template,
)


class PlantModuleContextTests(SimpleTestCase):
    def test_normalize_hagcc_aliases(self):
        self.assertEqual(normalize_module_code("HAGCC"), "HAGCC")
        self.assertEqual(normalize_module_code("Hydraulic AGC Cylinders"), "HAGCC")

    def test_hagcc_context_mentions_hysteresis_and_thickness(self):
        ctx = module_log_context("HAGCC")
        self.assertIn("Hydraulic Automatic Gauge Control", ctx)
        self.assertIn("hysteresis_deviation_um", ctx)
        self.assertIn("±25 μm", ctx)

    def test_hagcc_hysteresis_template(self):
        text = "[ABNORMALITY] Hysteresis Deviation μm — Abnormality limit exceeded (3629 μm)"
        out = specialized_log_template(module="HAGCC", text=text, time="10:17:14")
        self.assertIsNotNone(out)
        assert out is not None
        self.assertIn("3629", out)
        self.assertIn("Hydraulic Automatic Gauge Control", out)
        self.assertIn("thickness", out.lower())

    def test_classify_abnormality(self):
        evt, _ = classify_log_event("[ABNORMALITY] limit exceeded")
        self.assertEqual(evt, "abnormality")

    def test_classify_maintenance(self):
        evt, _ = classify_log_event("[MAINT] Bearing inspection completed")
        self.assertEqual(evt, "maintenance")

    def test_fs_vibration_template(self):
        text = "Vibration Rms F1 — Warning threshold exceeded (5.2 mm/s)"
        out = specialized_log_template(module="FS", text=text, time="08:00:01")
        self.assertIsNotNone(out)
        assert out is not None
        self.assertIn("Finishing Stand", out)
        self.assertIn("ISO 10816", out)

    def test_insight_task_context_includes_production_line(self):
        ctx = insight_task_context("Root-cause insight", asset_code="HAGCC", asset_name="Hydraulic AGC")
        self.assertIn("Horizon Foundry", ctx)
        self.assertIn("root-cause", ctx.lower())

    def test_risk_insight_context(self):
        ctx = insight_task_context("Risk insight", asset_code="SRF")
        self.assertIn("Slab Reheating Furnace", ctx)
        self.assertIn("bottleneck", ctx.lower())

    def test_asset_module_context_all_codes(self):
        for code in ("SRF", "HHPD", "FS", "HAGCC", "APT", "TCMS", "CGP", "HPAK"):
            ctx = asset_module_context(code)
            self.assertIn(code, ctx)
            self.assertGreater(len(ctx), 40)
