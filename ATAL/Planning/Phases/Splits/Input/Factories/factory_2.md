# 🏭 Factory 2 — Sinter Plant (SP)

---

## Overview

**Factory ID:** F2  
**Full Name:** Sinter Plant  
**Abbreviation:** SP  
**Primary Inputs:** Iron ore fines, coke breeze (fine coke particles from F1), limestone, dolomite  
**Primary Output:** Sinter — a porous, self-fluxing iron ore agglomerate  

### What This Factory Does (Plain English)

Iron ore from mines comes partly as fine particles — too small to be loaded directly into a Blast Furnace without being blown out by the hot blast air. The Sinter Plant solves this by **fusing** these fines together with coke breeze and fluxing minerals (limestone and dolomite) into a porous, lumpy mass called **sinter**.

The process: the raw mix is granulated with water, loaded onto a slow-moving steel conveyor belt called the **sinter strand**, and ignited from above by a gas-fired ignition furnace. As the strand moves forward, air is drawn downward through the bed by suction fans below, burning the coke breeze particles within the mix. By the time the bed reaches the end of the strand, the burn-through should have just reached the bottom — this precise point is called the **Burn-Through Point (BTP)**. The fused, porous mass is then broken, screened, and cooled before being sent to F3.

### Upstream Dependency
Coke breeze quality from F1 directly controls sinter bed combustion intensity. Poor coke quality (inconsistent particle size, high moisture) disrupts burn rate, causing BTP to shift upstream or downstream — a **2–4 hour quality propagation lag** into F3.

### Downstream Dependency
Sinter quality (FeO%, basicity, size distribution) directly determines **Blast Furnace (F3) gas permeability and reduction efficiency**. Sinter represents 70–80% of the BF iron-bearing charge — making this factory's output quality the single largest controllable variable for F3 performance.

---

## 15 Core Equipment Assets

### F2-EQ01 — Raw Material Blending Silo (RMBS)

**What it does:** A set of large storage silos (each 500–1500 tonnes capacity) holding the individual raw materials — iron ore fines, coke breeze, limestone, dolomite, return sinter fines. Automated weigh feeders below each silo dispense precise proportions of each material onto a conveyor belt to form the **raw mix**.

**Normal Operating Parameters:**
- Level maintained: 40–80% silo capacity
- Weigh feeder discharge accuracy: ±1% of setpoint
- Material flow: continuous, matched to sintering strand speed

**Sensors:**
- `Radar level transmitters` — non-contact level measurement in each silo
- `Weight load cells` on weigh feeders — confirm material discharge rate

**How it malfunctions (scientifically):**
Fine iron ore particles (< 6 mm) with high moisture content can **arch** over the silo discharge gate — a phenomenon where particles interlock across the opening, forming a stable bridge that stops flow completely. This is driven by **cohesive strength** of wet fines exceeding their weight — described by the Jenike flow factor. Separately, the wear-resistant steel liners on the silo walls erode from abrasive ore sliding contact, eventually reducing wall thickness to unsafe levels.

**Cascade effect:** Silo discharge blockage interrupts the raw mix feed → the sintering strand slows or starves → inconsistent bed depth → erratic BTP → poor sinter quality to F3.

**Spare Part:** Wear-resistant liner plates — **4-week lead time**

---

### F2-EQ02 — Primary Mixing Drum (PMD)

**What it does:** A large rotating cylindrical drum (typically 3–4 m diameter, 10–15 m long) that tumbles the raw mix components together, blending them into a homogeneous mixture and beginning the granulation (ball formation) process by adding water.

**Normal Operating Parameters:**
- Drum rotation speed: 5–8 RPM
- Drive motor current: monitored continuously
- Retention time: ~3–4 minutes

**Sensors:**
- `Drive motor current transducer` — detects overload (material buildup or bearing failure)
- `Drum speed tachometer` — confirms correct rotation

**How it malfunctions (scientifically):**
The drum is supported by four **trunnion roller bearings** running on riding rings welded to the drum shell. Under continuous load and rotational motion, the bearing rollers experience **Hertzian contact stress** cycling. Without adequate lubrication, the thin elastohydrodynamic (EHD) oil film between rollers and raceways breaks down, causing **adhesive wear** and eventual **spalling of the bearing race surface**. Internally, the **lifter blades** (steel paddles welded to the inner drum wall that lift and cascade material) erode from abrasive contact with iron ore particles.

**Cascade effect:** Reduced mixing uniformity → inconsistent granule size distribution → poor bed permeability in the sinter strand → BTP shifts → F3 receives non-uniform sinter.

**Spare Part:** Spherical roller bearings — **8-week lead time**

---

### F2-EQ03 — Secondary Drum Nodulizer (SDN)

**What it does:** A second rotating drum that receives the pre-mixed material from the PMD and further refines the granulation (nodulization) process by adding precisely metered water through spray nozzles. The goal is to form **granules of 3–8 mm diameter** with uniform moisture content (7–8%) — optimal for sintering.

**Normal Operating Parameters:**
- Water addition: 6–8% by weight of dry mix
- Moisture sensor output: 7.0–8.0% target
- Spray pressure: 2.0–3.0 bar

**Sensors:**
- `Water flow transmitter` — controls total water addition
- `Moisture sensor` (near-infrared or microwave) — real-time moisture feedback

**How it malfunctions (scientifically):**
The spray nozzles operate in a fine mist mode (nozzle orifice ~0.5–1.5 mm). Fine iron ore particles carried by the material splash can **bridge across the nozzle orifice** — a **clogging mechanism** driven by electrostatic attraction between wet iron ore fines and the nozzle edge. Partial clogging creates uneven moisture distribution: some granules are too wet (collapse, reducing permeability) and others too dry (don't granulate, fall apart on the strand). Separately, prolonged high-moisture exposure causes **delamination of the drum shell liner** through corrosion-fatigue.

**Cascade effect:** Over-wet granules → sinter bed permeability drops → burn rate slows → BTP shifts downstream → FeO content rises to unacceptable levels for F3.

**Spare Part:** High-pressure spray nozzles — **2-week lead time**

---

### F2-EQ04 — Sintering Machine Strand (SMS)

**What it does:** The core machine of the sinter plant. A continuous loop of **pallet cars** (each ~2 m wide, 1 m long, steel-sided with grate bar floors) linked together like a conveyor belt. The granulated mix is loaded onto this moving strand to a depth of 500–700 mm. The strand moves at 2–4 m/min from the ignition furnace to the discharge end.

**Normal Operating Parameters:**
- Strand speed: 2.5–4.0 m/min (adjusted based on BTP position)
- Drive sprocket current: monitored continuously
- Pallet position switches: verify spacing at drive

**Sensors:**
- `Strand drive current transducer` — total drive load; rises if strand jams
- `Pallet position switches` — detect pallet misalignment or missing pallet

**How it malfunctions (scientifically):**
The drive system uses a **sprocket-and-chain** mechanism. The sprocket teeth are exposed to cyclic impact loading as each pallet link engages. Under repeated stress, the tooth root experiences **fatigue crack initiation** at stress concentration points. Simultaneously, the track guides that keep pallets aligned can develop **rail misalignment** from thermal distortion (the strand operates in a temperature range from ambient to >1000°C surface temperature) — causing pallets to skew and jam.

**Cascade effect:** Strand stoppage during active sintering → the sinter bed continues to combust in place → overburning of the stationary bed → product destruction and potential fire → complete production halt affecting F3 feed.

**Spare Part:** High-alloy drive sprocket — **14-week lead time**

---

### F2-EQ05 — Pallet Car Assembly (PCA)

**What it does:** Individual pallet cars that form the sintering strand. Each pallet is a steel frame with **grate bars** on the bottom (allowing hot gas to pass downward through the sinter bed) and side walls to contain the mix. The pallets travel the full strand length and then invert at the discharge end to dump sinter.

**Normal Operating Parameters:**
- Wheel bearing temperature: < 120°C
- Wheel rotation: smooth, no wobble
- Side seal plates: maintain < 5 mm gap to strand sidewalls

**Sensors:**
- `Bearing temperature RTDs` — per-pallet temperature monitoring at key strand positions
- `Wheel tachometer` — detects locked wheels (dragging instead of rolling)

**How it malfunctions (scientifically):**
Pallet wheels run in an environment of hot gas (300–600°C at the pallet level), abrasive sinter dust, and intermittent water quench at the discharge end. This environment causes **lubricant carbonization** — the grease in the wheel bearings thermally degrades, losing its viscosity and leaving only solid carbon residue. Without lubrication, the bearing operates in **boundary lubrication** or **dry contact**, rapidly causing **adhesive wear** and eventual **seizure**. Simultaneously, the side seal plates (which prevent hot gas leakage around the pallet sides) **thermally warp** from the temperature gradient between the hot sinter bed and the cooler metal frame.

**Cascade effect:** Seized pallet wheels → increased strand drive load → drive sprocket overload → strand speed instability → BTP position variability.

**Spare Part:** Sealed wheel bearings — **6-week lead time**

---

### F2-EQ06 — Alloy Grate Bars (AGB)

**What it does:** The floor of each pallet car consists of **cast alloy steel grate bars** arranged in rows with gaps between them. These gaps allow the suction from below to draw combustion air down through the sinter bed — the fundamental mechanism of sintering. Without open grate bars, the sinter process cannot function.

**Normal Operating Parameters:**
- Grate gap: 4–6 mm between bars
- Surface temperature: 800–1100°C during active sintering
- Visual camera inspection: every shift for warping or clogging

**Sensors:**
- `Visual cameras` (pyrometer-equipped) — detect blocked or warped grate bars
- `Under-bed temperature sensors` — confirm gas flow is passing through (drop indicates clogging)

**How it malfunctions (scientifically):**
At sintering temperatures (1100–1300°C), **high-temperature oxidation** causes the chromium-steel alloy bar surface to form an oxide scale (Cr₂O₃). This scale flakes off (spalling) under thermal cycling, gradually reducing bar cross-section. Simultaneously, fine sinter particles can **sinter-bond** to the grate bar surface during liquid phase sintering, creating a **clogging deposit** that reduces gas permeability. The combined effect of oxidation loss and clogging causes the bars to **warp** asymmetrically.

**Cascade effect:** Clogged grate bars create uneven suction distribution across the sinter bed width → non-uniform combustion → striped quality variations in the sinter → F3 receives a mix of good and poor-quality sinter in each batch.

**Spare Part:** Cast chromium-steel grate bars — **3-week lead time**

---

### F2-EQ07 — Gas-Fired Ignition Furnace (GFIF)

**What it does:** A stationary furnace at the feed end of the strand that fires downward onto the top surface of the sinter mix for ~90–120 seconds as the pallet cars pass beneath it. This ignites the coke breeze particles at the surface layer, starting the combustion wave that will propagate downward through the bed.

**Normal Operating Parameters:**
- Furnace temperature: ~1200°C at burner exit
- Burner gas flow: matched to strand speed
- UV flame detectors: one per burner, confirm active flame

**Sensors:**
- `Burner gas flow transmitters` — verify fuel supply
- `UV flame detectors` — safety shutdown if flame loss detected

**How it malfunctions (scientifically):**
The furnace arch is lined with **refractory castable material** that is exposed to the combined thermal stress of burner flame (1400°C at the burner face) and cold ambient air entering from the open ends of the furnace. This **thermal gradient** creates differential expansion stresses in the refractory arch — eventually causing **arch spalling** (chunks of refractory falling onto the sinter bed below). Separately, the silicon carbide burner nozzles experience **oxidation at high temperature** combined with **thermal shock** from cold gas flow at startup, causing nozzle cracking.

**Cascade effect:** Partial ignition furnace failure → inconsistent surface ignition → some zones of the bed don't ignite → cold spots in sinter → F3 receives under-sintered material that crumbles in the BF, reducing bed permeability.

**Spare Part:** Silicon carbide burner nozzles — **8-week lead time**

---

### F2-EQ08 — Under-Strand Windboxes (USW)

**What it does:** A series of sealed chambers (windboxes) directly beneath the strand grate bars. They are connected to the main waste gas exhauster (F2-EQ09), which pulls suction through them, drawing combustion air down through the sinter bed from above. Each windbox captures the hot combustion gas after it passes through the bed.

**Normal Operating Parameters:**
- Windbox temperature profile: 200–400°C (rising toward discharge end; peak indicates BTP)
- Static pressure: −1.5 to −2.5 kPa (negative, confirming suction)
- Gas leakage: < 2% of total gas flow

**Sensors:**
- `Windbox temperature thermocouples` — used to locate BTP position along the strand
- `Static pressure gauges` — confirm suction is active in each windbox

**How it malfunctions (scientifically):**
Windboxes are connected to the main ductwork via **metallic expansion bellows** — flexible connectors that accommodate thermal expansion of the ducting system. Cyclic thermal expansion (heating and cooling with each production shift) causes **fatigue cracking** of the bellows convolutions. Once a bellow cracks, **gas leakage** occurs — hot combustion gas escapes into the plant environment (toxic CO and SO₂) and the suction in that windbox drops, disturbing the BTP position.

**Cascade effect:** Windbox gas leakage shifts BTP → inconsistent product quality → potential SO₂ environmental exceedance.

**Spare Part:** Metallic expansion bellows — **6-week lead time**

---

### F2-EQ09 — Main Waste Gas Exhauster Fan (MWGEF)

**What it does:** The large centrifugal fan that creates the suction pressure across all windboxes, drawing combustion air down through the entire length of the sinter strand. This is the sinter plant's equivalent of the COBPP's gas exhauster — the machine that drives the entire sintering process.

**Normal Operating Parameters:**
- Shaft vibration: < 4.0 mm/s RMS
- Bearing temperature: < 80°C
- Draft pressure: −1.5 to −2.5 kPa across strand

**Sensors:**
- `Shaft vibration sensors` (radial and axial) — primary health indicator
- `Bearing temperature RTDs` — monitor both drive-end and non-drive-end bearings

**How it malfunctions (scientifically):**
Sinter dust particles (primarily iron oxide, 10–50 μm) carried in the waste gas stream impact the fan impeller blades at high velocity. The **erosion rate** follows the Finnie-Bitter model: material loss ∝ (particle velocity)^n × (impact angle factor). This erosive wear causes **asymmetric blade thinning** — heavier on the pressure face and leading edge. As different blades erode at different rates (due to non-uniform dust distribution), **dynamic unbalance** develops, manifest as 1× rotational vibration — the same progression as F1-EQ09.

**Cascade effect:** Fan trip → total loss of suction → sinter strand must stop → emergency production halt; all of F3's feed supply (sinter) stops within hours.

**Spare Part:** Hard-faced fan impeller — **16-week lead time**

---

### F2-EQ10 — Hot Sinter Breaker (HSB)

**What it does:** At the discharge end of the strand, the fused sinter mass exits at ~700–900°C as large, irregular lumps. The hot sinter breaker uses rotating **toothed rolls** (hard-faced steel) to crush this mass into manageable pieces (< 100 mm) before it enters the cooler.

**Normal Operating Parameters:**
- Breaker drive torque: monitored continuously
- Grease line pressure: confirmed per lubrication schedule
- Output lump size: 40–100 mm target

**Sensors:**
- `Breaker drive torque sensor` — elevated torque indicates large/hard sinter block
- `Grease line pressure sensor` — confirms lubrication system is active

**How it malfunctions (scientifically):**
The breaker teeth operate at ~800°C and are exposed to **abrasive impact** from hardened sinter lumps. The teeth are made of high-chromium white iron or hard-faced steel — materials selected for wear resistance rather than toughness. Under repeated impact from very hard sinter blocks, **brittle fracture** initiates at pre-existing casting defects and propagates rapidly. The rotor shaft can experience **thermal bending** if cooling air distribution is uneven — detected as a sudden increase in shaft vibration at 1× frequency.

**Cascade effect:** Broken breaker teeth contaminate sinter with **metallic fragments** → sensor false readings downstream → potential damage to BF charging equipment at F3 if fragments pass through screening.

**Spare Part:** Hard-faced breaker teeth — **6-week lead time**

---

### F2-EQ11 — Circular Sinter Cooler (CSC)

**What it does:** A large circular rotating structure that receives hot sinter (~700°C) from the discharge conveyor and cools it to < 150°C by drawing ambient air through the sinter bed radially. The sinter must be cooled before it can be screened and transported to F3 via conveyor belts (conveyors cannot handle 700°C material).

**Normal Operating Parameters:**
- Sinter discharge temperature: < 150°C
- Drive motor current: steady (fluctuations indicate mechanical issues)
- Support wheel temperature: < 60°C

**Sensors:**
- `Drive motor current` — overall load monitoring
- `Discharge pyrometer` — confirms sinter is adequately cooled before leaving cooler

**How it malfunctions (scientifically):**
The cooler sits on a circular rail supported by **forged steel wheels**. The wheels experience **rolling contact fatigue** — cyclic Hertzian contact stress between wheel and rail causes **sub-surface crack initiation** at the depth of maximum shear stress (typically 0.5–1 mm below the contact surface). These cracks propagate to the surface, causing **spalling of the wheel tread**. Simultaneously, the cooler trough plates (the floor the sinter rests on) experience **thermal creep deformation** — slow permanent deformation at high temperature under load — causing the trough to **warp**, disturbing the sinter bed depth.

**Cascade effect:** Inadequate cooling → hot sinter (>150°C) placed on conveyor belts → belt rubber vulcanization damage → conveyor belt fire risk → supply interruption to F3.

**Spare Part:** Forged support wheels — **10-week lead time**

---

### F2-EQ12 — Sinter Vibrating Screens (SVS)

**What it does:** After cooling, the sinter passes over vibrating screens that separate it into size fractions: +8 mm goes to F3 (Blast Furnace feed), -8 mm return fines go back to the blending silos (F2-EQ01) to be recycled. This screening is critical — undersized sinter in the BF would reduce gas permeability.

**Normal Operating Parameters:**
- Screen vibration frequency: 16–20 Hz
- Exciter shaft speed: 960–1200 RPM
- Screen mesh aperture: 8 mm top deck, 5 mm bottom deck

**Sensors:**
- `Accelerometers` on screen body — monitor vibration amplitude (drops if exciter fails)
- `Exciter shaft speed sensor` — confirms correct operating frequency

**How it malfunctions (scientifically):**
The vibration is generated by **unbalance exciters** — rotating eccentric masses driven by an electric motor. The exciter shaft bearings are subject to combined radial and axial loads at high speed. **Bearing fatigue** (inner race spalling) is the primary failure mode. Separately, the screen mesh wires experience **high-cycle fatigue** — each vibration cycle flexes the mesh wire at the support frame intersection; after millions of cycles (typical at 18 Hz × 3600 sec/hr × operational hours), **wire fatigue fracture** occurs at the intersection points.

**Cascade effect:** Failed screens mean **all sinter sizes pass to F3**, including fine material → BF bed permeability collapses → major BF operational disruption.

**Spare Part:** Unbalance exciter unit — **8-week lead time**

---

### F2-EQ13 — Sinter Dust Collector ESP (ESP)

**What it does:** An Electrostatic Precipitator specifically for cleaning the waste gas from the sintering process before it is discharged to the stack. Sinter dust (fine iron oxide particles, PM₂.₅ and PM₁₀) must be removed to meet environmental emission standards.

**Normal Operating Parameters:**
- Collection efficiency: > 99.5% (outlet dust < 50 mg/Nm³)
- High-voltage: 40–60 kV
- Transformer current: 200–500 mA per field

**Sensors:**
- `Dust emission monitor` at stack — continuous opacity/particulate measurement
- `Transformer primary/secondary current` — monitors each ESP field independently

**How it malfunctions (scientifically):**
Sinter dust has **highly variable electrical resistivity** depending on temperature and composition. At low temperatures (< 100°C), high-resistivity dust accumulates on collection electrodes and forms a **resistive layer** that generates a back-discharge — a process where the trapped charge layer ionizes the gas in the opposite direction, reducing collection efficiency. This phenomenon (**back-corona**) can be detected by a characteristic increase in current at constant voltage. Separately, the **corona discharge electrodes** (thin wires or rigid frames) can **break** from mechanical vibration fatigue or corrosion.

**Cascade effect:** ESP failure → dust emission exceedance → regulatory shutdown order → sinter plant production halt.

**Spare Part:** Corona discharge electrodes — **6-week lead time**

---

### F2-EQ14 — Intensified Sifting Feeder (ISF)

**What it does:** Controls the rate at which blended raw material is fed from the mixing drums onto the strand. It provides a uniform, consistent material curtain across the full width of the strand to achieve an even bed depth — a prerequisite for uniform BTP position.

**Normal Operating Parameters:**
- Gate opening: controlled by position encoder feedback
- Feed rate: matched to strand speed and target bed depth
- Material level in feed bin: maintained at 70–80%

**Sensors:**
- `Gate position encoder` — confirms gate is at commanded opening
- `Material level radar` — prevents starvation or overflow of feed bin

**How it malfunctions (scientifically):**
The gate mechanism uses hardened steel plates sliding in guides. Fine iron ore particles (abrasive, angular) that enter the sliding interface cause **three-body abrasive wear** — the iron ore particle acts as a cutting medium between the gate and its guide, removing material from both surfaces. Wear increases the gate-to-guide clearance, causing **gate jamming** at partial-open positions (material wedges into the worn gap) and reducing feed rate accuracy.

**Cascade effect:** Uneven feed → variable bed depth → BTP instability → quality variation in F3 sinter feed.

**Spare Part:** Hardox wear liner plates — **4-week lead time**

---

### F2-EQ15 — Belt Coil FeO Analyzer (BCFA)

**What it does:** A non-contact online sensor mounted on the sinter discharge conveyor belt that measures the **FeO (ferrous iron oxide) content** of the sinter in real time. FeO content is a critical quality indicator — target range 7.5–8.2%. High FeO (> 8.5%) indicates over-reduction (too much coke breeze) and poor sinter reducibility in the BF.

**Normal Operating Parameters:**
- FeO target range: 7.5–8.2% (Product X, Y, Z requirement: < 8.5%)
- Measurement frequency: continuous (belt scan)
- Calibration: against laboratory wet chemistry samples every 8 hours

**Sensors:**
- `Electromagnetic induction sensor` — measures FeO based on magnetic susceptibility (FeO is ferromagnetic; Fe₂O₃ is paramagnetic; ratio indicates FeO%)

**How it malfunctions (scientifically):**
The sensor relies on a **primary/secondary induction coil** arrangement. The changing magnetic permeability of the passing sinter induces a secondary voltage proportional to FeO content. Over time, **mechanical vibration** from the conveyor belt causes micro-fractures in the ceramic former of the induction coil, changing coil geometry and leading to **calibration drift**. In wet environments, **moisture ingress** into the sensor housing changes the dielectric constant of the medium surrounding the coil, adding a systematic measurement error.

**Cascade effect:** Undetected FeO exceedance → F3 receives sinter with poor reducibility → higher coke rate in BF → increased BF operating cost → potential thermal imbalance.

**Spare Part:** Induction receiver coil — **4-week lead time**

---

## Integrated Safety SOPs

### SOP-F2-01: Sinter Strand BTP Control and Emergency Procedures

The Burn-Through Point (BTP) must stay within ±1.5 m of the target position (typically 0.5–1.0 m before the strand discharge end):

- If BTP shifts **upstream** (too early): increase strand speed by 0.2 m/min increments; reduce coke breeze feed by 0.3%
- If BTP shifts **downstream** (too late / bed not burning through): reduce strand speed; check for moisture excess; inspect grate bars for clogging
- **Emergency stop** criteria: strand jam (drive current spike > 150% rated), BTP completely absent (combustion failure), or exhauster fan trip

### SOP-F2-02: Environmental — Windbox Gas Emission Limits

- SO₂ concentration in waste gas: < 500 mg/Nm³ (monitored continuously)
- If ESP transformer trips: reduce strand speed immediately to reduce dust generation; notify environmental officer
- Workers near windbox area: respiratory protection required during maintenance

---

## Cascade Impact Summary — F2

| Failure | Immediate Effect | Downstream Impact |
|:---|:---|:---|
| EQ09 (Exhauster) fan trip | Loss of strand suction → production halt | F3 sinter feed stops; BF must reduce blast |
| EQ15 (FeO Analyzer) drift | Undetected high FeO sinter | F3 reducibility drops; increased coke rate |
| EQ04 (Strand) sprocket failure | Strand stops; active sinter overburns | Production halt; potential fire on strand |
| EQ03 (Nodulizer) nozzle clog | Over-wet mix; bed permeability drop | BTP shifts; non-uniform sinter quality to F3 |
| EQ12 (Screens) mesh failure | Fine sinter passes to F3 | BF bed permeability collapse |