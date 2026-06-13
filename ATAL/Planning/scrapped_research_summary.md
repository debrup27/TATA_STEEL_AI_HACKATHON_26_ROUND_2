# 📋 Complete Technical Summary of Scrapped 6-Factory Research

This document preserves the unique technical specifications, algorithms, scenarios, and database schemas from the initial **6-factory pipeline design** of Project ATAL before its deletion. The project was streamlined to focus on the 2-factory downstream finishing pipeline: **Horizon** (Factory 5: Hot Strip Mill) and **Zephyr** (Factory 6: Cold Rolling & Galvanizing). 

---

## 🏗️ 1. The Scrapped 6-Factory Pipeline Architecture

The initial architecture modeled a full steelmaking sequence from raw coking coal to finished galvanized sheets:

```
RAW COKING COAL ──► [F1: COBPP] ──► Metallurgical Coke ──────────────────────┐
IRON ORE FINES ───► [F2: SP]    ──► Agglomerated Sinter ──────────────────────┤
                                                                                ▼
                                                                     [F3: BF] ──► Hot Metal (Liquid Iron)
                                                                                │
                                                                                ▼
                                                                     [F4: SMS] ──► Steel Slabs
                                                                                │
                                           ┌────────────────────────────────────┘
                                           ▼
                                 [F5: HSM] ──► Hot Rolled Coils (HRC) ──► [Product X: Tata Astrum]
                                           │
                                           ▼
                                 [F6: CRMGL] ──► CRCA Sheets ──► [Product Y: Tata Steelium]
                                             └──► Galvanized Coils ──► [Product Z: Galvano]
```

### Factory Mapping Table
*   **F1: Coke Oven & By-Product Recovery Plant (COBPP):** Carbonizes coking coal at 1000–1100°C to yield coke and raw coke oven gas (COG).
*   **F2: Sinter Plant (SP):** Blends iron ore fines, coke breeze, and flux into agglomerated sinter bed granules (>8mm).
*   **F3: Blast Furnace (BF):** Reductive smelting of iron sinter/ore into liquid pig iron at ~1500°C.
*   **F4: Steel Melting Shop (SMS):** Refines pig iron via oxygen blowing in a Basic Oxygen Furnace (BOF) and casts slabs (200–250mm).
*   **F5: Hot Strip Mill (HSM):** Reheats, descales, roughs, and tandem-rolls slabs into Hot Rolled Coils (2.0–16.0 mm).
*   **F6: Cold Rolling Mill & Galvanizing Line (CRMGL):** Pickles, cold-reduces (50–80%), anneals, and hot-dip galvanizes steel into premium sheets (0.3–2.0 mm).

---

## ⚙️ 2. Scrapped Pipeline Orchestrator Logic (from `orch_iLearn.md`)

The Orchestrator connected the factories, managing buffer stock, scheduling time-lagged cascades, and evaluating systemic risk.

### 2.1 Buffer Zone Backpressure and Starvation Logic
Buffers between factories managed throughput mismatches. If a buffer filled up, it backpressured (throttled) the upstream factory; if it emptied, it starved the downstream factory.

```python
def orchestrator_tick(dt):
    for i in range(len(factories) - 1):
        upstream = factories[i]
        downstream = factories[i+1]
        buffer = buffers[i]
        
        # Update buffer level
        inflow = upstream.output_rate * dt
        outflow = min(downstream.input_demand * dt, buffer.current_level + inflow)
        buffer.current_level += inflow - outflow
        
        # Backpressure: throttle upstream if buffer full (>95%)
        if buffer.current_level > buffer.capacity * 0.95:
            upstream.throttle(0.85)  # Reduce output to 85%
            log_event("BACKPRESSURE", upstream.id, buffer.id)
        
        # Starvation: throttle downstream if buffer empty (<5%)
        if buffer.current_level < buffer.capacity * 0.05:
            downstream.throttle(0.70)  # Reduce consumption to 70%
            log_event("STARVATION", downstream.id, buffer.id)
```

### 2.2 Time-Lagged Cascade Propagation Engine
Upstream process failures propagated downstream with physical transport and diffusion lags:

```python
CASCADE_LAG_TABLE = {
    # (source_factory, target_factory): (lag_hours, propagation_mechanism)
    ("F1", "F3"): (7.0, "coke_quality_degradation"),
    ("F1", "F2"): (0.5, "COG_pressure_change"),
    ("F2", "F3"): (3.0, "sinter_quality_change"),
    ("F3", "F4"): (0.75, "hot_metal_chemistry"),
    ("F3", "F4"): (0.0, "blast_shutdown_emergency"),  # Immediate
    ("F4", "F5"): (2.0, "slab_surface_defect"),
    ("F4", "F5"): (0.0, "caster_breakout_slab_stop"),  # Immediate
    ("F5", "F6"): (3.0, "HRC_thickness_variation"),
    ("F5", "F6"): (4.0, "coiling_temp_microstructure"),
}

def propagate_cascade(event):
    source = event.factory_id
    for (src, tgt), (lag, mechanism) in CASCADE_LAG_TABLE.items():
        if src == source:
            scheduled_time = simulation_clock + lag
            cascade_queue.add(CascadeEvent(
                target=tgt,
                mechanism=mechanism,
                severity=event.severity,
                scheduled_time=scheduled_time
            ))
```

### 2.3 Systemic Downtime Alert Logic
Monitored the health indices of critical-path assets to forecast full line stoppages:

```python
CRITICAL_PATH = {
    "Product_X": ["F1-EQ09", "F2-EQ09", "F3-EQ05", "F4-EQ08", "F5-EQ05"],
    "Product_Y": ["F1-EQ09", "F2-EQ09", "F3-EQ05", "F4-EQ08", "F5-EQ05",
                  "F6-EQ02", "F6-EQ03"],
    "Product_Z": ["F1-EQ09", "F2-EQ09", "F3-EQ05", "F4-EQ08", "F5-EQ05",
                  "F6-EQ02", "F6-EQ03", "F6-EQ05", "F6-EQ06"],
}

def check_systemic_risk(product):
    critical_health = [
        assets[eq_id].health_index
        for eq_id in CRITICAL_PATH[product]
    ]
    min_health = min(critical_health)
    avg_health = sum(critical_health) / len(critical_health)
    
    if min_health < 30:
        trigger_alert("SYSTEMIC_DOWNTIME_IMMINENT", product, min_health)
    elif avg_health < 60:
        trigger_alert("SYSTEMIC_RISK_ELEVATED", product, avg_health)
```

---

## 🔗 3. Scrapped Product Chain & Routing Decision Logic (from `product_chain.md`)

Slabs were routed based on steel chemistry, blast furnace hot metal purity, coiling temperatures, and slab surface metrics:

```python
def route_slab(slab_chemistry, hot_metal_Si, coiling_temp, surface_quality):
    # Check if slab meets ultra-low-impurity requirement for CRCA/GC
    if slab_chemistry['S'] < 0.010 and slab_chemistry['N'] < 50e-6:
        # Eligible for Product Y or Z (Steelium or Galvano)
        if coiling_temp >= 630 and coiling_temp <= 660:
            if surface_quality == 'prime':
                return 'Product_Z'  # Galvanized (Galvano)
            else:
                return 'Product_Y'  # CRCA (Steelium)
        elif coiling_temp >= 660 and coiling_temp <= 700:
            return 'Product_Y'      # CRCA (Steelium)
        else:
            return 'downgrade_to_X' # Coiling temp miss -> structural HR only
    
    elif slab_chemistry['S'] < 0.025:
        # Structural HR grade - Product X (Tata Astrum)
        return 'Product_X'
    
    else:
        # Off-spec
        return 'reject'
```

---

## 🛠️ 4. Scrapped Scenario-Based Troubleshooting Scripts

These 5 detailed training/diagnostic scenarios were designed to evaluate the AI co-pilot's cognitive reasoning:

### Scenario 1: Coke Oven Exhauster Failure (F1 + F2)
*   **Context:** Night shift (02:40). Coke Oven Battery 3 is at 100% capacity; sinter strand running at 3.5 m/min.
*   **Sensor Indicators:** Exhauster F1-EQ09 bearing vibration spikes from 3.2 to 18.5 mm/s RMS at 232 Hz (BPFO peak); fluid coupler oil temp hits 82°C; O₂ in gas main reaches 1.4%; sinter strand FeO rises to 9.8%; windbox 19–21 temperatures drop by 65°C.
*   **Diagnosis:** Tar build-up on the exhauster impeller causes dynamic unbalance, leading to bearing outer race fatigue (232 Hz BPFO) and seal wear. This draws air in, raising O₂ to 1.4%, creating an explosion risk at the Electrostatic Precipitator (ETP). Meanwhile, sinter bed moisture over-spray reduces bed permeability, shifting the Burn-Through Point (BTP) downstream and raising FeO.
*   **SOP Actions:** De-energize ETP immediately (keep O₂ < 1.5%); start standby exhauster (purge with steam until >65°C, check O₂ < 1.0%); reduce nodulizer water spray by 0.5%; reduce coke breeze feed by 0.3%; throttle sinter strand speed to 2.9 m/min.

### Scenario 2: Blast Furnace Tuyere Burnthrough (F3)
*   **Context:** BF No. 2 running at 95% capacity (9,200 t/day hot metal).
*   **Sensor Indicators:** Tuyere 12 return water temp climbs from 42°C to 59°C; cooling inlet water pressure drops to 3.1 bar; bustle pipe pressure falls from 2.2 to 1.7 bar; shaft differential pressure spikes to 1.35 bar; H₂ in top gas hits 3.4%; optical peephole shows a dark steam plume.
*   **Diagnosis:** Zinc Liquid Metal Embrittlement (LME) cracks Tuyere 12. Water leaks into the 2000°C raceway and flashes to steam, raising shaft ΔP and causing burden hanging. High H₂ (3.4%) confirms water dissociation: $H_2O + C \rightarrow CO + H_2$.
*   **SOP Actions:** Reduce bustle pipe blast pressure to <1.5 bar; isolate water supply and return lines to Tuyere 12; purge tuyere jacket with nitrogen; vent steam; command inspection robot to scan staves; isolate tuyere until next scheduled stop.

### Scenario 3: BOF Lance Cooling Failure + Caster Sticking (F4)
*   **Context:** BOF 2 is 12 minutes into a 16-minute blow. Caster Strand 1 is casting at 1.4 m/min.
*   **Sensor Indicators:** Lance cooling water flow drops from 1420 to 1050 gal/min; return water temp rises to 68°C; Ladle 9 skin temp hits 435°C; Caster mould thermocouple Row 4 shows a drop followed by a +42°C spike.
*   **Diagnosis:** Scale build-up restricts lance cooling water, threatening lance tip burnout/explosion. Ladle 9 refractory is worn down to <200mm (slag line hot-spot). Caster mould has a classic sticking thermal signature, risking a shell breakout.
*   **SOP Actions:** Lance hoist crane auto-aborts (retracts lance, stops O₂); ladle 9 tagged out immediately; caster speed automatically reduced to 0.7 m/min to thicken shell and heal stick; adjust mould oscillation frequency.

### Scenario 4: Finishing Mill Backup Roll Bearing Failure (F5)
*   **Context:** Stand F7 is rolling 3.0mm transfer bar to 2.5mm Product X structural grade.
*   **Sensor Indicators:** F7 chock vibration spikes from 4.1 to 34.5 mm/s RMS with a dominant peak at 142 Hz (BPFO); AGC cylinder position drift reaches 0.15 mm/min; exit strip thickness drifts to +14 μm.
*   **Diagnosis:** Roll bearing outer race spalls at 142 Hz (BPFO), causing eccentricity and roll gap oscillations. AGC cylinder cannot compensate due to polyurethane piston seal extrusion and internal bypass leakage.
*   **SOP Actions:** Complete active coil and abort next slab; emergency stop mill train; initiate F7 roll change; replace AGC cylinder seals; inspect removed chock in shop.

### Scenario 5: Cold Finishing Surface Quality Failure (F6)
*   **Context:** Galvanizing line processing Product Z (Galvano). Tandem Cold Mill processing Product Y (Steelium).
*   **Sensor Indicators:** Skin Pass Mill elongation std dev rises by 18%; strip Ra hits 2.45 μm; emulsion iron content reaches 390 ppm; air knife header pressure falls from 850 to 755 mbar (−95 mbar); coating weight deviates by +18 g/m².
*   **Diagnosis:** Emulsion iron particle accumulation (>390 ppm) scratches the work roll, raising strip Ra to 2.45 μm (out of spec for automotive paint adhesion). Concurrently, zinc vapor condenses and crystallizes in the air knife nozzle slot, causing a local pressure drop and a thick zinc coating weight stripe (+18 g/m²).
*   **SOP Actions:** Divert CRCA coil to commercial grade; run air knife nozzle slot-cleaner traverse; switch coolant to auxiliary magnetic separators; add oil concentrate; schedule skin pass roll change.

---

## 🗃️ 5. Scrapped Database Architecture & Error Coding (from `TODO.md`)

*   **Database Topology:** Setup initially used separate PostgreSQL databases for each factory (`atal_factory_1_db` to `atal_factory_6_db`) and individual equipment databases (`atal_equipment_<factory_id>_<equipment_id>_db`) to store high-frequency telemetry.
*   **Table Schemas:**
    *   `schema_asset`: Config, metadata, baseline limits.
    *   `schema_timeseries`: Raw and normalized sensor windows.
    *   `schema_derived`: Calculated parameters (health index, stress levels).
    *   `schema_ml`: RUL models and failure risk outputs.
    *   `schema_recommend`: Work orders and parts SKU listings.
    *   `schema_errors` / `schema_errors_global`: Persisted error logs.
*   **Canonical Error Code Format:**
    $$\text{ERR}-\langle\text{domain}\rangle-\langle\text{factory/system}\rangle-\langle\text{YYYYMMDD}\rangle-\langle\text{seq}\rangle$$
    *   *Evidence Pointers:* Error entries stored arrays of `evidence_ids` mapping directly back to timestamps in `schema_timeseries` and `schema_derived` tables.
