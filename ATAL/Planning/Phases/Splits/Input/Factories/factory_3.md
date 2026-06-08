# 🏭 Factory 3 — Blast Furnace (BF)

---

## Overview

**Factory ID:** F3  
**Full Name:** Blast Furnace  
**Abbreviation:** BF  
**Primary Inputs:** Metallurgical Coke (from F1), Sinter (from F2), Pulverized Coal, Preheated Air Blast (1100–1200°C)  
**Primary Output:** Hot Metal — liquid pig iron at 1450–1520°C, ~94% Fe, ~4.5% C, ~0.5% Si  

### What This Factory Does (Plain English)

The Blast Furnace is the core ironmaking reactor — a towering, sealed cylindrical vessel (25–32 m tall, 10–14 m hearth diameter) where iron oxides are chemically **reduced** to liquid iron. Coke and sinter are loaded from the top in alternating layers. Preheated air (the "blast") is injected at high velocity through nozzles called **tuyeres** near the bottom. The coke burns at the tuyeres (reaching 2000°C in the **raceway** combustion zone), generating CO gas that rises through the burden (the mixed charge of coke and sinter) and chemically strips oxygen from iron oxide, converting it to liquid iron. The liquid iron accumulates in the **hearth** at the base and is tapped periodically through a **taphole**.

This is simultaneously a chemical reactor, a heat exchanger, and a pressure vessel. It operates 24/7, 365 days, without stopping for typically 10–20 years (a **campaign**).

### Upstream Dependencies
- **Coke quality (F1):** Low coke strength (CSR < 60%) means coke crumbles in the furnace, blocking gas flow and causing irregular burden descent.
- **Sinter quality (F2):** High FeO or poor size distribution collapses bed permeability. A 6–8 hour lag exists between F1 coal quality changes and their manifestation as BF thermal imbalance.

### Downstream Dependency
Hot metal chemistry (Si, S, P content) and temperature directly determine F4 (Steel Melting Shop) BOF oxygen blow duration, alloy additions, and slag chemistry. A 0.1% Si increase in hot metal requires ~200–400 Nm³ additional oxygen in the BOF.

---

## 15 Core Equipment Assets

### F3-EQ01 — Blast Furnace Shell (BFS)

**What it does:** The outer steel pressure vessel (25–35 mm thick steel plate) that contains the entire smelting process. Inside is lined with **refractory brickwork** (carbon blocks at the hearth, high-alumina bricks in the shaft) that protects the shell from the 1500°C interior. The shell operates at internal pressures of 2.5–4.0 bar (overpressure from the blast).

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| Shell skin temperature | 60–120°C | > 200°C (local hot-spot) |
| Tie-rod strain | Baseline ± 5% | > ±15% (wall deformation) |
| Hearth refractory thickness | > 400 mm | < 200 mm (campaign end) |
| Internal pressure | 2.5–4.0 bar | > 4.5 bar |

**Sensors:**
- `Shell skin thermocouples` — distributed array at 0.5 m intervals around circumference and height; detect refractory wear hot-spots
- `Strain gauges on tie rods` — tie rods are pre-tensioned steel rods that brace the shell against internal pressure; strain increase indicates wall bulging

**Malfunction Physics & Synthetic Reproduction:**

Refractory wears by **alkali attack** — potassium and sodium vapours from the burden condense in cooler refractory zones, reacting with the alumina/silica binder to form low-melting-point compounds that dissolve the refractory matrix. This progresses as a gradual **refractory thinning** toward a critical wall.

*Synthetic heat generation curve for hot-spot development:*
```
T_skin(t) = T_baseline + ΔT_wear × (1 - e^(-t/τ))
where:
  T_baseline = 90°C (normal skin temperature)
  ΔT_wear = 150°C (maximum additional rise from full refractory loss)
  τ = 720 hours (time constant of wear progression)
  
Alarm at T_skin > 200°C → cascade trigger to BLT to redistribute burden
Emergency at T_skin > 350°C → initiate emergency water cooling + reduce blast
```

**Cascade effect:** Local shell overheating → if uncorrected, risk of **shell burnthrough** → catastrophic molten iron release (a "hearth breakout") → long campaign-ending repair.

**Spare Part:** High-density carbon blocks — **20-week lead time**

---

### F3-EQ02 — Bell-Less Top Charger (BLTC)

**What it does:** The automated material distribution system at the furnace top. A rotating chute (the "Paul Wurth" chute) can tilt at any angle from 0° (vertical) to ~54° from vertical, depositing coke and sinter in precise concentric rings from the furnace wall to the center. By controlling where each material lands, operators optimize the gas flow profile inside the furnace.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| Chute tilt angle | 0–54° (programmable) | Position error > ±0.5° |
| Chute rotation speed | 6–10 RPM | Speed deviation > ±0.5 RPM |
| Top gas pressure | 2.0–3.5 bar | > 4.0 bar (overpressure) |
| Material batch weight | Per recipe ±2% | > ±5% deviation |

**Sensors:**
- `Chute tilt angle encoder` (optical/magnetic absolute encoder) — reports chute angle with ±0.1° resolution
- `Rotation speed tachometer` — confirms chute is rotating at programmed speed

**Malfunction Physics & Synthetic Reproduction:**

The tilting gearbox uses **helical bevel gears** to convert the motor's rotational motion into chute tilt. The gear teeth mesh under cyclic contact stress (Hertzian stress). At high temperatures (top gas 200–300°C), the gear lubricant viscosity drops, reducing the EHD film thickness. Once the film collapses, **adhesive wear** (scuffing) occurs on the tooth flanks.

*Synthetic gear degradation signal:*
```
Vibration_BLTC(t) = A_baseline × sin(2π × f_mesh × t) 
                  + A_wear(t) × sin(2π × f_mesh × t + φ_sidebands)
where:
  f_mesh = N_teeth × RPM / 60  (gear mesh frequency, typically 80–120 Hz)
  A_wear(t) = A0 × (t / MTBF)^2  (quadratic amplitude growth with wear)
  Alarm: when A_wear(t) / A_baseline > 3.0 (3× baseline sideband amplitude)
```

**Cascade effect:** Chute jam → burden distribution becomes random → gas flow maldistribution → local hot-spots in refractory → shell overheating.

**Spare Part:** Paul Wurth lining plates — **12-week lead time**

---

### F3-EQ03 — Regenerative Hot Blast Stoves (RHBS)

**What it does:** Three or four large cylindrical regenerative heat exchangers that alternately absorb heat from burning COG/BFG (blast furnace gas) and then transfer it to the incoming air blast. They operate in cycles: one stove is "on gas" (being heated by combustion), while another is "on blast" (preheating the air blast). Air blast enters at ambient and exits at 1100–1200°C.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| Dome temperature (on-gas) | 1250–1350°C | > 1400°C (checker damage) |
| Blast temperature (on-blast exit) | 1100–1200°C | < 1000°C (checker degradation) |
| Combustion gas flow | Per stove design | ±10% of setpoint |
| Stove wall temperature | 200–800°C (gradient) | Sudden step change |

**Sensors:**
- `Type S thermocouples` at dome apex — highest temperature point; confirms stove is achieving target heat-up
- `Gas flow transmitters` on combustion gas and cold blast lines

**Malfunction Physics & Synthetic Reproduction:**

The stove interior is packed with **checker brickwork** — a honeycomb of refractory bricks with channels for gas flow. At 1300°C+, alumina-silica bricks undergo **sintering** (densification) — the open checker channels narrow over campaign years. If the dome temperature is accidentally allowed to exceed 1400°C, the bricks begin to **vitrify** (melt at contact points), causing **checker collapse** — the channels fuse shut.

*Synthetic blast temperature degradation curve (checker wear):*
```
T_blast(t) = T_nominal × (1 - α × N_cycles / N_design)
where:
  T_nominal = 1150°C
  α = 0.15 (efficiency degradation coefficient)
  N_cycles = number of heating cycles elapsed
  N_design = design cycle life (typically 50,000 cycles)
  
Additional fault: burner valve leak → T_dome spike
T_dome_fault(t) = T_normal + ΔT_leak × (1 - e^(-t/30min))
Alarm at T_dome > 1380°C
```

**Cascade effect:** Degraded stove → lower blast temperature → BF needs more coke to compensate → coke rate rises → hot metal temperature drops → potential hearth freeze risk.

**Spare Part:** Alumina dome checker bricks — **18-week lead time**

---

### F3-EQ04 — Pulverized Coal Injection System (PCIS)

**What it does:** Raw pulverized coal (ground to < 75 μm particle size) is pneumatically conveyed at high velocity through **injection lances** inserted inside each tuyere (nozzle). The coal burns in the raceway alongside coke, partially replacing expensive metallurgical coke. This is called **PCI (Pulverized Coal Injection)** and is a major cost-saving measure.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| Coal injection rate | 150–200 kg/t hot metal | > 220 kg/t (incomplete combustion) |
| Transport air pressure | 3.0–5.0 bar | < 2.5 bar (lance blockage risk) |
| Coal flow per lance | ±5% of average | > ±15% (blocked lance) |
| Lance tip temperature | < 300°C (water-cooled) | > 400°C |

**Sensors:**
- `Coal flow transmitter` (Coriolis or differential pressure) — measures total and per-lance coal flow
- `Transport air pressure transmitter` — monitors line pressure; sudden spike indicates blockage

**Malfunction Physics & Synthetic Reproduction:**

The ceramic-lined injection lance carries a high-velocity stream of abrasive coal particles at 20–40 m/s. **Erosion** at bends follows the Finnie model: `E = K × (V^n / D_p) × f(θ)` where V = particle velocity, D_p = particle size, θ = impact angle. At lance bends (90° elbows), particle impingement is direct → catastrophic erosion rate. If the lance **plugs** (coal bridging in transport line), pressure upstream spikes instantly.

*Synthetic lance blockage pressure profile:*
```
P_transport(t) = P_normal                          (t < t_blockage)
P_transport(t) = P_normal + ΔP × (1 - e^(-t/τ))  (t ≥ t_blockage)
where:
  P_normal = 4.2 bar
  ΔP = 2.8 bar (pressure rise to blocked-line equilibrium)
  τ = 45 seconds (blockage build-up time constant)
  Trip at P > 6.5 bar (safety relief)
```

**Cascade effect:** Lance blockage → that tuyere receives only hot blast, no coal → raceway temperature rises asymmetrically → tuyere copper tip overheating → potential tuyere burnthrough (→ F3-EQ05 failure chain).

**Spare Part:** Ceramic-lined coal lances — **4-week lead time**

---

### F3-EQ05 — Water-Cooled Copper Tuyeres (WCCT)

**What it does:** Copper nozzles (tuyeres) inserted through the BF shell at the tuyere level (~3–4 m above the hearth). Each tuyere injects the preheated blast air (and PCI coal) into the furnace. The copper body is cooled by high-pressure water flowing through internal channels at 1200–1500 gallons/min total across all 20–40 tuyeres. The tuyere tip faces a 2000°C raceway flame.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| Tuyere return water temperature | 35–45°C | > 55°C (local heat flux increase) |
| Cooling water flow (per tuyere) | 40–60 L/min | < 30 L/min (blockage) |
| Blast pressure (bustle pipe) | 2.0–2.5 bar | < 1.7 bar (blast drop) |
| Hydrogen in top gas | 0.5–1.5% | > 2.5% (water leak into furnace) |

**Sensors:**
- `Tuyere water flow transmitter` — per-tuyere flow; sudden drop = blockage or leak
- `Return water RTD` — temperature rise indicates increased heat flux = refractory thinning or slag contact

**Malfunction Physics & Synthetic Reproduction:**

Zinc from scrap materials in the burden can vaporize, travel with the gas, and **deposit on tuyere copper surfaces**. Zinc diffuses along copper grain boundaries (**intergranular zinc diffusion**) and forms a brittle zinc-copper alloy layer at grain boundaries — a process called **Liquid Metal Embrittlement (LME)**. Under the thermal cycling stresses, this embrittled zone **cracks**, creating a pathway for cooling water to enter the furnace raceway. Water vaporizes explosively (1 L water → 1700 L steam), causing a **hydrogen spike** in top gas.

*Synthetic tuyere burnthrough temperature+hydrogen cascade:*
```
Stage 1 (Normal): T_return = 40°C, H₂_top = 1.1%
Stage 2 (Early wear): T_return = 40 + 2×t_hours°C (linear rise at 2°C/hr)
Stage 3 (Crack initiation): T_return spikes +15°C in 5 min; H₂_top rises from 1.1% → 2.8%
Stage 4 (Active leak): T_return = 59°C; H₂_top = 3.4%; ΔP_shaft spikes 0.8→1.35 bar
  → TRIP: isolate tuyere cooling circuit; reduce blast pressure; initiate PCI cutoff to Tuyere N
```

**Cascade effect:** Active tuyere water leak → hydrogen explosion risk in raceway → mandatory blast shutdown → unplanned tapholes → hot metal handling emergency at F4.

**Spare Part:** Forged oxygen-free copper tuyere — **8-week lead time**

---

### F3-EQ06 — Blast Furnace Stave Coolers (BFSC)

**What it does:** Cast iron or copper cooling panels (staves) bolted to the inside of the BF shell, covering the entire shaft and bosh zones. Cooling water flows through internal channels in the stave, extracting heat from the refractory and shell. The staves protect the shell from the 1200–1500°C internal temperatures.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| Stave ΔT (return − inlet) | 8–15°C | > 25°C (local refractory loss) |
| Inlet header pressure | 3.0–4.5 bar | < 2.5 bar (pump issue) |
| Individual stave flow | 80–120 L/min | < 60 L/min (channel blockage) |
| Skin temperature at stave | 60–120°C | > 200°C |

**Sensors:**
- `Stave inlet/outlet RTDs` — one pair per stave; ΔT is the primary health indicator
- `Flow transmitters` on manifold headers — detect zone-level flow reduction

**Malfunction Physics & Synthetic Reproduction:**

Over the campaign, refractory in front of the stave wears away. The stave's exposed copper/iron face then receives direct radiation and convection from the 1300°C burden and gas. The stave surface develops a **protective skulling layer** (frozen slag/iron), but if the heat flux exceeds the stave's cooling capacity, the skull melts. The cooling water channel inside the stave then undergoes **thermal fatigue cracking** — cyclic thermal stress from the hot face (> 600°C) vs. the water-cooled back face (< 40°C) creates a through-thickness ΔT that generates stresses exceeding the material's fatigue limit.

*Synthetic stave ΔT progression for refractory wear:*
```
ΔT_stave(t) = ΔT_0 + (ΔT_max - ΔT_0) × (t/t_wear)^1.5
where:
  ΔT_0 = 10°C (new stave with full refractory)
  ΔT_max = 35°C (exposed stave, full heat flux)
  t_wear = campaign-specific (inject as controlled variable)
  
Rate alarm: if d(ΔT)/dt > +3°C/hour → immediate supervisor alert
Emergency: ΔT > 25°C → reduce blast volume; adjust burden distribution
```

**Cascade effect:** Stave crack → water enters furnace → same hydrogen explosion risk as tuyere leak → forced blast shutdown.

**Spare Part:** Copper stave cooling panel — **14-week lead time**

---

### F3-EQ07 — Hydraulic Taphole Drill (HTD)

**What it does:** A hydraulic drill mounted on a pivot arm that bores through the **taphole clay plug** to open the taphole and allow hot metal to flow into the iron trough. Tapping occurs every 4–6 hours. The drill must penetrate 1.5–2.5 m of hardened taphole clay using a tungsten carbide drill bit.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| Hydraulic drill pressure | 150–200 bar | > 250 bar (hard clay or drill jam) |
| Drill penetration rate | 0.3–0.5 m/min | < 0.1 m/min (bit wear or clay hardness) |
| Drill motor speed | 60–120 RPM | Sudden stop |
| Taphole opening time | < 10 minutes | > 15 minutes |

**Sensors:**
- `Hydraulic pressure gauge` — primary health indicator; pressure spike = jam
- `Motor speed sensor` — confirms drill is rotating

**Malfunction Physics & Synthetic Reproduction:**

Hydraulic cylinder seals (polyurethane or PTFE composite) degrade from combined **thermal exposure** (radiant heat from the taphole, 300–600°C in vicinity) and **chemical attack** from splashed slag. Seal material swells, losing its compression set, and eventually extrudes through the seal groove — the classical **extrusion failure mode** for O-ring seals under high pressure + heat. The drill rod itself can **jam** if the clay hardens faster than expected (cold weather, clay composition variation).

*Synthetic hydraulic pressure jam profile:*
```
P_drill(t) = P_normal × (1 + jam_factor × t/τ_jam)
where:
  P_normal = 175 bar
  jam_factor = 0.6 (jam severity, 0–1)
  τ_jam = 120 seconds
  Alarm at P > 230 bar; auto-retract at P > 260 bar
```

**Cascade effect:** Failed drill → taphole cannot be opened → hot metal accumulates in hearth → hearth pressure rises → refractory stress increase → emergency tapping via secondary taphole (if available).

**Spare Part:** High-temp piston seals — **3-week lead time**

---

### F3-EQ08 — Clay Gun Machine (CGM)

**What it does:** After tapping is complete, the taphole must be plugged again with **taphole clay** (a refractory mixture of alumina, SiC, tar, and corundum). The clay gun is a hydraulic piston machine that inserts its nozzle into the taphole and injects clay at high pressure (200–300 bar) until the hole is sealed. The clay hardens over the next tapping interval.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| Injection pressure | 200–300 bar | < 150 bar (poor seal) |
| Piston stroke | Full travel (per clay charge) | Incomplete stroke |
| Clay chamber temperature | 80–120°C (preheated clay) | < 60°C (clay too stiff) |
| Seal time after injection | 30–60 min (clay hardening) | — |

**Sensors:**
- `Piston stroke LVDT` — confirms full clay charge was injected
- `Gun pressure gauge` — verifies adequate pressure was achieved for taphole sealing

**Malfunction Physics & Synthetic Reproduction:**

The clay gun nozzle tip is exposed to the taphole opening at ~1500°C. The tip material (high-chromia refractory) undergoes **thermal erosion** — combined dissolution by liquid slag and thermal spalling. Over repeated injections, the tip orifice geometry changes (enlarges), reducing injection pressure for the same piston force. The piston packing (PTFE-based) undergoes **extrusion creep** at the high clay injection pressure — the packing material flows into the cylinder clearance gap.

*Synthetic clay pressure degradation over injection cycles:*
```
P_inject(n) = P_max × (1 - wear_rate × n)
where:
  P_max = 280 bar
  wear_rate = 0.002 per injection cycle
  n = cumulative injection cycles
  Alarm when P_inject < 200 bar → schedule nozzle replacement
```

**Cascade effect:** Inadequate taphole plugging → molten iron continues to flow after tapping is intended to stop → iron overflow in cast house → safety emergency → unplanned BF hold.

**Spare Part:** Clay gun nozzle tip — **4-week lead time**

---

### F3-EQ09 — Cast House Slag Granulator (CHSG)

**What it does:** Blast furnace slag (a liquid silicate melt at ~1400–1500°C, byproduct of ironmaking) flows from the taphole alongside hot metal and is separated in the iron trough. The liquid slag is then directed to the granulator, where high-pressure water jets shatter it into glassy granules — a process called **granulation**. The granulated slag is dried and sold as a raw material for cement production.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| Granulation water flow | 400–600 m³/hr | < 300 m³/hr (inadequate quenching) |
| Water inlet pressure | 3.0–4.5 bar | < 2.5 bar |
| Slag flow rate | ~300 kg/t hot metal | Sudden surge |
| Steam generation | Continuous plume | No plume (flow stopped) |

**Sensors:**
- `Water flow meter` — primary process variable for granulation adequacy
- `Water pressure transmitter` — confirms system pressure

**Malfunction Physics & Synthetic Reproduction:**

The granulation head nozzles direct high-velocity water jets at the molten slag stream. The repeated **thermal shock** (water at 20°C hitting slag at 1450°C) and **abrasive impact** of rapidly solidifying slag particles cause **erosion-corrosion** of the nozzle material (typically Cr-alloy steel). Erosion proceeds as: `Δm/Δt = K × (ΔT)^α × V_particle^β` where ΔT is the thermal shock amplitude. Over time the nozzle orifice enlarges, reducing water jet velocity and spray coverage — inadequate granulation produces partially solidified slag "wool" that blocks conveyor systems.

*Synthetic flow + pressure decay pattern for nozzle wear:*
```
V_jet(t) = V_0 × (d_0 / d(t))²   [jet velocity inversely proportional to orifice area]
d(t) = d_0 × (1 + erosion_rate × t)
Where erosion_rate = 5×10⁻⁵ mm/hr under standard conditions
Flow alarm: when V_jet < 0.7 × V_0
```

**Spare Part:** Cr-alloy slag runner liners — **6-week lead time**

---

### F3-EQ10 — Top Gas Recovery Turbine (TRT)

**What it does:** The BF top gas (a mixture of CO, CO₂, N₂, and H₂) exits the furnace at 2.0–3.5 bar pressure. Instead of simply throttling this pressure down in a valve (wasting energy), a **top gas turbine** uses the pressure drop to generate electricity — recovering 20–30 MW from a single large furnace. The gas then flows to the cleaning system before being used as fuel.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm Threshold |
|:---|:---|:---|
| Rotor vibration | < 2.5 mm/s RMS | > 4.5 mm/s |
| Generator output power | 20–30 MW | < 15 MW (efficiency loss) |
| Gas inlet pressure | 2.5–3.5 bar | < 2.0 bar |
| Bearing temperature | < 70°C | > 90°C |

**Sensors:**
- `Rotor vibration sensor` (proximity probe) — primary rotating machinery health indicator
- `Generator power meter` — performance monitoring

**Malfunction Physics & Synthetic Reproduction:**

Despite gas cleaning, fine dust particles (< 10 μm) pass through and impact the turbine blades at 100–200 m/s gas velocity. **Erosion** follows `E ∝ V^2.5` (higher velocity exponent than fan erosion due to aerodynamic effects). The leading edges of high-nickel alloy blades thin progressively, changing the blade's aerodynamic profile — **profile loss** increases, manifesting as reduced turbine efficiency and increased vibration as blade mass becomes asymmetric.

*Synthetic rotor vibration growth from blade erosion:*
```
Vibration(t) = V_baseline + V_erosion × (1 - e^(-t/τ_erosion))
where:
  V_baseline = 1.5 mm/s
  V_erosion = 4.0 mm/s (maximum additional from full blade erosion)
  τ_erosion = 8760 hours (1 year)
  
Modulated by: dust loading spikes (sinter quality events from F2)
If F2-EQ13 (ESP) trips → dust load × 10 → τ_erosion / 5 (accelerated wear)
```

**Spare Part:** High-nickel alloy turbine blades — **20-week lead time**

---

### F3-EQ11 — Tuyere Optical Peepholes (TOP)

**What it does:** Quartz glass viewing ports fitted to each tuyere blowpipe, allowing operators (and cameras) to observe the **raceway** — the toroidal combustion zone in front of each tuyere. Normal raceway appearance: bright white/yellow flame. Abnormal: dark zone (scaffold blocking the tuyere), steam plume (water leak), or no flame (tuyere blocked).

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Raceway brightness | Uniform bright | Dark zone → scaffold |
| Steam visibility | None | Steam plume → water leak |
| Quartz glass temperature | < 150°C (cooled) | > 200°C (cooling failure) |

**Sensors:**
- `Visual CCTV cameras` (high-temperature rated) — image capture every 30 seconds
- `IR flame sensors` — detect flame absence

**Malfunction Physics & Synthetic Reproduction:**

The quartz glass lens is exposed to radiant heat from the 2000°C raceway. **Thermal devitrification** — conversion of amorphous quartz to crystalline cristobalite — occurs above 1050°C, making the glass brittle and opaque. Iron oxide and slag vapour **condense on the cooler lens surface**, creating an opaque fouling layer within hours of installation. The viewing port cover mechanism can warp from radiant heat if the cooling jacket circuit is disturbed.

*Synthetic image quality degradation (for computer vision model training):*
```
Clarity(t) = Clarity_0 × e^(-fouling_rate × t)
where:
  Clarity_0 = 1.0 (new lens)
  fouling_rate = 0.05 /hr (iron oxide deposition)
  Alarm: Clarity < 0.3 → lens cleaning required
  Computer vision confidence drops proportionally → increases false alarm rate
```

**Spare Part:** Quartz inspection glass — **2-week lead time**

---

### F3-EQ12 — Tilting Runner Drives (TRD)

**What it does:** After hot metal exits the taphole, it flows along a refractory-lined cast iron trough called the **main runner**. **Tilting runners** are moveable sections of this trough controlled by hydraulic cylinders that divert the hot metal flow either to iron ladles (for transport to F4) or to the slag granulator direction. Correct tilting sequencing is critical for ladle management.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Tilt cylinder pressure | 120–180 bar | > 220 bar (mechanical jam) |
| Tilt position (angle) | 0–35° (fully over to fully across) | Position error > ±2° |
| Hydraulic oil temperature | 40–60°C | > 80°C |

**Sensors:**
- `Tilt position encoder` — absolute position feedback
- `Hydraulic pressure transmitter` — detects jam or seal leak

**Malfunction Physics & Synthetic Reproduction:**

The hydraulic cylinder seals operate in a high-radiant-heat environment (runners carry 1500°C liquid iron). Seals degrade via **thermal ageing** — cross-linked polymer chains in polyurethane seals break at sustained temperatures > 120°C, reducing compression force. Oil viscosity drops in hot weather, further reducing seal effectiveness. Tilt mechanical linkage pins experience **fretting wear** — micro-oscillation under load causes surface oxidation and progressive material loss at pin-to-clevis interfaces.

*Synthetic hydraulic drift signal:*
```
Position_error(t) = ε_0 × (t / τ_seal)²
where:
  ε_0 = 0.1° (initial seal leakage position error)
  τ_seal = 500 hours (seal half-life)
  Alarm: position_error > 2° under hold-pressure condition
```

**Spare Part:** Runner tilt cylinder — **8-week lead time**

---

### F3-EQ13 — Tuyere Leak Spectrometer (TLS)

**What it does:** A gas sampling and analysis system mounted on the BF top gas offtake that continuously monitors the **hydrogen concentration** in the top gas. Hydrogen is not normally present in significant quantities — its presence (> 2%) is the primary indicator of water ingress from a leaking tuyere or stave cooler.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| H₂ in top gas | 0.5–1.5% | > 2.5% (water ingress) |
| Sample line temperature | > 80°C (above dew point) | < 60°C (condensation) |
| Sensor cell response time | < 60 seconds | > 120 seconds (drift) |

**Sensors:**
- `Hydrogen gas detector` (thermal conductivity or electrochemical cell) — primary measurement
- `Sample line flow transmitter` — ensures sample gas is reaching sensor

**Malfunction Physics & Synthetic Reproduction:**

The sample line from the BF top gas to the spectrometer passes through temperature zones from 200°C (near the furnace) to ambient (at the instrument). At any point where the line temperature drops below the **dew point of the top gas** (~60–80°C), water vapour condenses in the sample line. This liquid water **blocks the sample line**, preventing fresh gas from reaching the sensor. The sensor continues to read the last valid measurement — a **frozen reading** failure mode. Separately, the electrochemical sensor cell has a finite electrolyte volume that is consumed by H₂ oxidation — **sensor end-of-life drift**.

*Synthetic H₂ spike profile for tuyere leak event:*
```
H₂_normal(t) = 1.1% + 0.1% × sin(2π × t / 3600)   [normal fluctuation]
H₂_leak(t) = 1.1% + ΔH₂ × (1 - e^(-t/τ_leak))     [leak developing]
where:
  ΔH₂ = 2.3% (at full tuyere water ingress)
  τ_leak = 180 seconds (water breakthrough time constant)
  
Sensor condensation false flat: inject H₂_reading = const for 30–120 min → missed alarm scenario
```

**Spare Part:** Hydrogen analyzer sensor cell — **4-week lead time**

---

### F3-EQ14 — Quadruped Robotic Platform (QRIP)

**What it does:** An autonomous four-legged robot (similar to Boston Dynamics Spot) used for inspection of the cast house floor, tuyere platform, and furnace exterior — areas that are too hot, gaseous, or mechanically hazardous for continuous human presence. The robot carries thermal imaging cameras and acoustic sensors to detect hot-spots, steam leaks, and structural anomalies.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Battery temperature | 20–40°C | > 50°C (thermal runaway risk) |
| Motor joint torque | Per gait pattern | > 150% rated (stuck/obstacle) |
| IR camera range | 2–10 m effective | > 400°C surface reading (emergency) |
| Mission duration | 45–90 min per charge | — |

**Sensors:**
- `Thermal imaging cameras` (FLIR-type, 640×480, 25 Hz) — surface temperature mapping
- `Acoustic sensors` — detect hissing (gas leaks), clanking (mechanical faults), and ultrasonic signatures

**Malfunction Physics & Synthetic Reproduction:**

In high-radiation environments (cast house floor, 80–120°C ambient), the robot's **lithium-ion battery pack** can exceed safe operating temperature. Lithium-ion cells suffer **accelerated capacity fade** at temperatures > 45°C due to **SEI (Solid Electrolyte Interphase) layer growth** on the anode — irreversible capacity loss. If ambient temperature spike causes cell temperature to exceed 60°C, **thermal runaway** initiation is possible. Joint actuator motors experience **insulation degradation** from sustained heat exposure, eventually causing **winding short circuits**.

*Synthetic battery temperature profile in high-heat environment:*
```
T_battery(t) = T_ambient + (T_init - T_ambient) × e^(-t/τ_cool) + P_load/(m_bat × Cp)
where:
  T_ambient = 95°C (cast house floor, high radiation scenario)
  P_load = 150W (typical robot power draw)
  τ_cool = 1200 s (thermal time constant with cooling)
  Alarm at T_battery > 48°C → return to base
  Emergency at T_battery > 55°C → immediate shutdown
```

**Spare Part:** Robotic joint actuator — **10-week lead time**

---

### F3-EQ15 — Uptake Offtake Gas Valves (UOGV)

**What it does:** Large butterfly or slide gate valves (0.8–1.5 m diameter) on the BF top gas offtake pipes that control gas flow from the furnace to the gas cleaning system (dust catchers, cyclones, wet scrubbers). Correct valve positioning is essential for maintaining top pressure and preventing gas leakage to atmosphere.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Valve position | Per control program (0–100% open) | Position error > ±3% |
| Actuator cylinder pressure | 80–120 bar | < 60 bar (actuator leak) |
| Top gas pressure | 2.5–3.5 bar | Excursion > ±0.3 bar |
| Seal leakage | < 0.1% total gas flow | > 1% (seat wear) |

**Sensors:**
- `Valve position limit switches` (open and closed confirmation)
- `Cylinder pressure transmitter` — confirms actuator is holding commanded position

**Malfunction Physics & Synthetic Reproduction:**

The valve disc and seat seal (typically graphite-reinforced metal or ceramic) are exposed to hot gas (200–300°C) containing abrasive dust. **Erosive wear** of the seat surface creates surface roughness that allows **gas bypass** when the valve is nominally closed. If a valve fails in a partially-open position (**hydraulic actuator drift** from seal wear), the top pressure regulation loop loses authority → pressure oscillations develop → burden descent becomes irregular → BF stability disruption.

*Synthetic seat seal leakage progression:*
```
Leakage_rate(n) = L_0 × (1 + wear_coeff × n)
where:
  L_0 = 0.01% gas flow (new valve seat)
  wear_coeff = 0.001 per operational cycle
  n = number of open-close cycles
  Alarm: Leakage_rate > 0.5% → schedule seat lapping
```

**Spare Part:** High-temp gas seat seals — **6-week lead time**

---

## Integrated Safety SOPs

### SOP-F3-01: Blast Furnace Cooling System Integrity and Emergency Tuyere Isolation

**Purpose:** Prevent water-induced hydrogen explosion inside the furnace hearth.

**Daily Stave Monitoring:**
- Walk stave cooling manifolds every shift; log inlet/outlet ΔT and individual stave water flows
- Maintain main cooling water inlet header pressure: 3.0–4.5 bar
- Any pressure drop below 2.5 bar → immediate supervisor notification + activate backup cooling pumps

**Stave Temperature Deviation Response:**
- Normal ΔT across stave zones: 8–15°C
- ΔT rising at +3°C/hour → local refractory wear or partial flow restriction → increase monitoring frequency
- ΔT > 25°C → cool-down protocol: reduce hot blast volume; adjust BLT distribution away from affected wall

**Emergency Tuyere Isolation Sequence:**
1. Detect: rising H₂ in top gas (> 2.5%) OR steam visible at blowpipe joints OR dark tuyere peephole
2. Immediately reduce blast pressure to < 1.5 bar
3. Shut PCI feed to affected tuyere
4. Isolate cooling water feed AND return valves on the suspect tuyere circuit
5. Connect nitrogen purge line to empty water jacket; vent steam safely through dedicated stack
6. Keep tuyere isolated until next planned furnace stop; replace damaged tuyere

### SOP-F3-02: Cast House Emergency Hot Metal Overflow Protocol

- If iron trough runner volume exceeds capacity (excessive tapping rate): divert to emergency ladle bay
- If ladle is full: signal F4 to accelerate BOF charge acceptance
- Keep cast house floor clear of water at all times (water + hot metal = steam explosion)

---

## Cascade Impact Summary — F3

| Failure | Immediate Effect | Downstream Impact |
|:---|:---|:---|
| EQ05 (Tuyere) burnthrough | Water in raceway → H₂ spike → blast shutdown | F4 SMS starved of hot metal; ladle management crisis |
| EQ03 (Hot Blast Stoves) checker collapse | Blast temperature drops 100°C+ | Coke rate increases; hot metal Si rises → F4 extended BOF blow |
| EQ02 (BLTC) chute jam | Burden misdistribution → gas channelling | Shell overheating; product quality variation to F4 |
| EQ01 (BF Shell) hot-spot | Local refractory failure risk | Potential campaign-ending repair; multi-week shutdown |
| EQ06 (Stave Coolers) crack | Water ingress → H₂ → emergency shutdown | Same as tuyere burnthrough cascade |