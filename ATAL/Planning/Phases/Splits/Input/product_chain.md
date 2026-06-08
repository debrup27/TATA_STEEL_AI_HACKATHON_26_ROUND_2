# 🔗 Product Chain Document — Factory Routing for Products X, Y & Z

---

## Overview

Three commercial steel products are produced through different combinations of the six factories. Each product shares the same upstream ironmaking chain (F1 → F2 → F3 → F4) but diverges in the downstream finishing chain (F5 and F6).

```
RAW COAL + IRON ORE FINES
         │
    ┌────┴────┐
    ▼         ▼
  [F1]      [F2]
  COBPP      SP
  (Coke)   (Sinter)
    │         │
    └────┬────┘
         ▼
       [F3]
       BF
   (Hot Metal)
         │
         ▼
       [F4]
       SMS
     (Slabs)
         │
         ▼
       [F5]
       HSM
    (HRC Coils)
      │     │
      │     └──────────────────────────────────────────────────────────┐
      │                                                                 │
  PRODUCT X                                                           [F6]
  Hot Rolled Coils                                               CRMGL
  (Tata Astrum)                                             ┌────────────┐
                                                            │            │
                                                        PRODUCT Y    PRODUCT Z
                                                        CRCA Sheet   Galvanized Coil
                                                       (Steelium)    (Galvano)
```

---

## Product X — Hot Rolled Coils (HRC) — *Tata Astrum*

### Chain Route
```
F1 (COBPP) + F2 (SP) ──► F3 (BF) ──► F4 (SMS) ──► F5 (HSM) ──► [Product X]
```

### Market Application
Structural engineering, pipeline manufacturing, heavy vehicle chassis, agricultural equipment frames, machinery base plates.

### Thickness Range
2.0 mm – 16.0 mm

### Key Quality Parameters

| Parameter | Target | Critical Limit |
|:---|:---|:---|
| Thickness tolerance | ±50 μm (prime); ±150 μm (secondary) | Per customer order |
| Width tolerance | ±3 mm | ±5 mm |
| Coiling temperature | 550–700°C (grade-dependent) | ±20°C from target |
| Tensile strength | Per grade (e.g., IS 2062 E250: 410 MPa min) | ±15 MPa |
| Surface scale | No embedded scale pits visible | Any scale pit = downgrade |
| Flatness | <10 I-units (HRC standard) | >15 I-units = quality hold |

### Factory-by-Factory Process Chain

#### F1 Contribution — Metallurgical Coke Quality
- **Critical parameter:** Coke Strength after Reaction (CSR) > 60%
- **How it propagates to Product X:** Low CSR → coke crumbles in BF → poor gas permeability → thermal imbalance → irregular hot metal Si content → BOF blow variation → slab chemistry inconsistency → strip mechanical property non-conformity
- **Lag to Product X impact:** 8–12 hours (F1 → F3 → F4 → F5 sequence)

#### F2 Contribution — Sinter Quality
- **Critical parameter:** FeO% = 7.5–8.2%; basicity (CaO/SiO₂) = 1.8–2.0; size >8mm >80%
- **How it propagates:** High FeO → lower sinter reducibility → higher coke rate in F3 → hotter hot metal → extended F4 blow → wider slab chemistry spread → F5 rolling force variance → thickness tolerance widening
- **Lag:** 4–6 hours

#### F3 Contribution — Hot Metal Quality
- **Critical parameter:** Hot metal Si: 0.3–0.5%; S: <0.04%; Temperature: 1470–1510°C
- **How it propagates:** High Si → higher O₂ consumption at BOF → more slag → slag-metal mixing → increased oxide inclusions in slab → surface defects visible on HRC
- **Lag to F5:** 2–4 hours

#### F4 Contribution — Slab Chemistry and Surface
- **Critical parameter:** C: per grade; S: <0.015%; P: <0.025%; slab surface temperature at F5 entry: >900°C
- **How it propagates:** Caster mould wear → oscillation mark depth increases → surface crack initiation sites → when rolled at F5, these open as linear surface defects

#### F5 Contribution — Final Dimensions and Coiling
- **Critical parameter:** Exit gauge ±50 μm; flatness <10 I-units; coiling temperature ±20°C
- **Key machines:** F5-EQ01 (reheat furnace), F5-EQ05 (finishing stands), F5-EQ09 (AGC), F5-EQ10 (laminar cooling), F5-EQ11 (coiler)
- **Product X is the output:** No further F6 processing required

### Cascade Failure Impact on Product X
A tuyere burnthrough at F3 that shuts the BF for 8 hours → F4 SMS runs on residual hot metal for ~2 hours, then stops → F5 HSM runs out of slabs in ~4 hours → Product X output stops → customer structural steel delivery delay

---

## Product Y — Cold Rolled Closed Annealed (CRCA) — *Tata Steelium*

### Chain Route
```
F1 (COBPP) + F2 (SP) ──► F3 (BF) ──► F4 (SMS) ──► F5 (HSM) ──► F6 (CRMGL: Pickle + TCM + Anneal + SPM) ──► [Product Y]
```

### Market Application
Automotive outer body panels (hood, doors, fenders), refrigerator outer panels, washing machine drums, precision-engineered components, electrical enclosures.

### Thickness Range
0.5 mm – 2.5 mm

### Key Quality Parameters

| Parameter | Target | Critical Limit |
|:---|:---|:---|
| Thickness tolerance | ±3 μm (automotive grade) | ±8 μm (downgrade to commercial) |
| Surface roughness Ra | 0.8–1.5 μm | <0.6 μm (paint adhesion) or >2.0 μm (tooling wear) |
| Flatness | <3 I-units | >5 I-units (pressing defect risk) |
| Yield strength | Per grade (e.g., IF steel: 150–210 MPa) | >220 MPa (over-annealed or wrong grade) |
| Lüders bands | None visible | Any Lüders band → scrap panel |
| Oil coat weight | 300–600 mg/m² | <250 mg/m² (rust in storage) |
| Surface cleanliness | No scale pits, roll marks, scratches | Any visible defect = panel rejection |

### Factory-by-Factory Process Chain

#### F1+F2+F3+F4 Contribution (same as Product X) — plus:
- **Additional F4 requirement for CRCA:** Ultra-low sulphur (<0.010%) and nitrogen (<50 ppm after RH degassing) required for deep-drawable IF (Interstitial-Free) steel grades used for outer body panels
- **Critical:** F4-EQ07 (RH Vacuum Degasser) must function — snorkel wear monitored actively

#### F5 Contribution — HRC as CRCA Feedstock
- **Critical F5 parameter:** HRC thickness consistency to ±50 μm — any incoming gauge variation at F6-EQ02 TCM causes roll force variation → surface mark variation → rejected automotive panels
- **Coiling temperature critical for CRCA:** 660–700°C coiling temperature produces the right hot-band microstructure (predominantly ferritic) that anneals correctly in F6-EQ03

#### F6-EQ01 (Acid Pickling Tanks)
- **Role:** Remove all mill scale completely — even 1% residual scale creates surface pits visible after paint on an automotive panel
- **Critical control:** HCl concentration 12–18%; temperature 65–85°C; inhibitor dose to prevent over-pickling (loss of base metal → surface roughening)

#### F6-EQ02 (Tandem Cold Mill)
- **Role:** Reduce HRC from 2–4mm to 0.5–1.5mm at room temperature in 4–5 passes
- **Critical:** Emulsion quality (F6-EQ08) directly controls surface finish — high Fe contamination → micro-scratching → Ra >2.0 μm → paint defect on car panel
- **Thickness to ±3 μm** requires AGC-equivalent system with LVDT and load cell feedback

#### F6-EQ03 (Continuous Annealing Furnace)
- **Role:** Recrystallize cold-worked steel — temperature profile must achieve full recrystallization (>750°C soaking) without grain overgrowth (>850°C)
- **Critical for CRCA:** Protective atmosphere dew point <-30°C — any moisture contamination oxidizes strip surface → poor zinc wettability if subsequently galvanized, or poor paint adhesion for bare CRCA
- **Radiant tube integrity (F6-EQ03):** A single cracked tube ruins the atmosphere in its zone → strip surface oxidation → product scrapped

#### F6-EQ04 (Skin Pass Mill)
- **Role:** Final surface texture transfer and Lüders band suppression
- **Elongation control:** 0.8–1.2% for automotive grades — too little = Lüders bands visible; too much = yield strength too low → car panel dents easily

### Product Y — Cascade Failure Scenario
F6-EQ03 radiant tube crack → atmosphere dew point rises to -5°C within 3 minutes → strip in the furnace gets oxidized surface → 200m of strip scrapped → automotive delivery shortfall → production schedule replanning required

---

## Product Z — Galvanized Coils (GC) — *Galvano*

### Chain Route
```
F1 (COBPP) + F2 (SP) ──► F3 (BF) ──► F4 (SMS) ──► F5 (HSM) ──► F6 (CRMGL: Pickle + TCM + Anneal + CGP + Air Knives) ──► [Product Z]
```

### Market Application
Corrugated roofing sheets, HVAC ducting, automotive underbody structural members, refrigerator back panels, industrial cladding, pre-painted base material (PPGI).

### Thickness Range
0.3 mm – 2.0 mm base metal + zinc coating

### Key Quality Parameters

| Parameter | Target | Critical Limit |
|:---|:---|:---|
| Zinc coating weight (each side) | 60–275 g/m² (grade-dependent) | ±5 g/m² from target |
| Coating weight uniformity across width | <5 g/m² variation | >10 g/m² variation (air knife fault) |
| Surface appearance | Spangle-free or regular spangle (per order) | Dross inclusions → reject panel |
| Base metal thickness | ±3 μm (same as CRCA) | Same as CRCA |
| Corrosion resistance | Per coating weight (Z100–Z275) | Fails salt spray test → warranty claim |
| Adhesion of zinc to steel | No flaking in bend test | Delamination → return |

### Factory-by-Factory Process Chain

#### F1+F2+F3+F4 — same as Products X and Y

#### F5 — same as Product Y, with one additional constraint:
- **Coiling temperature for galvanizing:** 630–660°C — slightly lower than CRCA to ensure fine-grain microstructure that produces a thin Fe-Al inhibition layer in the zinc pot (prevents over-alloying)

#### F6-EQ01 through F6-EQ04 — same as Product Y, then additionally:

#### F6-EQ05 (Continuous Galvanizing Pot)
- **Role:** Immerse annealed strip in molten zinc for 3–8 seconds to form the Fe-Zn intermetallic bond layer
- **Temperature control is critical for Z:** At 455°C (±5°C window): correct Fe-Al inhibition layer forms → pure zinc coating adheres well. Below 445°C → zinc solidifies on strip → "bare spots". Above 470°C → Fe dissolution accelerates → dross forms → surface inclusions
- **Zinc chemistry:** 0.2% Al added to zinc bath to suppress Fe-Zn intermetallic growth at the interface; Al must be maintained at 0.18–0.22% or coating adhesion fails

#### F6-EQ06 (High-Pressure Air Knives)
- **Role:** Control final zinc coating weight to within ±5 g/m² of target
- **Pressure vs. coating weight relationship:** `CW = A × (P_air)^(-0.6) × (strip_speed)^(0.4) × (nozzle_distance)^(0.3)` — all three variables must be controlled simultaneously
- **Air knife blockage (zinc dust crystallization) is the dominant Quality Event for Product Z** — creates heavy stripes (+15–20 g/m² locally) visible as dull bands on the galvanized sheet

#### F6-EQ12 (Coating Weight Gauge)
- **Role:** Measure actual coating weight vs. target in real-time; feeds back to air knife pressure control
- **XRF response time:** 100–200 ms — adequate for control at typical strip speeds (60–120 m/min)

### Product Z — Quality Chain from F1 to Customer

The full quality signal propagation chain for zinc coating:
```
F1: Coke quality → F3: Hot metal Si → F4: BOF extra blow → Slab chemistry change
→ F5: Coiling temperature drift (±30°C) → F6: wrong microstructure enters galvanizing pot
→ Fe-Al inhibition layer thickness changes → zinc adhesion fails → product Z bending test failure
```

This 12+ hour quality propagation chain is a key demonstration of ATAL's time-lagged cascade modelling capability.

---

## Inter-Product Quality Interaction

Since F1 through F5 are shared infrastructure, a quality excursion in the upstream chain affects all three products simultaneously:

| Upstream Event | Product X Impact | Product Y Impact | Product Z Impact |
|:---|:---|:---|:---|
| F1 coke CSR drop (low F3 efficiency) | Mechanical property spread; TS ±20 MPa | Yield strength inconsistency; forming complaints | Base metal strength inconsistency; roofing load rating |
| F2 sinter FeO spike (>9%) | Scale pits risk | Pickling load increases; acid consumed faster | Same as Y |
| F3 tuyere burnthrough (blast shutdown) | Production stop; delivery delay | Same | Same |
| F4 caster breakout (slab supply stop) | 4–8 hr production gap | 6–12 hr impact (F6 buffer) | 6–12 hr impact |
| F5 work roll spalling | Surface defect; downgrade to secondary | F6 TCM rolling force spike; Ra increases | Zinc coating adhesion risk from rougher base |
| F5 laminar cooling valve stuck | Wrong coiling temp; mechanical spec shift | Wrong annealing response; yield spec miss | Zinc pot Fe-Al layer disruption; adhesion fail |

---

## Production Routing Decision Logic

The orchestrator uses the following decision tree to route slabs to products:

```python
def route_slab(slab_chemistry, hot_metal_Si, coiling_temp, surface_quality):
    
    # Check if slab meets ultra-low-impurity requirement for CRCA/GC
    if slab_chemistry['S'] < 0.010 and slab_chemistry['N'] < 50e-6:
        # Eligible for Product Y or Z
        if coiling_temp >= 630 and coiling_temp <= 660:
            if surface_quality == 'prime':
                return 'Product_Z'  # Galvanized (best surface, precise temp)
            else:
                return 'Product_Y'  # CRCA (same chem, surface acceptable)
        elif coiling_temp >= 660 and coiling_temp <= 700:
            return 'Product_Y'      # CRCA (slightly higher CT acceptable)
        else:
            return 'downgrade_to_X' # Coiling temp miss → only structural use
    
    elif slab_chemistry['S'] < 0.025:
        # Structural grade — Product X
        return 'Product_X'
    
    else:
        # Off-spec → internal use or scrap
        return 'reject'
```

This routing logic is simulated in the Orchestrator module and updated in real-time as sensor data flows in from F1 through F5.