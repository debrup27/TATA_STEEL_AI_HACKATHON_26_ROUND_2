"""Maintenance plan generation — integrates RUL predictions + maintenance schedules."""
from apps.assets.models import Asset
from apps.ml.models import MLPrediction


# Per-asset standard maintenance intervals (from horizon_zephyr_summary.md §5)
MAINTENANCE_SCHEDULES = {
    "SRF": [
        {"interval": "daily", "task": "Check combustion O₂ and AFR readings against [1.05-1.15] and [1.5-2.5%]"},
        {"interval": "weekly", "task": "Inspect walking beam stroke sensor for drift"},
        {"interval": "per_campaign", "task": "Thermographic IR survey of refractory zones"},
    ],
    "HHPD": [
        {"interval": "daily", "task": "Verify header pressure ≥380 bar"},
        {"interval": "500hr", "task": "Nozzle erosion measurement — replace if d(n) > 1.3×d₀"},
        {"interval": "monthly", "task": "Pump bearing vibration spectral analysis"},
    ],
    "FS": [
        {"interval": "per_roll_change", "task": "Chock bearing vibration check — BPFO amplitude assessment"},
        {"interval": "500hr", "task": "Chock wear clearance measurement"},
        {"interval": "monthly", "task": "ISO 4406 oil cleanliness check"},
    ],
    "HAGCC": [
        {"interval": "weekly", "task": "Hysteresis test — position step-response at ±25 μm"},
        {"interval": "monthly", "task": "ISO 4406 particle count — target 15/13/10"},
        {"interval": "quarterly", "task": "Seal bypass flow measurement"},
    ],
    "APT": [
        {"interval": "daily", "task": "HCl concentration check — maintain [12-18%]"},
        {"interval": "daily", "task": "FeCl₂ concentration check — alarm if >120 g/L"},
        {"interval": "annual", "task": "UT tank wall thickness survey (NACE SP0169)"},
    ],
    "TCMS": [
        {"interval": "daily", "task": "Emulsion iron content check — <200 ppm"},
        {"interval": "weekly", "task": "BPFO amplitude at 142 Hz spectral check"},
        {"interval": "monthly", "task": "Bearing stage assessment from temperature trend"},
    ],
    "CGP": [
        {"interval": "daily", "task": "Pot temperature monitoring — maintain [450-462°C]"},
        {"interval": "weekly", "task": "Fe-in-zinc analysis — alarm >0.03%"},
        {"interval": "quarterly", "task": "Sink roll bushing diameter measurement"},
    ],
    "HPAK": [
        {"interval": "daily", "task": "Air knife pressure drop monitoring — alarm >95 mbar"},
        {"interval": "weekly", "task": "Coating weight uniformity check (±5 g/m²)"},
        {"interval": "monthly", "task": "Nozzle slot visual inspection for zinc crystallization"},
    ],
}


class MaintenancePlanService:
    @staticmethod
    def generate(asset: Asset) -> dict:
        scheduled = MAINTENANCE_SCHEDULES.get(asset.asset_type, [])

        # Integrate RUL-driven urgency
        rul_pred = MLPrediction.objects.filter(
            asset=asset, model__model_type="rul_predictor"
        ).order_by("-prediction_time").first()

        rul_task = None
        if rul_pred:
            rul = rul_pred.prediction_output.get("rul_hours")
            if rul is not None and rul < 168:  # within 1 week
                rul_task = {
                    "interval": "predictive",
                    "task": f"RUL model predicts {round(rul, 1)} hours remaining — schedule maintenance before failure",
                    "urgency": "high" if rul < 24 else "medium",
                    "rul_hours": rul,
                }

        tasks = scheduled.copy()
        if rul_task:
            tasks.insert(0, rul_task)

        return {
            "asset_id": str(asset.id),
            "asset_name": asset.name,
            "asset_type": asset.asset_type,
            "plan": tasks,
            "rul_based_task": rul_task,
            "standard_schedule_count": len(scheduled),
        }


class AutoLogbookService:
    @staticmethod
    def draft_entry(event_id: str) -> str:
        from apps.maintenance.models import MaintenanceEvent
        event = MaintenanceEvent.objects.select_related("asset", "technician").get(id=event_id)
        entry = (
            f"Maintenance Log — {event.asset.name}\n"
            f"Date: {event.completed_date}\n"
            f"Type: {event.event_type}\n"
            f"Technician: {event.technician.username if event.technician else 'Unknown'}\n"
            f"Description: {event.description}\n"
            f"Outcome: {event.outcome}\n"
            f"Downtime: {event.downtime_hours or 0} hours\n"
            f"Parts used: {', '.join(str(p) for p in event.parts_used) or 'None'}\n"
        )
        return entry
