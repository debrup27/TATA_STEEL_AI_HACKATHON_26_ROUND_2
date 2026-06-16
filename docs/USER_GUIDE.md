# User Guide

## Access

| URL | What |
|---|---|
| http://localhost:3000 | UI (SANSAD + MANAS) |
| http://localhost/ | Same, via nginx |
| http://localhost:8000/health/ready/ | Backend readiness |

Login: **`tech_demo` / `TechDemo@123`**.

## The two suites

### SANSAD — industrial telemetry dashboard
From the hub (`/sansad/hub`) you can open:

- **Diagnostics & Prediction** — per-asset health, RUL, probable fault, root causes, live
  sensors, cross-stage defects, factory cost graphs. Click an asset to drill in;
  "Ask MANAS" gives an inline RCA insight (pop-out modal for long answers).
- **Risk & Priority** — plant bottleneck ranking with risk class, urgency, spares status
  and procurement lead time; "MANAS insight" explains the score.
- **Maintenance Actions** — action plans (immediate actions, recommendations, long-term
  monitoring), spares with in-stock quantity + a separate order decision, and **Schedule
  Work Order** which drafts a maintenance order from live SANSAD feeds. "Regenerate"
  rebuilds the plan from a fresh LLM pass.
- **Intelligence Reports** — structured maintenance reports, abnormal-alert reports,
  decision summaries and the digital logbook.
- **Samvidhaan** — plant history, predictive-maintenance graphs, legend and reports.
- **Horizon Foundry / Zephyr Sinter** — interactive factory pipeline viewers (draggable
  nodes, live system alerts).

**Abnormality toggle** (top-right control): flips an asset into a fault regime. Within ~5 s
every page reflects it — health falls, anomaly rises, RUL collapses, alarms raise, reports
regenerate. Toggle off to recover.

### MANAS — conversational Maintenance Wizard
At `/manas/chat`:
- Ask maintenance questions in natural language; multi-turn context is preserved.
- Select **reference documents** to ground answers; the reply shows `[n]` citations with a
  source panel and document preview.
- Type **`/sansad`** to link the live plant — MANAS then answers from current faults, RUL,
  logs and work orders.
- **Deep thinking** mode for harder analysis; **role lenses** (technician/supervisor) shape
  tone and emphasis.
- Thumbs up/down trains MANAS's response style to you over time.

## A 3-minute demo script

1. Open SANSAD hub → note healthy assets.
2. Toggle **abnormality** on an asset (e.g. HHPD). Watch Diagnostics, Risk and Reports
   update live; an alarm and a work order appear.
3. Open **Maintenance Actions** → Regenerate the plan → Schedule a work order.
4. Open **MANAS**, type `/sansad`, ask "What should I fix first and why?" — it ranks from
   the live bottleneck data and cites SOPs.
5. Ask a document question (e.g. ISO 4406 target) to show RAG citations.
6. Toggle abnormality off → assets recover.
