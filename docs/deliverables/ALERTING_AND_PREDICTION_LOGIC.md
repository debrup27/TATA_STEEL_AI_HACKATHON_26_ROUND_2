# Alerting & Prediction Logic

## 1. Threshold model

Every sensor has a calibrated three-band envelope: **normal → alert → trip**. On first
boot, `calibrate_sensors` aligns these bands to the p2/p98 of the nominal generator output
so healthy assets read healthy and faults still breach — fixing scale mismatches between
generators and seed thresholds.

A reading is scored by where it sits in its envelope; the aggregate across an asset's
sensors is the **sensor stress factor**, the primary driver of health degradation and the
anomaly score.

## 2. Anomaly detection

Two complementary mechanisms:

- **Deterministic anomaly score** (authoritative): rises with sensor stress and the count
  of active alarms; bounded 0–1. This is what the dashboard, early warning and risk use.
- **IsolationForest** (per asset type): unsupervised outlier detector trained on synthetic
  nominal data; surfaced only through the sanity gate (must agree with the deterministic
  score) as a secondary signal.

## 3. Early warning of catastrophic failure

Triggered when **anomaly is high AND RUL is collapsing AND criticality is high/critical**.
On an abnormality trip:
- an `AlarmEvent` is raised (acknowledgement tracked),
- the deterministic engine clamps health and shortens RUL toward the 30 h floor,
- a high/critical `DecisionOutput` auto-creates a `WorkOrder`,
- intelligence reports regenerate (inline thread) so the abnormal-alert report is current,
- the abnormality persists until the operator clears it (rapid-degrade loop re-asserts it).

## 4. RUL prediction

- **Primary:** physics/age-derived in the deterministic engine, bounded 30–600 h with
  per-criticality ceilings.
- **Refinement:** XGBoost RUL regressor (per asset type), used only when fresh + plausible
  + anomaly-consistent. Labels come from the physics RUL formulas
  (see [EQUIPMENT_PHYSICS.md](./EQUIPMENT_PHYSICS.md)).
- A **RUL-vs-trip discrepancy** is surfaced explicitly when the model predicts long life
  but live alarms indicate imminent failure — the engine wins and flags the conflict.

## 5. Risk & priority

Composite bottleneck score per asset combines:
- **process criticality** (asset criticality weight),
- **delay severity** (health/RUL-derived),
- **spares availability** (in-stock vs order-needed),
- **procurement lead time**.

Risk class ∈ {low, medium, high, critical}; assets are ranked plant-wide into a priority
stack. Criticality is honoured as a floor so a high/critical asset never reads LOW just
because its instantaneous score is low.

## 6. Predictive cost logic

Per factory: `predicted_loss = downtime_h × hourly_loss × P(fail) + emergency_premium +
spares_risk`; `pdm_savings = recovery_fraction × loss`, where recovery rises with health
deficit (70–88%). Reported in ₹ lakhs with a methodology object so every number is
explainable (the "MANAS insight" hover shows the actual calculation).

## 7. Real-time alerting

- Alarm events stream to SANSAD via WebSocket and surface as abnormal-alert reports and
  per-user notifications.
- KPIs (`/plant/kpis/`): proactive-maintenance rate, avg RUL at intervention, false-alarm
  rate (short-lived alarms), MTTR, plant health, min/avg asset RUL.
