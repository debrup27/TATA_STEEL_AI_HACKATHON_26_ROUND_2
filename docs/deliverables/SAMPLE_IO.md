# Sample Inputs & Outputs

Representative input→output demonstrations across the system. Exact numbers vary with live
telemetry and the abnormality toggle; shapes are stable.

---

## A. Abnormality trip → diagnostic output

**Input:** operator toggles abnormality on HHPD (High-Pressure Descaler), fault
`bearing_wear`.

**Output (Diagnostics page, within ~5 s):**
```
Critical Asset Alert — High-Pressure Descaler (HHPD)
  State:        TRIP / ANOMALY ACTIVE (bearing_wear)
  Risk:         HIGH
  Health:       65% → collapsing
  RUL:          30 hours (model predicts 30 h; trip context indicates imminent)
  Telemetry:    Flow rate alert at 5327 L/min; header pressure low at 379.85 bar
  Action:       Immediate LOTO/isolation; verify live sensor envelopes within 24 h
```

---

## B. Agentic consolidation → DecisionOutput

**Input:** `POST /api/v1/consolidate/<asset_id>/` on a faulted asset.

**Output (abridged JSON):**
```json
{
  "diagnosis": "HHPD header pressure at 380 bar with flow 15 m3/h below minimum. Bearing wear detected...",
  "rca": "Cavitation-driven nozzle erosion with bearing degradation under sustained high-pressure duty...",
  "risk_level": "high",
  "urgency_score": 0.85,
  "recommendations": [
    {"step": "Apply LOTO and verify zero-energy state", "rationale": "...", "iso_ref": "OSHA 1910.147"},
    {"step": "Inspect descaling nozzles for orifice erosion", "rationale": "..."}
  ],
  "spare_strategy": "...",
  "citations": [{"doc": "hhpd-descaler-factsheet", "section": "..."}],
  "tools_used": ["query_twin_state", "run_ml_inference"],
  "report_text": "..."
}
```

---

## C. MANAS chat (RAG-grounded)

**Input:** "What is the ISO 4406 hydraulic oil cleanliness target for the AGC servo system?"

**Output:** a streamed prose answer citing the corpus, e.g.
> The Hydraulic AGC Cylinders target **ISO 4406 15/13/10** cleanliness, with the alarm band
> at 18/16/13 and trip at 19/17/14 [1]. Exceeding this accelerates servo-valve seal drift… [2]
>
> **Sources:** [1] parker-hy08-hagcc, [2] iso-17359-sample

---

## D. Work order generation

**Input:** `POST /api/v1/maintenance/work-orders/<asset_id>/generate/`

**Output:**
```
Maintenance Order — Tandem Cold Mill Stands
  Priority:   4 (low)   ·   Estimated duration: 4 h
  Actions:    1. Apply LOTO and verify zero-energy state
              2. Inspect bearing for L10 stage progression
              3. Sample emulsion for contamination
  Spares:     Mill stand gearbox bearing — req 1, stock 0, reorder 1 → ORDER
  Safety:     Confirm lockout per OSHA 1910.147 before access
```

---

## E. Risk & priority ranking

**Input:** `POST /api/v1/plant/bottleneck-score/`

**Output:** ranked stack, e.g.
```
#1  High-Pressure Descaler (Horizon)   risk HIGH   urgency 78   spares: order   lead 7d
#2  Finishing Stands (Horizon)         risk MED    urgency 52   spares: in-stock
...
```

---

## F. Predictive cost analysis

**Input:** `GET /api/v1/plant/cost-analysis/`

**Output:**
```
Horizon Foundry:  predicted loss ₹12.4 L   ·   PdM savings ₹9.1 L
Zephyr Sinter:    predicted loss ₹8.7 L    ·   PdM savings ₹6.5 L
(hover any number → MANAS insight shows downtime_h × hourly_loss × P(fail) + premiums)
```
