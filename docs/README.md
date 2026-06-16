# Project ATAL — Documentation

**Autonomous Troubleshooting, Asset Intelligence & Lifecycle Management**
Tata Steel AI Hackathon 2026 · Round 2 · Agentic AI Challenge

ATAL is an intelligent **Maintenance Wizard** for steel-plant equipment. It consolidates
fragmented maintenance inputs — sensor telemetry, equipment manuals, SOPs, ISO standards,
maintenance history and spares data — and produces explainable diagnosis, root-cause
analysis, RUL prediction, anomaly detection, risk prioritisation, structured reports and a
natural-language assistant, behind a single `docker compose` stack.

## Document map

| Document | What it covers |
|---|---|
| [PROJECT_DESCRIPTION.md](./PROJECT_DESCRIPTION.md) | **Full detailed description** — functions, deliverables, realistic-dataset/physics mapping, end to end |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Service topology, the dual-engine design, RAG, the agentic graph, boot pipeline |
| [TECH_STACK.md](./TECH_STACK.md) | Every technology, why it was chosen, versions |
| [API_REFERENCE.md](./API_REFERENCE.md) | All REST endpoints and WebSocket channels |
| [USER_GUIDE.md](./USER_GUIDE.md) | Operator walkthrough of SANSAD + MANAS and the live demo |
| [BACKEND_GUIDE.md](./BACKEND_GUIDE.md) | Django app layout, key modules, how to extend |
| [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) | Next.js structure, service layer, streaming, rendering |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Annotated directory tree |
| [METHODOLOGY.md](./METHODOLOGY.md) | Design decisions, what's deterministic vs ML vs LLM, and why |
| **deliverables/** | Problem-statement §9 deliverables |
| [deliverables/DATA_AND_SYSTEM_FLOW.md](./deliverables/DATA_AND_SYSTEM_FLOW.md) | Data flow + system flow end to end |
| [deliverables/MODEL_DESIGN.md](./deliverables/MODEL_DESIGN.md) | Model design + reasoning pipeline |
| [deliverables/ALERTING_AND_PREDICTION_LOGIC.md](./deliverables/ALERTING_AND_PREDICTION_LOGIC.md) | Alerting + prediction logic |
| [deliverables/EQUIPMENT_PHYSICS.md](./deliverables/EQUIPMENT_PHYSICS.md) | The real failure physics each asset simulates |
| [deliverables/ASSUMPTIONS_AND_LIMITATIONS.md](./deliverables/ASSUMPTIONS_AND_LIMITATIONS.md) | Assumptions + limitations |
| [deliverables/SAMPLE_IO.md](./deliverables/SAMPLE_IO.md) | Sample inputs and outputs |

Run instructions live in the repo root: [../README.md](../README.md),
[../INSTRUCTIONS_TO_RUN.md](../INSTRUCTIONS_TO_RUN.md),
[../TROUBLESHOOTING.md](../TROUBLESHOOTING.md).

## The plant at a glance

Two simulated factories, eight assets, modelled on real steel-plant equipment:

| Factory | Assets |
|---|---|
| **Horizon Foundry** (F1) | Slab Reheating Furnace (SRF), High-Pressure Descaler (HHPD), Finishing Stands (FS, F1–F7), Hydraulic AGC Cylinders (HAGCC) |
| **Zephyr Sinter** (F2) | Acid Pickling Tanks (APT), Tandem Cold Mill Stands (TCMS), Continuous Galvanizing Pot (CGP), High-Pressure Air Knives (HPAK) |

Two product surfaces:

- **SANSAD** — the industrial telemetry dashboard (diagnostics, risk & priority, action
  plans, work orders, intelligence reports, Samvidhaan history, factory pipeline viewers).
- **MANAS** — the conversational Maintenance Wizard (RAG-grounded chat with citations,
  multi-turn context, `/sansad` live-plant linking, deep-thinking, role lenses).
