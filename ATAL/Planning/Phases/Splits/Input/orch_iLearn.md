# ⚙️ Pipeline Orchestrator & Scenario-Based iLearning System

---

## Part 1 — The Pipeline Orchestrator

### 1.1 What the Orchestrator Does

The Orchestrator is the top-level runtime controller of the ATAL simulation. It is not a factory — it is the **connective tissue** between all six factories. It:

1. **Instantiates** all six factory objects at simulation startup, each with their 15 equipment assets
2. **Runs the simulation clock** — advancing time in discrete steps (configurable: 1-second real-time steps representing 1–60 minutes of plant time)
3. **Propagates outputs** from one factory as inputs to the next, applying realistic **time-lag models**
4. **Detects cascade conditions** — monitors when a failure at one node is degrading conditions at a downstream node
5. **Triggers the Agentic AI reasoning layer** — when anomaly thresholds are crossed, the agent is invoked to diagnose, recommend action, and generate work orders
6. **Manages the knowledge base** — routes diagnostic queries to the correct RAG index (equipment manuals, SOPs, spare parts)

---

### 1.2 Orchestrator Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ATAL PIPELINE ORCHESTRATOR                         │
│                                                                             │
│  ┌──────────┐  Coke+COG  ┌──────────┐  Sinter  ┌──────────┐               │
│  │ F1:COBPP │──────────► │ F2:SP    │──────────►│ F3:BF    │               │
│  └──────────┘            └──────────┘           └────┬─────┘               │
│       │                       │                      │ Hot Metal           │
│  Buffer: COG                Buffer: Sinter           ▼                     │
│  Pressure Tank              Stockyard          ┌──────────┐                │
│  (capacity: 2hr)            (capacity: 6hr)    │ F4:SMS   │                │
│                                                └────┬─────┘                │
│                                                     │ Slabs                │
│                                               Buffer: Slab Bay             │
│                                               (capacity: 4hr)              │
│                                                     ▼                      │
│                                              ┌──────────┐                  │
│                                              │ F5:HSM   │                  │
│                                              └────┬─────┘                  │
│                                                   │ HRC Coils              │
│                                             Buffer: HRC Bay               │
│                                             (capacity: 8hr)               │
│                                                   ▼                        │
│                                              ┌──────────┐                  │
│                                              │ F6:CRMGL │                  │
│                                              └────┬─────┘                  │
│                                                   │                        │
│                                     ┌─────────────┼──────────────┐        │
│                                     ▼             ▼              ▼        │
│                                 Product X      Product Y     Product Z    │
│                                                                            │
│  ═══════════════════════════════════════════════════════════════════════  │
│                    AGENTIC AI REASONING LAYER                              │
│  [Anomaly Detector] → [RAG Query Engine] → [Work Order Generator]         │
│  [Cascade Risk Monitor] → [Spare Parts Allocator] → [SOP Retriever]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.3 Buffer Zone Dynamics

Between each factory pair, a **buffer zone** stores intermediate product. The buffer has:
- A **capacity** (in hours of downstream factory consumption)
- A **current level** (0–100%)
- A **backpressure logic**: if buffer is full (upstream producing faster than downstream consuming), the upstream factory receives a throttle-back signal
- A **starvation logic**: if buffer is empty (upstream not producing enough), the downstream factory must slow or stop

| Buffer Zone | Location | Storage Medium | Nominal Capacity |
|:---|:---|:---|:---|
| COG Pressure Buffer | Between F1 and F2/plant fuel | Gas holder vessel | ~2 hours |
| Sinter Stockyard | Between F2 and F3 | Open stockyard conveyor | ~6 hours |
| Hot Metal Buffer | Between F3 and F4 | Torpedo ladles | ~2 hours |
| Slab Bay | Between F4 and F5 | Slab storage area | ~4–8 hours |
| HRC Bay | Between F5 and F6 | Coil storage area | ~8–24 hours |

**Backpressure Example:**
```python
def orchestrator_tick(dt):
    for i in range(len(factories) - 1):
        upstream = factories[i]
        downstream = factories[i+1]
        buffer = buffers[i]
        
        # Update buffer level
        inflow = upstream.output_rate × dt
        outflow = min(downstream.input_demand × dt, buffer.current_level + inflow)
        buffer.current_level += inflow - outflow
        
        # Backpressure: throttle upstream if buffer full
        if buffer.current_level > buffer.capacity × 0.95:
            upstream.throttle(0.85)  # Reduce output to 85%
            log_event("BACKPRESSURE", upstream.id, buffer.id)
        
        # Starvation: throttle downstream if buffer empty
        if buffer.current_level < buffer.capacity × 0.05:
            downstream.throttle(0.70)  # Reduce consumption to 70%
            log_event("STARVATION", downstream.id, buffer.id)
```

---

### 1.4 Time-Lagged Cascade Propagation Engine

The Orchestrator models **four types of cascade** with specific time lags:

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

---

### 1.5 Systemic Downtime Alert Logic

The Orchestrator continuously evaluates whether the cumulative health of critical path assets falls below the threshold required to produce each product:

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

### 1.6 Agentic AI Work Order Generation

When the Orchestrator detects a threshold crossing (anomaly alert), it invokes the **Cognitive Agent**:

```
Step 1: Anomaly Detected
  → Orchestrator flags asset ID, sensor reading, threshold exceeded, cascade risk level

Step 2: RAG Context Retrieval
  → Query Weaviate: "failure mode for [asset_type] showing [sensor_pattern]"
  → Retrieve: equipment manual section, relevant SOP, historical breakdown cases
  → Retrieve: spare part SKU, current stock level, procurement lead time

Step 3: Work Order Synthesis (structured output)
  → Diagnosis: root cause statement
  → Recommendation: immediate / short-term / long-term actions
  → Impact: affected products, estimated production delay
  → Parts: SKU codes, quantities, supplier codes, lead times
  → SOP reference: procedure number and critical steps

Step 4: Delivery
  → Formatted work order to maintenance CMMS queue
  → Alert to shift supervisor HMI
  → Cascade risk update to Orchestrator dashboard
```

---

## Part 2 — Scenario-Based iLearning System

### 2.1 What is iLearning?

iLearning (interactive Learning) is the **troubleshooting interface** through which the Agentic AI demonstrates its reasoning capability to human evaluators (hackathon judges, plant engineers, end users). It presents the AI with **realistic industrial emergencies** — multi-sensor alert packages that require the agent to:

1. Identify the **root cause** (not just the symptom)
2. Understand the **cascade risk** to downstream equipment and products
3. Prescribe **SOP-aligned corrective actions**
4. Generate a **complete maintenance work order** including spare parts and lead times
5. Answer **follow-up queries** that progressively probe the depth of understanding

---

### 2.2 Scenario Structure

Each scenario follows a fixed structure:

```
SCENARIO HEADER
  - Factory involved
  - Products at risk
  - Time in shift (to add urgency context)

OPERATIONAL CONTEXT
  - What was happening normally before the event

SENSOR ALERT PACKAGE
  - Multi-sensor readings with timestamps
  - Values shown as: [NORMAL_VALUE → CURRENT_VALUE]
  - Duration of deviation (how long has this been happening?)

PRIMARY DIAGNOSIS QUESTION
  - "What is happening and why?"

SOP-ALIGNED RESPONSE
  - Immediate action (next 10 minutes)
  - Short-term action (next 2–4 hours)
  - Long-term corrective action

PIPELINE IMPACT STATEMENT
  - Which products are affected
  - How long until production impact
  - What can be done to buy time (buffer utilization)

SPARE PARTS AND PROCUREMENT TRIGGER
  - SKU codes, quantities, lead times
  - Urgency classification

FOLLOW-UP QUERY SET (5 escalating questions)
```

---

### 2.3 Scenario 1 — Factory F1 + F2 (Products X, Y, Z at Risk)

**Title:** Upstream Coke Oven Exhauster Failure with Sinter Bed Destabilization

**Operational Context:** It is 02:40 in the night shift. Coke Oven Battery 3 is at 100% capacity, supplying gas to both the sinter ignition furnace and the plant fuel network. The sintering strand is running at 3.5 m/min targeting a BTP position at windbox 18.

**Sensor Alert Package:**
| Sensor ID | Parameter | Normal | Current | Duration |
|:---|:---|:---|:---|:---|
| F1-EQ09-VIB | Exhauster bearing vibration | 3.2 mm/s RMS | 18.5 mm/s RMS | 4 minutes |
| F1-EQ09-FREQ | Dominant frequency peak | No peak | 232 Hz (BPFO) | 4 minutes |
| F1-EQ10-TEMP | Fluid coupler oil temp | 45°C | 82°C | 6 minutes |
| F1-EQ15-O2 | Collecting main O₂ | 0.4% | 1.4% | 2 minutes |
| F2-EQ15-FeO | Sinter strand FeO | 7.9% | 9.8% | 20 minutes |
| F2-EQ08-TEMP | Windbox 19–21 temperatures | baseline | −65°C deviation | 20 minutes |

**Primary Diagnosis:** 
Tar build-up on the F1-EQ09 impeller has caused dynamic unbalance → bearing outer race fatigue failure (232 Hz BPFO = `f = N_balls/2 × (1 - d_ball/d_pitch × cosα) × RPM/60`) → shaft seal degradation → air ingress into collecting main → O₂ rising toward 1.4% (danger threshold: 1.0%) → ETP arc-over risk. Concurrently, F2 moisture over-spray has reduced sinter bed permeability → BTP shifted downstream → FeO rising to 9.8% (target max 8.2%).

**Immediate Actions (0–10 minutes):**
1. **CRITICAL FIRST:** De-energize ETP (F1-EQ11) — set voltage to zero before O₂ reaches 1.5%
2. Initiate standby exhauster startup sequence per SOP-F1-EXH-01
3. Steam-purge standby casing with condensate drains open until body reaches 65–70°C
4. Rotate standby shaft manually; grease labyrinth seals
5. Verify O₂ at sample line is <1.0% before opening standby gas inlet valve

**Short-Term Actions (10 min – 2 hours):**
- Transfer full gas load to standby exhauster; keep collecting main at −100 Pa
- Reduce Nodulizer (F2-EQ03) water spray by 0.5% to restore bed permeability
- Reduce coke breeze feed at Blending Silos (F2-EQ01) by 0.3% to lower FeO
- Reduce Sinter Strand (F2-EQ04) speed from 3.5 m/min to 2.9 m/min to complete BTP before discharge

**Pipeline Impact:**
- Products X, Y, Z: No immediate production impact if exhauster changeover completes within 30 min
- If changeover takes >60 min (O₂ alarm forces full gas circuit shutdown): BF (F3) loses COG fuel → blast temperature drops ~50°C within 2 hours → coke rate rises → F4 BOF blow extended

**Spare Parts Trigger:**
| SKU | Description | Quantity | Lead Time | Action |
|:---|:---|:---|:---|:---|
| BRG-CGE-709 | Dynamically balanced impeller bearing | 1 | 20 weeks | RESERVE IMMEDIATELY |
| SEAL-LAB-CGE | Labyrinth carbon seals | 2 sets | 4 weeks | ORDER |
| IMP-CGE-003 | Replacement balanced impeller | 1 | 20 weeks | RESERVE IMMEDIATELY |

**Follow-Up Query Set:**
1. "Why must the ETP be shut down before starting the standby exhauster?" *(Tests: understanding O₂ + ignition source interaction)*
2. "The standby exhauster body is at 40°C. Is it safe to start it now?" *(Tests: SOP knowledge — must reach 65°C minimum; cold start causes condensation + corrosion)*
3. "If both exhausters fail simultaneously, what happens to the blast furnace?" *(Tests: cascade understanding — F3 loses fuel gas → blast temp falls → production impact)*
4. "The FeO is now 9.8%. If it stays there for the next 3 hours, what happens at F3?" *(Tests: upstream-to-downstream quality propagation knowledge)*
5. "The BRG-CGE-709 has a 20-week lead time. The imbalanced unit is now on standby. What is the risk exposure, and what should the maintenance manager do right now?" *(Tests: risk-based spare parts management reasoning)*

---

### 2.4 Scenario 2 — Factory F3 (Products X, Y, Z at Risk)

**Title:** Blast Furnace Copper Tuyere Burnthrough

**Operational Context:** BF No. 2 is running at 95% capacity, producing 9,200 t/day hot metal. The current tapping interval is 4.5 hours.

**Sensor Alert Package:**
| Sensor ID | Parameter | Normal | Current | Duration |
|:---|:---|:---|:---|:---|
| F3-EQ05-T12-TEMP | Tuyere 12 return water temp | 42°C | 59°C | 8 minutes |
| F3-EQ06-IN-PRESS | Cooling water inlet pressure | 3.8 bar | 3.1 bar | 8 minutes |
| F3-EQ03-PRESS | Bustle pipe hot blast pressure | 2.2 bar | 1.7 bar | 3 minutes |
| F3-EQ01-DP | Shaft pressure differential | 0.8 bar | 1.35 bar | 3 minutes |
| F3-EQ13-H2 | Hydrogen in top gas | 1.1% | 3.4% | 2 minutes |
| Tuyere 12 peephole | Visual | Bright flame | Dark/steam plume | 2 minutes |

**Primary Diagnosis:**
Physical burn-through on Tuyere 12 copper body via zinc LME (liquid metal embrittlement) — zinc from scrap in burden deposited on tuyere copper grain boundaries → intergranular cracking → water ingress into 2000°C raceway → water vaporizes (1L → 1700L steam) → shaft ΔP spike → burden hanging developing. Dark peephole confirms active steam in raceway. Rising H₂ (3.4%) confirms water dissociation: `H₂O + C → CO + H₂`.

**Immediate Actions (0–10 minutes):**
1. Reduce blast pressure at bustle pipe to <1.5 bar to stabilize gas flows
2. Shut off PCI feed to Tuyere 12 circuit immediately
3. **ISOLATE:** Close cooling water feed AND return valves on Tuyere 12 circuit
4. Connect nitrogen purge line to Tuyere 12 water jacket; vent steam safely through dedicated stack
5. Command Quadruped Robot (F3-EQ14) to scan surrounding furnace shell sectors 10–14 for stave anomalies

**Short-Term Actions (10 min – 4 hours):**
- If burden hangs: reduce blast volume further to 70% to clear hang; restore steady burden descent
- Use Hydraulic Taphole Drill (F3-EQ07) and Clay Gun (F3-EQ08) for emergency tapping if hearth level rises
- Keep Tuyere 12 isolated until next planned furnace stop (cannot be replaced at full blast)
- Monitor all adjacent tuyeres (10, 11, 13, 14) for secondary thermal anomalies

**Pipeline Impact:**
- Blast at 70% capacity → hot metal production drops from 9,200 to 6,440 t/day
- F4 SMS: reduced hot metal supply → casting speed reduced → slab output drops
- Products X, Y, Z: ~30% production reduction until tuyere replaced (8-week copper tuyere lead time)
- Buffer management: F4 slab bay can sustain F5 at full rate for ~6 hours; F5 must slow at hour 6

**Spare Parts Trigger:**
| SKU | Description | Quantity | Lead Time | Action |
|:---|:---|:---|:---|:---|
| TYR-CU-OFC-12 | Forged oxygen-free copper tuyere | 2 | 8 weeks | ORDER EMERGENCY |
| CLAY-TAP-ANHY | Anhydrous taphole clay | 500 kg | From local stock | USE NOW |

**Follow-Up Query Set:**
1. "What is zinc LME and why does it specifically affect copper?" *(Tests: metallurgical mechanism understanding)*
2. "Why is connecting a nitrogen purge to the tuyere water jacket so critical after isolating the water?" *(Tests: SOP knowledge — remaining water must be evacuated to prevent flash steam buildup in the jacket)*
3. "The H₂ in top gas is now at 3.4%. Is this an explosion risk at the BF top?" *(Tests: gas safety knowledge — lower explosive limit of H₂ is 4%; at 3.4% approaching LEL but still below; monitoring critical)*
4. "How does a 30% blast reduction at F3 cascade through to the delivery schedule for Product Z galvanized coils?" *(Tests: full chain cascade reasoning)*
5. "The tuyere lead time is 8 weeks. What operational adjustments can the BF make to maintain maximum possible hot metal production during those 8 weeks?" *(Tests: operational optimization reasoning)*

---

### 2.5 Scenario 3 — Factory F4 (Products X, Y, Z at Risk)

**Title:** BOF Oxygen Lance Cooling Failure + Caster Mould Sticking

**Operational Context:** BOF Converter 2 is 12 minutes into a 16-minute blow on Heat 3847. Simultaneously, Caster Strand 1 is running at 1.4 m/min casting slab grade SS400.

**Sensor Alert Package:**
| Sensor ID | Parameter | Normal | Current | Duration |
|:---|:---|:---|:---|:---|
| F4-EQ02-WFLOW | Lance cooling water flow | 1,420 gal/min | 1,050 gal/min | 4 minutes |
| F4-EQ02-RTEMP | Lance cooling water return temp | 35°C | 68°C | 4 minutes |
| F4-EQ14-SKIN-TEMP | Ladle 9 refractory skin temp | <250°C | 435°C | 30 minutes |
| F4-EQ09-TEMP-GRID | Caster mould thermocouple Row 4 | Baseline ±5°C | −18°C then +42°C | 90 seconds |

**Primary Diagnosis:**
*Lance:* Scale buildup in concentric cooling tube annulus → flow restriction below 1100 gal/min safety threshold → return temperature rising toward copper tip thermal limit → risk of tip burnout or lance explosion. *Ladle 9:* Refractory thinning near slag line (~200mm remaining) → local hot-spot at 435°C (normal <250°C) → risk of breakthrough during next heat. *Caster:* Row 4 thermocouple shows classic sticking signature (cold then hot as strand moves) → steel sticking to mould plate → shell tearing → breakout risk if uncorrected.

**Immediate Actions (0–5 minutes):**
1. **LANCE: AUTO ABORT triggered** (flow <1100 gal/min): close main O₂ valve; retract lance from converter at maximum crane speed
2. Tilt converter to charging bay for manual steel sampling (cannot trust sublance after lance abort)
3. **CASTER:** PLC automatic speed reduction to 0.7 m/min (50% of 1.4 m/min) — already triggered
4. Adjust mould oscillation frequency to help heal torn shell
5. **LADLE 9:** Tag out-of-service immediately; route to refractory bay

**Short-Term Actions (5 min – 4 hours):**
- Descale lance cooling circuit during changeover (chemical descaling or high-pressure water flush)
- Use Laser Profilometer (F4-EQ12) to scan Ladle 9 refractory before next use
- Use Gunning Manipulator (F4-EQ13) to repair Ladle 9 slag line zone (apply 100mm gunning mix)
- If caster mould sticking alarm persists after speed reduction → stop casting; allow 15-minute mould stabilization

**Pipeline Impact:**
- Heat 3847 restart: 40-minute delay (lance changeover, steel sampling, re-blow if needed)
- Ladle 9 out of service: reduces ladle fleet — F4 may slow to 1 heat per 55 min vs. 1 per 45 min
- If caster breakout occurs: 4–6 hour caster repair → F5 slab starvation

**Spare Parts Trigger:**
| SKU | Description | Quantity | Lead Time | Action |
|:---|:---|:---|:---|:---|
| LNC-TIP-340T | Machined copper lance tip | 2 | 6 weeks | ORDER |
| REF-GUN-MgC | Magnesia-carbon gunning mix | 2,000 kg | From local stock | USE NOW |

**Follow-Up Query Set:**
1. "Why did flow drop to 1,050 gal/min cause a temperature spike to 68°C? Show the physics." *(Tests: heat balance understanding — less flow → same heat → higher ΔT per unit mass)*
2. "The caster speed was reduced to 50%. Why does reducing speed help prevent a breakout?" *(Tests: solidification physics — lower speed → thicker shell at mould exit → more tensile strength → less tear risk)*
3. "Ladle 9 has a skin temperature of 435°C. Can it be used for one more heat before repair?" *(Tests: risk threshold reasoning — 435°C is already in emergency range at 200mm remaining; NO)*
4. "What would happen if the lance cooling flow had not been monitored and the lance tip had burned through mid-blow?" *(Tests: cascade consequences — O₂ lance structural failure → explosion risk → BOF converter damage → multi-week repair)*
5. "Design a preventive maintenance schedule for the lance cooling circuit that would have prevented this event." *(Tests: proactive maintenance reasoning — regular descaling intervals, flow trend monitoring, pre-emptive tip rotation every 80 heats)*

---

### 2.6 Scenario 4 — Factory F5 (Product X Primarily)

**Title:** Finishing Mill Backup Roll Bearing Failure + AGC Cylinder Drift

**Operational Context:** Stand F7 is the last rolling stand in the finishing mill, currently rolling a 3.0 mm transfer bar into 2.5 mm strip for Product X structural grade.

**Sensor Alert Package:**
| Sensor ID | Parameter | Normal | Current | Duration |
|:---|:---|:---|:---|:---|
| F5-EQ12-FS7-VIB | Stand F7 chock vibration | 4.1 mm/s RMS | 34.5 mm/s RMS | 2 minutes |
| VIB-SPECTRUM | F7 vibration dominant frequency | No peak | 142 Hz (BPFO) | 2 minutes |
| F5-EQ09-LVDT | F7 AGC cylinder position drift | <0.01 mm/min | 0.15 mm/min | 15 minutes |
| F5-EQ13-THICK | Strip exit thickness drift | Target 2.5 mm | +14 μm over spec | 15 minutes |

**Primary Diagnosis:**
F7 backup roll chock bearing has suffered outer race fatigue failure — `BPFO = (Nr/2)×(1-d_r×cosα/d_m)×n_shaft = 142 Hz` matches outer race pass frequency for this bearing geometry → race spalling confirmed. The bearing play has increased roll eccentricity → roll gap fluctuations exceed AGC cylinder correction authority (compounded by AGC cylinder piston seal extrusion wear causing 0.15 mm/min position drift under hold pressure). Combined: strip thickness drifts +14 μm → exceeds ±50 μm prime tolerance → strip cobble risk.

**Immediate Actions:**
1. Complete rolling of current active coil; abort next slab entry
2. Emergency shutdown of finishing mill train; apply all mill brakes
3. Initiate automatic roll change sequence on Stand F7
4. Confirm mill exit guides and roller wipers retracted before roll changer operation
5. Remove worn backup roll chock assembly; send to roll shop for bearing rebuild

**Short-Term Actions:**
- Depressurize F7 hydraulic manifold; lockout system; replace AGC piston seals
- Recheck all adjacent stands (F5, F6) vibration baselines — bearing failure particles may have contaminated F7 area
- Perform MCSA on F7 main drive motor to confirm rotor integrity after high-vibration event

**Pipeline Impact:**
- Product X: 45–90 minute production gap during roll change
- Product Y/Z (via F6): no immediate impact if HRC bay has >4 hours buffer stock

**Spare Parts Trigger:**
| SKU | Description | Quantity | Lead Time | Action |
|:---|:---|:---|:---|:---|
| BRG-BUR-F7 | Backup roll chock bearing | 2 | 16 weeks | RESERVE + ORDER |
| AGC-SEAL-07 | AGC high-pressure seal kit | 1 set | 3 weeks | ORDER |

**Follow-Up Query Set:**
1. "The 142 Hz peak matches BPFO. How do you calculate BPFO and what does it represent physically?" *(Tests: bearing fault frequency understanding)*
2. "Why did the AGC system fail to compensate for the thickness drift if it has sub-millisecond response?" *(Tests: understanding that AGC seal bypass leakage is a steady drift, not a force disturbance — the AGC corrects force disturbances, not its own internal hydraulic leak)*
3. "If the roll change is delayed and rolling continues, what is the most likely failure sequence in the next 30 minutes?" *(Tests: failure cascade projection — bearing seizure → roll stops → strip cobble → mill damage → 8-hour recovery)*
4. "The backup roll bearing lead time is 16 weeks. The mill needs to run. What is the risk mitigation strategy?" *(Tests: operational risk management — run at reduced speed, increase vibration monitoring frequency, identify if a spare bearing exists at a nearby facility)*
5. "A strip cobble occurs at F7. Walk through the emergency response." *(Tests: cobble SOP knowledge — emergency stop, no entry until all rolls stopped, cobble crane, guide inspection, root cause before restart)*

---

### 2.7 Scenario 5 — Factory F6 (Products Y and Z)

**Title:** Cold Finishing Surface Quality Failure — Emulsion Contamination + Air Knife Blockage

**Operational Context:** The Continuous Galvanizing Line (CGL) is processing automotive-grade sheet for Product Z. The Tandem Cold Mill is also running on a separate line for Product Y CRCA.

**Sensor Alert Package:**
| Sensor ID | Parameter | Normal | Current | Duration |
|:---|:---|:---|:---|:---|
| F6-EQ04-ELONG | Skin Pass elongation std dev | <0.1% σ | 0.18% σ (18% rise) | 45 minutes |
| F6-EQ10-Ra | Inline Ra profilometer | 0.9–1.1 μm | 2.45 μm | 45 minutes |
| F6-EQ08-FE | Emulsion iron particle count | <200 ppm | 390 ppm | 3 hours |
| F6-EQ06-PRESS | Air knife header pressure | 850 mbar | 755 mbar (−95 mbar) | 20 minutes |
| F6-EQ12-WT | Coating weight gauge | 140 g/m² target | +18 g/m² deviation | 20 minutes |

**Primary Diagnosis:**
*Product Y line:* Iron particle buildup in rolling emulsion from loaded magnetic separator → Fe >400 ppm → micro-scratching of work roll surface → Ra of 2.45 μm (target 0.9–1.1 μm) — customer automotive panel will show texture lines under paint. *Product Z line:* Zinc dust crystallization in air knife nozzle slot → reduced effective gap → jet pressure drops 95 mbar → coating weight locally +18 g/m² (target 140 g/m²) — heavy coating stripe = non-uniform corrosion protection thickness.

**Immediate Actions (0–15 minutes):**
1. **Product Y:** Divert active CRCA coil from automotive to secondary commercial grade (prevents automotive quality claim on coils already produced)
2. **Product Z:** Run automated mechanical slot-cleaner traverse along air knife nozzle to clear zinc crystallization; monitor pressure recovery
3. Route emulsion coolant through auxiliary magnetic separators; add synthetic oil concentrate to stabilize emulsion while contamination is being cleared

**Short-Term Actions (15 min – 4 hours):**
- Schedule roll change at Skin Pass Mill — replace worn rolls whose Ra has transferred to strip
- Perform emulsion quality check: pH, concentration, iron particle count, bacterial count
- If air knife pressure does not recover after slot cleaning: replace air knife lip assembly (nozzle gap restoration)
- Inspect F6-EQ08 (ECS) magnetic separator mesh — if loaded, replace mesh; do not resume prime production until Fe <200 ppm confirmed

**Pipeline Impact:**
- Product Y: ~30 minutes diversion to secondary grade + roll change time; ~150 minutes total disruption
- Product Z: ~20–45 minutes during slot cleaning; no product loss if cleaning restores pressure
- Automotive customer schedule: potentially 0.5 heat shortfall if diversion not communicated in time

**Spare Parts Trigger:**
| SKU | Description | Quantity | Lead Time | Action |
|:---|:---|:---|:---|:---|
| AK-LIP-CGL | Air knife nozzle lip | 1 pair | 6 weeks | ORDER (backup) |
| REF-PRISM-CGL | Inline refractometer prism | 1 | 4 weeks | ORDER (as-found check showed fouling) |
| MESH-MAG-ECS | Magnetic separation filter mesh | 2 | 4 weeks | ORDER |

**Follow-Up Query Set:**
1. "Why does iron contamination in the emulsion cause strip surface roughness to increase?" *(Tests: tribology understanding — iron particles act as three-body abrasive between roll and strip)*
2. "The Ra jumped from 1.0 μm to 2.45 μm. An automotive customer specifies Ra 0.8–1.5 μm. Quantify the quality risk." *(Tests: specification understanding — at 2.45 μm, the strip is out of spec; paint adhesion and press-forming quality are affected)*
3. "Why does zinc crystallize specifically in the air knife nozzle slot rather than elsewhere on the galvanizing line?" *(Tests: thermodynamic understanding — the nozzle slot is the coolest point in the air stream; zinc vapour from the pot condenses preferentially at cooler surfaces)*
4. "If the emulsion iron contamination had continued undetected for another 8 hours, project the damage sequence." *(Tests: failure projection — Fe >800 ppm → emulsion oil-water split → lubricant starvation → roll burn marks → roll surface destruction → emergency roll change, 4–8 hr downtime)*
5. "Design a continuous monitoring strategy that would detect emulsion iron contamination 4 hours before it reaches the alarm threshold." *(Tests: predictive monitoring design — trending analysis: rate of change of [Fe] vs. time; separator differential pressure as leading indicator)*

---

### 2.8 iLearning Query Type Classification

All troubleshooting queries that enter the system are classified by type before being routed to the appropriate reasoning module:

| Query Type | Example | Reasoning Module | Knowledge Source |
|:---|:---|:---|:---|
| Root Cause Identification | "Why is F3-EQ05 return water temperature rising?" | Physics engine + RAG manual lookup | Equipment manual, failure mode database |
| Cascade Impact Assessment | "What downstream effects does this cause?" | Orchestrator cascade model | Cascade propagation table |
| SOP Retrieval | "What are the exact steps to isolate Tuyere 12?" | SOP RAG index (keyword-heavy) | Factory SOP library |
| Spare Parts Lookup | "What is the part number and lead time for the CGE impeller?" | Spare parts inventory database | Parts catalogue |
| Quantitative Analysis | "How much will coke rate increase if blast temperature drops 80°C?" | Empirical model library | Blast furnace thermal balance models |
| Predictive Risk | "How long before the bearing fails completely?" | RUL estimation model | Historical breakdown database |
| Operational Optimization | "How do we maximize output while running with one tuyere isolated?" | Production optimization engine | Operational guidelines |
| Product Quality Impact | "Will this process excursion affect Product Z coating adhesion?" | Quality chain model | Steel metallurgy knowledge base |
| Regulatory/Safety | "What is the PEL for coke oven emissions and how do we stay compliant?" | Compliance RAG index | OSHA 1910.1029, safety SOPs |
| Post-Incident Analysis | "This failure happened before — what does the history show?" | Historical case RAG | Breakdown case studies |

---

### 2.9 The Complete iLearning Prompt Template

Every iLearning scenario prompt follows this template to ensure the AI agent receives complete context:

```
ATAL iLearning Query — [Scenario ID]
═════════════════════════════════════════════════════════

PLANT CONTEXT:
  Active Products: [X / Y / Z]
  Shift: [Day/Night/Evening], [Time]
  Current Buffer Levels:
    Sinter Stockyard: [X]% of 6hr capacity
    Slab Bay:         [X]% of 8hr capacity
    HRC Bay:          [X]% of 24hr capacity

ANOMALY PACKAGE:
  [TABLE: Sensor ID | Parameter | Normal | Current | Duration | Trend]

QUESTION:
  [Primary diagnostic or operational question]

CONSTRAINTS:
  - Available spare parts: [list of what is in stock]
  - Maintenance crew available: [N technicians, skill level]
  - Next planned shutdown: [X hours away]
  - Customer delivery commitment: [next N hours of production committed]

EXPECTED OUTPUT FORMAT:
  1. Root cause diagnosis (2–3 sentences, technical precision)
  2. Cascade risk statement (what else is at risk and when)
  3. Immediate actions (prioritized, SOP-referenced)
  4. Pipeline impact estimate (product shortfall in tonnes or hours)
  5. Spare parts work order (SKU, quantity, lead time, urgency)
  6. One follow-up question the agent anticipates being asked
```

This template ensures every interaction with the Agentic AI is structurally consistent, measurable for quality, and directly demonstrable to hackathon evaluators.