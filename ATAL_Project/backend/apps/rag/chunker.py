"""
Semantic chunker — splits at section/paragraph level.
Target: 400-600 tokens per chunk, 50-token overlap.

For documents without a source_url (seeded corpus), synthetic domain knowledge
is generated from _SYNTHETIC_CORPUS keyed by document title.
"""
import re
from typing import List, Dict

# ---------------------------------------------------------------------------
# Synthetic corpus: domain knowledge for each seeded document.
# Based on Horizon/Zephyr plant specs, ISO standards, and operational SOPs.
# ---------------------------------------------------------------------------
_SYNTHETIC_CORPUS: Dict[str, str] = {

    # ── ISO Standards ───────────────────────────────────────────────────────

    "ISO 10816-3 Mechanical Vibration": """
## ISO 10816-3: Mechanical Vibration — Evaluation of Machine Vibration by Measurements on Non-Rotating Parts

### Scope
Applies to industrial machines with power above 15 kW and nominal speeds between 120 and 15 000 r/min.
Covers finishing stands (FS), tandem cold mill stands (TCMS), and rotating auxiliary equipment.

### Vibration Severity Zones
| Zone | RMS Velocity (mm/s) | Condition |
|------|---------------------|-----------|
| A    | ≤ 2.3               | New machine — acceptable |
| B    | 2.3 – 4.5           | Satisfactory for long-term operation |
| C    | 4.5 – 7.1           | Unsatisfactory — corrective action within days |
| D    | > 7.1               | Dangerous — immediate shutdown required |

### Alarm Thresholds for Steel Plant Finishing Stand (FS)
- Warning alarm: 4.5 mm/s rms (Zone B→C boundary)
- Trip alarm: 7.1 mm/s rms (Zone C→D boundary)
- Bearing housing measurement: radial direction, ISO 2954 frequency weighting

### TCMS (Tandem Cold Mill Stand) Specific Limits
- Roll neck bearing vibration: warning at 3.5 mm/s, trip at 6.0 mm/s
- Drive spindle: warning at 4.0 mm/s, trip at 7.0 mm/s

### Measurement Points
Measurements taken on bearing housing in the direction of maximum load.
Frequency range: 10 Hz to 1 kHz for rolling element bearings.

### Trend Monitoring Interval
Critical machines (FS, TCMS): continuous online monitoring.
Semi-critical (auxiliary pumps): weekly route-based measurement.
""",

    "ISO 4406 Hydraulic Oil Cleanliness": """
## ISO 4406:2021 — Hydraulic Fluid Power — Method for Coding the Level of Contamination by Solid Particles

### Cleanliness Code Format
Three-number code: particles per mL at ≥4 μm(c), ≥6 μm(c), ≥14 μm(c).
Example: 17/15/12 means high contamination; 16/14/11 is target for servo valves.

### HAGCC (Hot Automatic Gauge Control Cylinder) Requirements
- Servo hydraulic system target cleanliness: ISO 4406 code 16/14/11
- Alarm level: 18/16/13 — schedule oil change within 5 days
- Trip level: 19/17/14 — immediate shutdown and oil flush
- Recommended oil: ISO VG 46 mineral hydraulic oil or equivalent

### Particle Count Limits (particles per mL)
| Size    | Target (≤) | Warning (≤) | Action (≤) |
|---------|------------|-------------|------------|
| ≥4 μm   | 1300       | 5000        | 10000      |
| ≥6 μm   | 320        | 1300        | 2500       |
| ≥14 μm  | 40         | 160         | 320        |

### Sampling Procedure
- Sample from return line at operating temperature (40–60°C)
- Sample volume: 100 mL minimum, ISO 3722 bottle
- Frequency: monthly for HAGCC servo systems; weekly if contamination trending up

### Water Content Limit
Karl Fischer method: < 0.05% (500 ppm) water by mass.
Exceed 0.1% → immediate oil change to prevent hydrolysis and corrosion.
""",

    "ISO 17359 Condition Monitoring": """
## ISO 17359:2011 — Condition Monitoring and Diagnostics of Machines — General Guidelines

### Purpose and Scope
Provides framework for selecting condition monitoring technologies and frequencies.
Applicable to rotating machinery including HPAK air knife systems, TCMS, and FS equipment.

### Technology Selection Matrix
| Failure Mode          | Recommended Technology            | Frequency |
|-----------------------|-----------------------------------|-----------|
| Bearing fatigue       | Vibration (accelerometer)         | Continuous |
| Gear tooth damage     | Vibration, AE (acoustic emission) | Weekly |
| Seal degradation      | Oil analysis, temperature         | Monthly |
| Imbalance/misalignment| Vibration (low frequency)         | Monthly |
| Cavitation            | Vibration, noise (ultrasound)     | Continuous |
| Corrosion/erosion     | Thickness measurement, oil analysis | Quarterly |

### Alarm Setting Methodology
Statistical baseline: mean + 3σ for warning; mean + 6σ for alarm.
Absolute threshold: ISO 10816-3 zones (vibration), ISO 4406 codes (oil).
Use the MORE conservative of statistical and absolute thresholds.

### HPAK Air Knife Condition Monitoring
- Differential pressure across knife header: baseline 60–80 mbar
- Warning: ΔP > 95 mbar (knife wear or blockage)
- Trip: ΔP > 120 mbar (immediate inspection)
- Flow measurement: minimum 1200 Nm³/h at rated knife pressure

### Trending and Prognosis
- RUL (Remaining Useful Life) estimate: exponential degradation model
- Update RUL daily for critical assets (FS, HPAK, HAGCC)
- Minimum 30-day advance warning for planned maintenance
""",

    "ISO 13373-3 Bearing Fault Frequencies": """
## ISO 13373-3:2015 — Condition Monitoring of Rotating Machinery — Vibration — Requirements for Training

### Bearing Fault Frequency Formulas

For a bearing with:
- N = number of rolling elements
- Bd = ball/roller diameter (mm)
- Pd = pitch diameter (mm)
- α = contact angle (degrees)
- RPM = shaft rotational speed (r/min)
- Fundamental frequency: f0 = RPM / 60 (Hz)

**BPFO** (Ball Pass Frequency Outer race):
BPFO = (N/2) × f0 × [1 - (Bd/Pd) × cos(α)]

**BPFI** (Ball Pass Frequency Inner race):
BPFI = (N/2) × f0 × [1 + (Bd/Pd) × cos(α)]

**BSF** (Ball Spin Frequency):
BSF = (Pd / 2Bd) × f0 × [1 - (Bd/Pd)² × cos²(α)]

**FTF** (Fundamental Train Frequency / cage):
FTF = (f0/2) × [1 - (Bd/Pd) × cos(α)]

### TCMS Roll Neck Bearing (Typical 4-Row Tapered Roller)
- N = 18 tapered rollers per row
- Contact angle α = 15°
- Bd/Pd ratio ≈ 0.22
- At 600 RPM: BPFO ≈ 72 Hz, BPFI ≈ 90 Hz, BSF ≈ 28 Hz

### Fault Detection Criteria
- Stage 1 (Incipient): BPFO/BPFI amplitude > 0.5 g rms — monitor weekly
- Stage 2 (Moderate): amplitude > 2 g rms — plan replacement within 4 weeks
- Stage 3 (Severe): amplitude > 5 g rms OR sidebands appear — replace within 48 hours
- Stage 4 (Critical): broadband noise floor rising — IMMEDIATE shutdown

### FS Finishing Stand Bearing Notes
High-speed work roll bearings: check at 2× and 3× BPFO harmonics.
Chatter vibration at 40-200 Hz may mask BPFI — use envelope analysis.
""",

    "ISO 19973 Seal Reliability Curves": """
## ISO 19973:2015 — Pneumatic Fluid Power — Assessment of Component Reliability by Test

### Seal Degradation Model for HAGCC Hydraulic Cylinders

Seal drift (leakage increase) follows exponential law:
  leakage_rate(t) = L0 × exp(t / τ)
where τ = characteristic life constant (hours), L0 = initial leakage at commissioning.

For HAGCC polyurethane seals:
- τ = 4000 operating hours (standard mineral oil at 60°C)
- L0 = 2 mL/min (acceptance limit at commissioning)
- Warning threshold: 5 mL/min
- Trip threshold: 10 mL/min → immediate seal replacement

### Temperature Effect on Seal Life
Arrhenius relationship: τ(T) = τ_ref × exp(Ea/R × (1/T - 1/T_ref))
- Ea (activation energy for PU seal): 80 kJ/mol
- T_ref = 333 K (60°C), τ_ref = 4000 h
- At 70°C: τ ≈ 2700 h (32% reduction)
- At 80°C: τ ≈ 1850 h (54% reduction)

### Inspection Schedule
- Monthly: measure leakage rate at operating pressure (280 bar)
- If leakage > 3 mL/min: increase monitoring to weekly
- If leakage > 5 mL/min: schedule seal replacement within 30 days
- If leakage > 10 mL/min: shutdown within 24 hours

### Seal Compatibility
HAGCC cylinders: fluorocarbon (FKM) seals if oil temp regularly > 70°C.
NBR seals acceptable for < 60°C continuous service.
""",

    "ISO 14224 Maintenance Data Collection": """
## ISO 14224:2016 — Petroleum, Petrochemical and Natural Gas Industries — Collection and Exchange of Reliability and Maintenance Data for Equipment

### Applicability
Equipment taxonomy for rotating and static equipment in process industries.
Applied to all 8 Horizon/Zephyr assets: SRF, HHPD, FS, HAGCC, APT, TCMS, CGP, HPAK.

### Failure Mode Taxonomy
Critical failure modes per asset class:
- SRF (Soaking/Reheating Furnace): burner failure, refractory degradation, thermocouple failure, pressure vessel leak
- HHPD (High-pressure Hydraulic Descaler): nozzle erosion, pump cavitation, seal failure, pressure loss
- FS (Finishing Stand): bearing failure, roll chatter, coupling fatigue, guide misalignment
- HAGCC: seal leak, servo valve stiction, position sensor drift, oil contamination
- APT (Acid Pickling Tank): HCl concentration depletion, pump corrosion, fume scrubber failure
- TCMS (Tandem Cold Mill Stand): roll surface roughening, emulsion contamination, bearing fatigue
- CGP (Continuous Galvanizing Pot): bath temperature deviation, dross buildup, zinc level low
- HPAK (High-Pressure Air Knife): knife wear, pressure loss, coating weight deviation

### Data Recording Requirements
Each maintenance event must record:
1. Equipment tag, failure mode (ISO 14224 taxonomy code)
2. Detection method (operator/sensor/scheduled inspection)
3. Time to detect (hours after failure initiation)
4. Repair time (hours)
5. Spare parts consumed
6. Root cause (primary + contributing factors)
7. Operating conditions at failure

### MTBF Targets for Horizon/Zephyr
| Asset | MTBF Target |
|-------|-------------|
| SRF   | 8760 h (annual campaign) |
| HHPD  | 4380 h |
| FS    | 2190 h per stand |
| HAGCC | 8760 h |
| APT   | 2190 h |
| TCMS  | 4380 h |
| CGP   | 8760 h |
| HPAK  | 4380 h |
""",

    "IEC 61511 Functional Safety SIS": """
## IEC 61511:2016 — Functional Safety — Safety Instrumented Systems for the Process Industry

### Scope for SRF (Soaking/Reheating Furnace)
Safety instrumented functions (SIFs) for furnace pressure, temperature, and combustion safety.

### Safety Integrity Level (SIL) Requirements
SRF furnace gas safety system: SIL 2 minimum.
- Combustion interlock (flame failure → gas shutoff): SIL 2
- Furnace overpressure protection (> +50 Pa → damper open): SIL 2
- High-temperature protection (> 1280°C → fuel cutoff): SIL 2
- Flame detection: dual UV/IR sensors, 1oo2 voting

### Proof Test Requirements
SIL 2 requires proof test every 12 months maximum.
Partial stroke testing of emergency shutoff valves: every 3 months.
Functional proof test sequence:
1. Simulate flame failure → verify gas shutoff within 2 seconds
2. Apply test pressure → verify safety valve opens at setpoint ± 5%
3. Simulate high temperature signal → verify fuel cutoff latches

### SRF Specific Setpoints
- High-temperature alarm: 1250°C (warning)
- High-temperature trip: 1280°C (gas cutoff, IEC 61511 SIF)
- Furnace pressure: +10 Pa operating, +50 Pa high alarm, +80 Pa trip
- Gas pressure low: < 50 mbar → burner lockout

### SIS Bypass Management
No bypass permitted without written authority and compensatory controls.
Maximum bypass duration: 4 hours. Continuous monitoring required during bypass.
""",

    "IEC 62682 Alarm Management": """
## IEC 62682: Management of Alarm Systems for the Process Industries
Alarm flood management for SRF combustion zones. Maximum 10 alarms per 10 minutes per operator.
Priority classification: critical (safety), high (equipment damage), medium (quality), low (information).
SRF zone temperature deviation alarms must include cause and recommended action text.
""",

    "ISO 12944 Corrosion Protection": """
## ISO 12944: Corrosion Protection of Steel Structures by Protective Paint Systems
APT pickling line structural steel: Class C5-I extreme industrial category.
Tank lining inspection interval: monthly UT thickness at high-risk points.
""",

    "ISO 1461 Hot Dip Galvanized Coatings": """
## ISO 1461:2009 Hot Dip Galvanized Coatings on Iron and Steel Products
Minimum coating thickness for CGP product: per batch testing criteria.
Fe in zinc bath must remain below 0.03% to control dross formation.
""",

    "ISO 1460 Coating Mass Determination": """
## ISO 1460:2020 Gravimetric Determination of Hot Dip Galvanized Coating Mass
Calibration baseline for automated X-ray coating weight gauges on HPAK exit.
Target coat weight 60-275 g/m² with deviation <±5 g/m².
""",

    "ISO 6085 Coating Uniformity": """
## ISO 6085: Coating Uniformity Assessment
Strip coating uniformity across width after HPAK air knife wiping.
Stripe defects indicate nozzle slot zinc dust crystallization blockage.
""",

    "OSHA 1910.147 Lockout Tagout": """
## OSHA 1910.147 — Control of Hazardous Energy (Lockout/Tagout)
Required before APT acid tank entry or mill stand roll change.
Each authorized employee applies own lock and tag. Group lockout for multi-person jobs.
Verify zero energy: pressure bled, electrical isolated, stored energy dissipated.
""",

    "SRF Startup Operation SOP": """
## Slab Reheating Furnace Startup Procedure
1. Verify combustion air flow and fuel gas supply.
2. Purge furnace chambers for 5× volume before ignition.
3. Light pilot burners zone-by-zone; confirm flame detection.
4. Ramp zone temperatures to 1150-1250°C slab setpoint.
5. Verify walking beam stroke sensors within tolerance.
Air/fuel ratio target 1.05-1.15. Zone deviation <±15°C.
""",

    "IEC 61508 Functional Safety E/E/PE": """
## IEC 61508:2010 — Functional Safety of E/E/PE Safety-Related Systems

### Application to SRF Control Systems
SRF programmable logic controllers (PLCs) and safety-related sensors fall under IEC 61508.

### Hardware Fault Tolerance
SIL 2 system: hardware fault tolerance (HFT) = 1 minimum.
Redundant architecture required for SRF flame scanners and gas shutoff valves.

### Diagnostic Coverage
DC (Diagnostic Coverage) target: ≥ 90% for SIL 2 (DC high category).
Safe failure fraction (SFF): ≥ 90% for Type B subsystems.

### Proof Test Interval
SIL 2 typical PFD_avg < 10^-3 achieved with:
- Annual proof test: λDU × T/2 < 10^-3
- Monthly partial proof tests recommended for SRF gas train

### Software Integrity
SRF PLC software: IEC 61508 SIL 2 software lifecycle required.
Management of functional safety (MOFS) document required.
No unstructured (spaghetti) code; formal verification for safety-critical functions.
""",

    # ── SOPs ────────────────────────────────────────────────────────────────

    "SRF Combustion Control SOP": """
## SRF Combustion Control Standard Operating Procedure
### Document: SOP-SRF-001 | Rev: 4 | Asset Scope: SRF

### Purpose
Maintain optimal combustion conditions in the Soaking/Reheating Furnace (SRF) to achieve
target slab exit temperature of 1200°C ± 15°C while minimising fuel consumption and NOx emissions.

### Normal Operating Parameters
| Parameter | Target | Warning | Alarm |
|-----------|--------|---------|-------|
| Zone 1 Temperature | 1180°C | < 1150°C or > 1220°C | < 1100°C or > 1250°C |
| Zone 2 Temperature | 1200°C | < 1170°C or > 1230°C | < 1150°C or > 1260°C |
| Furnace Pressure | +5 to +10 Pa | < 0 Pa or > +30 Pa | < -5 Pa or > +50 Pa |
| Air/Fuel Ratio | 1.05–1.15 excess air | < 1.02 or > 1.25 | < 1.00 (sub-stoich) |
| Flame Length | 60–80% of furnace width | — | > 90% (flame impingement) |

### Startup Procedure (Cold Start)
1. Verify all gas isolation valves closed; check gas pressure at manifold (setpoint: 120 mbar ± 10 mbar).
2. Purge furnace with air for minimum 5 volume changes (approximately 8 minutes at normal ventilation).
3. Initiate pilot burner ignition sequence via DCS — confirm UV scanner signal within 10 seconds.
4. Ramp temperature at ≤ 50°C/hour until zone temperatures reach 600°C (thermal shock prevention).
5. Switch to main burner operation; verify air/fuel ratio controller in automatic.
6. Ramp to operating temperature at ≤ 80°C/hour.
7. Confirm slab exit temperature meets specification before releasing mill.

### Emergency Shutdown — Combustion Interlock Triggered
Automatic: DCS initiates gas shutoff within 2 seconds of flame failure.
Manual: Actuate emergency stop pushbutton at operator panel — verify gas valve position feedback.
Do NOT re-ignite without furnace purge (minimum 5 volume changes).

### Burner Nozzle Inspection (Monthly)
1. Isolate burner — confirm zero energy (gas pressure gauge reads 0).
2. Remove nozzle tip; inspect for carbon deposits and erosion.
3. Clean with brass wire brush; replace if bore diameter exceeds 1.05× nominal.
4. Torque nozzle to manufacturer spec (typically 80 Nm for M30 nozzles).

### Fuel Consumption Baseline
Target specific fuel consumption: 1.05 GJ/t at 1200°C slab temperature.
Deviation > 5% from baseline → investigate combustion efficiency and air infiltration.
""",

    "HHPD Nozzle Inspection SOP": """
## HHPD Nozzle Inspection Standard Operating Procedure
### Document: SOP-HHPD-001 | Rev: 3 | Asset Scope: HHPD

### Purpose
Maintain descaling nozzle condition to ensure effective scale removal from slab surface
before entry to Finishing Stand. Worn nozzles cause scale inclusions in final product.

### HHPD Operating Parameters
| Parameter | Target | Alarm |
|-----------|--------|-------|
| Descaling pressure | 180–220 bar | < 160 bar or > 240 bar |
| Water flow per header | 80–100 L/min | < 70 L/min |
| Nozzle type | Flat-fan, 15° spray angle | — |
| Standoff distance | 150–200 mm from slab surface | — |

### Nozzle Erosion Model
Nozzle bore diameter increases with cumulative water volume:
  d(n) = d0 × (1 + 0.0002 × n)
where n = cumulative tonnes processed (×10^6), d0 = nominal bore diameter (mm).
At 10 M tonnes: d ≈ d0 × 1.002 — acceptable.
At 50 M tonnes: d ≈ d0 × 1.010 — replace if flow deviation > 3%.

### Inspection Frequency
- Visual inspection: weekly
- Flow measurement (individual nozzle): monthly
- Full header replacement: 500,000 tonnes campaign or flow deviation > 5%

### Inspection Procedure
1. Isolate descaling water; depressurise header; confirm zero pressure on gauge.
2. Remove nozzle body (⅜" BSP fitting; torque 40 Nm).
3. Inspect bore with nozzle gauge: replace if bore > 1.02× nominal diameter.
4. Check spray angle with nozzle test bench (15° ± 1°); discard if > 17°.
5. Inspect O-ring and seating face; replace O-ring at every inspection.
6. Reinstall and torque to 40 Nm; pressure-test header at 250 bar (150% of operating).

### Scale Inclusion Prevention
If product shows scale inclusion defects, check:
1. Nozzle bore erosion (flow reduced from nominal)
2. Nozzle plugging (debris — install 500-micron upstream strainer)
3. Header cracking (check leak/pressure drop signature)
4. Slab surface temperature at descaling point (must be > 1050°C for effective descaling)
""",

    "FS Roll Change Procedure SOP": """
## FS Roll Change Procedure Standard Operating Procedure
### Document: SOP-FS-002 | Rev: 6 | Asset Scope: FS (Finishing Stands F1–F7)

### Purpose
Safe and efficient change of work rolls and backup rolls in Finishing Stands to maintain
surface quality and dimensional tolerances per product specification.

### Roll Change Triggers
| Condition | Action |
|-----------|--------|
| Accumulated tonnage > 1500 t (work roll) | Schedule roll change |
| Vibration > 4.5 mm/s rms (ISO 10816-3 Zone C) | Immediate roll change |
| Surface roughness Rz > 8 μm (product quality check) | Immediate roll change |
| Chatter amplitude > 20 μm at strip surface | Immediate roll change |
| Bearing temperature > 85°C | Immediate roll change + bearing inspection |

### Work Roll Change Procedure (Standard)
1. Reduce mill speed to ≤ 5 m/s; thread tail end; stop rolling.
2. Open roll gap; position screw-down to change position (+50 mm from pass-line).
3. Retract roll locking devices; connect roll change carriage to work roll chocks.
4. Withdraw roll assembly to roll shop; weigh for wear estimation.
5. Insert pre-ground rolls (roughness target: Ra 1.2–1.8 μm for F1–F4, Ra 0.8–1.2 μm for F5–F7).
6. Verify chock bearing play ≤ 0.15 mm; replace bearing liner if > 0.25 mm.
7. Set roll gap per model setup schedule; confirm crown and bending force settings.
8. Thread test strip; verify gauge, flatness, and surface quality before production restart.

### Backup Roll Change (Planned, every 6 months or 15,000 t)
Requires 8-hour planned shutdown. Align new backup roll to work roll within 0.05 mm parallelism.
Confirm bearing preload to manufacturer specification.

### Roll Neck Bearing — Grease Specification
Lithium complex grease, NLGI grade 2, EP additives.
Relubrication interval: every 50 tonnes or every 8 hours (whichever first).
Grease quantity: 80 g per bearing housing per interval.
""",

    "HAGCC Oil Sampling SOP": """
## HAGCC Oil Sampling Standard Operating Procedure
### Document: SOP-HAGCC-001 | Rev: 2 | Asset Scope: HAGCC

### Purpose
Regular oil condition monitoring for HAGCC servo hydraulic system to maintain
ISO 4406 cleanliness target 16/14/11 and prevent servo valve failure.

### Sampling Procedure
1. Verify system at operating temperature (40–60°C) — do not sample cold oil.
2. Flush sampling port with 200 mL oil to waste before taking sample.
3. Sample from return line, upstream of return filter, using ISO 3722 sampling bottle.
4. Volume: 100 mL minimum.
5. Label: date/time, system ID (HAGCC-HYD-01), oil temperature, operating hours since last change.
6. Submit to laboratory within 24 hours (refrigerate if > 4 hour delay).

### Analysis Parameters
| Test | Method | Frequency | Alarm Limit |
|------|---------|-----------|-------------|
| Particle count (ISO 4406) | ISO 11500 | Monthly | 18/16/13 |
| Viscosity at 40°C | ISO 3104 | Monthly | ±15% of nominal |
| Water content | Karl Fischer (ISO 12937) | Monthly | > 500 ppm |
| Acid number (TAN) | ASTM D664 | Monthly | > 0.5 mg KOH/g |
| Ferrous particle index | Ferrography | Monthly | > 150 index |

### Oil Change Criteria
Replace oil if any of:
- Particle count reaches 19/17/14 (ISO 4406)
- Water > 1000 ppm
- TAN > 1.0 mg KOH/g
- Viscosity deviation > 20% from nominal (ISO VG 46: 41.4–50.6 cSt at 40°C)

### HAGCC Hydraulic System Capacity
- System volume: 1200 L
- Filter rating: β10(c) ≥ 200 (absolute 10-micron filtration)
- Relief valve setting: 320 bar; operating pressure 280 bar
- Change interval: annually or on condition (whichever first)
""",

    "APT Acid Bath Replenishment SOP": """
## APT Acid Bath Replenishment Standard Operating Procedure
### Document: SOP-APT-001 | Rev: 5 | Asset Scope: APT

### Purpose
Maintain HCl concentration in Acid Pickling Tank (APT) within specification for
effective scale removal from cold-rolled strip without over-pickling or under-pickling.

### APT Operating Parameters
| Parameter | Target | Warning | Trip |
|-----------|--------|---------|------|
| HCl free acid concentration | 80–120 g/L | < 60 g/L or > 140 g/L | < 40 g/L |
| Total iron (FeCl2) | < 140 g/L | > 120 g/L | > 160 g/L |
| Bath temperature | 75–85°C | < 65°C or > 90°C | < 60°C or > 95°C |
| Strip dwell time | 15–25 seconds | — | — |
| Inhibitor concentration | 0.3–0.5% v/v | < 0.2% | — |

### HCl Consumption Model
Acid consumption per tonne of strip: 12–18 kg/t HCl (target: 15 kg/t).
Replenishment trigger: HCl free acid falls below 80 g/L.
Replenishment volume = (target_conc - current_conc) × bath_volume / acid_strength.
Standard acid strength: 31% HCl (hydrochloric acid, technical grade).

### Replenishment Procedure
1. Don PPE: full face shield, acid-resistant gloves and apron, rubber boots.
2. Verify ventilation running (fume scrubber flow ≥ 5000 Nm³/h).
3. Confirm acid delivery line connection to correct tank (interlock label).
4. Open acid dosing valve — maximum flow rate 200 L/min to avoid thermal shock.
5. Dose calculated volume; collect post-dose sample immediately.
6. Titration confirms concentration; adjust if outside 80–120 g/L.
7. Log in SOP-APT record: date/time, volume added, pre/post concentration.

### Iron Concentration Management
When FeCl2 > 140 g/L, drag-out increases and pickle quality degrades.
Action: Dump 20% of bath volume to waste treatment, replace with fresh acid.
Spent acid disposal: to acid regeneration plant or licensed contractor only.

### Emergency — HCl Spill
1. Activate emergency shower if skin/eye contact.
2. Alert plant emergency response; evacuate downwind area.
3. Contain with absorbent (caustic sand); neutralise with soda ash (Na2CO3).
4. Do NOT use water jet (spreads acid vapour).
""",

    "TCMS Bearing Vibration SOP": """
## TCMS Bearing Vibration Monitoring Standard Operating Procedure
### Document: SOP-TCMS-001 | Rev: 3 | Asset Scope: TCMS

### Purpose
Online vibration monitoring of TCMS (Tandem Cold Mill Stand) roll neck bearings
to detect bearing fatigue and prevent catastrophic failure.

### Monitoring Architecture
- Accelerometers: ICP type, 100 mV/g, mounted on roll neck bearing housings (4 per stand)
- Frequency range: 10 Hz – 10 kHz
- Data acquisition: 25.6 kHz sampling, continuous recording to condition monitoring system
- Parameters logged: overall RMS, band-passed RMS (bearing fault bands), envelope spectrum

### Bearing Fault Frequency Bands (at 600 RPM nominal)
| Fault | Frequency Band (Hz) | Alarm Threshold |
|-------|---------------------|-----------------|
| BPFO (outer race) | 65–80 Hz | 2 g rms |
| BPFI (inner race) | 85–100 Hz | 2 g rms |
| BSF (rolling element) | 25–35 Hz | 1.5 g rms |
| FTF (cage) | 4–8 Hz | 0.5 g rms |
| High-frequency noise floor (1–5 kHz) | broadband | 5 g rms |

### Action Levels
| Overall Vibration | Action |
|-------------------|--------|
| < 3.5 mm/s rms | Normal — continue production |
| 3.5–6.0 mm/s rms | Warning — increase monitoring to 4-hourly, plan roll change |
| > 6.0 mm/s rms | Trip — immediate roll change; bearing inspection |

### Bearing Replacement Criteria
Replace bearing if:
- Any band-passed fault frequency exceeds alarm threshold for ≥ 2 consecutive readings
- Multiple fault frequencies simultaneously elevated (indicates advanced damage)
- High-frequency noise floor (1–5 kHz) > 8 g rms (metal-to-metal contact)

### Greasing Interval and Specification
Lubricant: Lithium complex grease, NLGI Grade 2, EP additives, 150°C drop point minimum.
Interval: 50 tonnes or 8 hours (whichever first) — automated system delivers 80 g per bearing.
""",

    "CGP Pot Temperature Management SOP": """
## CGP Pot Temperature Management Standard Operating Procedure
### Document: SOP-CGP-001 | Rev: 4 | Asset Scope: CGP

### Purpose
Maintain zinc bath temperature in Continuous Galvanizing Pot (CGP) within ±5°C of
setpoint (460°C baseline) to control coating weight and dross formation rate.

### Operating Temperature Parameters
| Parameter | Target | Warning | Trip |
|-----------|--------|---------|------|
| Zinc bath temperature | 460°C ± 5°C | ± 10°C deviation | ± 20°C deviation |
| Aluminium content (Al%) | 0.18–0.22% | < 0.15% or > 0.25% | — |
| Zinc level in pot | ±50 mm of nominal | ±75 mm | ±100 mm |
| Strip entry temperature | 480–520°C | < 460°C or > 540°C | — |
| Line speed | 60–120 m/min | — | — |

### Dross Formation Model (Arrhenius)
Dross formation rate: R = A × exp(-Q / (R_gas × T))
where Q = activation energy ≈ 120 kJ/mol, A = pre-exponential factor, R_gas = 8.314 J/(mol·K), T in Kelvin.
At 460°C (733 K): rate index = 1.0 (reference).
At 470°C (743 K): rate ≈ 1.18× reference (18% faster dross formation).
At 450°C (723 K): rate ≈ 0.85× reference (15% slower — risk of freezing at < 420°C).

### Temperature Control Action
1. Deviation > 5°C: adjust induction heater setpoint; allow 10 minutes to stabilise.
2. Deviation > 10°C: notify shift supervisor; reduce line speed by 10% to compensate.
3. Deviation > 15°C: halt zinc additions; check thermocouple calibration.
4. Deviation > 20°C: trip line; emergency recovery procedure per SOP-CGP-002.

### Zinc Ingot Addition
Trigger: zinc level falls ≥ 30 mm below nominal.
Addition size: 1 tonne ingots. Maximum addition rate: 5 t/hour (temperature shock limit).
Never add more than 3 ingots consecutively without temperature stabilisation check.

### Al (Aluminium) Addition
Al% maintained by continuous wire injection (0.5 kg/min wire feed).
If Al% < 0.15%: strip adhesion poor, risk of bare spots in coating.
If Al% > 0.25%: excessive inhibition layer; coating adhesion reduced.
Test frequency: every 2 hours from pot bath sample; ICP-OES analysis.

### Dross Skimming Schedule
Bottom dross: remove every 8 hours using dross boat.
Top dross: remove every 4 hours with rake.
Excess dross > 2 tonne/day → investigate temperature control or Al% deviation.
""",

    "HPAK Knife Purge Procedure SOP": """
## HPAK Knife Purge Procedure Standard Operating Procedure
### Document: SOP-HPAK-001 | Rev: 2 | Asset Scope: HPAK

### Purpose
Maintain high-pressure air knife (HPAK) performance to achieve target coating weight
(90–275 g/m² total both sides) and uniform zinc distribution across strip width.

### HPAK Operating Parameters
| Parameter | Target | Warning | Trip |
|-----------|--------|---------|------|
| Knife air pressure | 0.8–1.2 bar (g) above header | — | — |
| Header differential pressure (ΔP) | 60–80 mbar | > 95 mbar | > 120 mbar |
| Air flow rate | 1200–1800 Nm³/h | < 1200 Nm³/h | < 1000 Nm³/h |
| Knife gap to strip | 8–12 mm (Z-knife only) | < 6 mm or > 15 mm | — |
| Strip wiping uniformity | < ±5 g/m² edge-to-edge | > ±8 g/m² | > ±12 g/m² |
| Knife lip wear | < 0.5 mm lip recession | > 0.5 mm | — |

### Knife Wear Model
Lip recession rate: 0.001 mm per 10,000 m of strip processed.
Replace knife when lip recession exceeds 0.5 mm (≈ 5M metres of strip).
Accelerated wear: inspect after processing high-gauge (> 3 mm) or abrasive grades.

### Knife Purge Procedure (Every Shift Change)
1. Reduce line speed to 30 m/min (minimum productive speed).
2. Activate purge sequence from DCS: 5-second high-pressure air burst through each knife lip.
3. Confirm zinc drips clear from knife lip (observe via knife gap camera).
4. Check ΔP returns to baseline after purge: if ΔP remains > 95 mbar, perform manual inspection.
5. Log purge time, pre/post ΔP, and any abnormalities.

### Manual Knife Inspection (Monthly or on ΔP alarm)
1. Isolate air supply; lock out / tag out per SOP-HPAK-LOTO.
2. Remove zinc build-up from lip with brass scraper (do NOT use steel tools — gouges lip).
3. Measure lip recession with vernier: record and trend.
4. Inspect knife body for cracks (dye penetrant test if suspected crack).
5. Restart purge sequence; verify ΔP within specification.

### Coating Weight Control
Target zinc coating: adjusted by knife gap position and pressure.
Calculation: CW = K × (P_header - P_knife)^0.65 × (1/speed)^0.5
where K = knife efficiency constant (calibrate quarterly from gravimetric samples).
If coating weight deviates > 10 g/m² from target: recalibrate knife gap, check air pressure.
""",

    # ── Safety Codes ─────────────────────────────────────────────────────────

    "Hot Work Permit Safety Code": """
## Hot Work Permit Safety Code
### Document: SC-HOT-001 | Asset Scope: SRF, CGP

### Applicability
Required for all welding, cutting, grinding, or open-flame work within 10 metres of
the SRF furnace structure or CGP zinc bath area.

### Permit Requirements
1. Isolate and purge gas lines before any hot work near SRF (minimum 5 volume changes).
2. Atmospheric test: LEL < 10%, O2 between 19.5%–23.5% — test point within 3 metres of work.
3. CGP hot work: zinc bath temperature must be below 100°C OR zinc area fully isolated by water-cooled barrier.
4. Fire watch: designated person equipped with 9 kg dry powder extinguisher must remain during work and 30 minutes after.
5. Maximum permit duration: 4 hours. Retest atmosphere if work interrupted > 30 minutes.

### Prohibited Activities
- Hot work near CGP during active galvanising (zinc vapour / fire risk).
- Open-flame cutting within SRF without gas supply fully isolated at plant boundary.
- Welding on live hydraulic lines (HAGCC, HHPD): must be depressurised and drained.

### Emergency Response
Zinc fire: do NOT use water. Use dry sand or Class D extinguisher.
Gas leak at SRF: evacuate 50-metre exclusion zone; call plant emergency response.
""",

    "Acid Handling Emergency Procedure": """
## Acid Handling Emergency Procedure
### Document: SC-APT-EMERG-001 | Asset Scope: APT

### Chemical Hazard
31% Hydrochloric Acid (HCl). Corrosive to skin, eyes, respiratory tract.
HCl vapour IDLH: 50 ppm (NIOSH). Evaporation at operating temperature (80°C) is significant.

### Personal Protective Equipment
Mandatory when within 3 metres of open APT tanks or acid connections:
- Full face shield (splash-proof, BS EN 166)
- Chemical splash goggles under face shield
- PVC apron + sleeves (acid-resistant grade)
- Nitrile gloves (0.4 mm minimum) or PVC gauntlets
- Rubber boots (acid-resistant)
- Supplied-air respirator if HCl vapour > 1 ppm (STEL: 5 ppm)

### Spill Response
Small spill (< 10 L):
1. Alert nearby personnel; ensure adequate ventilation.
2. Apply dry soda ash (Na2CO3) liberally to absorb and neutralise.
3. Allow 5 minutes for reaction; collect neutralised material in sealed drum.
4. Wash area with water when neutralisation complete (pH test ≥ 7 before discharge).

Large spill (> 10 L) or vapour release:
1. EVACUATE building — activate emergency alarm.
2. Call emergency response and plant safety coordinator.
3. Isolate acid supply at main isolator (outside APT building, red handle).
4. Do NOT re-enter without SCBA until air-monitoring confirms < 5 ppm HCl.

### Eye/Skin Contact
Immediate: flood with copious water for minimum 20 minutes.
Report to first aid regardless of apparent severity — delayed injury is possible.
All HCl exposures must be documented in the plant incident register.
""",

    "High Pressure Safety Isolation SOP": """
## High Pressure Safety Isolation Standard Operating Procedure
### Document: SC-HP-LOTO-001 | Asset Scope: HHPD, HAGCC, HPAK

### Applicability
Any maintenance, inspection, or intervention on:
- HHPD descaling system (180–220 bar water)
- HAGCC servo hydraulic circuit (280 bar oil)
- HPAK air supply headers (1–2 bar compressed air, high flow)

### LOTO (Lockout/Tagout) Sequence
1. Notify production: obtain clearance from shift supervisor.
2. Close isolation valve at system boundary; apply personal lockout padlock.
3. Release stored energy:
   - Hydraulic (HAGCC, HHPD): open bleed valve to zero; confirm pressure gauge reads 0 bar.
   - Pneumatic (HPAK): open vent to atmosphere; confirm ΔP gauge reads 0 mbar.
4. Verify isolation: attempt to restart system — it must NOT start.
5. Apply DANGER tag: "DO NOT OPERATE — Maintenance in Progress" with name, date, contact.

### Minimum Isolation Requirements
| System | Pressure | Minimum Isolation |
|--------|----------|-------------------|
| HHPD water | 220 bar | Upstream shutoff + downstream bleed |
| HAGCC oil | 280 bar | Isolation valve + accumulator bleed + drain |
| HPAK air | 2 bar | Isolation valve + vent to atmosphere |

### Reinstatement Checklist (before re-energising)
- [ ] All personnel clear of hazard zone (confirmed by roll call)
- [ ] All tools and temporary connections removed
- [ ] Bleed valves closed; drain plugs fitted
- [ ] All padlocks removed (every person's own padlock and tag only)
- [ ] System restarted slowly; check for leaks before full pressure

### Restricted Action
Do NOT apply lockout for routine adjustments < 30 seconds. However, if ANY maintenance work
requires hands/tools inside the machine boundary, FULL LOTO is mandatory regardless of duration.
""",
}


def chunk_document(doc) -> List[Dict]:
    """Given a Document model instance, return list of chunk dicts."""
    from apps.rag.extractors import extract_text

    raw_text, source_kind = extract_text(doc)
    if source_kind == "placeholder" or not raw_text.strip():
        raw_text = _SYNTHETIC_CORPUS.get(doc.title, raw_text)

    if not raw_text.strip():
        return []

    asset_scope = doc.asset_scope if isinstance(doc.asset_scope, list) else []
    asset_scope_str = ",".join(asset_scope)
    standard_code = _standard_code_for_title(doc.title)

    chunks_text = semantic_split(raw_text, max_tokens=400, overlap_tokens=40)
    chunks = []
    for i, chunk_text in enumerate(chunks_text):
        section = _extract_section_heading(raw_text, chunk_text) or f"section_{i+1}"
        page = _extract_page_number(chunk_text)
        meta = {
            "title": doc.title,
            "document_id": str(doc.id),
            "content": chunk_text,
            "section": section,
            "page": str(page) if page is not None else "",
            "asset_scope": asset_scope_str,
            "source_url": doc.source_url or doc.local_path or "synthetic_corpus",
            "doc_type": doc.doc_type,
        }
        if doc.doc_type == "maintenance_log":
            asset_id = _maintenance_asset_id(doc)
            if asset_id:
                meta["asset_id"] = asset_id
            meta["event_type"] = "maintenance"
        if standard_code:
            meta["standard_code"] = standard_code
            thresholds = _threshold_values_for_title(doc.title)
            if thresholds:
                meta["threshold_values"] = thresholds
        chunks.append(meta)
    return chunks


def _maintenance_asset_id(doc) -> str:
    local = getattr(doc, "local_path", "") or ""
    if local.startswith("maintenance_event:"):
        event_id = local.split(":", 1)[1]
        from apps.maintenance.models import MaintenanceEvent
        try:
            event = MaintenanceEvent.objects.select_related("asset").get(id=event_id)
            return str(event.asset_id)
        except MaintenanceEvent.DoesNotExist:
            return ""
    return ""


def _standard_code_for_title(title: str) -> str:
    mapping = {
        "ISO 10816-3": "ISO 10816-3",
        "ISO 4406": "ISO 4406",
        "ISO 17359": "ISO 17359",
        "ISO 13373-3": "ISO 13373-3",
        "ISO 19973": "ISO 19973",
        "ISO 14224": "ISO 14224",
        "IEC 61511": "IEC 61511",
        "IEC 61508": "IEC 61508",
        "IEC 62682": "IEC 62682",
        "ISO 12944": "ISO 12944",
        "ISO 1461": "ISO 1461",
        "ISO 1460": "ISO 1460",
        "ISO 6085": "ISO 6085",
    }
    for key, code in mapping.items():
        if key in title:
            return code
    return ""


def _threshold_values_for_title(title: str) -> str:
    thresholds = {
        "ISO 4406": '{"target":"16/14/11","alarm":"18/16/13","trip":"19/17/14"}',
        "ISO 10816-3": '{"warning_mm_s":4.5,"trip_mm_s":7.1}',
        "ISO 17359": '{"hpak_pressure_drop_mbar":95}',
    }
    for key, val in thresholds.items():
        if key in title:
            return val
    return ""


def _extract_page_number(chunk_text: str):
    match = re.search(r"## Page (\d+)", chunk_text)
    return int(match.group(1)) if match else None


def _extract_section_heading(full_text: str, chunk_text: str) -> str:
    """Find the nearest heading above this chunk in the full text."""
    chunk_start = full_text.find(chunk_text[:60])
    if chunk_start < 0:
        return ""
    preceding = full_text[:chunk_start]
    headings = re.findall(r"#{1,3}\s+(.+)", preceding)
    return headings[-1].strip() if headings else ""


def semantic_split(text: str, max_tokens: int = 500, overlap_tokens: int = 50) -> List[str]:
    """Split text at section headings, then paragraphs, respecting token limits."""
    sections = re.split(r"\n#{1,3}\s+", text)
    chunks = []
    for section in sections:
        paragraphs = section.split("\n\n")
        current: List[str] = []
        current_len = 0
        for para in paragraphs:
            para_len = len(para.split())
            if current_len + para_len > max_tokens and current:
                chunks.append("\n\n".join(current))
                overlap_words = " ".join(" ".join(current).split()[-overlap_tokens:])
                current = [overlap_words]
                current_len = overlap_tokens
            current.append(para)
            current_len += para_len
        if current:
            chunks.append("\n\n".join(current))
    return [c for c in chunks if len(c.strip()) > 20]


def preserve_table(text: str) -> bool:
    return "|" in text and "---" in text


def extract_formula(text: str) -> List[str]:
    formula_pattern = re.compile(r"`[^`]+`|exp\([^)]+\)|\w+\([^)]+\)\^[\d.]+")
    return formula_pattern.findall(text)
