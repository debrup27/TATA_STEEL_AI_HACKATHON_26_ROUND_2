"""Spare parts availability helpers."""
from __future__ import annotations

from apps.assets.models import Asset, SparesPart
from apps.assets.spares_catalog import catalog_for_asset, ensure_asset_spares


def spare_parts_for_asset(asset: Asset) -> list[dict]:
    ensure_asset_spares(asset)
    rows = list(SparesPart.objects.filter(asset=asset))
    if rows:
        return [
            {
                "part_name": s.part_name,
                "quantity_in_stock": s.quantity_in_stock,
                "lead_time_days": s.lead_time_days,
                "in_stock": s.quantity_in_stock > 0,
            }
            for s in rows
        ]
    return [
        {
            "part_name": p["part_name"],
            "quantity_in_stock": p.get("quantity_in_stock", 0),
            "lead_time_days": p.get("lead_time_days", 14),
            "in_stock": (p.get("quantity_in_stock") or 0) > 0,
        }
        for p in catalog_for_asset(asset)
    ]


def evaluate_spares(parts: list[dict]) -> dict:
    if not parts:
        return {"spares_available": False, "spares_status": "none", "in_stock_ratio": 0.0}

    in_stock = sum(1 for p in parts if (p.get("quantity_in_stock") or 0) > 0)
    ratio = in_stock / len(parts)

    if ratio >= 1.0:
        status = "full"
        available = True
    elif ratio >= 0.5:
        status = "partial"
        available = True
    elif in_stock > 0:
        status = "partial"
        available = True
    else:
        status = "none"
        available = False

    return {
        "spares_available": available,
        "spares_status": status,
        "in_stock_ratio": round(ratio, 2),
    }
