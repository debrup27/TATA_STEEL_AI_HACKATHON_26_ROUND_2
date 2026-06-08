# 🏭 Factory 5 — Hot Strip Mill (HSM)

---

## Overview

**Factory ID:** F5  
**Full Name:** Hot Strip Mill  
**Abbreviation:** HSM  
**Primary Input:** Steel Slabs from F4 (200–250 mm thick, 900–1650 mm wide, 6–12 m long, ~15–30 tonnes each)  
**Primary Output:** Hot Rolled Coils (HRC) — 2–16 mm thick, 900–1650 mm wide, up to 30 tonne coil weight

### What This Factory Does (Plain English)

Steel slabs arrive from the caster at F4 at around 900–1000°C (they cool during transfer). The HSM reheats them to 1150–1250°C to make the steel soft and workable (above the **recrystallization temperature**), then passes them through a series of progressively closer rolling mill stands that squeeze the slab thinner and thinner. The process:

1. **Reheat furnace** → slab at 1200°C
2. **High-pressure descaler** → blasts off the surface oxide scale (mill scale) with water at 200–300 bar
3. **Roughing mill** → 5–7 rolling passes, reduces 220 mm slab to ~25–40 mm "transfer bar"
4. **Flying crop shear** → trims the ragged head and tail ends of the transfer bar
5. **Finishing mill (7 stands in series)** → rolls the transfer bar from 25–40 mm to final gauge (2–16 mm) in one continuous pass — strip exits at 700–900°C at speeds up to 20 m/s
6. **Run-out table laminar cooling** → controlled water cooling to target coiling temperature (550–700°C)
7. **Down coiler** → winds the strip into a coil

The whole sequence — slab in to coil out — takes approximately 3–5 minutes per slab.

### Upstream Dependency
Slab surface quality from F4 (inclusions, surface cracks, oscillation mark depth) directly affects strip surface quality — defects that escape detection at the caster manifest as slit edges, scale pits, or surface streaks in the HRC.

### Downstream Dependency
HRC dimensional accuracy (thickness tolerance ±50 μm for prime product), surface roughness, and flatness directly determine F6 pickling efficiency, rolling force requirements, and ultimately the surface finish of CRCA and galvanized products for automotive customers.

---

## 15 Core Equipment Assets

### F5-EQ01 — Slab Reheating Furnace (SRF)

**What it does:** A large walking-beam or pusher-type furnace (~40–60 m long) that heats slabs to 1150–1250°C over 2–4 hours. Walking-beam furnaces use movable beams to lift and advance slabs through the furnace, avoiding the skid marks (cold spots) that pusher furnaces leave where slabs rest on water-cooled skids.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| Discharge temperature | 1150–1250°C | < 1100°C (cold slab) or > 1280°C (overheating) |
| Furnace zone temperatures | Zone 1: 900°C; Zone 2: 1100°C; Zone 3: 1250°C | Any zone > ±40°C from setpoint |
| Gas fuel flow | 8,000–15,000 Nm³/hr (total) | > 18,000 Nm³/hr (high consumption) |
| Slab residence time | 2.5–4.0 hours | > 5 hours (furnace throughput bottleneck) |
| Combustion air-to-fuel ratio | 1.05–1.15 (slight excess air) | < 1.0 (fuel-rich → CO emission) |

**Sensors:**
- `Temperature pyrometers` (optical, non-contact) at discharge end and in each zone — continuous slab surface temperature measurement
- `Gas fuel flow transmitters` per zone — control input for zone temperature regulation
- `O₂ sensors` in flue gas — confirm combustion efficiency

**Malfunction Physics & Synthetic Reproduction:**

The furnace charging end uses **hydraulic pusher cylinders** (in pusher-type) or **walking beam lift-and-carry cylinders** to advance slabs. The cylinder piston seals operate in a high-temperature environment (furnace seal area: 300–500°C ambient). Seal material (PTFE composite or graphite packing) undergoes **creep** under sustained compression at elevated temperature — the seal loses contact force and begins to **bypass**, causing cylinder drift. Burner nozzles can crack from **thermal shock** during cold starts when cold fuel gas contacts a hot nozzle face.

*Synthetic slab underheating curve from burner failure:*
```
Assume Zone 3 burner fails (reduces Zone 3 heat input by 30%):

T_slab_discharge(t) = T_target - ΔT_deficit × (1 - e^(-t/τ_thermal))
where:
  T_target = 1200°C
  ΔT_deficit = 60°C (zone 3 burner failure deficit)
  τ_thermal = 45 min (slab thermal lag through furnace)
  
Consequence: Cold slab → insufficient plasticity at roughing mill
  → Rolling force spike: F_roll = K × σ_yield(T) × contact_area
  where σ_yield(1140°C) ≈ 1.5× σ_yield(1200°C)
  → Drive motor current spike at roughing mill → spindle overload alarm
```

**Spare Part:** Fuel burner nozzle assembly — **8-week lead time**

---

### F5-EQ02 — Hydraulic High-Pressure Descaler (HHPD)

**What it does:** Before rolling, the slab surface is covered in a layer of iron oxide scale (FeO, Fe₂O₃, Fe₃O₄) formed during reheating — typically 1–5 mm thick. If this scale is rolled into the strip, it creates surface defects (scale pits) that are visible on the final product. The descaler uses multiple headers of nozzles firing water at 150–280 bar, at angles calculated to create a hydraulic shear force that detaches and flushes scale from the slab surface.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Header pressure | 200–280 bar | < 180 bar (inadequate scale removal) |
| Water flow per header | 200–400 L/min | < 150 L/min (nozzle blockage) |
| Nozzle angle | 15° from vertical (optimal impact) | — |
| Pump pressure (supply) | 220–300 bar | < 200 bar (pump wear) |

**Sensors:**
- `Water pressure transmitter` at header — primary quality indicator
- `Header water flow meter` — confirms nozzle coverage is adequate

**Malfunction Physics & Synthetic Reproduction:**

The descaler nozzles are **fan-jet tungsten carbide** inserts. Despite their hardness (WC-Co composite, ~1400 HV), the nozzle orifice undergoes **abrasive erosion** from scale particles entrained in the water stream, and **cavitation erosion** from the rapid pressure drop across the nozzle orifice — imploding cavitation bubbles erode the nozzle bore, causing the orifice to enlarge. A worn orifice produces a lower-velocity, wider-angle jet with reduced hydraulic impact force: `F_impact = ρ × Q × V_jet × cos(θ) → drops as V_jet decreases with orifice area increase`.

*Synthetic pressure vs. nozzle wear progression:*
```
P_header(n) = P_supply × (d_nozzle_0 / d_nozzle(n))^4  [pressure inversely ∝ (orifice area)²]
d_nozzle(n) = d_0 × (1 + erosion_rate × n)
erosion_rate = 0.0002 per scale-removal cycle (hard scale)

Alarm: P_header < 190 bar → nozzle set replacement
Scale removal quality: defect_rate(t) ∝ (1/P_header(t))^0.7
```

**Cascade effect:** Insufficient descaling → scale rolled into strip surface → scale pit defects visible on final product → customer quality claims for Products Y and Z.

**Spare Part:** Tungsten carbide spray nozzle — **4-week lead time**

---

### F5-EQ03 — Roughing Mill Stand (RMS)

**What it does:** A massive reversing or continuous rolling stand with large work rolls (800–1200 mm diameter) that reduces the slab (220 mm thick) to a **transfer bar** (~25–40 mm thick) in 5–7 passes. The rolling force is enormous — typically 20,000–40,000 kN (2,000–4,000 tonnes force) per pass. The main drive motors are the most powerful in the plant (10–20 MW each).

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Rolling force | 20,000–40,000 kN | > 45,000 kN (hard slab or cold metal) |
| Main drive motor current | 60–80% rated | > 95% rated |
| Mill stand housing deflection | < 2 mm | > 4 mm (structural fatigue risk) |
| Roll gap (per pass) | Programmed profile | Deviation > ±3 mm |
| Spindle coupling torque | 800–2000 kNm | > 2500 kNm |

**Sensors:**
- `Sideload cells` (load cells measuring lateral force on roll chocks) — detect rolling force asymmetry
- `Main drive motor current transducers` — total power draw monitoring

**Malfunction Physics & Synthetic Reproduction:**

The spindle coupling (a Hooke's joint or cardan shaft) connects the drive motor gearbox to the roll necks. Under the massive reversing torques of roughing mill operation, the coupling's **cross-pin (trunnion)** bearings experience very high peak contact stress during each reversal. **Fretting wear** (micro-slip at the trunnion-to-yoke interface under oscillating load with no full rotation) progressively removes material from the trunnion surface — detectable as a knocking vibration during direction reversals. The mill housing (the massive C-frame that holds the rolls apart) accumulates **fatigue damage** at the column-crosshead junction — a high-stress concentration area under cyclic bending from rolling force variations.

*Synthetic spindle coupling degradation vibration:*
```
V_coupling(t) = V_0 × sin(ω_roll × t)              [baseline rolling vibration]
              + V_fretting(n) × δ(t - t_reversal)   [impulsive knock at each reversal]
where:
  V_fretting(n) = V_fretting_0 × n^0.5  [square-root wear accumulation]
  n = number of reversal cycles

Alarm: V_fretting > 3× baseline impulsive level → coupling inspection
```

**Spare Part:** Main drive gear coupling — **14-week lead time**

---

### F5-EQ04 — Synchronized Flying Crop Shear (SFCS)

**What it does:** As the transfer bar exits the roughing mill, its head and tail ends are irregular (cobble-shaped, non-uniform temperature). The crop shear cuts these irregular ends off (the "crop") while the bar is still moving at roughing-mill exit speed (~1–3 m/s). The shear must be perfectly synchronized with the strip speed to make a clean, perpendicular cut — a miss-timed cut creates a skewed bar head that can jam in the finishing mill.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Blade speed (at cut) | Synchronized to bar speed ± 0.5% | Sync error > 1% |
| Hydraulic pressure (blade drive) | 150–200 bar | < 130 bar |
| Blade gap (between upper and lower) | 0.5–1.5 mm (% of bar thickness) | > 2% (poor shear quality) |
| Blade temperature | < 300°C (air-cooled) | > 400°C |

**Sensors:**
- `Blade position encoder` (absolute) — confirms blade is at correct position for synchronization
- `Hydraulic pressure transmitter` — confirms blade drive is ready

**Malfunction Physics & Synthetic Reproduction:**

The shear blades are made of **high-alloy tool steel** (H13 or similar, hot-work tool steel). Each cut subjects the blade edge to a compressive impact (cutting force 5,000–15,000 kN) followed by tension release. **Thermal fatigue** from the hot transfer bar (1100°C) contacting the blade surface creates a shallow heat-affected zone — the blade surface layer heats rapidly then quenches by conduction into the blade body. After many cycles, **thermal fatigue cracks** (heat checks) form perpendicular to the blade edge, growing inward. These cracks eventually propagate transversely, causing **blade chipping** — a fragment of blade edge breaks off. Simultaneously, **synchronization lag** can arise if the hydraulic accumulator pressure decays between cuts (valve leakage).

*Synthetic blade chipping fault signal:*
```
Normal cut force profile:
F_cut(t) = F_max × (1 - e^(-t/τ_rise)) × e^(-t/τ_decay)  [rise and fall per cut]

Chipped blade cut force profile:
F_cut_chipped(t) = F_max × (1 + ΔF_chip/F_max) × ...  [higher peak, irregular shape]
                 + high-frequency noise spike (blade-to-bar impact asymmetry)

Detection: FFT of cutting force; chipping creates harmonic content at 3× and 5× fundamental cut frequency
```

**Spare Part:** High-alloy steel shear blades — **6-week lead time**

---

### F5-EQ05 — Finishing Stands F1–F7 (FS)

**What it does:** Seven rolling stands arranged in series (tandem mill), each reducing the strip thickness progressively. Transfer bar enters F1 at 25–40 mm and exits F7 at the target final gauge (2–16 mm). The strip accelerates through the mill from ~1 m/s (F1 entry) to up to 20 m/s (F7 exit). All seven stands operate simultaneously on the same strip — an interruption at any stand immediately affects all others.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Chock sideload force | 200–500 kN | > 700 kN (chock lock failure) |
| Roll torque per stand | 500–3000 kNm (varies by stand) | > 3500 kNm |
| Strip tension (interstand) | 20–80 MPa | < 10 MPa (strip buckle risk) |
| Strip temperature F7 exit | 820–920°C | < 800°C (product spec risk) |
| Speed ratio (F1:F7) | ~1:8 to 1:15 (volume conservation) | Deviation > 0.5% between adjacent stands |

**Sensors:**
- `Chock sideload cells` — detect lateral forces indicating chock slide plate wear or housing misalignment
- `Roll torque meters` — per-stand drive torque monitoring

**Malfunction Physics & Synthetic Reproduction:**

The roll **chock** is the bearing housing that supports the roll neck. The chock slides vertically inside the mill housing window (the gap between the two vertical columns). **Bronze wear plates** (liner plates) on the chock sides provide controlled sliding contact. Under repeated roll changes (thermal cycling, mechanical shock) and rolling force-induced lateral drift, the wear plates undergo **abrasive wear** — direct contact between chock steel and housing column steel removes material. As clearance increases, the roll can shift laterally (**chock drift**), producing strip that is thicker on one edge than the other (**wedge cross-section**) — a primary cause of Product Y/Z customer complaints.

*Synthetic chock wear → strip wedge progression:*
```
Chock_clearance(n_rolls) = C_0 + wear_coeff × n_rolls
where:
  C_0 = 0.1 mm (new wear plate)
  wear_coeff = 0.002 mm per roll change cycle

Strip_wedge(n) = K × Chock_clearance(n) × (rolling_force / housing_stiffness)
where K = 0.8 (empirical coupling factor)

Alarm: Strip_wedge > 0.05 mm across 1600 mm width → schedule wear plate replacement
```

**Spare Part:** Bronze chock wear plates — **4-week lead time**

---

### F5-EQ06 — Work Rolls (WR)

**What it does:** The work rolls are the actual rolls that contact the strip and apply the rolling force. In the finishing mill, work roll diameters are 600–800 mm. They are made by centrifugal casting — an outer shell of high-chromium iron or HSS (High Speed Steel) for wear resistance, with a ductile iron core for toughness. Work rolls are changed every 4–8 hours due to surface wear and thermal fatigue.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Roll surface roughness (Ra) | 0.5–2.0 μm (depends on product) | > 4.0 μm (surface defect transfer risk) |
| Roll surface temperature | 80–200°C (with water cooling) | > 300°C local (fire mark risk) |
| Roll eccentricity | < 0.03 mm TIR | > 0.1 mm (thickness periodic variation) |
| Roll campaign (km of strip rolled) | 50–150 km between changes | Per scheduled roll change |

**Sensors:**
- `Roll surface profile scanner` (laser profilometer) — measures roll crown and surface roughness after grinding

**Malfunction Physics & Synthetic Reproduction:**

The work roll surface undergoes **thermal fatigue** from the cyclic heating by the hot strip and cooling by the water sprays. Cracks initiate at the surface (the "fire crack" or "heat check" network) perpendicular to the circumferential direction — a classic thermal fatigue crack morphology. Under continued rolling, these cracks are subjected to both tensile (during strip contact, as the roll surface stretches slightly over the contact zone) and compressive (during cooling) stresses — driving crack propagation into the roll body. If a crack depth reaches 1–3 mm, **spalling** occurs — a fragment of the roll surface detaches at high speed, potentially damaging the strip surface and the backup roll.

*Synthetic roll thermal fatigue crack depth growth model:*
```
Crack_depth(N) = C × (ΔK)^m × N    [Paris Law: da/dN = C × ΔK^m]
where:
  ΔK = ΔK_thermal + ΔK_mechanical  [total stress intensity factor range]
  ΔK_thermal ≈ E × α × ΔT / (2 × √(π × a))
  ΔK_mechanical ≈ rolling_force × f(geometry) / √(π × a)
  C = 2×10⁻¹², m = 3.2  [material constants for HSS roll steel]

Spalling risk: Crack_depth > 1.5 mm AND Crack_length > 30 mm
→ Remove roll immediately (roll scanner detects during routine inspection)
```

**Spare Part:** Centrifugally cast steel roll — **12-week lead time**

---

### F5-EQ07 — Backup Rolls (BUR)

**What it does:** Backup rolls (1200–1600 mm diameter) support the work rolls from deflecting under the enormous rolling force (20,000–40,000 kN per stand). Without backup rolls, the work roll would bow in the middle, producing strip thicker in the center than at the edges. Backup rolls are changed every 2–4 weeks (much less frequently than work rolls).

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Bearing temperature | 40–65°C | > 80°C |
| Roll neck surface condition | No cracking (verified by MT) | Crack indication → remove roll |
| Roll crown profile | Per design (slightly convex) | Profile deviation > 0.05 mm |

**Sensors:**
- `Bearing temperature RTDs` (at both drive-end and non-drive-end chocks) — primary bearing health indicator

**Malfunction Physics & Synthetic Reproduction:**

Backup roll bearings (large tapered roller or cylindrical roller bearings, 600–900 mm bore) carry the full rolling force transmitted from the work roll through the chock. The race experiences **Hertzian contact stress** at each roller contact. Sub-surface shear stress (maximum at ~0.5× Hertz contact half-width depth) creates **fatigue cracks** after N cycles described by the Lundberg-Palmgren model: `L₁₀ = (C/P)^p` where C = dynamic load rating, P = equivalent load, p = 10/3 for roller bearings. The roll neck — where the roll transitions from the roll body to the neck entering the bearing — is a stress concentration site; **neck cracks** initiate here under bending fatigue.

*Synthetic backup roll bearing temperature rise:*
```
T_bearing(t) = T_ambient + P_bearing / (h_conv × A_housing)
P_bearing = μ × F_roll × v_bearing_surface

Normal: T = 60°C
Early fatigue: T begins rising at 0.5°C per shift (increased rolling resistance from surface damage)
Spalling onset: T rises sharply at 2°C/hour → alarm at 80°C
→ Vibration signature: BPFO = (N_r/2) × (1 - d_r cos α / d_m) × n_shaft
   Dominant frequency changes as spalled zone grows
```

**Spare Part:** Cast steel backup roll — **16-week lead time**

---

### F5-EQ08 — VFD Main Motors (VFDMM)

**What it does:** Large AC induction motors (10–20 MW each) controlled by Variable Frequency Drives (VFDs) drive each finishing stand. VFDs allow precise speed control and synchronized acceleration across all 7 stands. The motors must maintain exact speed ratios between stands (within ±0.01%) to control interstand tension correctly.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Stator winding temperature | 80–120°C (class F insulation) | > 140°C |
| Rotor current (actual) | 70–90% rated | > 100% rated |
| VFD DC bus voltage | 690–800 V (typical) | > 900 V (overvoltage) |
| Bearing vibration | < 2.5 mm/s RMS | > 4.5 mm/s |

**Sensors:**
- `Rotor winding current transducers` — per-phase monitoring; asymmetry indicates rotor bar cracking
- `Bearing vibration sensors` — motor health monitoring

**Malfunction Physics & Synthetic Reproduction:**

Rotor bars in squirrel-cage induction motors can develop **fatigue cracks** from the cyclic electromagnetic forces (at twice supply frequency) and from the centrifugal stresses (particularly during startup acceleration). A cracked rotor bar creates an asymmetric rotor impedance — the motor draws unbalanced current from the three phases, producing a characteristic **sideband signature in the motor current spectrum** at `f_supply ± 2s × f_supply` (where s = slip). This is the basis of **Motor Current Signature Analysis (MCSA)** — a non-invasive diagnostic technique.

*Synthetic rotor bar crack MCSA signature:*
```
I_phase(t) = I_fundamental × sin(2π × f_supply × t)
           + I_sidebands × sin(2π × (f_supply ± 2s×f_supply) × t)   [cracked bar sidebands]

I_sidebands(n_cracks) = I_sideband_0 × n_cracks × crack_severity
where:
  n_cracks = number of cracked bars
  crack_severity = 0 (hairline) to 1.0 (full break)
  
MCSA alarm: sideband amplitude > -30 dB relative to fundamental → inspect rotor
```

**Spare Part:** Motor stator winding coils — **20-week lead time**

---

### F5-EQ09 — Hydraulic AGC Cylinders (HAGCC)

**What it does:** **Automatic Gauge Control (AGC)** is the closed-loop feedback system that maintains strip thickness to within ±25 μm of target. Large hydraulic cylinders (500–800 mm bore, high-pressure: 250–350 bar) mounted in the mill housing press the rolls together. A position LVDT on each cylinder measures the roll gap to ±1 μm resolution. The AGC controller modulates hydraulic pressure thousands of times per second to correct for incoming slab thickness variations and rolling force changes.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Cylinder pressure | 200–350 bar | > 380 bar (overload) |
| LVDT position | Per target gauge ±0.01 mm | Drift > 0.15 mm/min under hold |
| Response frequency | 0–40 Hz bandwidth | Bandwidth drop > 30% |
| Hydraulic oil cleanliness | ISO 4406 class 15/13/10 | > 18/16/13 (particle contamination) |

**Sensors:**
- `LVDT cylinder stroke sensor` (sub-micron resolution) — primary gauge control feedback signal
- `Cylinder pressure gauge` — load monitoring

**Malfunction Physics & Synthetic Reproduction:**

The AGC cylinder piston seals are **high-performance polyurethane or PTFE composite seals** operating at 350 bar continuous pressure with frequent dynamic stroking. The seal undergoes **extrusion wear** — under high pressure, the seal material is forced into the cylinder-piston clearance gap (typically 20–50 μm). This extrusion removes material from the seal's sealing lip, increasing the bypass leakage. As leakage increases, the cylinder can no longer hold position under load — the LVDT detects a **drift rate** (mm/min under constant pressure, with no commanded movement). This directly causes strip thickness error.

*Synthetic AGC seal leakage drift model:*
```
Drift_rate(t) = Drift_0 × e^(t/τ_seal)     [exponential growth as seal degrades]
where:
  Drift_0 = 0.001 mm/min (new seal, minimal bypass)
  τ_seal = 4000 hours

Thickness_error = Drift_rate × control_response_delay × rolling_speed
rolling_speed = 15 m/s (F7 typical)
control_response_delay = 0.05 s (AGC bandwidth limitation)

Alarm: Drift_rate > 0.15 mm/min → thickness error > 50μm → schedule seal replacement
Critical: Drift_rate > 0.4 mm/min → product out-of-tolerance → down-speed and reduce thickness targets
```

**Spare Part:** AGC high-pressure seal kit — **3-week lead time**

---

### F5-EQ10 — Run-Out Table Laminar Cooling (ROTLC)

**What it does:** After the strip exits F7 at 820–920°C, it travels along a 100–150 m long run-out table (a series of driven roller conveyors) while laminar flow cooling water is applied from above (and sometimes below). The **cooling rate** and **final coiling temperature** (550–700°C) determine the steel's final **microstructure** — the ratio of ferrite, pearlite, bainite — and therefore its mechanical properties (tensile strength, elongation, hardness). This is as much a metallurgical process as a physical one.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Cooling water flow (per header zone) | 200–400 L/min | < 150 L/min (zone control loss) |
| Coiling temperature target | 550–700°C (grade-dependent) | > ±20°C from target |
| Spray valve response | < 100 ms | > 200 ms (valve sticking) |
| Runout table roller speed | Matches F7 strip speed ± 0.5% | Slip > 1% (cobble risk) |

**Sensors:**
- `Pyrometers` (non-contact) at entry, mid-table, and exit — control input for cooling model
- `Water valve positioners` per zone — confirm valve is at commanded position

**Malfunction Physics & Synthetic Reproduction:**

The pneumatic spray control valves use **rubber diaphragm actuators** to open and close. Prolonged exposure to the wet, warm, oxidizing environment of the run-out table area causes **rubber oxidative ageing** — the cross-linked elastomer undergoes chain scission, losing elasticity and hardening. A hardened diaphragm requires higher actuator air pressure to stroke, eventually **sticking at partial-open** positions — spray rate control is lost. Nozzles can also **clog** with mineral deposits from the cooling water (calcium carbonate scale in hard water areas).

*Synthetic coiling temperature deviation from valve sticking:*
```
If zone k valve sticks at X% open (instead of commanded Y%):
  Effective_cooling_zone_k = X/Y × Design_cooling_rate_k
  
T_coil = T_F7_exit - Σ(ΔT_zone_j) for j = 1 to N_zones
where ΔT_zone_j = Cooling_rate_j × Residence_time_j

Stuck zone: ΔT_zone_k_actual = (X/Y) × ΔT_zone_k_design
→ T_coil shifts by ΔT_miss = (1 - X/Y) × ΔT_zone_k_design

At 50% valve sticking in zone 5 (of 10): T_coil deviation = +25 to +40°C
→ Yield strength deviation: ΔYS = 15–25 MPa (automotive spec violation)
```

**Spare Part:** Pneumatic spray control valve — **6-week lead time**

---

### F5-EQ11 — Down Coiler Mandrel (DCM)

**What it does:** The final machine on the run-out table. The mandrel is a segmented, expanding steel drum (700–900 mm diameter) that the strip wraps around as it is wound into a coil. The mandrel expands hydraulically to grip the coil's inner wrap; once coiling is complete, it contracts to allow the coil to be stripped off. Two or three coilers operate alternately to provide continuous winding.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Mandrel expansion diameter | Per coil ID target ± 2 mm | Expansion error > 4 mm |
| Coiling tension | 15–50 MPa in strip | > 70 MPa (strip stretching) |
| Motor current | 60–85% rated | > 100% rated |
| Coil strip temperature | 550–700°C at entry | > 750°C (heat damage to surface) |

**Sensors:**
- `Mandrel expansion LVDT` — confirms mandrel has reached correct diameter
- `Coiler motor current transducer` — monitors tension level

**Malfunction Physics & Synthetic Reproduction:**

The mandrel segments slide radially on the conical spindle as the hydraulic cylinder extends/retracts. The segment slide **wear plates** (bronze or hardened steel) experience **fretting wear** under the combined vibration of the coiling process and the cyclic expansion/contraction. As wear plates thin, segment positional accuracy degrades — the mandrel no longer expands to a perfect circle, producing **non-circular coil IDs** that cause strip breakage on the F6 uncoiler. The hydraulic expansion cylinder seals fail by the same extrusion mechanism as the AGC cylinders.

*Synthetic mandrel segment wear → coil ID deviation:*
```
Segment_wear(n) = wear_rate × n  [n = expansion/contraction cycles]
wear_rate = 0.002 mm/cycle

Mandrel_roundness_error(n) = Σ(Segment_wear_i(n) × sin(i × 2π/N_segments))
→ Non-circular ID of coil increases with wear

Alarm: Roundness_error > 3 mm → schedule wear plate replacement
F6 impact: coil ID out-of-round → strip neck at uncoiler → strip break → production loss
```

**Spare Part:** Coiler segment wear plate — **8-week lead time**

---

### F5-EQ12 — Roll Chock Accelerometers (RCA)

**What it does:** Piezoelectric accelerometers mounted directly on the roll chocks of each finishing stand to capture high-frequency vibration signatures. These are the primary sensors for detecting roll bearing defects (inner/outer race, roller element, cage faults), roll eccentricity, and mill chatter (a regenerative vibration instability of the rolling process itself). Data is analyzed in real-time by spectrum analyzers looking for characteristic fault frequencies.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Overall vibration level | 1.5–4.5 mm/s RMS | > 8.0 mm/s (stand F7 chatter onset) |
| BPFO frequency amplitude | < −25 dB relative to 1× | > −15 dB → bearing fault developing |
| Chatter frequency | None (< −40 dB) | Detectable peak → reduce rolling speed |

**Sensors:**
- `Piezoelectric accelerometers` (100 mV/g sensitivity, 5 kHz bandwidth)
- `Signal conditioner/converter` — converts accelerometer charge output to voltage for ADC

**Malfunction Physics & Synthetic Reproduction:**

The accelerometer cable shielding in the harsh mill environment (water, vibration, electromagnetic interference from large motor drives) can suffer **shield conductor fatigue fracture** — the shield braid eventually breaks from metal fatigue at the cable-connector junction (the highest flex point). This causes **electromagnetic interference (EMI) pickup** — the signal shows 50/60 Hz and harmonics from motor drives, overwhelming the actual bearing fault signal. The piezoelectric crystal can crack from a **mechanical shock** (a strip cobble impact on the chock) — a cracked crystal generates a lower sensitivity signal.

*Synthetic EMI contamination signature:*
```
V_signal_clean(t) = V_bearing_fault × sin(2π × f_BPFO × t)  [true bearing signal]
V_signal_contaminated(t) = V_bearing_fault × sin(2π × f_BPFO × t)
                         + V_EMI × sin(2π × 50 × t)          [50 Hz power frequency pickup]
                         + V_EMI/3 × sin(2π × 150 × t)       [3rd harmonic]

Detection: when V_EMI > V_bearing_fault → false alarms increase; real faults masked
Shield failure indicator: V_EMI / V_bearing_fault > 1.5 → replace sensor cable
```

**Spare Part:** Piezoelectric accelerometer — **3-week lead time**

---

### F5-EQ13 — X-Ray Thickness Gauge (XTG)

**What it does:** A non-contact gauge that measures the strip thickness to ±1 μm accuracy using the **attenuation of X-rays** passing through the strip. It is mounted at the exit of each finishing stand and provides real-time feedback to the AGC system. Without this gauge, thickness control is blind.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Measurement accuracy | ±1 μm | > ±5 μm (calibration drift) |
| X-ray tube voltage | 80–150 kV | > 180 kV (insulation stress) |
| Cooling water flow | 5–10 L/min | < 3 L/min |
| Detector signal | Stable baseline counts | > ±5% drift (detector aging) |

**Sensors:**
- `X-ray ionization detector` (scintillation or ionization chamber) — measures transmitted X-ray intensity
- `Cooling jacket water flow sensor` — protects X-ray tube from thermal damage

**Malfunction Physics & Synthetic Reproduction:**

The X-ray tube produces X-rays by accelerating electrons to high voltage and bombarding a tungsten target anode. Over time, **electron bombardment erodes the tungsten target** and deposits tungsten on the glass envelope interior — the glass **darkens** (coloration), attenuating the X-ray beam by 5–15%. Simultaneously, the **high-voltage transformer insulation** (paper-oil impregnated or epoxy) degrades from cumulative electrical stress — partial discharge events erode the insulation incrementally until **dielectric breakdown** (arc-over) occurs. This failure mode is often preceded by **partial discharge noise** detectable in the tube's electrical supply.

*Synthetic X-ray signal drift from tube aging:*
```
I_detector(t) = I_0 × e^(-μ × thickness_strip) × Tube_transmission(t)
Tube_transmission(t) = T_0 × (1 - darkening_rate × t)
where:
  T_0 = 1.0 (new tube)
  darkening_rate = 5×10⁻⁵ per hour

Measured_thickness = - (1/μ) × ln(I_detector / (I_0 × Tube_transmission))
Error: if Tube_transmission not corrected for → systematic thickness overestimate
Gauge calibration detects this via reference foil comparison every 4 hours
Alarm: Calibration error > 5 μm → tube replacement required
```

**Spare Part:** X-ray tube source block — **10-week lead time**

---

### F5-EQ14 — Roll Shop Grinder (RSG)

**What it does:** Between campaigns, worn work rolls are sent to the roll shop for **precision cylindrical grinding** to restore their surface profile and roughness. The grinder uses a rotating abrasive wheel traversing along the roll length, removing 0.1–0.5 mm of surface material per grind to eliminate heat checks, cracks, and worn profile. The ground surface quality directly determines the strip surface quality in the next campaign.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Grinding wheel load | 2–8 kN radial | > 12 kN (wheel damage risk) |
| Spindle speed | 800–1200 RPM | > 1400 RPM |
| Traverse speed | 0.5–3.0 m/min | — |
| Roll surface roughness post-grind | Ra = 0.5–2.0 μm | > 3.0 μm (grind quality failure) |

**Sensors:**
- `Grinding wheel load cell` — primary process control variable
- `Motor speed encoder` — spindle speed feedback

**Malfunction Physics & Synthetic Reproduction:**

The grinding wheel spindle is supported by precision **angular contact ball bearings** (preloaded to eliminate runout). These bearings experience **fatigue and Brinelling** — during intermittent operation with thermal cycling, the balls can **false-Brinell** the races (micro-indentations from vibration while stationary). False Brinelling creates **periodic raceway damage** at ball spacing intervals — detectable in vibration as a characteristic ball pass frequency signature. Grinding wheel imbalance causes vibration that transfers to the roll surface as **chatter marks** — a periodic surface undulation that is then rolled into the strip surface in the next campaign.

*Synthetic grinding wheel imbalance → roll surface chatter:*
```
Surface_waviness(x) = A_chatter × sin(2π × x / λ_chatter)
λ_chatter = V_traverse / f_spindle   [wavelength depends on traverse and spindle speed]
A_chatter ∝ Imbalance_mass × (ω²) / (Spindle_stiffness)

Strip surface waviness after rolling: similar wavelength (circumferentially) → periodic brightness variation
Customer detection: waviness > 5 μm visible under angle lighting → quality claim
```

**Spare Part:** Dynamic spindle bearings — **8-week lead time**

---

### F5-EQ15 — Looper Tension Arm (LTA)

**What it does:** Between each pair of adjacent finishing stands, a **looper arm** holds a small loop of strip and maintains constant **strip tension** by providing a precise back-tension force. The looper pivots on a hydraulic cylinder and uses a **roll** to contact the strip. Correct interstand tension is critical — too high causes strip elongation and gauge reduction; too low allows strip to buckle and cobble.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Looper arm angle | 10–35° from horizontal | > 40° (strip slack) or < 5° (strip too tight) |
| Hydraulic cylinder pressure | 80–150 bar | > 200 bar (abnormal strip load) |
| Looper roll bearing temperature | < 60°C | > 90°C |
| Tension control response | < 50 ms | > 100 ms (control instability) |

**Sensors:**
- `Arm angle resolver` (absolute angular encoder) — primary position/tension feedback
- `Cylinder pressure transmitter` — secondary tension measurement

**Malfunction Physics & Synthetic Reproduction:**

The looper roll rotates at high speed (the strip contacts it at 5–15 m/s) in a hot, wet environment. The **bearing cartridge** is a sealed unit (no external lubrication access during operation). Bearing grease degrades from the combined effect of **thermal ageing** (base oil evaporation at 80–120°C contact temperature) and **mechanical shearing** (high-speed shear of grease at ball-race contact). Once grease becomes a dry powder, the bearing operates in **boundary lubrication** → rapid **adhesive wear** → bearing seizure. The air cylinder can develop a slow air leak from **O-ring hardening** in the hot mill environment.

*Synthetic looper bearing seizure temperature progression:*
```
Stage 1 (Normal): T_looper_bearing = 55°C, arm angle = 22° (steady)
Stage 2 (Grease depletion, ~500 hrs): T starts rising +0.5°C/shift
Stage 3 (Boundary lubrication onset): T = 75°C; bearing noise increases
  Arm angle becomes jittery: σ(angle) doubles from 0.5° to 1.0°
Stage 4 (Seizure imminent): T = 90°C; arm angle oscillates ±3°; interstand tension unstable
  → Strip gauge variation increases; automatic speed reduction triggered
Stage 5 (Seized): Arm locks → strip tension uncontrolled → cobble risk in 10–30 seconds
```

**Spare Part:** Looper roll bearing cartridge — **6-week lead time**

---

## Integrated Safety SOPs

### SOP-F5-01: Roll Change Procedure (Finishing Mill)

1. Complete rolling of active coil; abort next slab entry
2. Shut down finishing mill train; apply mill brakes
3. Retract mill exit guides and roller wipers from roll contact position
4. Retract roll changer translation cover; verify position with proximity switches
5. Remove worn work rolls and chock assemblies via automatic roll changer
6. Transport chocks to roll shop for wear plate inspection and bearing check
7. Insert new rolls (pre-heated to 80°C to prevent thermal shock against hot housing)
8. Reset roll gap reference to zero using reference gauge block
9. Verify AGC LVDT calibration before restart

### SOP-F5-02: Strip Cobble Emergency Response

A **cobble** is a catastrophic strip folding/jamming event:
1. Emergency stop all stands immediately (automatic on cobble detection)
2. Do NOT enter the mill bay until all rolls have stopped (cobbling strip can travel at 20 m/s)
3. Engage mill-bay cobble removal crane and cobble shear
4. Inspect all roll surfaces for damage from strip impact
5. Check all guide tables for deformation before restart
6. Root cause analysis required before next coil (identify which stand lost tension control)

---

## Cascade Impact Summary — F5

| Failure | Immediate Effect | Downstream Impact |
|:---|:---|:---|
| EQ06 (Work Roll) spalling | Emergency roll change; 30–60 min downtime | F6 HRC supply interruption; production planning disruption |
| EQ09 (AGC) seal leak | Strip thickness out of tolerance | F6 TCMS rolling force wrong; surface quality claims |
| EQ15 (Looper) seizure | Interstand tension loss → cobble | Mill damage; 4–8 hr recovery; F6 supply gap |
| EQ10 (ROT Cooling) valve stuck | Wrong coiling temperature | Wrong microstructure → mechanical property claims |
| EQ01 (Reheating Furnace) burner failure | Cold slab → rolling force spike → drive overload | Slab scrapped; furnace throughput reduced; F6 starved |