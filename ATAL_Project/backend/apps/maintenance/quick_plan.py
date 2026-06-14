"""Short maintenance action plans — delegates to threshold intelligence pipeline."""
from __future__ import annotations

from apps.assets.models import Asset
from apps.maintenance.intelligence_report import build_asset_intelligence_plan


def generate_quick_maintenance_plan(asset: Asset) -> dict:
    return build_asset_intelligence_plan(asset, use_llm=True)
