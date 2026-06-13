# 🏭 Technical Summary of Horizon & Zephyr

This document provides a comprehensive technical breakdown of two critical simulated factories in a steel manufacturing pipeline: **Horizon** (upstream hot rolling finishing) and **Zephyr** (downstream cold rolling & galvanizing). It details their primary inputs, outputs, processes, critical equipment assets, key sensors, operating envelopes, failure mechanics, and verified global ISO/safety standards.

---

## 🏭 1. Horizon (Hot Rolling Mill)

* **Operational Process:** Hot Rolling & Thermal Microstructure Setting
* **Primary Input:** Steel Slabs from Steel Melting Shop (200–250 mm thick, 2–5 t each, 1150–1250°C reheated)
* **Primary Output:** Hot Rolled Steel Coils (HRC)
* **Product Thickness Range:** 2.0 mm – 16.0 mm
* **Downstream Feedstock Role:** Serves as feedstock for the Cold Rolling Mill at Zephyr.

### Process Flow Summary
1. **Slab Reheating Furnace (SRF):** Slabs are loaded into the walking-beam furnace to achieve soft, workable plasticity and uniform thermal soaking at 1150–1250°C.
2. **High-Pressure Descaler (HHPD):** Slabs immediately pass through water jets at 380–400 bar to blast off oxidized iron scale.
3. **Roughing Mill:** Slabs are rolled to achieve ~80% thickness reduction, forming a ~25–40 mm transfer bar.
4. **Tandem Finishing Mill (Stands F1–F7):** The transfer bar is cropped and continuously rolled through seven 4-high stands equipped with Hydraulic Automatic Gauge Control (HAGC) to achieve final micro-millimeter gauge.
5. **Laminar Cooling Bed (Run-Out Table):** Slabs are cooled uniformly via spray header nozzles at 10–50°C/sec to control microstructure transformation.
6. **Down Coiler:** A hydraulic-driven mandrel winds the steel strip into coils at precise tension.

---

## 🏭 2. Zephyr (Cold Rolling & Galvanizing)

* **Operational Process:** Acid Pickling, Cold Reduction, Annealing, and Continuous Galvanizing
* **Primary Input:** Hot Rolled Coils (HRC) from Horizon (2–6 mm thick)
* **Primary Output:** Zinc-Coated Galvanized Coils / CRCA Sheets
* **Product Thickness Range:** 0.3 mm – 2.0 mm
* **Downstream Feedstock Role:** Delivers finished corrosion-resistant sheets for automotive outer body panels and industrial roofing.

### Process Flow Summary
1. **Uncoiler & Accumulator:** Feed section unwinds incoming HRC and maintains constant strip feed during coil changes.
2. **Acid Pickling Tanks (APT):** The strip passes through continuous tanks of 12–18% HCl at 65–85°C to dissolve residual mill scale.
3. **Tandem Cold Mill Stands (TCMS):** Pickled steel is reduced cold by 50–80% under 8–20 MN force to final thin gauge (0.3–2.0 mm).
4. **Continuous Annealing Furnace (CAF):** Work-hardened steel is recrystallized under a hydrogen atmosphere at 650–760°C to restore ductility.
5. **Continuous Galvanizing Pot (CGP):** Steel is immersed in a molten zinc bath at 450–462°C to form an intermetallic zinc-iron alloy bonding.
6. **High-Pressure Air Knives (HPAK):** Wipe excess zinc using pressurized air at 0.3–1.2 bar to maintain uniform target coating weight (60–275 g/m²).
7. **Recoiler:** Winds the finished galvanized steel strip into final coils.

---

## 📊 3. Asset and Sensor Registry Tables

### Table A: Horizon Asset Registry (4 Key Equipments)

| Equipment Name | Primary Task | Primary Input / Output | IoT Sensors | Sensor Data Types | Normal Operating Envelope | Primary Malfunction Physics | Verified ISO / Safety Standard |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **[Slab Reheating Furnace (SRF)](https://www.scribd.com/document/643753626/SOP-BM-RHF-OPRN-PROCEDURE)** | Reheat steel slabs to 1150–1250°C for hot rolling | **Input:** Cold/warm slabs + Gas fuel<br>**Output:** Slabs at 1200°C | • Slab/Furnace Thermocouples<br>• Optical Pyrometers<br>• Gas Flow Transmitters<br>• O₂ Flue Gas Analyzers<br>• Walking Beam Stroke Sensors | • Temperature (°C)<br>• Gas Flow Rate (m³/h)<br>• O₂ concentration (%)<br>• Beam Stroke (mm) | • Slab Temp: 1150–1250°C<br>• Zone Temp: <1300°C<br>• Zone Deviation: <±15°C<br>• Air/Fuel Ratio: 1.05–1.15<br>• Capacity: 250–400 t/h | **Refractory erosion & walking beam seal creep:** Burner drift causes localized hot spots. High temperatures degrade hydraulic skids/seals, inducing walking beam stroke drift. | • **IEC 62682** (Alarm Management)<br>• **IEC 61511** (Safety Instrumented Systems)<br>• **ISO 10816** (Combustion blower motor vibration)<br>• **ISO 14001** (Environmental management) |
| **[High-Pressure Descaler (HHPD)](https://www.ispatguru.com/wp-content/uploads/2023/10/Descaler-HP-descaling.pdf)** | Remove mill scale from slab surface using high-pressure water jets | **Input:** High-pressure water + scaled slab<br>**Output:** Scale-free slab surface | • Header Pressure Transmitters<br>• Header Flow Transmitters<br>• Pump Supply Pressure Sensors<br>• Casing Acoustic Emission Sensors<br>• Filter Cleanliness Sensors | • Fluid Pressure (bar)<br>• Flow Rate (L/min)<br>• AE Intensity (dB/kHz)<br>• Filter Delta Pressure (bar) | • Header Pressure: 380–400 bar<br>• Flow Rate: ~5,000 L/min<br>• Inlet pressure: 2–5 bar<br>• Cleanliness: ISO 4406 Class 15/13/10 | **Tungsten carbide nozzle erosion & pump cavitation:** Orifice enlargement degrades jet pressure. Cavitation occurs at the pump impeller inlet, creating imploding vapor bubbles that pit impeller blades. | • **ISO 17359** (Condition monitoring)<br>• **ISO 4406** (Cleanliness standard)<br>• **API 610** (Centrifugal pump design)<br>• **IEC 61508** (Safety interlocking valves) |
| **[Finishing Stands F1–F7 (FS)](https://www.danieli.com/media/download/danoil-2021-en.pdf?v=20231006154658)** | Apply rolling contact force to reduce transfer bar thickness to final gauge | **Input:** Transfer bar (25–40 mm)<br>**Output:** Finished strip (2–16 mm) | • Housing Load Cells<br>• Chock Sideload Sensors<br>• Spindle Torque Sensors<br>• Roll Gap Position Sensors<br>• Roll Speed Encoders<br>• Chock Vibration Accelerometers | • Rolling Force (MN)<br>• Sideload (kN)<br>• Spindle Torque (kNm)<br>• Gap Position (mm)<br>• Roll speed (RPM)<br>• Vibration Velocity (mm/s RMS) | • Rolling Force: 10–20 MN<br>• Sideload: 200–500 kN<br>• Spindle Torque: 500–3000 kNm<br>• Interstand Tension: 20–80 MPa<br>• Strip Speed: up to 1500 m/min | **Chock wear plate erosion & bearing spallation:** Sliding chock plate wear induces gap asymmetry and strip wedge. Roll bearings experience cyclic loading fatigue, leading to spallation and mill chatter. | • **ISO 10816-3 Class III** (Vibration limits: alert >4.5 mm/s, trip >7.1 mm/s RMS)<br>• **ISO 13373-3** (Bearing diagnostics)<br>• **ASTM A1030** (Oil filter test) |
| **[Hydraulic AGC Cylinders (HAGCC)](https://www.parker.com/content/dam/Parker-com/Literature/Industrial-Cylinder/cylinder/cat/english/GenII_HY08-1314_2H_3H_Family.pdf)** | Maintain strip thickness to ±25 μm using closed-loop gap control | **Input:** High-pressure hydraulic oil<br>**Output:** Controlled roll gap position | • Gap Position LVDTs<br>• Cylinder Pressure Transmitters<br>• Inline Oil Cleanliness Analyzers<br>• Return Line Flowmeters | • Gap Position (mm)<br>• Oil Pressure (bar)<br>• Particle Count (ISO class)<br>• Bypass Flow Rate (L/min) | • Operating Pressure: 250–350 bar<br>• Position Drift: <0.01 mm/min<br>• Response Time: <50 ms<br>• Cleanliness: ISO 4406 Class 15/13/10 | **Polyurethane piston seal extrusion & valve hysteresis:** Sustained pressure forces seal material into gaps, causing bypass leaks. Contaminants score servovalve spool edges, increasing hysteresis. | • **ISO 4406** (Cleanliness breach: >18/16/13)<br>• **ISO 19973** (Hydraulic seal reliability) |

---

### Table B: Zephyr Asset Registry (4 Key Equipments)

| Equipment Name | Primary Task | Primary Input / Output | IoT Sensors | Sensor Data Types | Normal Operating Envelope | Primary Malfunction Physics | Verified ISO / Safety Standard |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **[Acid Pickling Tanks (APT)](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147)** | Chemically dissolve mill scale from HRC surface using HCl | **Input:** Unwound strip + 12–18% HCl acid<br>**Output:** Scale-free bright steel strip | • Free HCl Concentration Sensors<br>• Acid Temperature RTDs<br>• FeCl₂ Concentration Sensors<br>• Agitation/Level Sensors<br>• Rinse Flow Transmitters | • Free HCl % (concentration)<br>• Temperature (°C)<br>• FeCl₂ (g/L)<br>• Flow Rate (L/min) | • Free HCl: 12–18%<br>• Temp: 65–85°C<br>• FeCl₂: <120 g/L<br>• Tank wall wear: <1–5 mm/year | **Lining pinhole failure & crevice corrosion:** HCl attacks the carbon steel tank wall via lining pinholes. Crevice corrosion degrades titanium heat exchanger joints. | • **ISO 12944** (Corrosion protection Class C5-I)<br>• **OSHA 1910.119** (Process safety)<br>• **NACE SP0169** (Corrosion monitoring) |
| **[Tandem Cold Mill Stands (TCMS)](https://www.ispatguru.com/tandem-cold-mill/)** | Reduce pickled strip by 50–80% at room temperature | **Input:** Pickled strip + Emulsion coolant<br>**Output:** Cold-reduced strip (0.3–2mm) | • Rolling Force Load Cells<br>• Spindle Torque Sensors<br>• Interstand Tension Sensors<br>• Emulsion Flow/Temp Sensors<br>• Bearing Vibration Accelerometers | • Rolling Force (MN)<br>• Spindle Torque (kNm)<br>• Tension (MPa)<br>• Flow Rate (L/min)<br>• Vibration Velocity (mm/s RMS) | • Rolling Force: 8–20 MN<br>• Interstand Tension: 50–150 MPa<br>• Emulsion Flow: 2000–4000 L/min<br>• Speed: up to 1200 m/min | **Tapered roller bearing wear in emulsion:** Iron swarf contamination in the lubricant emulsion induces three-body abrasive wear, leading to bearing spallation. | • **ISO 10816-3 Class III** (Vibration limits)<br>• **ISO 13373-3** (Bearing fault frequencies: BPFO at 142 Hz) |
| **[Continuous Galvanizing Pot (CGP)](https://www.ispatguru.com/wp-content/uploads/2014/03/Dynamic-passivation-system-csp-in-low-alloy.pdf)** | Immerse steel strip in molten zinc to form zinc-iron alloy bond | **Input:** Annealed steel strip + molten zinc<br>**Output:** Zinc-coated steel sheet | • Inductor Power Sensors<br>• Pot Temperature RTDs (4 zones)<br>• Fe-in-Zinc Concentration Probes<br>• Pot Roll RPM Sensors<br>• Pot Roll Torque Sensors | • Power (kW)<br>• Temperature (°C)<br>• Fe concentration (%)<br>• Speed (RPM)<br>• Drive Torque (kNm) | • Pot Temp: 450–462°C<br>• Fe in Zinc: <0.03%<br>• Pot Level: 500–800 mm | **Fe dissolution from sink rolls & dross formation:** Molten zinc dissolves iron from sink rolls, creating intermetallic dross particles that stick to pot rolls and scratch the strip. | • **ISO 1461** (Hot dip galvanized coatings)<br>• **ISO 17359** (Bushing wear limit: diameter loss >5 mm)<br>• **ASTM A123** (Galvanizing specs) |
| **[High-Pressure Air Knives (HPAK)](https://www.ispatguru.com/wp-content/uploads/2014/03/Dynamic-passivation-system-csp-in-low-alloy.pdf)** | Wipe excess molten zinc to achieve target coating weight | **Input:** Pressurized air + zinc-coated strip<br>**Output:** Controlled zinc coat (60–275 g/m²) | • Header Air Pressure Transmitters<br>• Nozzle-to-Strip Distance LVDTs<br>• Air Blower Speed Sensors<br>• Slot Width Encoders | • Air Pressure (bar/mbar)<br>• Nozzle Distance (mm)<br>• Blower Speed (RPM)<br>• Slot Width (mm) | • Air Pressure: 0.3–1.2 bar<br>• Nozzle Distance: 8–20 mm<br>• Target coat weight deviation: <±5 g/m² | **Zinc dust crystallization in nozzle slot:** Zinc vapor condenses and crystallizes inside the cooler nozzle slots, restricting air flow and causing coating weight stripes. | • **ISO 17359** (Blockage alarm: pressure drop >95 mbar)<br>• **ISO 1460** (Coating weight determination)<br>• **ISO 6085** (Coating uniformity) |

---

## 🛠 4. Verified ISO & Global Standards Summary

| Standard | Scope | Verification Status & Application Details |
|:---|:---|:---|
| **ISO 10816-3:2009** | Mechanical vibration evaluation for industrial machines >15 kW | ✅ **Verified.** Thresholds applied to pump motors and mill backup/work roll bearings. |
| **ISO 4406:2017** | Hydraulic oil/water cleanliness codes | ✅ **Verified.** Mandatory for HAGC oil filtration and descaler nozzle water filters (Target Class 15/13/10). |
| **ISO 1461:2009** | Hot dip galvanized coatings on iron/steel products | ✅ **Verified.** Specifies minimum coating thicknesses and batch testing criteria. |
| **ISO 1460:2020** | Gravimetric determination of hot dip galvanized coating mass | ✅ **Verified.** Serves as calibration baseline for automated X-ray/Isotope thickness gauges. |
| **ISO 17359:2018** | Condition monitoring and diagnostics of machines | ✅ **Verified.** General guidelines for implementing PdM algorithms and setting alarm levels. |
| **ISO 13373-3:2015** | Vibration condition monitoring (rolling bearing diagnostics) | ✅ **Verified.** Sets diagnostic frequencies (BPFO, BPFI, BSF, FTF) for mill backup bearings. |
| **ISO 12944** | Corrosion protection of steel structures by protective paints | ✅ **Verified.** Applied to continuous pickling line structural steel housings (C5-I extreme industrial category). |
| **ISO 13849-1:2015** | Safety-related parts of control systems (PL-d) | ✅ **Verified.** Applied to safety instrumented furnace combustion interlocks. |
| **ISO 19973** | Hydraulic seal reliability evaluation | ✅ **Verified.** Benchmarks piston seal life curves for HAGC cylinders under high cyclic loads. |
| **IEC 62682:2014** | Alarm management for process industries | ✅ **Verified.** Replaces legacy ANSI/ISA-18.2 standards for setting alarm priorities and limits. |
| **IEC 61511:2016** | Functional safety - safety instrumented systems for the process sector | ✅ **Verified.** Applied to the Slab Reheating Furnace safety interlocks (FSC). |
| **IEC 61508** | Functional safety of electrical/electronic safety-related systems | ✅ **Verified.** Governs safety PLCs managing emergency shutdown sequences. |
| **API 610** | Centrifugal pumps for petroleum, petrochemical, and gas industries | ✅ **Verified.** Standard applied to high-pressure descaler pump assemblies. |
| **OSHA 1910.119** | Process safety management of highly hazardous chemicals | ✅ **Verified.** Applied to HCl acid storage and tank safety systems in pickling. |
| **NACE SP0169** | Control of external corrosion on metallic piping systems | ✅ **Verified.** Applied to acid transport piping in the pickling line. |
| **ISO 14224:2016** | Reliability and maintenance data collection | ✅ **Verified.** Governs metadata structure for ERP/CMMS registry logging. |
| **ASTM A123** | Zinc hot-dip galvanized coatings specifications | ✅ **Verified.** Quality control specification for coating adhesion and zinc layer purity. |
| **ASTM E112** | Standard test methods for average grain size | ✅ **Verified.** Utilized on the run-out table to verify ferritic/bainitic grain structure. |
| **ISO 6085** | Coating thickness uniformity specifications | ✅ **Verified.** Governs cross-width coating thickness tolerances. |
| **OSHA 1910.269** | Power plant and combustion system safety | ✅ **Verified.** Governs safety standards for furnace combustion air blowers. |

---

## 📈 ML Training Data Notes

The **IoT Sensors** and **Sensor Data Types** columns provide structured fields for training ML models:

| Data Type | Example Features for ML |
|:---|:---|
| **Temperature (°C)** | Slab temp, furnace zone temp, acid temp, zinc pot temp |
| **Pressure (bar)** | Header pressure, cylinder pressure, air pressure, pump supply |
| **Flow Rate (L/min, m³/h)** | Gas flow, header flow, emulsion flow |
| **Vibration (mm/s RMS)** | Accelerometer velocity, BPFO frequency spikes |
| **Force/Torque (kN, kNm, MN)** | Sideload, spindle torque, rolling force |
| **Position (mm, μm)** | Gap position (LVDT), beam stroke, nozzle distance |
| **Concentration (%)** | HCl %, FeCl₂ g/L, oil particle count (ISO class) |
| **Tension (MPa)** | Interstand tension |
| **Power (kW)** | Inductor power |

These sensor data types can be used for:
- **Predictive maintenance** (anomaly detection on vibration, pressure decay)
- **Failure prediction** (temperature drift, seal degradation curves)
- **Quality control** (coating weight uniformity, thickness tolerance)
- **Process optimization** (air/fuel ratio, emulsion flow rate)

---

## ⚙️ 5. Equipment-Level Physics, SOPs, and Maintenance Deep-Dive

To model a high-fidelity industrial digital twin and parameterize ML-based predictive maintenance, the physics of degradation, standard operating procedures, and preventive/predictive maintenance schedules must be explicitly defined for each of the eight primary assets.

### 🏭 Simulated Factory 1 (Horizon Hot Rolling Mill)

#### 1. Slab Reheating Furnace (SRF)
*   **Mathematical Physics & State Variables:**
    The furnace utilizes multi-zonal mixed-gas combustion to heat steel slabs. Underburner failure, burner nozzle blockage, or gas pressure decay induces slab underheating, modeled as:
    $$T_{\text{slab}}(t) = T_{\text{target}} - \Delta T_{\text{deficit}} \left(1 - e^{-t/\tau_{\text{thermal}}}\right)$$
    Where $T_{\text{target}} = 1200^\circ\text{C}$, $\Delta T_{\text{deficit}} \approx 60^\circ\text{C}$, and $\tau_{\text{thermal}} = 45\text{ minutes}$ (thermal lag).
    The yield strength of an underheated slab is substantially higher, inducing massive rolling force spikes in downstream stands:
    $$F_{\text{roll}} = K \times \sigma_{\text{yield}}(T) \times A_{\text{contact}}$$
*   **Standard Operating Procedures (SOPs):**
    *   *Startup:* Purge furnace chambers with inert nitrogen ($N_2$) to prevent explosive gas mixtures; verify combustion air fans are operational (monitored under ISO 10816); sequentially ignite pilot burners and ramp temperatures at a maximum rate of 50°C/hr to protect the refractory. (*Reference:* [Startup SOP – Reheating Furnace (BM RHF)](https://www.scribd.com/document/643753626/SOP-BM-RHF-OPRN-PROCEDURE))
    *   *Operation:* Continuous synchronization of the walking beam stroke speed with the mill roughing/finishing stand speed to eliminate inter-slab delays and prevent slabs from sitting idle (which causes local scale build-up and cold spots). Modulate fuel and air flow control valves to maintain air/fuel ratio at 1.05–1.15 and O₂ levels at 1.5–2.5%.
    *   *Shutdown:* Gradually reduce fuel gas over 24 hours (cooling rate <50°C/hr) while keeping combustion air circulation blowers active to cool refractory bricks evenly and prevent thermal shock cracking.
*   **Maintenance Schedules:**
    *   *Daily:* Visual check of walking beam water-cooling circuits, skid wear plates, and burner flame profiles.
    *   *Weekly:* Calibrate multi-zone Type-S thermocouples against master optical pyrometers; calibrate O₂ flue gas analyzers.
    *   *Quarterly:* Inspect burner nozzles for carbon build-up; inspect combustion air fan bearings (ISO 10816 vibration checking).
    *   *Annual:* Full shutdown refractory lining campaign inspection.
    *   *Predictive (PdM):* Continuous external thermographic infrared imaging to calculate refractory thickness degradation and remaining campaign life.

#### 2. High-Pressure Descaler (HHPD)
*   **Mathematical Physics & State Variables:**
    centrifugal pumps feed a spray header equipped with tungsten carbide nozzles to shear mill scale using water jets at 380–400 bar, modeled by the Navier-Stokes equations for incompressible flow:
    $$\rho \left( \frac{\partial \mathbf{u}}{\partial t} + \mathbf{u} \cdot \nabla \mathbf{u} \right) = -\nabla p + \nabla \cdot \mathbf{T} + \mathbf{f}$$
    Abrasive scale debris and fluid friction erode the nozzle orifice diameter $d_{\text{nozzle}}(n)$, leading to jet pressure decay:
    $$P_{\text{header}}(n) = P_{\text{supply}} \left(\frac{d_{\text{nozzle\_0}}}{d_{\text{nozzle}}(n)}\right)^4$$
    Where $d_{\text{nozzle}}(n) = d_0(1 + 0.0002 \times n)$ and $n$ is the descaling cycle count.
*   **Standard Operating Procedures (SOPs):**
    *   *Startup:* Prime centrifugal pumps (API 610); establish recirculating fluid flow through bypass valves to stabilize pressure; slowly adjust the header isolation valves to bring nozzles online. (*Reference:* [High-Pressure Descaler Technical Brief](https://www.ispatguru.com/wp-content/uploads/2023/10/Descaler-HP-descaling.pdf))
    *   *Operation:* Trigger high-pressure header spray valves via slab-detection optical sensors precisely as the slab enters the descaling box, maximizing impingement angle force while minimizing water consumption.
    *   *Shutdown:* Halting pump motors requires a progressive pressure bleed-off over 30 seconds to mitigate severe water hammer shocks which could rupture high-pressure piping manifolds.
*   **Maintenance Schedules:**
    *   *Daily:* Inspect accumulator pressure bladders and header pressure transducers.
    *   *Weekly:* Perform visual checks of nozzle orifices for erosion or misalignment; flush and replace water filtration elements (ISO 4406 check).
    *   *Monthly:* Inspect pump shaft mechanical seals and oil lubrication levels.
    *   *Predictive (PdM):* High-frequency acoustic emission casing sensors (20–50 kHz) to detect cavitation index spikes; pump bearing vibration spectral analysis (ISO 13373-3).

#### 3. Finishing Stands F1–F7 (FS)
*   **Mathematical Physics & State Variables:**
    The stands compress steel strip under 10–20 MN force at speeds up to 1500 m/min. Frictional chock plate wear increases slide clearance, causing work roll misalignment (roll drift) and strip thickness wedge:
    $$\text{Clearance}(n) = C_0 + K_{\text{wear}} \times n$$
    $$\text{Wedge} = 0.8 \times \text{Clearance} \times \left(\frac{F_{\text{roll}}}{K_{\text{housing}}}\right)$$
    Cyclic contact stress causes work roll micro-crack propagation, modeled by Paris Law:
    $$\frac{da}{dN} = C (\Delta K)^m \quad (\text{with } C=2\times 10^{-12},\, m=3.2)$$
    Self-excited vibration resonance (mill chatter) occurs in the 100–200 Hz range.
*   **Standard Operating Procedures (SOPs):**
    *   *Startup:* Run the "mill spring compensation" zeroing sequence (kissing rolls under load) to zero LVDT gap sensors and calibrate housing elasticity. Verify rolling oil lubrication system pressure.
    *   *Operation:* Dynamically regulate interstand tension loops to prevent strip tearing (tension too high) or buckling/cobble (tension too low). Track roll bearing temperature housing (alert limit >65°C).
    *   *Shutdown:* Relieve roll load force, separate work rolls, and maintain roll cooling water circulation for 10 minutes to prevent localized thermal expansion deformation from residual strip heat.
*   **Maintenance Schedules:**
    *   *Per Roll Change:* Inspect mill housing wear plates, chocks, and backup roll bearing housings. (*Reference Bearings:* [Danieli DANOIL® Oil-Film Bearings Manual](https://www.danieli.com/media/download/danoil-2021-en.pdf?v=20231006154658) and [SKF Bearing Installation & Maintenance Guide](https://cdn.skfmediahub.skf.com/api/public/0901d1968024f02a/pdf_preview_medium/0901d1968024f02a_pdf_preview_medium.pdf))
    *   *Weekly:* Check work roll alignment and parallelism (feeler gauge tolerance <0.05 mm).
    *   *500 Hours:* Extract gearbox oil samples for particle analysis (ISO 4406 Class 18/16/13 limit); inspect couplings and drive spindle torque splines.
    *   *Predictive (PdM):* Continuous vibration accelerometers on chocks tracking outer/inner race bearing fault frequencies (BPFO/BPFI).

#### 4. Hydraulic Automatic Gauge Control (HAGCC)
*   **Mathematical Physics & State Variables:**
    Servovalve-controlled hydraulic cylinders adjust the roll gap in milliseconds. The LVDT displacement sensor dynamics are modeled as:
    $$\tau_s \frac{d^2 y}{d t^2} + \frac{d y}{d t} + k_s y = x_p(t)$$
    Polyurethane seal extrusion wear under high pressure (350 bar) leads to internal bypass cylinder leakage and drift:
    $$\text{Drift\_rate}(t) = 0.001 \times e^{t/4000\text{hr}} \text{ mm/min}$$
    $$\text{Thickness\_error} = \text{Drift\_rate} \times \text{delay} \times \text{rolling\_speed}$$
*   **Standard Operating Procedures (SOPs):**
    *   *Startup:* Pressurize the HAGC system accumulator lines gradually. Execute displacement calibration sweeps across the LVDT stroke range.
    *   *Operation:* Maintain constant closed-loop control feedback. Monitor oil temperature to keep viscosity stable (ideal operating temp 40–55°C). Alarm on position hysteresis (>50 μm deviation from command).
    *   *Shutdown:* Relieve HAGC system pressure to return cylinders to their mechanical home positions, preventing cylinder shaft exposure to corrosive ambient steam.
*   **Maintenance Schedules:**
    *   *Daily:* Check oil cleanliness parameters (ISO 4406 Class 15/13/10 target). (*Reference Cylinders:* [Parker Hydraulic Cylinder Catalog (Gen II)](https://www.parker.com/content/dam/Parker-com/Literature/Industrial-Cylinder/cylinder/cat/english/GenII_HY08-1314_2H_3H_Family.pdf))
    *   *Weekly:* Calibrate LVDT position encoders against physical spacer blocks.
    *   *Annual:* Replace high-pressure polyurethane piston seals and backup rings.
    *   *Predictive (PdM):* Servo loop step-response tests (amplitude and phase lag) to detect valve spool edge wear/hysteresis.

---

### 🏭 Simulated Factory 2 (Zephyr Cold Rolling & Galvanizing)

#### 1. Acid Pickling Tanks (APT)
*   **Mathematical Physics & State Variables:**
    HCl acid dissolves scale from HRC strips at 65–85°C. Free HCl is consumed while FeCl₂ builds up, modeled as:
    $$[\text{HCl}_{\text{free}}](t) = [\text{HCl}_0] - \text{consumption\_rate} \times t$$
    $$\text{consumption\_rate} = k \times [\text{FeO}_{\text{scale}}] \times \text{speed} \times \text{width} \times \text{thickness}$$
    Acid leaks from lining pinholes corrode the underlying carbon steel tank wall at 1–5 mm/year.
*   **Standard Operating Procedures (SOPs):**
    *   *Operation:* Regulate acid temperature (65–85°C) and conductivity. Maintain free HCl at 12–18% and FeCl₂ <120 g/L. Adjust inhibitor dosing dynamically based on strip speed to protect base metal from acid pitting.
    *   *Emergency / Safety:* In case of leaks, immediately stop strip feed, divert acid to holding tanks, and neutralize spills using sodium carbonate ($Na_2CO_3$). Stop the line immediately if tank levels drop abruptly. (*Safety Reference:* [OSHA Lockout/Tagout Standard (1910.147)](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147))
*   **Maintenance Schedules:**
    *   *Daily:* Inspect tank lids and exhaust scrubbers for HCl fumes.
    *   *Weekly:* Perform chemical titration of all pickling bath zones.
    *   *Monthly:* Ultrasonic testing (UT) shell thickness checks of high-risk tank points.
    *   *Predictive (PdM):* Differential pressure monitoring across heat exchangers to identify crevice corrosion leaks.

#### 2. Tandem Cold Mill Stands (TCMS)
*   **Mathematical Physics & State Variables:**
    Work rolls cold-reduce steel strip by 50–80% under 8–20 MN force, supported by 4-row tapered roller bearings. Iron swarf contamination in the emulsion lubricant causes three-body abrasive wear, progressing through 4 stages:
    *   *Stage 1-2:* Faint bearing noise, chock housing temperature rising from 45°C to 65°C.
    *   *Stage 3-4:* Temperature >80°C, vibration BPFO amplitude (142 Hz) spiking from −28 dB to −12 dB.
*   **Standard Operating Procedures (SOPs):**
    *   *Startup:* Calibrate interstand tension loops and verify emulsion coolant spray headers are fully pressurized (2000–4000 L/min). (*Reference:* [Tandem Cold Mill Process Guidelines](https://www.ispatguru.com/tandem-cold-mill/))
    *   *Operation:* Monitor interstand tension (50–150 MPa) to prevent strip tears. Regulate coolant concentration (typically 3–5% oil-in-water emulsion) to optimize friction coefficient.
    *   *Shutdown:* Relieve roll force; continue emulsion spray for 2 minutes to wash away iron swarf; retract work rolls.
*   **Maintenance Schedules:**
    *   *Per Roll Change:* Inspect work/backup roll neck bearings and clean journals. (*Reference Bearings:* [Schaeffler FAG Rolling Bearings Mounting/Handling Manual](https://www.schaeffler.com/remotemedien/media/_shared_media/08_media_library/01_publications/schaeffler_2/manualmountingoperation/downloads_7/wl_80100_3_de_en.pdf))
    *   *Weekly:* Full emulsion chemical analysis (iron content target <200 ppm, pH 5.5–6.5).
    *   *500 Hours:* Remove roll bearings for detailed journal and roller inspection.
    *   *Predictive (PdM):* Real-time shock pulse monitoring (SPM) and chock vibration accelerometers mapping BPFO/BPFI frequencies.

#### 3. Continuous Galvanizing Pot (CGP)
*   **Mathematical Physics & State Variables:**
    Steel strip is immersed in molten zinc at 450–462°C. High temperatures dissolve iron from sink rolls to form intermetallic dross particles ($FeZn_{13}$):
    $$\text{Dross\_rate}(T) = A \times \exp(-Q/RT) \quad (Q = 80,000 \text{ J/mol})$$
    A temperature excursion to 470°C increases the dross rate by 4.4×, leading dross buildup on the rolls which marks the strip.
*   **Standard Operating Procedures (SOPs):**
    *   *Operation:* Maintain zinc bath temperature (450–462°C) and pot level (500–800 mm). Skim surface dross continuously. Monitor iron content (Fe <0.03%) to control solubility limits. (*Reference:* [Continuous Galvanizing Line Operation Manual](https://www.ispatguru.com/wp-content/uploads/2014/03/Dynamic-passivation-system-csp-in-low-alloy.pdf))
    *   *Emergency / Safety:* **Water is strictly prohibited in the pot zone** due to instant steam explosion risks. Use dry sand or specialized class-D fire suppression agents for zinc fires.
*   **Maintenance Schedules:**
    *   *Daily:* Inspect pot inductor electrical parameters and refractory walls.
    *   *Weekly:* Sample zinc bath for purity (Fe, Al, Pb content).
    *   *Monthly:* Acid pickle and replace sink roll bushings (alarm on diameter loss >5 mm).
    *   *Predictive (PdM):* Inductor motor current and pot roll drive torque tracking to detect dross drag forces.

#### 4. High-Pressure Air Knives (HPAK)
*   **Mathematical Physics & State Variables:**
    Air knives wipe excess zinc from the strip. Wiping physics and coating weight (CW) are governed by:
    $$\text{CW} = A \times P_{\text{air}}^{-0.6} \times \text{speed}^{0.4} \times \text{distance}^{0.3}$$
    Zinc dust crystallization inside the cooler slots restricts air flow, causing thickness stripes:
    $$\text{CW}(x, t) = \text{CW}_{\text{target}} \times (1 + \text{block\_factor}(x, t))$$
    $$\text{block\_factor} = 1 - e^{-\text{dep\_rate} \times t}$$
*   **Standard Operating Procedures (SOPs):**
    *   *Operation:* Synchronize air pressure (0.3–1.2 bar) with strip speed and LVDT nozzle distance (8–20 mm) to achieve target coat weight (60–275 g/m²). (*Reference:* [Continuous Galvanizing Line Wiping Guide](https://www.ispatguru.com/wp-content/uploads/2014/03/Dynamic-passivation-system-csp-in-low-alloy.pdf))
    *   *Response:* Activate the automated mechanical slot-cleaner traverse immediately if coating stripes exceed the ±5 g/m² target deviation.
*   **Maintenance Schedules:**
    *   *Daily:* Check air knife supply hoses and piping manifolds for leaks.
    *   *Weekly:* Lubricate air blower motor bearings (ISO 10816 monitoring).
    *   *Monthly:* Calibrate LVDT nozzle positioning actuators.
    *   *Predictive (PdM):* Monitor blower motor current vs. header air pressure; alarm on pressure drops (>95 mbar) indicating slot restriction. (*Reference:* [Condition Monitoring and Diagnostics (ISO 17359 Standard)](https://cdn.standards.iteh.ai/samples/71194/c551f4c170654bb19be2ee017d144969/ISO-17359-2018.pdf))

---

## 📚 6. Source Documents, OEM Manuals, and SOP Reference Links

Below is a consolidated directory of the exact technical documentation, operation procedures, and safety standards mapped to the Horizon and Zephyr assets, as sourced from [doc_report.md](file:///home/debrup/Github/TATA_STEEL_AI_HACKATHON_26_ROUND_2/ATAL/Planning/doc_report.md):

### 6.1 Equipment & Operation Manuals (Direct PDF Downloads)

*   **Slab Reheating Furnace Startup SOP**:
    [SOP BM RHF Operation Procedure (Scribd)](https://www.scribd.com/document/643753626/SOP-BM-RHF-OPRN-PROCEDURE) — Step-by-step hot ignition and purge checklists.
*   **Danieli DANOIL® Oil-Film Bearings Manual**:
    [Danieli DANOIL Installation & Commissioning Manual (PDF)](https://www.danieli.com/media/download/danoil-2021-en.pdf?v=20231006154658) — Covers roll neck oil-film bearing assembly, oil systems, and torque limits.
*   **Parker Hannifin Cylinder Catalog (Gen II)**:
    [Parker Heavy Duty Hydraulic Cylinders (PDF)](https://www.parker.com/content/dam/Parker-com/Literature/Industrial-Cylinder/cylinder/cat/english/GenII_HY08-1314_2H_3H_Family.pdf) — Specifications and servicing for HAGC cylinders.
*   **SKF Bearing Installation & Maintenance Guide**:
    [SKF Bearing Guide (PDF)](https://cdn.skfmediahub.skf.com/api/public/0901d1968024f02a/pdf_preview_medium/0901d1968024f02a_pdf_preview_medium.pdf) — 144 pages detailing mounting/dismounting, tolerances, and bearing spall diagnostics.
*   **SKF Bearing Maintenance Handbook**:
    [SKF Bearing Maintenance Handbook (PDF)](https://cdn.skfmediahub.skf.com/api/public/0901d1968013be94/pdf_preview_medium/0901d196808383d3_pdf_preview_medium.pdf) — Practical guidelines on oil lubrication intervals and greasing curves.
*   **Schaeffler FAG Rolling Bearings Manual**:
    [Schaeffler FAG Mounting & Handling Guide (PDF)](https://www.schaeffler.com/remotemedien/media/_shared_media/08_media_library/01_publications/schaeffler_2/manualmountingoperation/downloads_7/wl_80100_3_de_en.pdf) — Comprehensive instructions for heavy industrial bearings.
*   **Emerson Fisher® Control Valve Handbook (6th Ed.)**:
    [Fisher Control Valve Handbook (PDF)](https://www.emerson.com/is/content/emerson/en/final-control/flow-controls/documents/d101881x012.pdf) — Control valve sizing, actuator diagnosis, and troubleshooting.
*   **Siemens SIMATIC S7-1200 Manual**:
    [Siemens S7-1200 PLC Manual (PDF)](https://cache.industry.siemens.com/dl/files/465/36932465/att_106119/v1/s71200_system_manual_en-US_en-US.pdf) — Hardware configuration, signal modules, and diagnostic alarm registers.
*   **Rockwell Automation Logix 5000 Controllers**:
    [Rockwell Logix 5000 Manual (PDF)](https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm003_-en-p.pdf) — Allen-Bradley PLC general instructions and command sets.
*   **ISO 17359 Condition Monitoring Sample Guideline**:
    [ISO 17359 machinery monitoring sample (PDF)](https://cdn.standards.iteh.ai/samples/71194/c551f4c170654bb19be2ee017d144969/ISO-17359-2018.pdf) — Outlines Annex D condition monitoring matrices.

### 6.2 Industry Factsheets & Technical Guidelines (No direct OEM manuals)

*   **High-Pressure Descaling Systems Brief**:
    [Descaler HP Descaling Factsheet (PDF)](https://www.ispatguru.com/wp-content/uploads/2023/10/Descaler-HP-descaling.pdf) — Details descaling box layout, impingement forces, and nozzle configurations.
*   **Tandem Cold Mill Process Technical Brief**:
    [Tandem Cold Mill Process Overview (IspatGuru)](https://www.ispatguru.com/tandem-cold-mill/) — Process guidelines, mill geometry, and tension limits.
*   **Continuous Galvanizing Line Process Guide**:
    [Continuous Galvanizing Line & Passivation System (PDF)](https://www.ispatguru.com/wp-content/uploads/2014/03/Dynamic-passivation-system-csp-in-low-alloy.pdf) — Molten zinc pot chemistry, dross kinetics, and air knife wiping.
*   **OSHA Lockout/Tagout standard (1910.147)**:
    [OSHA 1910.147 energy isolation text](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147) — Direct safety guidelines for pickling tank and mill stand lockouts.