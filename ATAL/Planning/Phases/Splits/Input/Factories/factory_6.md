# 🏭 Factory 6 — Cold Rolling Mill & Galvanizing Line (CRMGL)

---

## Overview

**Factory ID:** F6  
**Full Name:** Cold Rolling Mill & Galvanizing Line  
**Abbreviation:** CRMGL  
**Primary Input:** Hot Rolled Coils (HRC) from F5 (2–6 mm thick)  
**Primary Outputs:**
- **Product Y:** CRCA (Cold Rolled Closed Annealed) sheets — Tata Steelium, for automotive body panels
- **Product Z:** Galvanized Coils (GC) — Galvano, for roofing and automotive underbody

### What This Factory Does (Plain English)

HRCs from the Hot Strip Mill have a rough, oxidized surface covered in **mill scale** and are too thick for precision applications like car body panels. F6 transforms them through three stages:

1. **Pickling:** HRCs are unwound and passed through hydrochloric acid (HCl) tanks that dissolve the mill scale chemically, exposing a clean, bright steel surface.
2. **Cold Rolling (Tandem Cold Mill — TCM):** The pickled strip is rolled cold (at room temperature) through 4–6 rolling stands in series, reducing thickness by 50–80% (e.g., 4 mm → 0.8 mm). Cold rolling makes the steel very hard and springy (**work hardening**) — the steel's crystal structure is deformed and internally stressed.
3. **Annealing + Skin Pass (for CRCA):** The cold-rolled strip is heated in a controlled atmosphere furnace to 700–850°C (**annealing**), which relieves the work hardening and restores ductility by allowing the steel microstructure to **recrystallize**. The strip then passes through a **Skin Pass Mill** — a light rolling pass (0.5–2% reduction) that controls final surface finish and prevents yield point elongation (Lüders lines).
4. **Galvanizing (additional, for Product Z):** For galvanized products, the annealed strip is continuously passed through a bath of molten zinc at 450–460°C. The strip surface is wetted by the zinc and exits the pot coated with a zinc layer (60–275 g/m²). Air knives control the final coating weight.

### Upstream Dependency
HRC surface quality (scale thickness, surface roughness, inclusion density) directly determines pickling efficiency and the defect content of the final CRCA/galvanized surface. Roll marks, laminations, or laps from F5 cannot be corrected at F6 — they become customer-visible surface defects.

---

## 15 Core Equipment Assets

### F6-EQ01 — Acid Pickling Tanks (APT)

**What it does:** A series of 4–6 tanks (each 20–30 m long) containing 15–20% hydrochloric acid (HCl) solution at 65–85°C. The HRC strip passes continuously through the tanks on submerged rolls. HCl reacts with iron oxide scale: `FeO + 2HCl → FeCl₂ + H₂O` and `Fe + 2HCl → FeCl₂ + H₂↑`. The FeCl₂ (ferrous chloride) byproduct builds up in the acid over time, reducing pickling efficiency until the acid is regenerated.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Acid concentration (free HCl) | 12–18% | < 10% (under-pickling risk) |
| Tank temperature | 65–85°C | > 90°C (accelerated over-pickling) |
| Strip speed through pickling | 60–150 m/min | — |
| FeCl₂ concentration | < 120 g/L | > 140 g/L → acid regeneration needed |
| Strip surface cleanliness post-pickling | Sa 2.5 (near-white) | Any residual scale → repeat pass |

**Sensors:**
- `Acid concentration sensor` (conductometric or refractometric) — continuous acid strength monitoring
- `Tank temperature RTD` — acid temperature control for pickling rate

**Malfunction Physics & Synthetic Reproduction:**

The tank interior is lined with **acid-resistant materials** (rubber-lined steel, FRP, or titanium panels). HCl at elevated temperature is highly corrosive — any **pinhole in the lining** (from mechanical damage, thermal stress at weld joints, or chemical attack) allows acid to contact the carbon steel tank wall. The acid corrodes the steel at rates of 1–5 mm/year at 80°C — detectable as a **bulge or discoloration** on the tank exterior. The tank **heat exchangers** (which heat the acid from steam) use titanium tubes — over years, **crevice corrosion** in the tube-to-tubesheet joints (stagnant acid trapped in crevices at lower dissolved oxygen) causes joint leakage.

*Synthetic acid concentration decay from FeCl₂ buildup:*
```
[HCl_free](t) = [HCl_initial] - consumption_rate × t
consumption_rate = k × [FeO_scale] × strip_speed × strip_width × scale_thickness
where k = pickling rate constant (temperature-dependent: k ∝ e^(-Ea/RT))

[FeCl₂](t) = [FeCl₂_initial] + consumption_rate × t × (MWFeCl₂/MWFeO)

Pickling_efficiency(t) = 1 - e^(-[HCl_free](t) / K_half_saturation)
Under-pickling alarm: [HCl_free] < 10% → schedule acid addition or batch regeneration
```

**Cascade effect:** Under-pickled strip → residual scale → scale rolled into strip at TCM → surface defects in Product Y and Z → automotive customer rejection.

**Spare Part:** Heat exchanger acid tubes — **10-week lead time**

---

### F6-EQ02 — Tandem Cold Mill Stands (TCMS)

**What it does:** 4–6 rolling stands in series (similar to F5 but for cold rolling). Work rolls are much smaller (450–550 mm diameter — smaller diameter gives higher pressure per unit area for cold rolling). Rolling forces are typically 8,000–20,000 kN per stand. The strip is flooded with **rolling emulsion** (oil-in-water mixture, 2–5% concentration) that acts as lubricant and coolant — critical for surface quality and preventing roll thermal damage.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Rolling force per stand | 8,000–20,000 kN | > 22,000 kN |
| Strip tension (interstand) | 50–150 MPa | < 30 MPa (buckling risk) |
| Emulsion flow per stand | 2,000–4,000 L/min | < 1,500 L/min |
| Roll surface temperature | 40–80°C (cooled by emulsion) | > 100°C (emulsion failure) |
| Strip exit speed | Up to 30 m/s (final stand) | — |
| Thickness tolerance | ±3 μm for automotive grade | > ±8 μm → product downgrade |

**Sensors:**
- `Chock load cells` (sideload) — rolling force measurement per stand
- `Spindle roll torque meters` — drive power monitoring

**Malfunction Physics & Synthetic Reproduction:**

Cold mill work roll bearings (**4-row tapered roller bearings**, 200–350 mm bore) carry extremely high radial loads (up to 20,000 kN) in a continuous cold rolling environment. The emulsion **contamination** from iron fines (from the rolled strip surface) and from bearing wear particles reduces the emulsion's lubricating film strength — iron particles act as an **abrasive medium** within the bearing, causing **three-body abrasive wear** of the bearing rollers and races. Roll neck bearings fail progressively — initial stages produce **bearing noise** (audible tonality), then **temperature rise**, then ultimate **catastrophic seizure**.

*Synthetic roll neck bearing degradation sequence:*
```
Stage 1 (0–500 hrs): T_bearing = 45°C, vibration = 2.0 mm/s, normal
Stage 2 (500–800 hrs): T_bearing rising at +0.3°C/shift; faint bearing tonality 
  BPFO amplitude = -28 dB (borderline)
Stage 3 (800–900 hrs): T_bearing = 65°C; BPFO amplitude = -18 dB (alarm)
  Roll surface shows early surface marks from bearing play
Stage 4 (>900 hrs): T_bearing > 80°C; BPFO = -12 dB; strip surface defects visible
  → Emergency roll change; check bearing and journal surface for damage
```

**Spare Part:** Chock taper roller bearings — **14-week lead time**

---

### F6-EQ03 — Continuous Annealing Furnace (CAF)

**What it does:** A large furnace (~200–400 m total length, folded into a multi-pass loop configuration) through which the cold-rolled strip passes continuously. The furnace has several zones: **heating zone** (from 20°C to 800°C), **soaking zone** (hold at 780–830°C for recrystallization), **slow cooling zone**, and **fast cooling zone**. The atmosphere inside is a **protective gas** mixture (N₂ + H₂, typically 5–10% H₂) that prevents surface oxidation at high temperature. Without this atmosphere, the strip surface would oxidize and produce a poor base for galvanizing.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Soaking zone temperature | 780–830°C | > 850°C (grain overgrowth; mechanical property loss) |
| Furnace atmosphere H₂ | 5–10% H₂ in N₂ | < 3% H₂ (oxidizing atmosphere risk) |
| Strip speed through furnace | 60–200 m/min | — |
| Radiant tube skin temperature | < 1000°C | > 1050°C (tube creep damage) |
| Dew point inside furnace | < −30°C | > −20°C (moisture contamination) |

**Sensors:**
- `Furnace zone thermocouples` (Type K or Type N) — zone temperature control
- `Gas flow transmitters` for H₂ and N₂ supply — atmosphere composition control

**Malfunction Physics & Synthetic Reproduction:**

The furnace heating elements are **radiant tubes** — U-shaped tubes (Ni-Cr alloy) through which combustion gas burns internally, radiating heat to the strip without combustion products contacting the strip. At 950–1000°C, the radiant tube material undergoes **high-temperature oxidation** (rapid oxide scale growth on tube outer surface, reducing tube cross-section) and **creep deformation** — the tube slowly sags under its own weight and the thermal stresses, eventually **cracking**. A cracked radiant tube allows combustion products (CO₂, H₂O) to enter the furnace atmosphere, raising the dew point and **oxidizing the strip surface** — ruining its galvanizability.

*Synthetic radiant tube creep + crack temperature signature:*
```
Tube_life(T, σ) estimated by Larson-Miller parameter:
  P = T × (C + log t_r)  where C ≈ 20, T in Rankine, t_r = rupture time in hours
  
T_tube_skin(t) = T_normal + ΔT_creep × t/t_design  [gradual rise as insulation degrades]
  
Crack event: T_zone drops sharply −20 to −40°C (combustion gas displaces H₂/N₂)
  Dew_point rises from −35°C to −5°C within 2–5 minutes of crack
  
Strip surface oxidation rate ∝ P_H₂O^0.5 (parabolic oxidation law)
Alarm: Dew_point > −20°C → identify and isolate cracked radiant tube → reduce line speed
```

**Spare Part:** Cast alloy radiant tube — **12-week lead time**

---

### F6-EQ04 — Skin Pass Mill (SPM)

**What it does:** After annealing, steel is in a soft, ductile state. If formed without further treatment, it exhibits **yield point elongation** — an abrupt localized deformation called **Lüders bands** (surface markings), unacceptable on visible automotive panels. The skin pass mill applies a very light cold reduction (0.5–2.0%) that **suppresses** this effect by introducing a uniform density of dislocations throughout the strip. It simultaneously **transfers a surface texture** (roughness Ra = 0.8–2.5 μm) from the work roll to the strip — important for paint adhesion.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Elongation percentage | 0.5–2.0% | > 2.5% (excessive) or < 0.3% (insufficient) |
| Rolling force | 2,000–6,000 kN | > 8,000 kN |
| Roll gap LVDT | Precise to ±0.01 mm | Drift > 0.05 mm |
| Strip tension | 30–80 MPa | < 15 MPa |
| Surface roughness post-SPM | Ra = 0.8–2.5 μm | > 3.0 μm or < 0.5 μm |

**Sensors:**
- `Elongation measurement laser` (strip speed ratio between entry and exit) — primary process control
- `Roll gap LVDT` — gap position control feedback

**Malfunction Physics & Synthetic Reproduction:**

The skin pass work rolls have **textured surfaces** (shot-blasted or EDM-textured) that transfer the required roughness to the strip. This texture **wears** during rolling — abrasive contact between the roll asperities and the strip surface progressively smooths the roll. Roll roughness decay follows a **exponential smoothing model**. As the roll smooths, the strip surface becomes **too smooth** — automotive paint adhesion decreases. Conversely, if the roll gap LVDT drifts (from the same seal-wear mechanism as AGC cylinders), elongation becomes inconsistent — **variable Lüders suppression** → intermittent surface patterning on the strip.

*Synthetic roll texture wear model:*
```
Ra_roll(n) = Ra_initial × e^(-wear_rate × n)
where:
  Ra_initial = 3.5 μm (new textured roll)
  wear_rate = 0.003 per tonne rolled
  n = cumulative tonnes rolled

Ra_strip(n) = Ra_roll(n) × transfer_efficiency  [transfer_efficiency ≈ 0.65 for SPM]
  
Alarm: Ra_strip < 0.7 μm → schedule roll change (paint adhesion specification violated)
Alarm: Ra_strip > 2.8 μm → also schedule roll change (excessive roughness → forming tool wear)
```

**Spare Part:** Forged textured skin pass roll — **12-week lead time**

---

### F6-EQ05 — Continuous Galvanizing Pot (CGP)

**What it does:** The heart of the galvanizing line — a large ceramic or steel pot (2–5 m deep, 5–10 m long) containing approximately 250–400 tonnes of **molten zinc** at 450–460°C. The annealed steel strip passes continuously through the pot, submerged below the zinc surface by **sink rolls** (submerged ceramic or steel rolls), then exits vertically upward. During the 3–8 seconds of immersion, zinc **alloys with the steel surface** (forming an Fe-Zn intermetallic compound layer) and then **pure zinc solidifies** as the strip exits.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Pot zinc temperature | 450–462°C | > 470°C (excessive Fe dissolution; dross formation) |
| Pot level | Maintained at design fill | ±20 mm variation |
| Strip immersion time | 3–8 seconds | — |
| Dross level | < 5 mm on pot bottom | > 20 mm → affects sink roll clearance |
| Iron content in zinc | < 0.03% | > 0.05% → excessive dross formation |

**Sensors:**
- `Inductor power meter` — the pot is heated by electromagnetic induction heaters; power = heat input
- `Pot temperature RTDs` (multiple, on pot walls and in zinc bath) — primary temperature control

**Malfunction Physics & Synthetic Reproduction:**

The **pot rolls** (sink rolls and stabilizing rolls, submerged in liquid zinc) are typically made of **stainless steel or ceramic**. At 460°C, liquid zinc dissolves iron at a rate described by: `dissolution_rate = K × (C_sat - C_current) × exp(-Q/RT)` where C_sat is zinc saturation in iron (~0.03% at 450°C). The pot roll surface erodes by **dissolution and intermetallic formation** — Fe₃Zn₁₀ and FeZn₁₃ form on the roll surface, then break off as **dross particles** (hard zinc-iron intermetallic particles). Dross that contacts the strip surface during exit embeds as **dross inclusions** — customer-visible surface defects on galvanized panels.

*Synthetic dross formation rate model:*
```
Dross_production_rate(T) = A × exp(-Q/RT) × [Fe_dissolved - Fe_equilibrium]
where:
  Q = 80,000 J/mol (dissolution activation energy)
  T = pot temperature in Kelvin
  A = pre-exponential factor (calibrated to pot geometry)

At T = 455°C: dross_rate = 0.8 kg/hr (normal)
At T = 470°C: dross_rate = 3.5 kg/hr (4.4× higher — pot temperature excursion scenario)

Pot roll wear rate:
Thickness_loss(t) = K_dissolution × t × exp(-Q/RT)
Alarm: Roll diameter reduced by > 5 mm → replace sink roll (pot shutdown required)
```

**Spare Part:** Stainless steel sink roll assembly — **8-week lead time**

---

### F6-EQ06 — High-Pressure Air Knives (HPAK)

**What it does:** As the galvanized strip exits the zinc pot vertically, it carries excess zinc. Two air knives (one on each side of the strip) direct **high-velocity air jets** at the strip from precise nozzle slots. The shear force of the air jet **wipes** the excess zinc, controlling the final **coating weight** (zinc thickness in g/m²). Coating weight is controlled by adjusting air knife pressure and position (distance from strip).

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Air knife pressure | 0.3–1.2 bar (above ambient) | < 0.2 bar (coating too heavy) |
| Nozzle-to-strip distance | 8–20 mm | > 25 mm (poor control authority) |
| Nozzle slot gap uniformity | < 0.1 mm variation across width | > 0.3 mm (coating non-uniformity) |
| Air temperature | 20–50°C | > 70°C (zinc splash solidification issue) |
| Coating weight achieved | 60–275 g/m² (grade-dependent) | > ±5 g/m² from target |

**Sensors:**
- `Air knife pressure transmitter` — primary coating weight control variable
- `Nozzle-to-strip laser distance sensor` — position control feedback

**Malfunction Physics & Synthetic Reproduction:**

The air knife nozzle slot is a precision-machined gap (0.8–1.5 mm wide, full strip width up to 1650 mm long). Zinc vapour condenses in the cooler regions of the nozzle slot and **solidifies as zinc crystals** inside the slot — a process called **zinc dust clogging**. Once partial, the solidified zinc changes the air flow distribution across the strip width, creating a **"heavy" stripe** (locally higher coating weight) on the strip directly opposite the blockage.

*Synthetic coating weight non-uniformity from nozzle blockage:*
```
Coating_weight(x, t) = CW_target × P_effective(x, t) / P_target
P_effective(x, t) = P_air × gap_effective(x, t)² / gap_design²
gap_effective(x, t) = gap_design × (1 - blockage_fraction(x, t))

blockage_fraction(x, t) = 1 - e^(-zinc_deposition_rate × t)
zinc_deposition_rate varies across x: highest at nozzle cold-spots (near supports)

Net effect: Coating_weight deviation(x) = +18 g/m² locally at blockage (matches real incident)
Detection: Coating_weight_gauge (F6-EQ12) reports stripe exceeding ±5 g/m² spec
Response: Automated nozzle slot cleaner traverse; restore gap uniformity
```

**Spare Part:** High-precision air knife lip — **6-week lead time**

---

### F6-EQ07 — Tension Leveler (TL)

**What it does:** After galvanizing (or after skin pass for CRCA), the strip passes through a **tension leveler** — a series of small-diameter rolls arranged in a wave pattern that applies **alternating bending** to the strip under tension. This **stretches the strip longitudinally by 0.2–0.5%** and removes residual stresses from coiling, rolling, and thermal treatment, producing a **flat strip** that lies perfectly flat when uncoiled — essential for automotive pressing operations.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Strip entry tension | 80–150 MPa | > 200 MPa (yield risk) |
| Roll bending force | 200–600 kN per flex roll | > 700 kN |
| Elongation | 0.2–0.5% | > 0.6% (permanent deformation) |
| Roll gap hydraulic pressure | 100–200 bar | < 80 bar (cylinder leak) |

**Sensors:**
- `Inter-roll tension load cell` — primary tension measurement
- `Roll gap LVDT` — flex roll position control

**Malfunction Physics & Synthetic Reproduction:**

The **flex rolls** (small-diameter rolls applying the alternating bending) rotate at strip speed while being forcibly displaced into the strip plane. The combination of **high surface contact stress** (Hertzian contact, magnified by small roll radius) and **high rotational speed** causes the roll surface to undergo **rolling contact fatigue (RCF)**. Sub-surface cracks initiate at the depth of maximum orthogonal shear stress and propagate to the surface as **pitting or spalling**. The roll bearing (supporting the flex roll on both ends under the bending force) experiences the combined radial load from strip bending and axial load from strip tension — **combined loading bearing fatigue**.

*Synthetic flex roll RCF progression:*
```
N_rfc_initiation = (Hardness)^3 / (Contact_stress)^3 × N_Hertz_fatigue_ref
  [initiation life inversely proportional to cube of contact stress]

Sub-surface crack depth:
a(N) = a_0 × (N / N_initiation)^0.5    [square root growth after initiation]

Spalling at: a > a_critical = 0.5 × roll_radius × 0.05  [5% of radius]

Vibration signature of pitting: high-frequency shock pulses at:
f_pitting = strip_speed / (π × roll_diameter) × N_pits_per_revolution
```

**Spare Part:** High-hardness flex rolls — **8-week lead time**

---

### F6-EQ08 — Emulsion Coolant System (ECS)

**What it does:** At the Tandem Cold Mill (F6-EQ02), a precisely formulated **oil-in-water emulsion** is applied to work rolls and strip at 2,000–4,000 L/min per stand. The emulsion serves dual purposes: **lubrication** (reducing rolling force and friction, preventing strip surface damage) and **cooling** (absorbing heat from plastic deformation — typically 5–10°C temperature rise per stand). Emulsion concentration is 2–5% oil in water.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Emulsion concentration | 2.0–5.0% oil | < 1.5% (poor lubrication) |
| Iron particle contamination | < 200 ppm | > 400 ppm (abrasive emulsion) |
| pH | 7.5–9.0 (slightly alkaline) | < 7.0 (corrosive to strip) |
| Temperature | 45–60°C | > 70°C (emulsion breakdown) |
| Flow per stand | 2,000–4,000 L/min | < 1,500 L/min |

**Sensors:**
- `Inline refractometer` — real-time oil concentration measurement
- `Iron particle sensor` (magnetic or optical) — contamination monitoring

**Malfunction Physics & Synthetic Reproduction:**

Rolling iron particles (fine swarf from strip surfaces) accumulate in the emulsion tank. These particles are **ferromagnetic** — the magnetic separator (rotating permanent magnet drum) is designed to capture them. When the separator's **magnetic filter mesh becomes loaded** (saturated with iron particles), its capture efficiency drops below 60%, and iron accumulates in the emulsion above the 400 ppm alarm level. At high iron contamination, the emulsion's **oil-water emulsion stability** is disrupted (iron ions catalyze oil oxidation), causing the emulsion to **split** — free oil forms on the surface, leaving a water-lean zone that causes **roll surface burn marks**.

*Synthetic iron contamination growth and emulsion splitting:*
```
[Fe](t) = [Fe_0] + production_rate × t - removal_rate(filter_efficiency) × [Fe] × t
production_rate = k_wear × rolling_force × strip_speed × strip_width

Filter efficiency degradation:
η_filter(t) = η_max × (1 - (t/t_saturation)^2)   [parabolic capacity reduction]

At η_filter < 0.5:
  [Fe] rises above 400 ppm within 2–3 shifts
  Emulsion pH drops from 8.5 to 7.2 (iron oxidation consumes alkalinity)
  Strip corrosion risk increases → rust stains on coil
  
Full split: [Fe] > 800 ppm → requires full emulsion dump and refill (6–8 hr downtime)
```

**Spare Part:** Magnetic separation filter mesh — **4-week lead time**

---

### F6-EQ09 — Electrostatic Oiler (EO)

**What it does:** The final surface treatment before coiling. A thin, uniform film of **corrosion protection oil** (typically 300–600 mg/m²) is applied to both surfaces of the finished strip using **electrostatic spraying** — oil is charged to high voltage (15–25 kV), atomized into fine droplets that are electrostatically attracted to the grounded strip surface. This prevents rust formation during storage and shipping, and aids in press-forming lubrication at the customer's site.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Charge grid voltage | 15–25 kV | < 12 kV (poor atomization) |
| Oil flow rate | 30–80 mL/min (per side) | > 100 mL/min (over-oiling) |
| Oil coat weight | 300–600 mg/m² | > ±50 mg/m² from target |
| Strip speed | 40–120 m/min | — |

**Sensors:**
- `Charge grid voltage meter` — confirms electrostatic field is active
- `Oil flow sensor` — volumetric oil delivery measurement

**Malfunction Physics & Synthetic Reproduction:**

The **ionizing charging electrode** (a fine-wire corona discharge electrode at 20 kV) is exposed to the mist of oil droplets. Over time, **oil deposits** build up on the electrode wire and the insulating support structures, reducing the electrode's surface area for corona discharge. Reduced corona output means fewer oil droplets are charged — **spray efficiency drops** and oil coat becomes non-uniform. If the electrode support insulator becomes **oil-contaminated**, the high voltage can cause **surface tracking discharge** — a creeping arc along the insulator surface, similar to the ETP failure mode in F1.

*Synthetic oil coat weight degradation from electrode fouling:*
```
Corona_current(t) = I_0 × (1 - fouling_rate × t)^2   [quadratic fouling]
where:
  I_0 = 2.5 mA (clean electrode)
  fouling_rate = 0.0008 per operating hour

Oil_coat_weight(t) = OC_target × (Corona_current(t) / I_0)^0.7
  [sub-linear relationship between current and coat weight]

At t = 500 hrs: Corona_current = 1.35 mA → Oil_coat = 420 mg/m² (still in spec)
At t = 800 hrs: Corona_current = 0.70 mA → Oil_coat = 255 mg/m² (BELOW minimum 300 → rust risk)
Alarm: Oil_coat < 280 mg/m² → clean electrode assembly
```

**Spare Part:** Ionizing charging electrode — **6-week lead time**

---

### F6-EQ10 — Inline Roughness Profilometer (IRP)

**What it does:** A laser-based non-contact surface roughness gauge mounted above the strip on the exit of the skin pass mill or galvanizing line. It measures the strip surface **Ra** (arithmetic mean roughness) and **Rz** (mean roughness depth) continuously at strip speed, providing real-time feedback for roll change scheduling and process adjustments.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Ra measurement range | 0.3–5.0 μm | — |
| Ra target (CRCA automotive) | 0.8–1.5 μm | > 2.0 or < 0.6 μm |
| Ra target (Galvanized) | 1.0–2.0 μm | > 2.5 or < 0.8 μm |
| Measurement speed | Up to 30 m/s strip speed | — |
| Laser spot size | 1.5 μm (HeNe laser, confocal) | — |

**Sensors:**
- `Laser scanning head` (confocal or coherence scanning interferometer) — primary measurement element
- `Sensor cooling flow meter` — maintains sensor below operating temperature limit

**Malfunction Physics & Synthetic Reproduction:**

The laser optical window is exposed to **rolling emulsion mist and zinc dust** in the plant atmosphere. Micro-droplets of emulsion land on the window and dry, leaving **oil residue deposits** that scatter the laser beam — **optical lens fogging**. The scattered light creates a **systematic bias in the roughness measurement** — the instrument reports a higher Ra than actually exists (the scattered light mimics surface features). In the galvanizing area, **zinc fume condensation** on the optical window is particularly aggressive — zinc oxide particles are harder to clean than oil films.

*Synthetic optical fogging measurement bias:*
```
Ra_measured(t) = Ra_true + Ra_bias(t)
Ra_bias(t) = Ra_bias_max × (1 - e^(-fouling_rate × t))
where:
  Ra_bias_max = 0.8 μm (fully fouled window)
  fouling_rate = 0.004 per operating hour

At t = 100 hrs: Ra_bias = 0.33 μm → Ra_measured = 1.1 + 0.33 = 1.43 μm (still in spec, but wrong)
At t = 200 hrs: Ra_bias = 0.55 μm → Ra_measured = 1.1 + 0.55 = 1.65 μm (triggers high alarm incorrectly)
→ Spurious roll change triggered → unnecessary production disruption + cost

Mitigation: Air purge on optical window; cleaning every 8 hours
```

**Spare Part:** Laser scanning sensor head — **8-week lead time**

---

### F6-EQ11 — Flatness Measurement Roll (FMR)

**What it does:** A segmented roll with **piezoelectric force sensors** built into each segment along the roll width. As the strip passes over the roll, each segment measures the **contact force** — variations in contact force across the width indicate **flatness defects** (wavy edges, center buckle, quarter buckle). The measurement is used to control the **flatness actuators** (work roll bending, crown adjustment) of the TCM stands.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Flatness uniformity | < 5 I-units across width | > 10 I-units |
| Sensor segment force | Uniform ±5% across width | Any segment deviation > 20% |
| Roll speed | Synchronized with strip | — |
| Operating temperature | < 50°C | > 70°C |

**Sensors:**
- `Piezoelectric segment load cells` (one per 25–50 mm of strip width) — distributed force measurement

**Malfunction Physics & Synthetic Reproduction:**

Piezoelectric sensors generate a voltage proportional to applied force via the **piezoelectric effect** (stress-induced charge separation in a crystalline material like quartz or PZT). In the cold mill environment, **water and emulsion ingress** into the sensor capsule cause **ionic contamination** of the piezoelectric element — ions in the liquid reduce the sensor's insulation resistance and create a **parallel conductive path** that leaks the charge away, reducing the sensor's sensitivity. Over time, the sensor reads **lower force than actual** — flatness defects are missed, eventually causing strip flatness complaints from the automotive customer.

*Synthetic sensor sensitivity drift:*
```
Sensitivity(t) = S_0 × e^(-contamination_rate × t)
where:
  S_0 = 1.0 pC/N (new sensor)
  contamination_rate = 0.001 per operating hour (in poor sealing environment)

Force_measured(t) = Force_actual × Sensitivity(t)
Flatness_error_missed = Σ(Force_actual - Force_measured) × geometry_factor

Alarm: Sensitivity < 0.7 × S_0 → cross-check with edge drop gauge; replace sensor
Insulation resistance check: quarterly → R < 100 MΩ → replace
```

**Spare Part:** Segmented piezoelectric roll — **16-week lead time**

---

### F6-EQ12 — Dual Coating Weight Gauge (DSCWG)

**What it does:** An **X-ray fluorescence (XRF)** gauge that measures zinc coating weight on both sides of the galvanized strip simultaneously and continuously. XRF works by irradiating the strip with X-rays; zinc atoms fluoresce at characteristic Zn Kα wavelength (8.63 keV), and the intensity of the fluorescence is proportional to the zinc coating mass per unit area. This is the primary quality control measurement for Product Z.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Coating weight (each side) | 30–140 g/m² (grade-dependent) | > ±5 g/m² from target |
| Measurement reproducibility | ±0.5 g/m² (1σ) | > ±2 g/m² drift |
| X-ray source activity | Per manufacturer spec | < 80% initial (source decay) |
| Detector counting rate | Stable baseline | > ±5% drift |

**Sensors:**
- `XRF detector` (scintillation counter or silicon drift detector) — measures Zn fluorescence intensity
- `Cooling water RTD` — detector thermal stability

**Malfunction Physics & Synthetic Reproduction:**

The XRF source (often an ⁵⁵Fe or ¹⁰⁹Cd radioisotope, or an X-ray tube) has a **finite source activity** — for radioisotopes, this follows exponential decay: `A(t) = A_0 × e^(-λ × t)` where λ = ln(2)/T_half. As source activity decreases, the signal-to-noise ratio drops, reducing measurement precision. The **reference slide** (a calibrated zinc foil that the gauge measures periodically to check calibration) travels on rails that can become **corroded by zinc fumes**, causing the slide to bind — the gauge cannot perform automatic calibration checks, and calibration drift goes undetected.

*Synthetic coating weight measurement error from source decay + calibration miss:*
```
Signal_intensity(t) = S_actual × (A(t) / A_0)   [proportional to source activity]
A(t) = A_0 × e^(-0.693/T_half × t)

If calibration slide is stuck (missed calibration for 2 shifts):
  Calibration_offset(Δt_no_cal) = drift_rate × Δt_no_cal
  where drift_rate = 0.15 g/m² per hour (temperature-induced drift)
  
  After 16 hrs no calibration: offset = 2.4 g/m² → approaching ±5 g/m² alarm
  
Combined error: Measurement = True_coating + Source_decay_bias + Calibration_offset
→ Product shipped with unknown coating weight deviation → corrosion warranty claims
```

**Spare Part:** Ionization detector tube — **10-week lead time**

---

### F6-EQ13 — Edge Position Control System (EPCS)

**What it does:** Controls the **lateral position** of the strip as it travels through the entire processing line — pickling, cold mill, annealing furnace, and galvanizing pot. If the strip wanders sideways, it can contact furnace walls, overflow the zinc pot, or produce coils with offset edges (telescoped coil). The EPCS uses an **optical edge scanner** (LED or laser) to detect strip edge position and a **hydraulic servo valve** to steer the strip by adjusting the angle of a steering roll.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Strip edge position deviation | < ±5 mm from centerline | > ±15 mm → auto-correct |
| Hydraulic servo valve response | < 50 ms | > 100 ms |
| Sensor field of view | Covers full strip edge range | Edge out of field |

**Sensors:**
- `Optical edge scanner` (CCD camera or LED curtain) — strip edge detection
- `Hydraulic servo valve` — steering actuator

**Malfunction Physics & Synthetic Reproduction:**

The optical edge scanner's **CCD camera lens** in the pickling section is exposed to HCl vapour (hydrochloric acid fumes at 65–80°C). HCl reacts with glass lens coatings (typically MgF₂ or SiO₂ anti-reflection coatings) through **chemical etching** — the acid attacks the coating surface, increasing **lens haze** (light scattering) and reducing image contrast. A hazy lens means the strip edge appears blurred in the image — the edge detection algorithm computes a **biased or noisy edge position**, causing the EPCS to apply incorrect steering corrections — the strip wanders rather than being corrected.

*Synthetic edge position noise from lens haze:*
```
Edge_detected(t) = Edge_true + N(0, σ_edge(t))  [Gaussian noise model]
σ_edge(t) = σ_0 × (1 + haze_growth_rate × t)^2
where:
  σ_0 = 0.5 mm (new clear lens)
  haze_growth_rate = 0.001 per operating hour (acid pickling environment)

At t = 200 hrs: σ_edge = 0.5 × (1.2)² = 0.72 mm (marginal)
At t = 500 hrs: σ_edge = 0.5 × (1.5)² = 1.13 mm → strip wander > ±5 mm → EPCS hunting
→ Strip lateral oscillation → edge damage at furnace walls
```

**Spare Part:** Edge scanning CCD camera — **4-week lead time**

---

### F6-EQ14 — Acid Dosing Pumps (ADP)

**What it does:** Continuously dose fresh concentrated HCl acid into the pickling tanks to maintain the target acid concentration as it is consumed. Also dose **inhibitor chemicals** (organic compounds that slow steel dissolution to prevent over-pickling) and pH adjustment chemicals. Precise dosing (±2% of setpoint) is critical — over-dosing wastes expensive acid; under-dosing causes quality failures.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Stroke rate | 30–120 strokes/min | > 140 strokes (overload) |
| Delivery flow | 50–200 L/hr (per pump) | Deviation > ±5% from setpoint |
| Discharge pressure | 3–6 bar | > 8 bar (check valve failure) |

**Sensors:**
- `Pump stroke rate sensor` — counts strokes per minute; confirms pump is operating
- `Delivery flow meter` — confirms correct volume delivery

**Malfunction Physics & Synthetic Reproduction:**

Diaphragm pumps use a **flexible PTFE diaphragm** that flexes back and forth to displace fluid. PTFE is selected for its chemical resistance to HCl, but it is **notch-sensitive** — any manufacturing defect, particulate damage, or flex crease develops into a **fatigue crack** that propagates through the diaphragm thickness with each stroke cycle. A **pinhole perforation** allows acid to bypass the diaphragm, reducing dosing rate. The **check valves** (ball or disc type) control the direction of acid flow — an HCl-corroded check valve seat loses its sealing surface, allowing **backflow** (acid siphons backwards when pump is idle), causing measurement error and potential chemical spill.

*Synthetic diaphragm fatigue life:*
```
N_failure = (σ_fatigue_limit / σ_flex)^m × N_ref    [Basquin law for elastomers]
σ_flex = diaphragm_stiffness × stroke_amplitude / t_diaphragm
m ≈ 4–6 for PTFE composites

Flow deviation signature of progressive perforation:
Flow(n) = Flow_setpoint × (1 - perforation_area(n) / diaphragm_area)
perforation_area(n) = A_0 × (n / N_failure)^1.5    [super-linear crack area growth]

Alarm: Flow deviation > 5% from setpoint → inspect diaphragm
If detected at > 10% deviation: acid concentration in tank drops → under-pickling risk
```

**Spare Part:** PTFE metering diaphragm — **3-week lead time**

---

### F6-EQ15 — Annealing Atmosphere Scrubber (AAGS)

**What it does:** The atmosphere gas leaving the continuous annealing furnace (a mixture of N₂ + H₂ + combustion byproducts from any radiant tube leaks + trace organics from strip surface oil burning off) must be treated before discharge to atmosphere. The scrubber removes residual organics through **activated carbon adsorption** and any trace acid gases through **alkaline scrubbing**. This is both an environmental compliance system and a quality system — uncontrolled organics in the furnace atmosphere can deposit on the strip surface, affecting galvanizability.

**Normal Operating Parameters:**

| Parameter | Normal Range | Alarm |
|:---|:---|:---|
| Carbon bed pressure drop | 2–5 mbar | > 8 mbar (loaded bed) |
| Exhaust organic content (VOC) | < 20 mg/Nm³ | > 50 mg/Nm³ (emission violation) |
| Exhaust fan suction | 50–100 Pa negative | < 20 Pa (fan trip) |
| Carbon bed temperature | < 40°C (ambient) | > 60°C (exothermic adsorption overload) |

**Sensors:**
- `Gas pressure gauge` across carbon bed — primary bed loading indicator
- `Oxygen analyzer` in exhaust — confirms H₂ is not accumulating to flammable levels

**Malfunction Physics & Synthetic Reproduction:**

**Activated carbon adsorption saturation** is the primary failure mode — the carbon's pore surface area (750–1000 m²/g) that adsorbs organic molecules becomes fully occupied (**breakthrough**). Once saturated, organics pass through unabsorbed into the exhaust stream, causing environmental exceedance. The saturation rate depends on the organic loading from the strip surface (higher oil carryover from the cold mill → faster saturation). The **exhaust fan** can trip from **motor winding overtemperature** (the fan motor operates in a humid, contaminated atmosphere that degrades winding insulation faster than normal).

*Synthetic carbon bed saturation breakthrough curve:*
```
C_outlet(t) = C_inlet × (1 - e^(-k_ads × (M_carbon - M_loaded(t)) / Q_gas))
M_loaded(t) = M_loaded_0 + loading_rate × t
where loading_rate = C_inlet × Q_gas × η_adsorption

Breakthrough when M_loaded approaches M_carbon × adsorption_capacity:
  C_outlet rises from near-zero to near C_inlet over breakthrough time τ_BT = 4–8 hours

Alarm: C_outlet > 20 mg/Nm³ (half of regulatory limit) → initiate carbon bed change
Pressure drop alarm provides earlier warning: ΔP > 6 mbar → schedule replacement
```

**Spare Part:** Gas scrubber carbon filter element — **4-week lead time**

---

## Integrated Safety SOPs

### SOP-F6-01: Acid Pickling Safety and Emergency Spill Response

HCl is a **corrosive, toxic gas-generating liquid**:
- All pickling tank area workers: wear acid-resistant PPE (face shield, gloves, apron, boots)
- Tank ventilation: maintain negative pressure in pickling bay (acid fumes exhausted at source)
- Emergency eye wash and shower: within 10 seconds reach from any pickling tank position
- HCl spill: neutralize with sodium carbonate (Na₂CO₃) solution; contain drainage to acid sump
- If acid level drops unexpectedly (pump failure or tank leak): stop strip immediately; isolate acid feeds

### SOP-F6-02: Zinc Pot Emergency Procedures

Liquid zinc at 460°C is a severe burn hazard:
- **Water + liquid zinc = steam explosion** — no water hoses in zinc pot area; use dry sand
- Pot level drop (> 50 mm sudden): stop galvanizing line; inspect for pot leak
- Strip breakage in zinc pot: stop line; allow zinc to cool; remove strip manually only after zinc solidifies
- Sink roll replacement: pot must cool to below 300°C; full PPE (aluminized suit) required

---

## Cascade Impact Summary — F6

| Failure | Immediate Effect | Downstream Impact |
|:---|:---|:---|
| EQ01 (Pickling Tanks) acid under-concentration | Under-pickled strip → scale at TCM | Surface defects in Product Y and Z → customer claims |
| EQ05 (Zinc Pot) temperature excursion | Excess dross → dross inclusions in strip | Product Z quality rejection; automotive claims |
| EQ06 (Air Knives) nozzle blockage | Coating weight stripe (+18 g/m²) | Product Z out-of-spec; coating weight customer claim |
| EQ03 (Annealing Furnace) radiant tube crack | Atmosphere contamination → strip oxidation | Product Y ungalvanizable; galvanizing line contamination |
| EQ02 (TCM) roll bearing seizure | Emergency roll change; 2–4 hr downtime | Product delivery delays; coil supply gap to customers |