from apps.assets.models import Factory, Asset, SparesPart
from apps.twins.models import AssetTwinState
from apps.ml.models import MLPrediction
from apps.alerts.models import AlarmEvent
from apps.rag.models import Document
from apps.maintenance.models import MaintenanceEvent


from apps.ml.inference import MAX_SANE_RUL_HOURS


def _sanitize_rul_hours(rul_hours) -> float | None:
    if rul_hours is None:
        return None
    try:
        hours = float(rul_hours)
    except (TypeError, ValueError):
        return None
    if hours < 0:
        return 0.0
    if hours > MAX_SANE_RUL_HOURS:
        return None
    return round(hours, 1)


class AssetHealthService:
    @staticmethod
    def compute(asset: Asset) -> dict:
        twin = AssetTwinState.objects.filter(asset=asset).first()
        health_score = twin.health_score if twin else 100.0
        twin_state = twin.state if twin else {}
        campaign_hours = float(twin_state.get("_campaign_hours", 0.0))

        active_alerts_count = AlarmEvent.objects.filter(
            asset=asset, acknowledged=False
        ).count()

        last_pred = MLPrediction.objects.filter(asset=asset).order_by("-prediction_time").first()
        pred_out = last_pred.prediction_output if last_pred else {}
        rul_hours = _sanitize_rul_hours(pred_out.get("rul_hours"))
        anomaly_score = pred_out.get("anomaly_score")
        fault_classification = pred_out.get("fault_classification")
        ml_source = pred_out.get("source")

        # If consolidated prediction lacks rul_hours, search specifically for rul_predictor output
        if rul_hours is None:
            rul_pred = MLPrediction.objects.filter(
                asset=asset, model__model_type="rul_predictor"
            ).order_by("-prediction_time").first()
            if rul_pred and "rul_hours" in rul_pred.prediction_output:
                rul_hours = _sanitize_rul_hours(rul_pred.prediction_output["rul_hours"])
            elif rul_pred and "rul_days" in rul_pred.prediction_output:
                rul_hours = _sanitize_rul_hours(
                    float(rul_pred.prediction_output["rul_days"]) * 24.0
                )

        # Heuristic fallback: derive RUL from campaign hours + asset-type degradation ceiling
        if rul_hours is None:
            campaign_max_hours = {
                "SRF": 8000, "HHPD": 6000, "FS": 12000, "HAGCC": 5000,
                "APT": 4000, "TCMS": 10000, "CGP": 15000, "HPAK": 3000,
            }
            max_h = campaign_max_hours.get(asset.asset_type, 8000)
            rul_hours = round(max(0.0, max_h - campaign_hours), 1)

        last_event = MaintenanceEvent.objects.filter(asset=asset).order_by("-completed_date").first()
        last_maintenance = None
        if last_event and last_event.completed_date:
            completed = last_event.completed_date
            last_maintenance = {
                "date": completed.isoformat() if hasattr(completed, "isoformat") else str(completed),
                "event_type": last_event.event_type,
                "description": (last_event.description or "")[:120],
                "outcome": last_event.outcome,
            }

        status = "healthy"
        if health_score < 40:
            status = "critical"
        elif health_score < 60:
            status = "warning"
        elif health_score < 80:
            status = "caution"

        return {
            "asset_id": asset.id,
            "name": asset.name,
            "health_score": health_score,
            "rul_hours": rul_hours,
            "status": status,
            "active_alerts_count": active_alerts_count,
            "anomaly_score": anomaly_score,
            "fault_classification": fault_classification,
            "ml_source": ml_source,
            "campaign_hours": campaign_hours,
            "last_maintenance": last_maintenance,
            "twin_state_summary": twin_state,
            "last_prediction_time": last_pred.prediction_time if last_pred else None,
        }


class FactoryHealthService:
    # Criticality weights per asset type for factory aggregation
    WEIGHTS = {
        "SRF": 0.25, "HHPD": 0.10, "FS": 0.35, "HAGCC": 0.10,
        "APT": 0.15, "TCMS": 0.25, "CGP": 0.35, "HPAK": 0.10,
    }

    @staticmethod
    def compute(factory: Factory) -> dict:
        assets = factory.assets.all()
        rankings = []
        total_weight = 0
        weighted_score = 0
        critical_count = 0

        for asset in assets:
            health = AssetHealthService.compute(asset)
            rankings.append(health)
            w = FactoryHealthService.WEIGHTS.get(asset.asset_type, 0.1)
            weighted_score += health["health_score"] * w
            total_weight += w
            if health["status"] == "critical":
                critical_count += 1

        factory_score = (weighted_score / total_weight) if total_weight > 0 else 100.0
        rankings.sort(key=lambda x: x["health_score"])
        bottleneck = rankings[0]["asset_id"] if rankings else None

        return {
            "factory_id": factory.id,
            "name": factory.name,
            "health_score": round(factory_score, 2),
            "asset_rankings": rankings,
            "bottleneck_asset_id": bottleneck,
            "critical_alerts_count": critical_count,
        }


class AssetKnowledgeBaseService:
    @staticmethod
    def get(asset: Asset) -> dict:
        docs = Document.objects.filter(asset_scope__contains=asset.asset_type)
        events = MaintenanceEvent.objects.filter(asset=asset).order_by("-completed_date")[:20]
        spares = SparesPart.objects.filter(asset=asset)
        return {
            "asset_id": str(asset.id),
            "asset_name": asset.name,
            "documents": [
                {"id": str(d.id), "title": d.title, "doc_type": d.doc_type, "source_url": d.source_url}
                for d in docs
            ],
            "error_history": [
                {
                    "date": e.completed_date,
                    "event_type": e.event_type,
                    "description": e.description,
                    "parts_used": e.parts_used,
                    "outcome": e.outcome,
                }
                for e in events
            ],
            "parts_inventory": [
                {
                    "part_name": s.part_name,
                    "quantity_in_stock": s.quantity_in_stock,
                    "lead_time_days": s.lead_time_days,
                }
                for s in spares
            ],
        }


class FactoryOnboardService:
    HORIZON_ASSETS = [
        {"name": "Slab Reheating Furnace", "asset_type": "SRF", "criticality_level": "critical",
         "iso_standards": ["ISO 13849-1", "IEC 61511", "IEC 61508"]},
        {"name": "High-Pressure Descaler", "asset_type": "HHPD", "criticality_level": "high",
         "iso_standards": ["API 610", "ISO 17359"]},
        {"name": "Finishing Stands F1-F7", "asset_type": "FS", "criticality_level": "critical",
         "iso_standards": ["ISO 10816-3", "ISO 13373-3", "ISO 4406"]},
        {"name": "Hydraulic AGC Cylinders", "asset_type": "HAGCC", "criticality_level": "high",
         "iso_standards": ["ISO 4406", "ISO 19973"]},
    ]
    ZEPHYR_ASSETS = [
        {"name": "Acid Pickling Tanks", "asset_type": "APT", "criticality_level": "critical",
         "iso_standards": ["OSHA 1910.119", "OSHA 1910.147", "NACE SP0169", "ISO 12944"]},
        {"name": "Tandem Cold Mill Stands", "asset_type": "TCMS", "criticality_level": "critical",
         "iso_standards": ["ISO 13373-3", "ISO 4406", "ISO 17359"]},
        {"name": "Continuous Galvanizing Pot", "asset_type": "CGP", "criticality_level": "critical",
         "iso_standards": ["ISO 1461", "ISO 14224"]},
        {"name": "High-Pressure Air Knives", "asset_type": "HPAK", "criticality_level": "high",
         "iso_standards": ["ISO 17359", "ISO 1461"]},
    ]

    @classmethod
    def onboard(cls, data: dict) -> dict:
        from apps.assets.fixtures import seed_sensor_definitions, seed_alarm_thresholds
        from apps.users.models import Organization

        org = Organization.objects.get(id=data["org_id"])
        factory_type = data.get("factory_type", "horizon").lower()
        asset_list = cls.HORIZON_ASSETS if factory_type == "horizon" else cls.ZEPHYR_ASSETS

        factory = Factory.objects.create(
            org=org,
            name=data.get("name", factory_type.title()),
            code=data.get("code", "F1"),
            location=data.get("location", ""),
        )
        assets_created = []
        for a in asset_list:
            asset = Asset.objects.create(factory=factory, **a)
            seed_sensor_definitions(asset)
            seed_alarm_thresholds(asset)
            AssetTwinState.objects.create(asset=asset, state={}, health_score=100.0)
            assets_created.append({"id": str(asset.id), "name": asset.name, "type": asset.asset_type})

        return {
            "factory_id": str(factory.id),
            "factory_name": factory.name,
            "assets_created": assets_created,
        }
