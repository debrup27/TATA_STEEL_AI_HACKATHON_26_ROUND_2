"""Default spare parts catalog per asset type — mixed stock levels per plant equipment."""
from __future__ import annotations

from apps.assets.models import Asset, SparesPart

# Well-stocked types: SRF, FS, CGP, HPAK (bearing)
# Depleted types: HHPD, HAGCC, APT, TCMS
_CATALOG: dict[str, list[dict]] = {
    "SRF": [
        {"part_name": "Furnace roller bearing SKF 22220", "quantity_in_stock": 3, "lead_time_days": 21, "reorder_level": 2},
        {"part_name": "Burner nozzle assembly", "quantity_in_stock": 0, "lead_time_days": 28, "reorder_level": 1},
        {"part_name": "Zone thermocouple Type K", "quantity_in_stock": 5, "lead_time_days": 10, "reorder_level": 3},
    ],
    "HHPD": [
        {"part_name": "Descaler pump mechanical seal", "quantity_in_stock": 0, "lead_time_days": 14, "reorder_level": 2},
        {"part_name": "High-pressure valve kit", "quantity_in_stock": 0, "lead_time_days": 21, "reorder_level": 1},
    ],
    "FS": [
        {"part_name": "Work roll bearing set F1-F7", "quantity_in_stock": 0, "lead_time_days": 35, "reorder_level": 1},
        {"part_name": "Roll chock liner plates", "quantity_in_stock": 6, "lead_time_days": 18, "reorder_level": 2},
        {"part_name": "AGC hydraulic hose kit", "quantity_in_stock": 4, "lead_time_days": 12, "reorder_level": 2},
    ],
    "HAGCC": [
        {"part_name": "AGC cylinder seal kit", "quantity_in_stock": 0, "lead_time_days": 21, "reorder_level": 2},
        {"part_name": "Hydraulic servo valve", "quantity_in_stock": 0, "lead_time_days": 42, "reorder_level": 1},
    ],
    "APT": [
        {"part_name": "Acid circulation pump impeller", "quantity_in_stock": 0, "lead_time_days": 28, "reorder_level": 1},
        {"part_name": "Tank fume exhaust blower bearing", "quantity_in_stock": 0, "lead_time_days": 14, "reorder_level": 2},
    ],
    "TCMS": [
        {"part_name": "Mill stand gearbox bearing", "quantity_in_stock": 0, "lead_time_days": 45, "reorder_level": 1},
        {"part_name": "Roll force transducer", "quantity_in_stock": 0, "lead_time_days": 30, "reorder_level": 1},
    ],
    "CGP": [
        {"part_name": "Zinc pot thermocouple assembly", "quantity_in_stock": 4, "lead_time_days": 10, "reorder_level": 3},
        {"part_name": "Pot roll bearing cartridge", "quantity_in_stock": 2, "lead_time_days": 38, "reorder_level": 1},
    ],
    "HPAK": [
        {"part_name": "Air knife blower motor bearing", "quantity_in_stock": 3, "lead_time_days": 16, "reorder_level": 2},
        {"part_name": "Nozzle wear strip set", "quantity_in_stock": 8, "lead_time_days": 12, "reorder_level": 4},
    ],
}

_DEFAULT_PARTS = [
    {"part_name": "Drive-end bearing kit", "quantity_in_stock": 1, "lead_time_days": 21, "reorder_level": 1},
    {"part_name": "Lubrication filter cartridge", "quantity_in_stock": 0, "lead_time_days": 7, "reorder_level": 2},
]


def catalog_for_asset(asset: Asset) -> list[dict]:
    return list(_CATALOG.get(asset.asset_type, _DEFAULT_PARTS))


def ensure_asset_spares(asset: Asset, *, force: bool = False) -> int:
    """Create catalog spare rows when missing. Returns rows created."""
    if not force and SparesPart.objects.filter(asset=asset).exists():
        return 0
    created = 0
    for row in catalog_for_asset(asset):
        _, was_created = SparesPart.objects.get_or_create(
            asset=asset,
            part_name=row["part_name"],
            defaults={
                "quantity_in_stock": row["quantity_in_stock"],
                "lead_time_days": row["lead_time_days"],
                "reorder_level": row["reorder_level"],
            },
        )
        if was_created:
            created += 1
    return created


def sync_spares_from_catalog(*, force: bool = False) -> int:
    """Refresh quantities from catalog — use after catalog updates."""
    updated = 0
    for asset in Asset.objects.all():
        for row in catalog_for_asset(asset):
            obj, created = SparesPart.objects.update_or_create(
                asset=asset,
                part_name=row["part_name"],
                defaults={
                    "quantity_in_stock": row["quantity_in_stock"],
                    "lead_time_days": row["lead_time_days"],
                    "reorder_level": row["reorder_level"],
                },
            )
            if created or force:
                updated += 1
    return updated


def ensure_all_asset_spares(*, force: bool = False) -> int:
    total = 0
    for asset in Asset.objects.all():
        total += ensure_asset_spares(asset, force=force)
    return total
