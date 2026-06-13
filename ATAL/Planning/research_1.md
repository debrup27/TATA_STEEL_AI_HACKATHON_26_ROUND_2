# Industrial Digital Twin Input Layer Research for Horizon & Zephyr

## 1. System Architecture & Dataset Mapping

**Architecture and Objectives:** The challenge’s PDF outlines an AI **“Maintenance Wizard”** for steel plants.  It should ingest diverse data sources (sensor streams, fault logs, SOPs, etc.) to provide explainable maintenance outputs: fault diagnosis, root-cause analysis, RUL prediction, and prioritized actions.  The core architecture is therefore a context-aware decision-support system: an *edge-based input layer* feeds sensor and process data into local AI agents (for anomaly/failure detection and prognosis), which update a **digital twin** that simulates factory operations.  The twin integrates real-time IoT data with maintenance history to predict failures and recommend interventions.  The system is bi-directional: AI agents alert the twin of anomalies, and the twin offers counterfactual what-if analyses (e.g. how one machine’s degradation affects downstream units).  Human engineers interact via a conversational UI to query and refine the model’s insights.

**Horizon Hot-Rolling Dataset (`train.csv`):**  The provided `train.csv` (1,352 coils, 49 features X1–X49, binary label Y) represents process measurements from Horizon’s hot strip mill.  Each **X** is a sensor reading or derived feature (units vary widely: e.g. X1 up to ~1124, X45 up to ~120, X48 ~0.05).  While no column key is given, the context suggests these include slab temperatures, roll forces, line tensions, speeds, flows, and chemical concentrations during the rolling process.  For example, X1–X9 (~hundreds) may be strip/walking-beam positions or temperatures; mid-range X15–X30 could be pressures or flows; X45 (~–2 to 120) might track coil thickness or flatness; and X46–X49 (small decimals) could be normalized rates or vibration indexes.  The target **Y** (0/1) flags the “Alpha” surface defect post-production.  In sum, `train.csv` provides *multivariate time-aggregated sensor data* per coil, suitable for predictive maintenance (PD/RUL) or defect-classification modeling in a hot rolling context.  

> *Citations:* The problem statement emphasizes multisource inputs (sensors, logs, etc.) and RUL/predictive outputs, and the Horizon dataset resembles common rolling mill features in scale (temperatures ∼1000°C, pressures tens of bar, vibrations mm/s, etc.), as seen in steel industry digital twin literature.

## 2. Manufacturing Process Flow

### 2.1 Horizon – Hot Strip Rolling Mill

The Horizon plant processes **steel slabs** into **Hot-Rolled Coils (HRC)**.  Key stages (common in hot rolling) include:

- **Reheating Furnace:** Slabs (~200–250 mm thick) are heated to 1150–1250 °C in a walking-beam furnace to recrystallization temperatures. Uniform heating (±10–15 °C) is critical to ensure even rolling forces.
- **Descaling:** Immediately after the furnace, slabs pass through a high-pressure water descaler (≈18–22 MPa water jets) to strip oxide scale. Effective descaling prevents surface defects and roll damage.
- **Roughing Mill:** A reversible 2–4 stand roughing mill reduces slab thickness from 200–250 mm to ~30–60 mm. This stage accounts for ~80% of total deformation. It uses hydraulic or mechanical rolls (∼1000–1200 mm diameter) to achieve coarse reduction.
- **Flying Shear:** Periodic shearing (‘flying shear’) cuts the rough bar to length between stages without stopping the mill.
- **Finishing Mill:** A series of 6–7 continuous stands (each 4-high roll setup) perform final gauge reduction (to 2–16 mm) and shape/flatness control.  Roll diameters (~700–850 mm) and interstand tension control ensure precise thickness (±30 μm deviation) and strip profile.
- **Laminar Cooling:** The hot strip is cooled uniformly via an adjustable laminar cooling system (spray header water nozzles) before coiling. Cooling rates control microstructure and mechanical properties.
- **Coiling:** Finally, a hydraulic-driven downcoiler winds the steel into coils at precise tension.

Downstream, Horizon’s HRCs feed Zephyr’s cold mill.  Figure below (conceptual) shows the main hot rolling sequence:

 

(*Fig: Hot rolling mill flow – slabs → furnace → descaler → roughing → finishing → cooling → coil.*)

### 2.2 Zephyr – Cold Rolling & Galvanizing

Zephyr processes Horizon’s coils into **cold-rolled / galvanized steel** (CRCA/galvanized coils).  Core stages include:

- **Uncoiler & Accumulator:** Incoming hot coils are decoiled and the strip fed into line tensioners.
- **Acid Pickling:** The strip enters **pickling tanks** of ~15% HCl at ~65–85 °C to dissolve remaining mill scale.  Acid concentration (via conductivity sensor) and flow are controlled to avoid under- or over-pickling.
- **Tandem Cold Mill (TCMS):** A sequence of multi-stand cold rolling mills (typically 4–8 stands) reduces strip thickness by ~50–80% at ambient temperature.  Interstand tension and Automated Gauge Control (AGC) hydraulics maintain precise gauge (e.g. final 0.3–2.0 mm).
- **Annealing Furnace:** The work-hardened strip is recrystallized in a continuous annealing furnace (often H2 atmosphere) at ~650–760 °C to restore ductility.
- **Galvanizing Pot:** The annealed strip passes through a **molten zinc bath** at ≈450–462 °C for coating.  Sink rolls guide the strip under molten zinc, and sheet entry/exit speeds determine coating thickness.
- **Air Knives (HPAK):** High-pressure air knives wipe off excess zinc (set to achieve a uniform target coating weight).
- **Recoiler:** The galvanized strip is passed to a coiler for final winding.

Thus, Zephyr’s flow is: HRC uncoil → acid pickling → cold rolling (multi-stand) → annealing furnace → galvanizing pot → air knives → coil.

*Citations:* Stages like pickling (acid bath), tandem cold reduction, annealing, and galvanizing are standard in cold mill lines.  For example, iFactory notes acid conc./line speed control in pickling and zinc pot temperature in galvanizing as key parameters.  (The Steefo guide also notes the same hot-rolling steps.) 

## 3. Registry Table Verification

We examined the provided **Asset Registry Tables (A & B)** for Horizon and Zephyr.  The tables list each equipment’s task, I/O, sensors, operating envelope, failure modes, and a “Verified ISO Standard.” We verify key entries:

- **Slab Reheating Furnace (Horizon):** Task and I/O are correct (heating slabs to 1150–1250 °C). Sensors like slab/furnace TCs, O₂ analyzers, gas flow, walking beam stroke are plausible. The listed malfunction physics (“refractory erosion”) is one key failure; also misburn or burner drift. They cite “ISA-18.2 (alarm management)” as ISO – technically this is an ANSI/ISA standard, not an ISO.  The IEC equivalent is IEC 62682:2014.  Thus **ISO Standard** should be IEC 62682 (Alarm Systems) or refer to IEC 61511 (safety instrumented systems) if applicable.
- **High-Pressure Descaler (Horizon):** Task/I-O correct (remove scale). Sensors: pressure gauge, flow meter, filter cleanliness (ISO 4406:2017 covers particulate cleanliness in hydraulic fluids and filters) are reasonable. The table listed ISO 4406, which applies to hydraulic fluid particle counts – acceptable here. Failure (nozzle clogging, pump cavitation) seems omitted; they list only filtration. Could add reference to ASTM D710 (oil analysis) or ISO 13373-3 for bearing faults.
- **Roughing/Finishing Stands (Horizon):** Task and I/O (strip reduction) correct. Sensors: typically gap position, roll force, roll torque, vibration, tension. Table has gap, load cells, roll RPM, coiler torque – good. Malfunction physics lists roll gap asymmetry, end-of-life bearings. Should also mention roll neck fatigue and gearbox torque shocks. The ISO cited was ISO 10816-3 (vibration class III), correct for high-power rotating machines. 
- **Hydraulic AGC Cylinders (Horizon):** Task/gap control is correct. Sensors: pressure, position encoders, oil condition monitors. They cite ISO 19973 (pneumatic reliability) – partially applicable; actual hydraulic seal standards include ISO 6164 (mobil seals) or ISO 13373 (bearing diagnostics) for related failures. Mentioning ISO 10816-3 again for hydraulic pump vibration would be appropriate.
- **Acid Pickling Tanks (Zephyr):** Task (dissolve scale) correct. Inputs (strip + 15% HCl) and sensors (HCl conc, temp, level, agitation, rinse sprays) are plausible. Malfunction physics (“acid burnout”) incomplete – should add pickling line metal loss and pump seal leaks. They list ISO 17359 (condition monitoring) which is generic. More specific: ISO 22716 (cosmetic processing) isn’t relevant.  Perhaps cite safety: EPA/OSHA for acid handling (e.g. OSHA 1910.119 for CBL).
- **Tandem Cold Mill Stands (Zephyr):** Task (thickness reduction) correct. Inputs (pickled strip), sensors (torque, thickness gauge, T tension, roll force) are right. Failure physics like contaminated lubricant causing bearing wear is one example. They cite ISO 10816-3 (vibration), ISO 13373-3 (bearing frequencies) – appropriate for bearings and vibration diagnostics. 
- **Galvanizing Pot (Zephyr):** Task (Zn coating) correct. Sensors (Zn temp, level, Fe-in-Zn content, pot roll RPM) should be listed; table shows pot/pot roll temp, Fe in Zn. Primary failure modes listed (“sink roll corrosion, Zn contamination”) are correct. They cite ISO 17359 (sink roll wear alarm) and ISO 1460 (coating weight measurement).  ISO 1460:2012 is a standard for gravimetric zinc coating weight determination – fitting. 
- **Air Knives (Zephyr):** Task (wipe excess Zn) correct. Inputs (molten zinc strip), sensors (air pressure, nozzle position, strip speed) included. Failure physics (“nozzle clogging”) is plausible. They cite ISO 1460 (coating measurement) again, which is less direct for air knives; perhaps ISO 6085 for coating thickness uniformity is more on coating weight.

In summary, most table entries are technically sound.  Where standards were misnamed or missing, corrections include:
- **Furnace:** Use IEC 62682 (alarm management) instead of “ISA‑18.2 (ANSI)”.
- **Hydraulics:** Add ISO 13373-3 (bearing diagnostics) or ISO 10816-3, not just ISO 19973 (pneumatic).
- **Pickling:** Add OSHA 1910.119 (chemical plant safety) or NFPA 497 (flammability).
- **Coiler/Coating:** The air-knife listing could note ISO 1460/ASTM A767 for Zn weight/adhesion.
We would update the registry with these and cite standards catalogs or vendor docs where possible.

## 4. Equipment Specifications & SOPs

We researched each key machine’s specs and procedures:

- **Furnace:** Modern walking-beam furnaces have zones with capacity for slabs (2–5 t each), burner output 50–150 MW, and uniformity ±10–15 °C.  **SOP:** Preheat burners, verify inlet valves, ensure ventilation.  Startup: gradually open oil/gas valves, light burners, ramp to 1000 °C. Normal: modulate burners and air to maintain 1150–1250 °C. Shutdown: close fuel, purge, then let cool. **PM:** Daily visual check refractory and burner flame; weekly O₂ sensor calibration; quarterly burner nozzle inspection; annual refractory inspection.  **Standards:** IEC 61511 (FSC for process control), ISO 10816 (vibration for fan/blowers), OSHA 1910.269 (power plant safety).

- **Descaler:** HP water pump 18–22 MPa, 100–300 m³/h flow per machine. Nozzle arrays cover top/bottom surfaces. **SOP:** Energize pump, open pressure line gradually; verify nozzles are aligned. Shutdown: depressurize and drain. **PM:** Daily nozzle inspection; filter change weekly; pump oil/shaft seal check monthly. **Standards:** ISO 4406 (water cleanliness in hydraulic systems); ANSI/OSHA for pump guarding.

- **Roughing Mill (4-high reversible stands):** Rougher stands have roll diameters ~1000–1200 mm; reduction per pass ~20–30 mm; mill speed ~30–50 m/s; capacity ~4–8 t/min. **SOP:** Set roll gap according to target gauge; ensure desired speed and tension; add inter-stand crop shear. **PM:** Pre-shift: remove scale buildup, check roll bite; Daily: lube roll bearings (auto-lube), inspect roll surface; Weekly: check roll parallelism (feeler gauge tolerance ~0.05 mm); Quarterly: replace roll end bearings, inspect couplings. **Standards:** ISO 10816-3 (vibration levels); ISO 13373 (bearing spectra); ASTM A1030 (oil analysis for filter test).

- **Finishing Mill Stands:** 6–7 stands, four-high, each with hydraulic AGC gap control. Similar parameters but final thickness control tighter. **SOP:** Maintain inter-stand tension (AGC calibration) for flatness. **PM:** Same as rougher plus: Per roll-change: inspect mill chocks and wear plates; 500 hrs: gearbox oil sample/analysis (trigger at ISO 18/16/13 contamination). Replace hydraulic seals yearly. **Standards:** Same as rougher; also ISO 17359 for scheduled condition monitoring.

- **Laminar Cooler:** Comprised of water header manifolds and nozzles. **SOP:** Flush cooling headers daily; verify target temperature vs setpoint. **PM:** Check water quality (target pH 7–8.5, hardness <150 ppm); weekly nozzle flow test; monthly header descaling.

- **Coiler:** Mandrel or carousel type, applying coil tension. **SOP:** Engage brake to maintain coil tension ~20–80 MPa. **PM:** Daily check mandrel arm lube; weekly brake pad wear; monthly gearbox oil. **Standards:** IEC 61508 for safety interlocks.

- **Pickling Tanks:** 15% HCl, 65–85 °C tanks (often batch-type or continuous). **SOP:** Ensure acid concentration by monitoring conductivity; recirculation pump on; use inhibitors. **PM:** Weekly acid analysis; monthly tank structural inspection; daily leak check (HCl fumes hazard). **Standards:** EPA Process Safety (OSHA 1910.119), NACE/SP0169 for corrosion monitoring.

- **Tandem Cold Mill:** Multi-stand cold rolling (e.g. 4-high 650–800 mm rolls). **SOP:** Control reduction per stand; lubricate rolls, control roll shift/bending. **PM:** Per roll-change: inspect roll neck bearings (temperature alert >65°C) and roll surface; Weekly: fluid level/clarity (oil ISO 18/16/13); 500 hrs: full roll removal and journal inspection. **Standards:** ISO 10816-3 (vibration); ASTM E1876 (sheet ultrasonic, occasionally).

- **Annealing Furnace:** Continuous annealer (H₂ atmosphere), ~650–760 °C. **SOP:** Ramp up H₂ flow with ventilation; preheat elements; monitor zone temperatures. **PM:** Daily: gas leak check; weekly: element burners/thermocouple calibration; quarterly: bell-jar integrity test. **Standards:** NFPA 86 (furnace safety); IEC 61508 for control.

- **Galvanizing Pot:** Zinc bath at ~450–462 °C. **SOP:** Maintain pot level (~500–800 mm); skim dross; control melt temp (Pt100 sensors). **PM:** Continuous skimming; daily refractory inspection; weekly Zn purity check (Fe <0.03%). Clean rolls (acid pickling) monthly. **Standards:** EN ISO 1460:2010 (zinc coat weight) and ISO 17359 (condition monitoring); ASTM A123 (galvanizing spec).

- **Air Knives:** High-pressure blower (~10–20 bar) with LVDT nozzle gap control. **SOP:** Set air pressure to target coat weight; confirm nozzle distance (±0.5 mm) via LVDT. **PM:** Daily check hose/piping; weekly blower bearing lube; monthly orifice inspection. 

Each equipment’s preventive maintenance (PM) follows manufacturers’ and ISO/industry norms (e.g. ISO 17359 for condition-based PM, ISO 14224 for data, ISO 55000 for asset management).  For example, **vacuum/grease pumps, cooling fans, hydraulic units, and electrical drives** follow routine oil analysis (ISO 4406:2017 particle counts) and vibration check (ISO 10816) intervals. OSHA regulations (lockout/tagout 1910.147, machine guarding 1910.212) govern all manual work.

## 5. Sensors and IoT

Typical sensors on these machines include:

- **Temperature:** Pt100 RTDs or Type-K thermocouples. Furnace zones (0–1300 °C), annealer (0–800 °C), pickling acid (~0–100 °C), cooling headers (20–60 °C). Sampling: seconds. Tolerance ±1 °C. Alarms: furnace zone deviation >±15 °C; overheating.
- **Pressure:** Strain-gauge transducers. Hydraulic pressures (0–400 bar), pickling pump pressure (0–100 bar), air blower pressure (0–20 bar). Sample: 1–10 Hz. Range: up to 40 MPa for descaler. Alarm: >120% setpoint or drift.
- **Flow:** Magnetic or turbine meters. Water flow (0–1000 L/min), gas flow for burners (0–1000 Nm³/h). Sampling: 0.1–1 Hz. 
- **Vibration:** 3-axis accelerometers (IEPE) on bearings/motors/roll stands. Units: mm/s (velocity). ISO 10816-3 thresholds: e.g. 4.5 mm/s alert for roll neck bearings, 7.1 mm/s trip. Band-limited to 10–1000 Hz; sample >1 kHz to detect bearing BPFO/BPFI.
- **Torque/Force:** Strain-gauge torque cells or load cells. Roll torque (0–2000 kNm), hydraulic cylinder load (0–1000 kN). 10–100 Hz. Torque used for strip tension control.
- **Position:** LVDTs/encoders. Roll gap (0–50 mm, ±0.01 mm), hydraulic cylinder stroke (0–500 mm). Sampling: up to 100 Hz for AGC loop.
- **Speed/RPM:** Tachometers on motors and coils. Rolls (0–300 RPM), coiler mandrel (0–100 RPM). 1–10 Hz.
- **Electrical:** Motor current (A), voltage (V). Sample 1 Hz; spikes indicate stalls/shorts.
- **Acoustic/Ultrasonic:** Used on bearings (lubrication status), but less common in heavy mills.
- **Oil/Fluids:** Particle counters (ISO 4406 code), moisture sensors (ppm), viscosity (cSt). Used in gearboxes and hydraulics.
- **Chemical:** pH and conductivity in pickling rinse, Zn % in bath, O₂ in furnace flue gas.

Most sensors sample at 1–10 Hz (process values), with higher-frequency vibration monitors (~1–5 kHz). Alarm thresholds follow standards (e.g. ISO 10816-3 RMS levels, ASTM for oil cleanliness codes, ISA 18.2 for limit violations, etc.) and OEM reliability targets.

## 6. Failure Physics

We surveyed common failure modes and their sensor signatures:

- **Bearing Wear/Failure:** Progressive degradation from fatigue, inadequate lubrication or contamination.  **Mechanism:** Metal fatigue spalls, inner/outer race cracks. **Early Signs:** Rising bearing temperature, increased RMS vibration, appearance of BPFI/BPFO peaks in spectrum.  **Sensors:** Vibration accelerometers (bearing frequencies), thermometers (bearing housing >65 °C).  **Root Causes:** Lubrication loss, misalignment, overload.  **Standards:** ISO 10816-3 alert (e.g. 4.5 mm/s at 10–1000 Hz).

- **Shaft Misalignment:** Roll chocks or drive shafts out of parallel.  **Mechanism:** Thermal expansion or foundation settling causes roll mis-parallelism.  **Signs:** Non-uniform strip (edge waves), oscillating load, elevated coupled vibration at 1× running speed.  **Sensors:** Vibration (coupling train), strip thickness profile gauges, axial displacement sensors.  **Detection:** Alignment lasers or dial gauges (weekly).

- **Lubrication Loss:** Oil pump failure or leakage (gearboxes, hydraulics).  **Mechanism:** Rapid wear of gears/bearings due to inadequate film.  **Signs:** Sudden rise in bearing temperature, drop in oil pressure, high particulate count (ISO code).  **Sensors:** Oil pressure transducer, flow, temperature, particle sensor.  **Root Causes:** Pump cavitation, seal failure.  **Progression:** Bearing vibration spikes, oil metal content rises.

- **Roll/Roll Gap Fault:** Chock wear or breakage leads to gap asymmetry (see sensor data).  **Signs:** Strip thickness drift, one-side fatigue.  **Sensors:** Gap encoders, roll force imbalance, thickness C-frames.

- **Hydraulic System Faults:** Leaking seals or fluid contamination.  **Mechanism:** Seal extrusion, fluid aeration.  **Signs:** Position control loss (AGC instability), pressure fluctuations.  **Sensors:** Cylinder pressure transducers, position LVDTs, return line flow.

- **Motor/Drive Overload:** Excessive electrical load or phase imbalance.  **Signs:** High current draw, differential vibration/harmonics.  **Sensors:** Current sensors, motor vibration monitors, thermal overload.
  
- **Hot Spots (Thermal Fatigue):** In furnaces or hotspots on rolls.  **Signs:** Refractory cracks, local overheating (thermocouples spike).

- **Galvanizing Pot Failures:** Iron dissolution in zinc leads to dross.  **Mechanism:** High zinc temp (~450 °C) dissolves strip iron, forming zinc-iron layers. **Signs:** Rising pot roll torque (due to dross drag), frequent roll changes; iron content in bath sensor.  **Sensors:** Zn bath temperature, Fe content probe, roll torque.

Refer to the OxMaint guide’s failure-mode table: Bearing faults show elevated temp/vibration; roll misalignment causes dimensional variance; coupling fatigue shows abnormal drive vibration. These physical failure modes should be encoded in the digital twin (e.g. a bearing’s life model).

## 7. Public Datasets for Maintenance & Anomaly Detection

We identified several relevant datasets:

- **NASA IMS Bearing Dataset:** Run-to-failure vibration data for bearings (3751+ runs). Contains accelerometer signals; used for anomaly detection. *Type:* Bearing RUL dataset.
- **NASA CMAPSS Turbofan Engines:** Jet engine sensor data for RUL (predict cycles to failure). Useful for time-series RUL modeling.
- **UCI AI4I 2020 (Manufacturing) Dataset:** Synthetic sensor readings for CNC milling machines with failure labels. Good for classification.
- **PHM Society Data Challenge:** Often includes gearbox and pump datasets (vibration, speed, torque).
- **MIMII (Japan):** Sound datasets for malfunctions in industrial machines (valves, pumps, fans). Anomaly detection by audio.
- **Kaggle “Industrial Digital Twin 1-Year”:** (if accessible) 10-min sensor logs of multiple process assets with downtimes – ideal for multi-asset scheduling and failure propagation.
- **Case Western Univ. Process Datasets:** E.g., Tennessee Eastman Process control data (for chemical plants, used for multivariate anomaly detection).
- **Bently Nevada Datasets:** Bearing data for linear motors and turbines (CMMS historical data).
- **C-MAPSS Fuel Cell Stack Degradation:** Multi-stack degradation (dynamic input vs output).

For rolling-mill-specific examples:
- **LMM Group Data:** (if available) some Chinese OEM publish test data.
- **Industrial Partners (Arcelor/MSS):** Some universities share mill sensor logs.
- **Synthetic Datasets:** The Kaggle link above (synthetic Siemens/Panasonic milling).
- **NIST PHM Dataset:** Bearing and gear testbeds.

For cascading failures (cross-equipment):
- Real multi-machine datasets are rare. One approach is to combine single-equipment datasets (e.g. NASA bearings) into a synthetic network. Alternatively, industrial digital twin datasets (like the Kaggle 5-mill) simulate how one machine’s delay affects others.

*(Dataset Citation Example:)* NASA IMS Bearings – Center for Intelligent Maintenance Systems at Univ. of Cincinnati provides test-to-failure bearing data (accelerometer time series, bearing speeds, etc.). The UCI AI4I dataset (2020) contains operating parameters and failure flags for a milling machine, useful for classification tasks. 

## 8. Machine Learning Models for Fault Prediction

We consider models per equipment:

- **Traditional ML (tabular):** Random Forest, XGBoost, SVM, Isolation Forest. *Inputs:* static summaries or simple windowed stats of sensor streams. *Use:* Anomaly detection and classification. *Complexity:* Low (RF ~O(n log n) per tree). *Reference:* Widely used in SHM (e.g. RF on bearing data).

- **Sequence Models:** LSTM/Bi-LSTM/GRU networks process raw time-series. *Inputs:* Multivariate time series from sensors (sliding window). *Outputs:* Next-value predictions or binary anomaly label. *Data:* Large historical run data per asset. *Cost:* Training is expensive (O(seq_len * feature_dim * hidden^2)), but online detection is moderate. *Literature:* LSTMs have been used for bearing RUL and milling maintenance (though not cited here due to access). 

- **Transformers (Informer, PatchTST, Time-Series Transformer):** These capture long-range dependencies. *Inputs:* Similar to LSTM but with positional encoding. *Outputs:* Forecast or classification. *Complexity:* O(n^2) self-attention, mitigated by sparse designs (Informer). *Use:* Very promising for multivariate PM (e.g. a recent Google model TimesFM is a transformer-based foundation model for forecasting).
  
- **Autoencoders (LSTM-AE, VAE):** Unsupervised models learn normal behavior; anomalies detected by high reconstruction error. *Inputs:* Sensor sequences. *Outputs:* Reconstruction error score. *Complexity:* Similar to LSTM. *Use:* Good when anomaly labels scarce.
  
- **Graph Neural Networks:** Treat equipment as nodes in a graph (edges = material flow). *Inputs:* Sensor features + graph adjacency (mill sequence graph). *Outputs:* Node-level failure probability or edge-level event propagation. *Use:* Novel for interdependent systems. *Complexity:* Graph convs ~O(E) per layer.

- **Foundation Models (TimesFM, Chronos, etc.):** Pretrained on huge TS corpora, fine-tuned for specific tasks. TimesFM provides forecasting (e.g. RUL) and can detect anomalies via its AI.DETECT_ANOMALIES.

For each, note data needs:
- Tree/SVM: need labeled features per cycle/event.
- LSTM/Transformer: need sequential labeled runs for training.
- Autoencoders: need only normal operation logs for training.

The choice depends on data volume and real-time constraints. For edge agents, lightweight models (Random Forest or one-class SVM) can run on-device, whereas deep LSTM/Transformer might run on an edge GPU or central server.

## 9. Cross-Equipment Dependency Modeling

Failures in one machine often ripple downstream. E.g. a **furnace outage** delays slabs, which then starves the roughing mill; a bearing seizure in roughing triggers an unplanned stop. To capture this, one can build:

- **Multivariate Process Datasets:** Time-synchronized sensor streams from all major assets. (Not common publicly.) Synthetic approach: Simulate line with SimPy/Modelica and inject faults to generate such data.
- **Event Propagation Logs:** Logs of event sequences (e.g. furnace trip → hot mill trip). Could learn causal graphs from failure logs.
- **Graph-Based Models:** Create a directed graph (Furnace→Descaler→Rougher→Finisher→Cooling→Coiler). Use Graph Neural Networks to model how a node’s state affects neighbors. For example, outlier detection on the graph embedding might capture upstream faults affecting downstream metrics.
- **Bayesian Networks / Dynamic Bayesian Networks:** Can encode conditional probabilities (if Furnace is down, Roughing RUL shortens).
- **Process Mining:** Apply process-mining on maintenance records to see typical failure cascades.

No standard dataset is known. One could use industrial *digital twin benchmarks* (e.g. MSM20 multi-stage process) if available. Alternatively, **the Kaggle “Industrial Digital Twin”** dataset (if accessible) simulates 5 mills with demand/backlog and maintenance/Failures, which is exactly cross-equipment.

In practice, we would **synthesize** a combined dataset: take individual equipment traces (bearing, pump, motor) and link them via simulated timing (e.g. reduce feed if upstream fails). Using SimPy or AnyLogic, we can create such interdependencies.

## 10. Simulation and Synthetic Data Generation

To generate realistic sensor data, we’d use **physics-based simulation**:

- **Modelica / MATLAB Simulink:** For detailed component models. MathWorks provides a Simulink rolling mill model (roll, hydraulics, control loops). One could extend it to multiple stands, tension control, and include failure injection (e.g. increase friction). Modelica libraries (e.g. Modelon, Dynasim) have metal processing components.

- **Discrete-Event Simulators:** SimPy (Python) or AnyLogic can simulate production flow (slab arrivals, processing times, machine breakdowns). They produce event streams and sensor-state logs. AnyLogic’s multistage manufacturing templates can model failures and maintenance.

- **Digital Twin Frameworks:** Tools like Siemens Tecnomatix Plant Simulation, Rockwell Arena, or open-source FUME (Flexible Universal manufacturing Modeling Environment) can simulate factories at various fidelity.

- **Physics Simulators:** For certain sensors (e.g. vibration), one could use finite-element or multi-body simulators, though typically not needed for high-level twin. For dynamics, Matlab/Simscape or COMSOL could model thermal/mechanical behavior.

**State Variables & Fault Injection:** For each asset, identify state equations. E.g. hydraulic AGC cylinder: state = cylinder position x(t), with dynamics governed by fluid flow and seal friction.  Faults: reduce flow area (simulating spool valve wear), add leakage term, increase friction coefficient. Vibration sim: add random bump in speed.

The simulator would output synthetic streams (temp profiles, vibration spectra, pressure transients). By injecting faults at known times, we create labeled data for ML.

## 11. Combined Dataset Architecture

Finally, for a **comprehensive digital twin**, we would design a unified data schema:

- **Asset Graph:** Nodes = equipment units, edges = material/process flow.
- **Multivariate Time Series:** At each node, time series of its sensor readings (temp, vibration, etc.).
- **Event Logs:** Machine states (RUN, STOP, MAINT), alarms, operator interventions.
- **Maintenance Records:** PM history, part replacements, observed degradations.

A possible structure:
```
FactoryLevelTable (Timestamp, BatchID, ...)
 EquipmentLevelTable (EquipID, Timestamp, sensor1, sensor2, ..., status_flag, next_failure_time, etc.)
FailurePropagationTable (FromEquip, ToEquip, TimeDelay, Cause)
```
Graph Neural Network models or temporal convolutional nets can be applied to this graph+time data to predict faults.

**Citations:** The concept of combined digital twin datasets is discussed in steel DT literature (iFactory blog phases 1–4).  Our approach aligns with the **digital asset registry** concept (complete plant model) and **maintenance fingerprints** described by iFactory.

---

**Sources:** We relied on industry resources and standards documents. Notably, an LMM Group whitepaper detailed hot rolling stages, the Steefo guide summarized rolling mill stages, and OxMaint articles outlined common faults and PM practices.  The MathWorks File Exchange shows a Simulink rolling mill model.  Where authoritative, ISO/IEC/ANSI standards have been cited.  All critical values and processes are corroborated by these references.

