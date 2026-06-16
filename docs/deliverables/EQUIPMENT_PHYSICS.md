# Equipment Physics & Failure Modelling

The synthetic data is **not random noise**. Each of the eight assets has a generator
(`apps/synthetic/generators/*.py`) and a scenario sampler
(`apps/synthetic/dataset_builder.py`) that reproduce the *actual degradation physics* of
that class of steel-plant equipment, with realistic sensor signatures, failure thresholds
referenced to published standards, and physically-derived Remaining-Useful-Life (RUL)
formulas. This is what lets the deterministic engine and the ML models behave like the
real plant under the abnormality toggle.

Standards referenced in the corpus and thresholds: **ISO 4406** (hydraulic oil
cleanliness), **ISO 17359** (condition monitoring), **ISO 281 / L10** (bearing life),
**OSHA 1910.147** (LOTO), bearing defect frequencies (**BPFO/BPFI**), and **Paris' law**
of fatigue crack growth.

---

## Horizon Foundry (F1)

### SRF — Slab Reheating Furnace · *criticality: critical*
- **Physics:** refractory lining degrades with cumulative campaign hours
  (`refractory_pct = 100 − 0.01·campaign_hr`). Failure modes: underheating (burner/air-fuel
  drift), refractory degradation, hearth seal drift.
- **Signals:** zone temperatures, fuel/air ratio, refractory thermocouples.
- **RUL:** `refractory_pct · 30 h − underheating_penalty`, floored at 50 h — i.e. remaining
  refractory campaign life, penalised when underheating is active.

### HHPD — High-Pressure Descaler · *high*
- **Physics:** descaling nozzle orifices erode with use; nozzle lifetime ≈ 5000 cycles
  before the orifice diameter reaches 1.5×D₀, collapsing jet pressure. Cavitation is the
  acute failure mode.
- **Signals:** header pressure (≈380–400 bar), flow rate (≈5000 L/min), nozzle cycle count.
- **RUL:** `(5000 − nozzle_cycles) · 0.4 h`. Fault when cavitation injected or cycles > 4000.

### FS — Finishing Stands (F1–F7) · *critical*
- **Physics:** work-roll bearing fatigue modelled by **Paris' law** of crack propagation:
  `da/dN = C·(ΔK)^m` with `C = 2×10⁻¹²`, `m = 3.2`, `ΔK = 12·√(a·1000)`. Failure at critical
  crack length `a_crit = 5 mm`. The **BPFO** (ball-pass frequency outer-race) vibration
  amplitude grows with crack size: `BPFO_dB = −45 + 25·log₁₀(a·10⁵)`. Secondary modes:
  roll chatter, chock wear.
- **Signals:** BPFO/BPFI vibration spectra (dB), roll force, roll revolutions.
- **RUL:** integrated Paris' law from current crack size to `a_crit` (converted to hours).

### HAGCC — Hydraulic AGC Cylinders · *high*
- **Physics:** servo-valve seal drift decays exponentially with seal age
  (`τ = 4000 h`, base drift rate 0.001), alarm when drift crosses 1%. Oil contamination is
  tracked against **ISO 4406 15/13/10** target cleanliness (particle counts per mL > 4 µm).
  Hysteresis is the control-degradation mode.
- **Signals:** position-loop error, valve current, ISO 4406 particle counts, oil pressure.
- **RUL:** `τ·ln(0.01/base_rate) − seal_age` — time until seal drift reaches the 1% alarm.

---

## Zephyr Sinter (F2)

### APT — Acid Pickling Tanks · *high*
- **Physics:** HCl depletion kinetics. Free-acid concentration drops with pickling time at
  a rate `K·FeO·LS·W·TH` (rate constant × ferrous-oxide load × line speed × strip width ×
  thickness). Start 15 g/L, alarm at 12 g/L. Failure modes: tank lining failure, safety
  breach (fume/ventilation).
- **Signals:** free-HCl concentration (g/L), Fe²⁺ load, bath temperature, ventilation flow
  (Nm³/h).
- **RUL:** `(HCl_now − 12)/rate` — hours of pickling left before the bath needs replenishment.

### TCMS — Tandem Cold Mill Stands · *critical*
- **Physics:** work-roll bearing degradation modelled as discrete **L10-life** stages
  (stage 1 healthy → stage 4 failure), with RUL factors `{1:1.0, 2:0.6, 3:0.25, 4:0.0}`
  against a 2000 h base. BPFO grows and bearing temperature rises per stage. Emulsion
  (rolling-lubricant) contamination is the acute mode.
- **Signals:** bearing temperature (~45 °C baseline), BPFO amplitude, rolling force,
  emulsion cleanliness.
- **RUL:** `2000 h · stage_factor`.

### CGP — Continuous Galvanizing Pot · *high*
- **Physics:** molten-zinc pot at ~450–465 °C; **dross formation rate** rises sharply with
  pot temperature (Arrhenius-like `dross_rate(T)`), alarm above 462 °C. Sink/stabiliser-roll
  bushing wear and temperature excursions are the failure modes.
- **Signals:** pot temperature, dross rate, bushing wear (mm), bath level.
- **RUL:** `3000 h · dross_rate(462)/dross_rate(T)` — inversely proportional to dross rate.

### HPAK — High-Pressure Air Knives · *medium*
- **Physics:** air-knife nozzle crystallisation/blockage. Pressure drop grows with blockage
  time `Δp = 20 + 200·(1 − e^(−0.0001·t))` mbar; the 95 mbar alarm is crossed at
  `t ≈ 4700 min`. Crystallisation is the acute mode.
- **Signals:** air-knife header pressure, Δp across the knife, coating-weight uniformity.
- **RUL:** `(t_alarm − blockage_time)/60` hours, where `t_alarm ≈ 4700 min`.

---

## Why this matters for the submission

- **Realistic abnormality demo:** toggling abnormality re-asserts a fault and drives the
  generators into their failure regimes, so health falls, anomaly rises and RUL collapses
  with physically-plausible sensor traces — visible across every page within seconds.
- **Grounded thresholds:** alarm/trip bands are calibrated to the nominal generator output
  (`calibrate_sensors`) and cross-referenced to ISO/OEM limits in the RAG corpus, so the
  LLM can cite a real standard (e.g. ISO 4406 16/14/11) when explaining a deviation.
- **Physically-derived RUL labels** train the XGBoost regressors on meaningful targets,
  not arbitrary numbers — even though the deterministic engine remains the source of truth.
