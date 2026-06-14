"""Tests for threshold-based intelligence report pipeline."""
from django.test import TestCase

from apps.assets.models import Asset
from apps.maintenance.intelligence_report import (
    build_asset_intelligence_plan,
    build_factory_decision_report,
    build_factory_maintenance_report,
)
from apps.maintenance.threshold_scorer import score_asset


class IntelligenceReportTests(TestCase):
    fixtures = None

    def setUp(self):
        from apps.assets.services import FactoryOnboardService
        from apps.assets.spares_catalog import ensure_all_asset_spares
        from apps.users.models import Organization

        org, _ = Organization.objects.get_or_create(
            slug="tata-steel-test",
            defaults={"name": "Tata Steel Test", "timezone": "Asia/Kolkata"},
        )
        from apps.assets.models import Factory

        if not Factory.objects.filter(org=org, code="F1").exists():
            FactoryOnboardService.onboard({
                "org_id": str(org.id), "name": "Horizon", "code": "F1", "factory_type": "horizon",
            })
        if not Factory.objects.filter(org=org, code="F2").exists():
            FactoryOnboardService.onboard({
                "org_id": str(org.id), "name": "Zephyr", "code": "F2", "factory_type": "zephyr",
            })
        ensure_all_asset_spares()

    def test_score_asset_has_nonzero_lead(self):
        asset = Asset.objects.first()
        scored = score_asset(asset)
        self.assertGreater(scored["max_lead_days"], 0)
        self.assertIn(scored["risk_level"], ("low", "medium", "high", "critical"))
        self.assertGreater(scored["urgency_score"], 0)

    def test_asset_plan_always_filled_without_llm(self):
        asset = Asset.objects.first()
        plan = build_asset_intelligence_plan(asset, use_llm=False)
        self.assertTrue(plan["immediate_actions"])
        self.assertTrue(plan["long_term_monitoring"])
        self.assertTrue(plan["spare_strategy"]["parts"])
        self.assertGreater(len(plan["report_text"]), 80)
        self.assertNotIn("thinking", plan["report_text"].lower())

    def test_factory_reports_cover_all_assets(self):
        factory = Asset.objects.first().factory
        assets = list(factory.assets.all())
        maint = build_factory_maintenance_report(factory, use_llm=False)
        decision = build_factory_decision_report(factory, use_llm=False)
        for a in assets:
            self.assertIn(a.name, maint["report_text"])
        self.assertIn(factory.name, maint["report_text"])
        self.assertIn(factory.name, decision["report_text"])
        self.assertTrue(maint["immediate_actions"])
        self.assertTrue(decision["immediate_actions"])
