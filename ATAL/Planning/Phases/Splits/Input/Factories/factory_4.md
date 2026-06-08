# 🏭 Factory 4 — Steel Melting Shop (SMS)

---

## Overview

**Factory ID:** F4  
**Full Name:** Steel Melting Shop  
**Abbreviation:** SMS  
**Primary Inputs:** Liquid Hot Metal from F3 (~1480°C), Steel Scrap  
**Primary Outputs:** Continuously cast steel slabs (200–250 mm thick, 900–1650 mm wide, 6–12 m long)

### What This Factory Does (Plain English)

Hot metal from the Blast Furnace (F3) is 94% iron — the remaining 6% consists of carbon (~4.5%), silicon (~0.5%), sulphur, phosphorus, and manganese, all of which must be reduced to specific levels to produce steel. The SMS does this in three stages:

1. **Basic Oxygen Furnace (BOF):** Liquid hot metal is poured into a large, tiltable vessel. A water-cooled lance blows pure oxygen at supersonic speed onto the surface of the melt. Oxygen reacts with and burns off the excess carbon, silicon, and other impurities — the heat generated is so intense (bath temperature reaches 1600–1700°C) that no external heating is needed. The result is liquid **crude steel**.

2. **Secondary Metallurgy (Ladle Furnace + Vacuum Degasser):** The crude steel is tapped into a ladle, where graphite electrodes heat it precisely, alloy additions fine-tune chemistry, and vacuum treatment removes dissolved hydrogen and nitrogen. This stage produces **finished-grade liquid steel** to exact specifications.

3. **Continuous Casting:** The liquid steel is poured into a water-cooled copper mould, where it solidifies into a strand that is continuously withdrawn, bent, and cut into **slabs** — the semi-finished product sent to F5.

### Upstream Dependency
Hot metal chemistry from F3 directly controls BOF blow parameters. A 0.1% Si increase in hot metal requires ~200–400 Nm³ additional oxygen — extending blow time by 2–4 minutes, changing slag chemistry, and affecting refractory wear rate.

### Downstream Dependency
Slab chemistry, temperature, and surface quality directly determine F5 (Hot Strip Mill) furnace reheating parameters, rolling force, and final mechanical properties of the strip.

---

## 15 Core Equipment Assets

### F4-EQ01 — BOF Converter Vessel (BOFC)

**What it does:** A pear-shaped, refractory-lined steel vessel (250–350 tonne capacity) mounted on a trunnion ring, allowing it to tilt 360° for charging, blowing, sampling, tapping, and deslagging. The inner lining is made of magnesium oxide-carbon (MgO-C) bricks — a material chosen for its resistance to basic slag attack.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| Vessel tilt angle | 0–360° (continuous) | Deviation from setpoint > ±1° |
| Shell temperature (outer) | 200–400°C | > 600°C (hot-spot = lining wear) |
| Blow duration | 14–18 minutes | > 20 min (inefficient blow) |
| Lining thickness | > 600 mm (new) → > 200 mm (safe limit) | < 200 mm → reline |
| Heat number | 1 per ~40–45 min | — |

**Sensors:**
- `Vessel tilt angle encoder` — absolute tilt position for safe tilting operations
- `Shell RTDs` (distributed thermocouple array on outer shell) — detect local hot-spots from lining wear

**Malfunction Physics & Synthetic Reproduction:**

MgO-C bricks wear through a two-mechanism process: **oxidation of the carbon binder** at the hot face (CO formation from C + ½O₂ at 1600°C) weakens the brick structure, and simultaneous **chemical dissolution** of MgO by liquid slag (FeO in slag attacks the brick surface). The trunnion ring area experiences the greatest wear because it is the point where slag repeatedly contacts the lining during tilting.

*Synthetic lining wear + shell temperature model:*
```
Thickness(n) = Thickness_0 - wear_rate_per_heat × n
wear_rate_per_heat = 0.3 mm/heat (normal), 0.6 mm/heat (hot metal Si > 0.6%)

Shell_temp(n) = T_baseline + (T_max - T_baseline) × (1 - Thickness(n)/Thickness_0)^2
where:
  T_baseline = 250°C
  T_max = 800°C (at full lining loss)

Alarm at Shell_temp > 550°C → laser profilometer measurement (EQ12) triggered
Emergency at Shell_temp > 700°C → schedule immediate reline
```

**Cascade effect:** Lining burnthrough → catastrophic steel breakout from converter vessel → fire and explosion → multi-week rebuild → full F4 shutdown affecting F5 and F6.

**Spare Part:** MgO-C refractory bricks — **16-week lead time**

---

### F4-EQ02 — Water-Cooled Oxygen Lance (WCOL)

**What it does:** A 20–25 m long steel pipe (three concentric tubes for water in, water out, and oxygen) lowered into the converter to within 2–3 m of the molten bath surface. Oxygen flows at 800–1000 Nm³/min through the copper lance tip nozzles (4–6 convergent-divergent supersonic nozzles) at Mach 2 velocity, creating a powerful jet that oxidizes impurities.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| O₂ flow rate | 800–1000 Nm³/min | > 1100 Nm³/min |
| Cooling water flow | 1200–1500 gallons/min | < 1100 gallons/min → AUTO ABORT |
| Return water temperature | 30–40°C | > 55°C → AUTO ABORT |
| Lance height above bath | 2.0–3.5 m (programmed profile) | — |
| Blow heats before rotation | 80–120 heats | > 150 heats |

**Sensors:**
- `O₂ flow meter` (Coriolis or vortex) — primary oxygen delivery measurement
- `Cooling water RTD` (inlet and outlet) — CRITICAL safety sensor; trip if ΔT exceeds limit
- `Cooling water flow transmitter` — trip if flow falls below 1100 gallons/min

**Malfunction Physics & Synthetic Reproduction:**

The copper lance tip is exposed to the thermal radiation of the 1700°C BOF bath and the kinetic energy of the oxygen jets rebounding from the bath surface. **Thermal fatigue** causes microcracking at the tip interface between copper and the supporting steel structure — because copper (high thermal expansion coefficient: 17×10⁻⁶/°C) and steel (11.7×10⁻⁶/°C) expand at different rates, cyclic stresses at the interface grow each blow until the copper-steel bond fails.

The lance elbow (the 90° bend where the lance goes from vertical to the supply tube) experiences **erosion-corrosion** from the high-velocity oxygen stream — at the bend, the oxygen jet impacts the inner wall at nearly 90°, removing material at `E = K × ρ × V^3 × cos²θ × sin θ` (Bitter erosion model for ductile materials).

*Synthetic cooling water restriction event:*
```
Stage 0 (Normal): flow = 1380 gal/min, T_return = 36°C
Stage 1 (Scale buildup onset): flow = 1380 gal/min, T_return = 36 + 0.02×t°C (slow drift)
Stage 2 (Partial blockage): flow drops 1380 → 1200 gal/min over 30 min
  T_return = 36 + (1380/flow)² × 4°C
Stage 3 (Critical): flow = 1050 gal/min (<1100 threshold)
  T_return = 68°C → LANCE ABORT triggered
  → crane hoist retracts lance in < 8 seconds
```

*Synthetic lance elbow wall-thickness decay (for ultrasonic testing schedule):*
```
Thickness_elbow(n) = Thickness_0 - erosion_rate × n
erosion_rate = 0.04 mm/heat (at standard O₂ flow)
Alarm at Thickness < 60% of original → schedule UT inspection
Non-destructive test interval: every 150 heats (per SOP)
```

**Cascade effect:** Lance tip burnout mid-blow → oxygen supply lost → steel not decarburized → off-spec high-carbon steel → must be either re-blown (adding time and cost) or downgraded.

**Spare Part:** Machined copper lance tip — **6-week lead time**

---

### F4-EQ03 — Oxygen Lance Hoist Crane (OLHC)

**What it does:** A dedicated overhead crane with a precision wire rope hoist that raises and lowers the oxygen lance to its programmed height profile during blowing. The crane must position the lance with ±50 mm accuracy at up to 1000 mm/min travel speed.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Drum speed | 0–15 m/min | Overspeed > 18 m/min |
| Load cell reading | Lance weight ± 5% | > ±20% (rope kink or snag) |
| Brake holding force | > 150% of lance weight | < 110% (brake slipping) |

**Sensors:**
- `Crane load cells` — confirm lance is free-hanging (abnormal load = obstruction)
- `Drum speed encoder` — position calculation by integration

**Malfunction Physics & Synthetic Reproduction:**

The wire rope is a multi-strand helical structure. Under repeated bending over the crane drum sheave (bending radius typically 20–30× rope diameter), the individual wires experience **bending fatigue** — surface cracks initiate on the outer wires at the crossover points where wires contact each other. In the corrosive BOF environment (acidic fumes, heat), **stress corrosion cracking** accelerates wire failure. Industry standard: replace rope when ≥10% of wires are broken in any 8-diameter length.

*Synthetic rope fatigue signature:*
```
Wire_breaks(t) = 0    for t < t_fatigue_onset
Wire_breaks(t) = N_total × (1 - e^(-(t-t_onset)/τ))   for t ≥ t_onset
where:
  t_onset = 80% of design rope life
  τ = 200 hours (exponential failure acceleration)
  Alarm: wire_breaks > 10% of total → immediate rope change
```

**Spare Part:** Steel core wire rope — **4-week lead time**

---

### F4-EQ04 — Sublance System (SLS)

**What it does:** A disposable probe-equipped lance that is lowered into the BOF bath in the final 2 minutes of the blow to measure bath **temperature** and **carbon content** directly, without stopping the blow. The measurement guides the operator in deciding whether to continue blowing or to tap. This eliminates the costly "reblow" (stopping too early, retapping, and blowing again).

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Bath temperature (measured) | 1580–1650°C | > 1680°C (overblown) |
| Carbon content (measured) | 0.03–0.08% at tap | < 0.02% (overblown) |
| Probe depth (into bath) | 500–800 mm below surface | Depth error > ±50 mm |
| Carriage drive speed | 1.0–2.0 m/min | — |

**Sensors:**
- `Probe depth encoder` — absolute position of sublance carriage
- `Bath thermocouple signal` — disposable Type B thermocouple in probe tip

**Malfunction Physics & Synthetic Reproduction:**

The sublance carriage runs on vertical guide rails. Rail mounting bolts are exposed to the BOF bay's thermal cycling (40–600°C range per heat cycle). **Differential thermal expansion** between the steel rail and the structural column causes mounting bolt loosening over time → rail misalignment → sublance carriage drive **torque spikes** → carriage motor overload → positional error of the probe in the bath → inaccurate measurement.

*Synthetic carriage misalignment torque profile:*
```
Torque_normal(t) = T0 × (1 + 0.05 × sin(2π × t / cycle_time))
Torque_misaligned(t) = T0 × (1 + α_misalign × (position - P_bind))
where α_misalign rises as rail gap increases → torque spikes at specific carriage positions
Detection: torque standard deviation > 3σ of baseline → maintenance flag
```

**Spare Part:** Sublance signal contact block — **3-week lead time**

---

### F4-EQ05 — Water-Cooled Hood Tubes (WCHT)

**What it does:** The extraction hood positioned over the converter mouth captures the intense off-gas (CO-rich, at 1400–1600°C, generated during blowing). The hood is constructed of **water-cooled tubes** — parallel steel tubes with cooling water flowing through them, forming a heat exchanger wall. This cools the gas from 1500°C to ~900°C before it enters the gas cleaning ductwork.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Inlet water temperature | 25–35°C | > 40°C (system heat load increase) |
| Outlet water temperature | 50–70°C | > 80°C (reduced flow or increased heat flux) |
| Water flow | 800–1200 m³/hr | < 600 m³/hr |
| Tube surface temperature | < 250°C | > 400°C (scale buildup) |

**Sensors:**
- `Inlet/outlet water RTDs` — multiple pairs along the hood height
- `Water flow meters` — zone-by-zone flow monitoring

**Malfunction Physics & Synthetic Reproduction:**

The cooling water circulated through the hood tubes deposits **calcium carbonate scale** (CaCO₃) on the inner tube walls — a function of water hardness and temperature. As scale accumulates (scale thermal conductivity ~0.5 W/m·K vs. steel 45 W/m·K), the overall heat transfer coefficient drops: `U = 1 / (1/h_conv + x_scale/k_scale + x_wall/k_wall)`. The tube wall temperature rises. At the external tube surface (facing the hot gas), **thermal fatigue cracking** initiates from the cyclic temperature swing between heats.

*Synthetic scale-induced outlet temperature rise:*
```
T_out(t) = T_water_in + Q_gas / (m_dot × Cp) × (1 - e^(-UA(t)/m_dot/Cp))
UA(t) = UA_0 / (1 + fouling_resistance × t)
where:
  UA_0 = 2500 kW/°C (clean tubes)
  fouling_resistance = 0.00015 m²·°C/W per hour (hard water conditions)
Alarm: T_out > 75°C → descaling cycle initiation
```

**Spare Part:** ASTM A106 Grade B steel tubes — **10-week lead time**

---

### F4-EQ06 — Ladle Refining Furnace (LRF)

**What it does:** After BOF tapping, the steel in the ladle (at ~1580°C) is transferred to the LRF station. Three graphite electrodes arc to the steel surface, providing precise electrical heating (up to 10°C/min temperature increase). Alloy additions (ferrosilicon, ferromanganese, etc.) are made here to achieve final chemistry. Argon stirring through porous plugs in the ladle bottom ensures homogeneous mixing.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Electrode current | 40–70 kA | > 80 kA (short circuit) |
| Electrode position (above bath) | 150–400 mm | > 500 mm (arc too long → instability) |
| Ladle steel temperature | 1550–1600°C | > 1620°C (overheating) |
| Argon flow | 15–40 Nm³/hr | < 10 Nm³/hr (plug blockage) |

**Sensors:**
- `Electrode current transformers` — primary control input for arc power regulation
- `Electrode position LVDT` — electrode height control feedback

**Malfunction Physics & Synthetic Reproduction:**

The electrode hydraulic regulation system uses a **proportional hydraulic valve** to position the electrode. Over time, iron oxide and graphite particles from the LRF process contaminate the hydraulic oil. This particulate contamination **erodes the valve spool lands** (the precision-machined surfaces that meter oil flow) — spool land erosion changes the valve's flow-vs-current characteristic, causing **regulation instability**: the electrode oscillates around its setpoint rather than holding steadily. This manifests as **arc length fluctuation** — visible as current oscillation and audible as arc noise variation.

*Synthetic electrode regulation instability signature:*
```
I_electrode(t) = I_setpoint + ΔI_noise × sin(2π × f_hunt × t) × e^(t/τ_worsen)
where:
  ΔI_noise_initial = 1 kA (normal arc fluctuation)
  f_hunt = 0.5–2 Hz (hydraulic hunting frequency)
  τ_worsen = 200 hours (instability growth time constant)
  
Alarm: ΔI_noise > 5 kA sustained → replace hydraulic valve
```

**Spare Part:** Graphite electrodes — **4-week lead time**

---

### F4-EQ07 — RH Vacuum Degasser (RHVD)

**What it does:** For ultra-low-carbon steels (automotive grades, electrical steels), dissolved hydrogen and nitrogen must be removed to < 2 ppm. The RH degasser immerses two **snorkels** (refractory tubes) into the ladle and uses vacuum (< 1 mbar) to boil off dissolved gases. Steel circulates continuously through the snorkels driven by argon injection (the "argon lift pump" effect).

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Chamber vacuum | < 1.0 mbar | > 2.0 mbar (poor degassing) |
| Steel circulation rate | 80–120 t/min | < 60 t/min (snorkel blockage) |
| Lift gas (argon) flow | 1500–2500 Nm³/hr | < 1000 Nm³/hr |
| Treatment time | 20–30 minutes | > 35 min (efficiency issue) |
| Dissolved H₂ post-treatment | < 2 ppm | > 3 ppm → re-treat |

**Sensors:**
- `Vacuum chamber pressure transmitter` — primary quality indicator
- `Lift gas flow transmitter` — confirms circulation is active

**Malfunction Physics & Synthetic Reproduction:**

The snorkel (the refractory tube dipped into liquid steel) is exposed to violent steel circulation and to the slag layer. **Refractory spalling** occurs because the snorkel lower end is alternately immersed in 1580°C steel and then exposed to vacuum conditions — the rapid thermal cycling creates stress cracking in the refractory. Over time, the snorkel inner diameter **erodes** (refractory material dissolves into the circulating steel), reducing the steel flow area and slowing circulation.

*Synthetic snorkel erosion → circulation rate decay:*
```
D_snorkel(n) = D_0 - erosion_rate × n   [inner diameter shrinks... wait, erosion INCREASES inner diameter]

Corrected: refractory spalling REDUCES wall thickness → but increases inner diameter until breakthrough
Circulation_rate(n) ∝ (D_snorkel(n))^4  [Poiseuille-like scaling for viscous flow]

D_snorkel(n) = D_0 + spall_rate × n
But: if D becomes too large → steel flow uncontrolled → refractory breakthrough risk

Modeled as:
Flow_rate(n) = Flow_0 × (D(n)/D_0)^2  until D exceeds D_max → emergency snorkel change
snorkel wear rate: 1.5 mm/treatment cycle
D_max = D_0 + 80 mm → 53 treatment cycles typical campaign life
```

**Spare Part:** Degasser snorkel nozzle — **12-week lead time**

---

### F4-EQ08 — Continuous Slab Caster (CSC)

**What it does:** The liquid steel from the ladle flows through a **tundish** (a buffer vessel) into a water-cooled copper **mould** where the outer shell solidifies. The partially solidified strand is continuously withdrawn downward, bent into horizontal, straightened, and finally cut into slabs by torch cutters. The solidification front propagates from the surface inward over the 20–40 m strand length.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Casting speed | 1.0–1.8 m/min | > 2.0 m/min (breakout risk) |
| Strand withdrawal load | 80–150 kN | > 200 kN (strand sticking or roll jam) |
| Mould water flow | 3000–4500 L/min | < 2500 L/min → STOP |
| Segment cooling spray pressure | 6–10 bar | < 4 bar → reduce casting speed |
| Mould oscillation frequency | 80–200 cpm | Deviation > ±5 cpm |

**Sensors:**
- `Strand withdrawal load cell` — primary breakout prediction sensor
- `Spray pressure transmitters` — per-zone secondary cooling control

**Malfunction Physics & Synthetic Reproduction:**

The most dangerous caster failure is a **breakout** — where the solidified steel shell tears and liquid steel erupts from the strand. This occurs when the shell is too thin for the withdrawal force (insufficient cooling, too-high casting speed) or when the steel sticks to the mould wall (inadequate lubrication, mould geometry mismatch, inclusion entrapment).

Breakout prediction relies on the **mould thermocouple pattern**: when sticking occurs, a local hot-spot (reduced heat extraction) appears in a row of thermocouples, then propagates downward as the strand moves — this characteristic downward-moving hot-spot is the classic breakout signature.

*Synthetic sticking-type breakout thermocouple signature:*
```
Normal: T_mould[row, col] = T_baseline ± 5°C (random noise)

Sticking event (t = 0):
T_mould[row_N, col_k](t) = T_baseline + ΔT_stick × (1 - e^(-t/τ_stick))
  where ΔT_stick = 40°C, τ_stick = 8 s  [hot spot in row N]

After τ_stick: hot spot migrates one row down every (row_spacing / casting_speed) seconds
→ Classic V-shaped temperature signature moving downward

Breakout prediction: if ΔT > 35°C AND downward migration detected → 
  PLC automatic casting speed reduction by 50% + alarm
  If PLC response < 15 s → shell heals; casting continues
  If PLC response > 30 s → breakout occurs
```

**Spare Part:** Continuous caster segment rollers — **14-week lead time**

---

### F4-EQ09 — Caster Mould Copper Plates (CMCP)

**What it does:** The mould is a set of four water-cooled copper plates (two wide-face, two narrow-face) forming a rectangular tube into which steel is cast. The copper plates transfer heat at 1–3 MW/m² to the cooling water. The mould oscillates vertically (±3 mm, 80–200 cycles/min) to prevent the solidifying steel from sticking to the copper surface — this creates the characteristic **oscillation marks** on slab surfaces.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Plate surface temperature | 200–350°C | > 400°C (flow disturbance) |
| Mould water temperature rise (ΔT) | 8–12°C | > 15°C (reduced flow) |
| Plate wear (surface recession) | < 1 mm per campaign | > 2 mm (geometry distortion) |
| Taper setting | 1.0–1.2% per meter | Deviation > 0.1% |

**Sensors:**
- `Plate thermocouple grid` (8×8 array per wide-face plate) — maps heat flux distribution; sticking and inclusion events visible as hot-spots
- `Mould water temperature RTDs` — inlet and outlet per cooling zone

**Malfunction Physics & Synthetic Reproduction:**

Copper plates wear through **thermal fatigue and erosion** — the continuous oscillation combined with the shrinking solidifying shell exerts cyclic mechanical contact. High-velocity casting powder (lubricant between shell and mould) contains abrasive SiO₂ particles that **abrade the copper surface**. The mould taper (the slight narrowing from top to bottom, matching the shell shrinkage) becomes incorrect as the plates wear, causing **uneven pressure distribution** on the solidifying shell → increased sticking events.

*Synthetic plate wear → increased sticking event frequency:*
```
Sticking_rate(n_heats) = R_0 × (1 + wear_factor × n_heats)
where:
  R_0 = 0.02 events/heat (new mould plate)
  wear_factor = 0.0008 per heat
  Alarm: Sticking_rate > 0.1 events/heat → schedule plate replacement
  
Mould hot-spot signature at worn locations:
T_worn_spot = T_baseline + ΔT_wear × (plate_recession / max_recession)
ΔT_wear = 60°C maximum (at end-of-life plate)
```

**Spare Part:** Copper-silver alloy mould plate — **12-week lead time**

---

### F4-EQ10 — Mould Electromagnetic Stirrer (MEMS)

**What it does:** A set of electromagnetic coils surrounding the mould that create a rotating magnetic field in the liquid steel pool inside the mould. This **electromagnetic stirring** forces the liquid steel to rotate, breaking up dendrite tips (solidification crystals), removing inclusions to the surface where they are absorbed by the mould flux, and homogenizing temperature — producing a more uniform steel structure.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Magnetic field strength | 0.02–0.05 Tesla | < 0.01 T (coil failure) |
| Coil current | 200–600 A | > 700 A (short circuit) |
| Coil cooling water flow | 15–25 L/min per coil | < 10 L/min |
| Coil temperature | < 60°C (water-cooled) | > 80°C |

**Sensors:**
- `Magnetic field probe` — confirms field is being generated at correct strength
- `Coil water flow transmitter` — per-coil cooling confirmation

**Malfunction Physics & Synthetic Reproduction:**

The coil winding insulation is a high-temperature polymer (polyimide or similar). Over time, repeated thermal cycling (the coil heats during operation, cools between heats) causes the polymer to undergo **thermal oxidative degradation** — chain scission reduces molecular weight and electrical insulation resistance. Once insulation resistance drops below the threshold (typically 1 MΩ), **inter-turn short circuits** develop — the coil draws excessive current, the affected turns overheat (I²R heating), and the insulation fails progressively until the coil burns out.

*Synthetic insulation resistance decay:*
```
R_insulation(t) = R_0 × e^(-t/τ_thermal)
where:
  R_0 = 100 MΩ (new coil)
  τ_thermal = 26,000 hours (thermal degradation time constant)
  
Modified by thermal cycling severity:
τ_effective = τ_thermal / (1 + cycle_factor × ΔT_cycle / 100)
where ΔT_cycle = temperature swing per heat cycle

Alarm: R_insulation < 5 MΩ → plan replacement
Trip: R_insulation < 1 MΩ or coil current > 700A → immediate shutdown
```

**Spare Part:** High-current induction coil — **16-week lead time**

---

### F4-EQ11 — Slab Torch Cutter (STC)

**What it does:** At the end of the caster, the continuously moving slab must be cut into individual pieces. Oxy-fuel torch cutters (using oxygen + natural gas) travel synchronously with the moving slab, cut it to the programmed length, then return for the next cut. Each slab is typically 6–12 m long and weighs 15–30 tonnes.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Torch travel speed (synchronized) | Matches casting speed ±2% | Sync error > 3% |
| O₂ preheat pressure | 5–8 bar | < 4 bar |
| Gas flow (cutting O₂) | 50–100 Nm³/hr | < 40 Nm³/hr (poor cut) |
| Cut quality | Clean, no remelting | Dross on cut face (nozzle wear) |

**Sensors:**
- `Torch position encoder` — absolute position for synchronization control
- `Gas flow meters` (preheat and cutting O₂) — confirm correct gas ratios

**Malfunction Physics & Synthetic Reproduction:**

The cutting nozzle (precision-machined copper, central O₂ orifice + preheat orifices) operates in a splash-back zone from the molten steel cut. Steel droplets impinge on the nozzle face at high velocity, causing **impact erosion** — the central O₂ orifice enlarges asymmetrically, changing the jet geometry. An asymmetric O₂ jet produces a skewed cut, creating a slab face that is not perpendicular to the length — causing issues at F5 when loading in the reheating furnace.

*Synthetic cut quality degradation:*
```
Nozzle_diameter(n) = D_0 + erosion_rate × n
erosion_rate = 0.01 mm per cut cycle
  
Cut_skew_angle(n) = θ_0 × (D_nominal / D_0 - 1) × (nozzle_diameter(n) / D_0 - 1)
  → Non-linear: skew increases rapidly beyond 10% nozzle erosion

Alarm: Nozzle in service > 200 cuts → mandatory replacement
```

**Spare Part:** Gas torch cutting nozzles — **2-week lead time**

---

### F4-EQ12 — Laser Refractory Profilometer (LRP)

**What it does:** A laser scanning system mounted on an automated arm that measures the **3D profile of the BOF converter inner lining** during vessel downtime. By comparing each scan to the nominal new lining profile, it calculates remaining lining thickness at every point. This determines when the converter needs relining and identifies critical thin zones.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Scan accuracy | ±5 mm | > ±15 mm (optic fouling) |
| Measurement cycle time | 15–30 minutes | > 45 min |
| Operating temperature | Scanner body < 80°C | > 100°C |

**Sensors:**
- `Laser distance sensor` — Time-of-Flight or structured light triangulation
- `Optical sensor temperature RTD` — scanner body temperature monitoring

**Malfunction Physics & Synthetic Reproduction:**

The converter interior (during measurement, the vessel is tilted and cool, but ambient temperature still 200–400°C) causes **thermal expansion** of the scanner positioning mechanism — the arm that sweeps the laser changes length and angle, causing **systematic positional drift** in the measurements. If the optical window is not purged with clean air, **iron oxide dust** settles on the laser emission/receiving optics, attenuating the laser signal and creating **false short-range readings** (dust return signal mistaken for refractory surface).

*Synthetic optical fouling measurement error:*
```
Signal_attenuation(t) = 1 - (1 - e^(-dust_rate × t))
True_distance = D_refractory
Measured_distance = D_refractory × Signal_attenuation(t) + D_dust × (1-Signal_attenuation(t))
where D_dust < D_refractory → scanner reports wall "thicker" than actual → UNSAFE error
Alarm: Attenuation > 30% → clean optical window; recalibrate
```

**Spare Part:** Laser scanner assembly — **10-week lead time**

---

### F4-EQ13 — Gunning Repair Manipulator (GRM)

**What it does:** A remotely operated robotic arm inside the converter vessel (while cool/empty) that sprays **refractory gunning mix** — a wet refractory slurry — onto worn areas of the lining identified by the profilometer (F4-EQ12). This extends the lining campaign life between full relinings.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Gunning pressure | 3–6 bar | < 2 bar (poor compaction of refractory) |
| Material flow rate | 200–400 kg/hr | < 150 kg/hr (hose blockage) |
| Nozzle traverse speed | 0.1–0.3 m/s | — |
| Application thickness | 50–150 mm per pass | > 200 mm (layer delamination risk) |

**Sensors:**
- `Rotor position encoder` — arm position feedback
- `Nozzle feed pressure` — confirms material is flowing

**Malfunction Physics & Synthetic Reproduction:**

The gunning hose carries a slurry of refractory grain (alumina, magnesia) in water. The high-velocity slurry at bends in the hose causes **abrasive erosion** of the hose inner liner — the same Finnie erosion mechanism as the coke injection lances. The rubber inner liner thins progressively until **perforation** — the slurry sprays outside the hose, causing loss of nozzle pressure and refractory contamination of the manipulator arm. The nozzle valve can **block** if the slurry sets during a pause (refractory mix has finite pot life of 30–60 minutes).

**Spare Part:** Refractory gunning nozzle — **4-week lead time**

---

### F4-EQ14 — Ladle Transfer Car (LTC)

**What it does:** A large, motorized rail car (carrying capacity: 300–400 tonnes including the steel ladle) that transfers steel ladles between BOF tapping position → LRF station → RH degasser → caster turret. Precise positioning (±10 mm) is critical at each station for ladle engagement.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Travel speed | 0–30 m/min | > 35 m/min |
| Drive motor current | 60–120 A | > 180 A (wheel slip or track obstruction) |
| Laser collision sensor | > 2 m clearance | < 0.5 m → STOP |
| Wheel flange temperature | < 80°C | > 120°C (bearing heat) |

**Sensors:**
- `Drive motor current transducer` — primary motion health indicator
- `Laser collision sensor` — safety device; prevents collision with personnel or equipment

**Malfunction Physics & Synthetic Reproduction:**

The ladle car wheels run on steel rails carrying enormous loads (up to 400 tonnes). **Rolling contact fatigue** is the primary wear mechanism — sub-surface shear stress creates cracks that propagate to the wheel surface, causing **tread spalling** similar to railway wheel failures. In the high-temperature BOF bay environment, the wheel bearing grease undergoes **thermal hardening** (base oil evaporates; thickener remains as a solid plug), causing bearing starvation and eventually bearing **seizure**. The VFD (Variable Frequency Drive) that controls car speed can experience **thyristor overcurrent failure** from voltage spikes in the plant's industrial power grid.

*Synthetic bearing seizure temperature profile:*
```
T_bearing(t) = T_ambient + P_friction(t) / (m_bearing × Cp × e^(-t/τ_cool))
P_friction(t) = P_0 × (1 + seizure_factor × t²)  [rapidly increasing as lubrication fails]
where:
  P_0 = 50 W (normal bearing friction power)
  seizure_factor = 0.001 per hour²
  
Alarm: T_bearing > 90°C → stop car; inspect bearing
Emergency: T_bearing > 130°C → motor trip; protect bearing from fire
```

**Spare Part:** Forged car wheel assembly — **8-week lead time**

---

### F4-EQ15 — Segment Roll Drives (SRD)

**What it does:** The caster strand (solidifying slab) is guided and supported by sets of **rolls** arranged in segments along the entire length of the caster (from mould exit to torch cutter). Each roll segment has **hydraulic cylinders** that control the gap between rolls (matching slab thickness) and **electric drive motors** (through planetary gearboxes) that provide the withdrawal force. There are typically 10–15 segments per caster.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Roll gap (per segment) | Matching slab thickness ± 0.5 mm | > ±1.5 mm |
| Drive motor speed | Synchronized with casting speed ± 0.5% | Speed deviation > 1% |
| Hydraulic cylinder pressure | 80–150 bar | > 200 bar (bulging compensation) |
| Gearbox oil temperature | 40–70°C | > 85°C |

**Sensors:**
- `Drive speed tachometers` — per-segment speed feedback; synchronization monitoring
- `Hydraulic pressure transmitters` — per-cylinder; ferrostatic pressure compensation

**Malfunction Physics & Synthetic Reproduction:**

The planetary gearbox transfers high torque (10–50 kNm per segment) in a compact package. **Planet gear bearing failure** is the primary failure mode — high radial loads on planet bearings cause **sub-surface fatigue cracking** in the bearing races. In the wet, hot environment of the caster secondary cooling zone, **water ingress** into the gearbox (through failed shaft seals) causes **hydrogen embrittlement** of bearing steel — water catalyzes nascent hydrogen formation that diffuses into the steel grain boundaries, reducing fracture toughness → premature bearing failure at lower-than-expected loads.

*Synthetic gearbox vibration signature for bearing degradation:*
```
Vibration(t) = A_1X × sin(ω_shaft × t)                 [1× shaft frequency]
             + A_mesh × sin(ω_mesh × t)                 [gear mesh frequency]
             + A_bearing(t) × sin(ω_BPFI × t + φ)      [bearing inner race fault]

A_bearing(t) = A0 × (t / T_bearing_life)^1.8           [power law growth]
ω_BPFI = (N_rollers/2) × (1 + d_roller/d_pitch × cos α) × ω_shaft  [inner race pass freq]

Alarm: A_bearing(t) / A_baseline > 4.0 → schedule gearbox inspection
```

**Spare Part:** Caster segment drive gearbox — **12-week lead time**

---

## Integrated Safety SOPs

### SOP-F4-01: BOF Oxygen Lance Operation and Emergency Abort

**Lance height program:**
- Blow start: lance at 3.0 m above bath (soft blow — promotes slag formation)
- Mid-blow: lower to 2.5 m (hard blow — decarburization)
- End of blow: raise to 2.8 m (avoid slag skulling on lance tip)

**Cooling water safety:**
- Minimum flow: 1100 gallons/min — below this, PLC triggers AUTOMATIC ABORT
- Maximum return ΔT: design-specific; exceeded → AUTOMATIC ABORT
- Abort sequence: close O₂ main valve → retract lance at maximum crane speed → tilt converter to safe position
- Water-cooled lance must NEVER be left stationary at low position during a power outage

**Lance tip rotation rule:**
- Rotate tip azimuth by 45° every 80–120 heats — distributes oxygen jet impingement zone on BOF lining
- Reduces lining wear rate at trunnion area by ~30%
- Ultrasonic testing of lance elbow welds every 150 heats (sigma phase embrittlement check)

### SOP-F4-02: Breakout Prevention and Emergency Response

**Breakout prediction response:**
- PLC detects sticking signature → automatic speed reduction to 50% of casting speed
- Adjust mould oscillation frequency to promote shell healing
- If not resolved within 60 seconds → stop casting; allow shell to reheal in mould
- Never manually override automatic speed reduction during a sticking alarm

**If breakout occurs:**
- Emergency water deluge on strand guide area is triggered automatically
- Evacuate area within 10 m of caster
- Shut off tundish slide gate to stop liquid steel flow
- Isolate spray cooling water (avoid water-steel contact in breakout zone)

---

## Cascade Impact Summary — F4

| Failure | Immediate Effect | Downstream Impact |
|:---|:---|:---|
| EQ02 (Lance) cooling water restriction | Auto abort → reblow required | +40 min per heat delay → F5 slab starvation |
| EQ08 (Caster) breakout | Production halt; caster damage | F5 HSM runs out of slabs within 4–8 hours |
| EQ01 (BOF) lining burnthrough | Catastrophic steel spill | Multi-week rebuild; F5 and F6 shutdown |
| EQ07 (RH Degasser) snorkel failure | Cannot treat ultra-low-C grades | Product downgrade; automotive customer claims |
| EQ09 (Mould plates) excess wear | Increased sticking; breakout risk | Quality claims for slab surface defects to F5/F6 |