"""RUL calculator — simulation cap, health/criticality correlation."""
from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest

from apps.assets.models import Asset
from apps.assets.rul_calculator import SIM_MAX_RUL_HOURS, _health_rul_cap, compute_rul


def _asset(criticality: str = "medium", asset_type: str = "SRF") -> Asset:
    return Asset(
        id=uuid.uuid4(),
        name="Test Asset",
        asset_type=asset_type,
        criticality_level=criticality,
    )


@pytest.mark.parametrize(
    "health,crit,expect_max",
    [
        (0, "critical", 0.0),
        (0, "low", 0.0),
        (100, "critical", 96.0),
        (100, "low", 300.0),
        (50, "critical", 96.0 * (0.5**1.35)),
    ],
)
def test_health_rul_cap_monotonic(health, crit, expect_max):
    cap = _health_rul_cap(health, crit)
    assert cap <= SIM_MAX_RUL_HOURS
    assert cap == pytest.approx(expect_max, rel=0.01)


@patch("apps.alerts.models.AlarmEvent")
@patch("apps.assets.rul_calculator.AssetTwinState")
@patch("apps.assets.rul_calculator.MLPrediction")
@patch("apps.assets.rul_calculator.SensorDefinition")
def test_zero_health_critical_never_high_rul(mock_sdef, mock_pred, mock_twin, mock_alarm):
    asset = _asset("critical")
    twin = MagicMock()
    twin.health_score = 0.0
    twin.state = {"_campaign_hours": 100.0}
    mock_twin.objects.filter.return_value.first.return_value = twin
    mock_pred.objects.filter.return_value.order_by.return_value.first.return_value = None
    mock_alarm.objects.filter.return_value.count.return_value = 0
    mock_sdef.objects.filter.return_value.__getitem__.return_value = []

    result = compute_rul(asset, health_score=0.0)
    assert result["rul_hours"] <= 6.0
    assert result["rul_hours"] <= SIM_MAX_RUL_HOURS


@patch("apps.alerts.models.AlarmEvent")
@patch("apps.assets.rul_calculator.AssetTwinState")
@patch("apps.assets.rul_calculator.MLPrediction")
@patch("apps.assets.rul_calculator.SensorDefinition")
def test_healthy_low_criticality_can_approach_sim_cap(mock_sdef, mock_pred, mock_twin, mock_alarm):
    asset = _asset("low", "HPAK")
    twin = MagicMock()
    twin.health_score = 100.0
    twin.state = {"_campaign_hours": 0.0}
    mock_twin.objects.filter.return_value.first.return_value = twin
    mock_pred.objects.filter.return_value.order_by.return_value.first.return_value = None
    mock_alarm.objects.filter.return_value.count.return_value = 0
    mock_sdef.objects.filter.return_value.__getitem__.return_value = []

    result = compute_rul(asset, health_score=100.0)
    assert result["rul_hours"] <= SIM_MAX_RUL_HOURS
    assert result["rul_hours"] >= 200.0


@patch("apps.alerts.models.AlarmEvent")
@patch("apps.assets.rul_calculator.AssetTwinState")
@patch("apps.assets.rul_calculator.MLPrediction")
@patch("apps.assets.rul_calculator.SensorDefinition")
def test_critical_healthier_than_unhealthy(mock_sdef, mock_pred, mock_twin, mock_alarm):
    asset = _asset("critical")
    mock_alarm.objects.filter.return_value.count.return_value = 0
    mock_pred.objects.filter.return_value.order_by.return_value.first.return_value = None
    mock_sdef.objects.filter.return_value.__getitem__.return_value = []

    rul_high = []
    rul_low = []
    for hs in (90.0, 85.0):
        twin = MagicMock()
        twin.health_score = hs
        twin.state = {"_campaign_hours": 500.0}
        mock_twin.objects.filter.return_value.first.return_value = twin
        rul_high.append(compute_rul(asset, health_score=hs)["rul_hours"])

    for hs in (10.0, 5.0):
        twin = MagicMock()
        twin.health_score = hs
        twin.state = {"_campaign_hours": 500.0}
        mock_twin.objects.filter.return_value.first.return_value = twin
        rul_low.append(compute_rul(asset, health_score=hs)["rul_hours"])

    assert min(rul_high) > max(rul_low)
