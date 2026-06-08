# 🏭 Project ATAL — Master System Overview
## Autonomous Troubleshooting, Asset Intelligence & Lifecycle Management

---

## 1. What is ATAL?

ATAL is a synthetic industrial intelligence platform built to simulate, monitor, and reason about a **six-factory integrated steel manufacturing pipeline** modelled on Tata Steel's real-world operations. It combines three capabilities:

- **Synthetic Data Generation** — Realistic, physically coupled telemetry streams from 90 industrial machines across 6 factories.
- **Agentic AI Reasoning** — An autonomous agent that reads sensor anomalies, cross-references equipment manuals and SOPs, and generates structured maintenance work orders.
- **Pipeline Orchestration** — A chain-aware orchestrator that propagates upstream failures downstream with realistic time-lags, modelling cascade effects across the full production chain.

---

## 2. The Six-Factory Production Chain

Each factory represents a distinct thermodynamic, chemical, or mechanical transformation stage. Raw material enters at Factory 1 and exits as a finished steel product at Factory 6.

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

### Factory ID Reference

| ID | Full Name | Abbreviation | Primary Output |
|:---|:---|:---|:---|
| F1 | Coke Oven & By-Product Recovery Plant | COBPP | Metallurgical Coke + Clean COG |
| F2 | Sinter Plant | SP | Iron Ore Sinter (agglomerate) |
| F3 | Blast Furnace | BF | Hot Metal (Liquid Pig Iron) |
| F4 | Steel Melting Shop | SMS | Continuous Cast Steel Slabs |
| F5 | Hot Strip Mill | HSM | Hot Rolled Coils (HRC) |
| F6 | Cold Rolling Mill & Galvanizing Line | CRMGL | CRCA / Galvanized Coils |

---

## 3. Three Commercial Products

| Product | Brand | Factory Chain | Final Form |
|:---|:---|:---|:---|
| **Product X** | Tata Astrum (HRC) | F1 + F2 → F3 → F4 → F5 | Hot Rolled Steel Coil |
| **Product Y** | Tata Steelium (CRCA) | F1 + F2 → F3 → F4 → F5 → F6 (TCM + Anneal) | Cold Rolled Annealed Sheet |
| **Product Z** | Galvano (GC) | F1 + F2 → F3 → F4 → F5 → F6 (Pickling + TCM + Galvanize) | Zinc-Coated Galvanized Coil |

---

## 4. The Four-Layer Data Architecture

ATAL's synthetic data is organized in four layers, from atomic machine-level up to pipeline-level orchestration.

### Layer 1 — Machine & Sensor Module (Atomic Level)
Each factory contains **15 unique equipment assets**, each modelled as an autonomous software object with:
- `health_index` (0–100%) — decays based on cumulative stress and anomaly events
- `thermal_load`, `vibration_amplitude`, `power_draw`, `throughput_speed` — real-time state variables
- **High-frequency telemetry** (vibration, current) sampled at Hz ranges
- **Low-frequency telemetry** (temperature, pressure, mass-flow) sampled at process cycle intervals
- **Gaussian noise injection** on all sensor streams to simulate real-world sensor drift

### Layer 2 — Factory Aggregation Module
Each factory maintains:
- `Factory_Overall_Efficiency_Score` (0–100%) — synthesized from all internal machine health indices
- **PLC (Programmable Logic Controller) Alarm simulation** — rule-based triggers (e.g., `IF Sensor_A + Sensor_B > Warning_Limit → Generate_Alarm`)
- **Thermodynamic coupling** — factory output quality depends on upstream factory output quality

### Layer 3 — Pipeline Orchestrator (Macro Level)
The orchestrator connects all six factories and manages:
- **Buffer zones** between factory pairs — if upstream output rate exceeds downstream input capacity, a "Backpressure Event" throttles upstream production
- **Transit delay propagation** — `Delay = Distance / Throughput_Velocity`
- **Cascade failure detection** — if cumulative health across critical machines drops below a threshold required for a specific product, a "Systemic Downtime Alert" is triggered

### Layer 4 — Cognitive Knowledge & RAG Layer
The AI reasoning layer contains:
- **Weaviate vector database** — stores equipment manuals, safety SOPs, historical breakdown case studies
- **Hybrid search** — BM25 keyword + semantic vector search for both exact technical queries and conceptual maintenance questions
- **Work order synthesis** — outputs structured diagnosis, recommendation, impact forecast, and spare parts list

---

## 5. The Physical Cascade Principle

> *Everything has a reason. A fault in one machine does not stay contained — it propagates upstream and downstream through physical, chemical, and thermodynamic channels.*

ATAL models four types of cascade propagation:

### Type A — Intra-Factory Cascade (Same Factory)
A failure in one machine degrades the operating conditions of the next machine in the same process line.

**Example:** F1 — Tar buildup on the Centrifugal Gas Exhauster (F1-EQ09) causes impeller unbalance → vibration damages shaft seals → air ingress into raw coke oven gas → oxygen concentration rises above safe limits → Electrostatic Tar Precipitator (F1-EQ11) must be shut down immediately to prevent ignition.

### Type B — Inter-Factory Feed Quality Cascade (Adjacent Factories)
Degraded output quality from one factory reduces the efficiency and quality of the next factory's process.

**Example:** F1 → F3 — High ash content in raw coal degrades coke quality at F1. Poor coke quality reduces the thermal efficiency of the Blast Furnace (F3) after a 6–8 hour transit lag, increasing silicon and carbon deviations in the hot metal, which then forces the BOF at F4 to extend blow time.

### Type C — Thermodynamic Backpressure Cascade (Rate Mismatch)
If a downstream factory slows or stops, upstream factories must throttle back, creating a production stall wave that propagates backwards through the chain.

**Example:** F4 → F3 — A steel caster breakout at F4 halts casting. Hot metal accumulates in the ladle. F3 must reduce its tapping rate. F3's blast volume is reduced, slowing ironmaking throughput.

### Type D — Cross-Product Quality Cascade (Finishing Factories)
Quality degradation at an upstream finishing stage (F5) directly causes defects at the downstream finishing stage (F6).

**Example:** F5 → F6 — Backup roll bearing failure at F5 finishing stand F7 causes roll gap fluctuations and strip thickness variation. When this HRC enters F6, the Tandem Cold Mill must compensate with higher rolling force, accelerating roll wear at F6 and potentially causing strip surface defects.

---

## 6. Time-Lagged Propagation Model

Not all failures manifest immediately downstream. ATAL models realistic transit and diffusion delays:

| Cascade Path | Physical Mechanism | Typical Lag |
|:---|:---|:---|
| F1 coal quality → F3 hot metal chemistry | Coke transit via conveyor and BF charging | 6–8 hours |
| F3 hot metal Si content → F4 blow extension | Ladle transfer and BOF charge | 30–60 minutes |
| F5 strip thickness deviation → F6 roll force increase | HRC coil unwinding and pickling | 2–4 hours |
| F2 sinter FeO spike → F3 burden efficiency drop | Sinter bed cooling and BF charging | 2–4 hours |

---

## 7. Human & System Interplay Simulation

ATAL simulates realistic human factors — not just machine failures:

- **Interlock bypass scenarios** — an operator bypasses a PLC interlock during a rush restart
- **Manual valve errors** — a coolant valve left closed after routine maintenance (outside standard PLC detection logic, detectable only through thermodynamic rate-of-change analysis)
- **Procedural sequence violations** — wrong startup order for dual exhausters causing gas pressure fluctuation in the collecting main

These events are inserted as stochastic triggers in the simulation and are designed to test whether the Agentic AI can detect non-obvious root causes.

---

## 8. Knowledge Base Architecture (RAG Layer)

| Index Type | Content | Search Mode |
|:---|:---|:---|
| Equipment Manuals | Maintenance procedures, torque specs, replacement intervals | Semantic + keyword |
| Safety SOPs | OSHA compliance, PPE requirements, emergency shutdown procedures | Keyword-heavy |
| Historical Breakdown Cases | Past failure scenarios, repair timelines, root cause patterns | Semantic |
| Spare Parts Catalogue | SKU codes, stock levels, procurement lead times, supplier codes | Keyword |
| Sensor Threshold Reference | Normal operating ranges, alarm thresholds, trip limits | Keyword |

---

## 9. Agentic AI Work Order Output Format

Every anomaly detected by the system triggers the Agentic AI to produce a structured work order:

```
WORK ORDER — AUTO-GENERATED
═══════════════════════════════════════════════════════
Asset ID        : [e.g., F1-EQ09]
Asset Name      : Centrifugal Gas Exhauster
Factory         : F1 — COBPP
Triggered At    : [Timestamp]
Severity        : CRITICAL / HIGH / MEDIUM / LOW

DIAGNOSIS
─────────
Root Cause      : [e.g., Tar build-up on impeller causing dynamic unbalance]
Failure Mode    : [e.g., Outer race fatigue — 232 Hz BPFO frequency peak]
Cascade Risk    : [e.g., O₂ ingress risk → ETP ignition → Gas fire]

RECOMMENDATION
──────────────
Immediate       : [e.g., Shut ETP power, initiate standby exhauster startup]
Short-Term      : [e.g., Perform exhauster changeover per SOP-F1-EXH-01]
Long-Term       : [e.g., Replace bearing BRG-CGE-709, schedule impeller clean]

PIPELINE IMPACT
───────────────
Affected Products : Product X, Y, Z (all downstream)
Estimated Delay   : [e.g., 2 hours if changeover completes normally]
Downstream Risk   : F2 sinter quality degradation if coke gas pressure drops

SPARE PARTS
───────────
Part SKU         : BRG-CGE-709
Description      : Dynamically balanced exhauster impeller bearing
Stock Level      : [from inventory DB]
Lead Time        : 20 weeks
Procurement Flag : RESERVE NOW — Long lead item
═══════════════════════════════════════════════════════
```

---

## 10. ATAL vs. Tata Steel's Real iROC

| Feature | Tata Steel iROC | ATAL (Simulated) |
|:---|:---|:---|
| Sensor count | 10,000+ real sensors | 90 machines × ~3 sensors = ~270 synthetic streams |
| AI models | 650 narrow AI models | Modular anomaly detectors per asset class |
| Digital twins | 250+ physics-based twins | Stochastic + physics-coupled factory objects |
| Maintenance mode | Predictive → Prescriptive | Prescriptive (work order auto-generation) |
| Knowledge base | Proprietary, on-premises | Weaviate RAG with public domain equipment data |
| Cascade modelling | Real physical plant | Time-lagged software propagation model |

---

*This document is the top-level reference for Project ATAL. All factory-specific markdown files (01–06), the equipment master index (07), the product chain document (08), and the orchestrator + scenario document (09) derive from this architecture.*