# 🏗️ Phase 1 Implementation Plan: Industrial Data Synthesis (Detailed)

## 🔑 Industrial Factory Key (The Codewords)
To ensure the Agentic AI understands the production chain, we map each factory ID to its primary industrial function and output:

| ID | Full Name | Primary Process | Key Output |
| :--- | :--- | :--- | :--- |
| **F1** | COBPP | Coke Oven & By-Product Recovery | Metallurgical Coke & Coal Chemicals |
| **F2** | SP | Sintering Plant | Sinter (Iron ore agglomerates) |
| **F3** | BF | Blast Furnace | Molten Liquid Iron |
| **F4** | SMS | Steel Melting Shop | Raw Liquid Steel (Billets/Slabs) |
| **F5** | HSM | Hot Strip Mill | Hot Rolled (HR) Steel Coils |
| **F6** | CRMGL | Cold Rolling Mill & Galvanizing Line | Premium CRCA / Galvanized Sheets |

---

## 🟢 Layer 1: The Machine & Sensor Module (Atomic Level)
*Focus: Modeling individual assets as autonomous, data-generating software objects.*

### 1.1 Equipment Class Modules
* **Asset Registry:** Define schema for 10–20 unique machine types per factory (e.g., Exhauster fans, Conveyor belts, Induction heating units).
* **Operational State Variables:** Initialize properties: `health_index`, `thermal_load`, `vibration_amplitude`, `power_draw`, and `throughput_speed`.
* **Physical Failure Logic:** Stochastic decay models; e.g., if `vibration_amplitude` exceeds threshold for >500 cycles, update `health_index` by -15% and trigger an `Anomaly_Event`.

### 1.2 Sensor Telemetry Modules
* **Synthetic Data Generation:**
    * **High-Frequency Stream:** Generate noise-filtered telemetry ($Hz$ ranges) for vibration and current.
    * **Low-Frequency Stream:** Generate process setpoints for pressure, temperature, and mass-flow rates.
* **Sensor Noise Injection:** Program Gaussian noise parameters to mimic real-world sensor drift, ensuring the AI agent learns to filter "dirty" data.

### 1.3 Knowledge Synthesis Inputs
* **Manuals & Documentation:** Map specific equipment IDs to external RAG knowledge chunks.
* **Spare Parts Inventory:** Bind asset IDs to procurement metrics: `Part_SKU`, `Stock_Level`, `Procurement_Lead_Time`, and `Supplier_Code`.

---

## 🟡 Layer 2: The Factory Aggregation Module
*Focus: Encapsulating the factory-level environment and internal control logic.*

### 2.1 Aggregated Factory Metrics
* **Health Index Synthesis:** Aggregate the status of all internal machines to calculate a real-time `Factory_Overall_Efficiency_Score` (0-100%).
* **PLC Alarm Simulation:** Build internal logic to mimic Industrial PLC (Programmable Logic Controller) triggers (e.g., `If Sensor_A + Sensor_B > Warning_Limit, Generate_Alarm`).

### 2.2 Thermodynamic/Kinetic Coupling
* **Process Dependencies:** Hard-code logic where factory output performance relies on upstream factory health.
    * *Example:* The `Blast_Furnace_F3` object calculates output based on `Sinter_Quality_F2` (from Factory 2) and `Coke_Quality_F1` (from Factory 1).

---

## 🔴 Layer 3: The Pipeline Orchestrator (Macro-Level)
*Focus: Modeling the product transit between factories.*

### 3.1 Pipeline Routing Logic
* **The Chain Link:** Define an Orchestrator that creates an array of factory objects.
* **Buffer Tank Dynamics:** Implement buffer zones between factory units (e.g., material storage tanks). If `Output_Rate_F3 > Input_Capacity_F4`, simulate a "Backpressure Event" that forces the upstream factory to throttle back production.

### 3.2 Domino Effect & Cascade Logic
* **Transit Delay Model:** Calculate propagation delay: `Delay = Distance / Throughput_Velocity`.
* **Systemic Risk Analysis:** Program the orchestrator to automatically flag a "Systemic Downtime Alert" if the cumulative health of critical equipment across factories falls below the threshold required to produce specific products.

---

## 🔵 Layer 4: Peripheral & Cognitive Knowledge Synthesis
*Focus: The "Brain" that interfaces with the maintenance engineer.*

### 4.1 Knowledge Base & RAG Indexing
* **Weaviate Data Structure:** Initialize schemas for equipment manuals, safety SOPs, and historical breakdown case studies.
* **Multimodal Embedding:** Ensure indices are stored as hybrid vector/BM25 search vectors to support both semantic and keyword-heavy technical queries.

### 4.2 Agentic Reasoning Layer
* **Maintenance Work Order Synthesis:** Define a templated output logic where the Agentic AI automatically generates:
    * **Diagnosis:** Root cause of failure.
    * **Recommendation:** Immediate action (Stop/Slow/Repair).
    * **Impact:** Forecasted effect on product delivery (Pipeline 1, 2, or 3).
    * **Action:** Pre-formatted work order sheet with necessary spare parts SKU.