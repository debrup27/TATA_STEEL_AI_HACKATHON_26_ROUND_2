# ATAL — User Guide

A walkthrough of the two suites — **SANSAD** (dashboard) and **MANAS** (chat) — and the live
abnormality demo. Open **http://localhost:3000** after the stack is up.

---

## 1. Sign in

Go to `/login` and use a demo account (created automatically on boot):

| Role | Username | Password |
|------|----------|----------|
| Technician | `tech_demo` | `TechDemo@123` |

There is no real auth wall — the login simply sets the role lens used by MANAS advisories.

---

## 2. SANSAD — Plant Dashboard (`/sansad/hub`)

SANSAD is the industrial telemetry and intelligence cockpit. Two factories are shown:
**Horizon Foundry** (hot rolling) and **Zephyr Sinter** (cold rolling), 8 assets total.

### 2.1 Hub canvas
- Each factory renders as an interactive canvas of asset **nodes**. Nodes are **draggable**, even
  when expanded.
- **System alerts** float up from the bottom of the canvas, cycling in/out of the stack; dragging a
  node does not move the alerts.
- Each node shows live **health %, RUL, risk level**, and a fault badge when tripped.

### 2.2 Diagnostics (`/sansad/hub/monitor`, `/sansad/hub/abpred`)
- Per-asset **probable fault**, health, RUL, anomaly score, and live sensor readings vs
  normal / alert / trip bands.
- **RCA insight** and **defect insight** buttons open MANAS-generated explanations grounded in the
  asset's telemetry and history.

### 2.3 Risk & Priority
- Assets ranked by **bottleneck score**.
- **Predictive cost analysis** panel: *"Predicted loss if no action ₹X L"* vs *"Savings with
  predictive maintenance ₹Y L"*, net benefit, and recommended timing.
- Click **"How?"** on any cost figure for a MANAS explainer that shows the **actual formula and
  inputs** (downtime hours, hourly loss, failure probability, recovery fraction) — no black boxes.

### 2.4 Action Plans (`/sansad/hub/actions`)
- AI-generated maintenance plan per asset: immediate actions, root cause, optimized plan summary.
- **Spares table** with five columns: Part · Required Qty · In Stock (qty / reorder level) ·
  Lead time · **Decision** (order vs in-stock).
- **Regenerate** rebuilds the plan with a fresh qwen generation, replacing the stale plan.
- **Schedule work order** triggers AI **work-order generation** from live SANSAD feeds and adds a
  **"Work Order Requested"** section (title, priority, recommended actions, spare requirements,
  estimated duration, safety notes).

### 2.5 Reports & Logs (`/sansad/hub/logs`, `/sansad/hub/historical-logs`)
- Maintenance reports and alarm logs. Click a log for a MANAS **log insight**.

### 2.6 Samvidhaan (`/sansad/hub/samvidhaan`)
- Historical 90-day factory dossiers and **predictive-maintenance analytics graphs** (loss vs
  savings per factory). Includes the same cost explainer.

---

## 3. The Abnormality Toggle (live demo)

This is the headline demo — it shows reactive troubleshooting end-to-end.

1. On a diagnostics or risk page, toggle **abnormality / inject fault** on an asset (or call
   `POST /api/v1/simulate/trip/`).
2. Over the next ~90 seconds, every 5 seconds:
   - **Health crashes** (toward 14–26%), **anomaly rises** (0.85–1.0), **RUL collapses** (to a few
     hours, critical).
   - Alarms fire; the cost/risk numbers shift; diagnostics, risk, actions, reports and Samvidhaan
     all update **live** (the UI drops its poll to 5 s while a fault is active).
3. Toggle **clear** (or `POST /api/v1/simulate/trip/clear/`) — alarms are acknowledged and the asset
   **recovers** to a healthy 88–98%.

Use this to demonstrate the deterministic engine reacting instantly and the agentic layer producing
fresh diagnoses, plans and work orders.

---

## 4. MANAS — Maintenance Wizard (`/manas/chat`)

MANAS is a grounded conversational assistant for troubleshooting and maintenance reasoning.

### 4.1 Basic chat
- Type a question; the answer streams token-by-token over WebSocket.
- Multi-turn context is preserved; long sessions auto-compact.

### 4.2 Document grounding (RAG)
- Open the **document selector** and pick one or more library documents (OEM manuals, SOPs, ISO
  standards). Answers are then grounded with **[n] citations** to the source excerpts.
- *(Library docs appear once the corpus is ingested — see README, `INGEST_CORPUS_ON_START=1`.)*

### 4.3 `/sansad` — link live plant context
- Type **`/sansad`** (or use the SANSAD link control) to attach the **live plant briefing** to the
  conversation. MANAS harvests plant snapshots, alarms, events, reports, 90-day dossiers, cost and
  KPIs, summarises them, and answers plant-state questions from real data.
- Ask things like *"Which factory has the most at-risk assets and their RUL?"*, *"List assets with
  active anomalies and their health"*, or *"Summarise recent maintenance history and RCA highlights"*.
- The briefing auto-refreshes every few turns; use **update** to force a re-harvest.
- Note: Factory 1 / F1 = Horizon; Factory 2 / F2 = Zephyr.

### 4.4 Deep thinking & prompt optimizer
- Enable **deep thinking** to stream the model's reasoning channel alongside the answer.
- Use the **optimize prompt** action to refine a draft prompt before sending.
- 👍 / 👎 feedback on any answer is recorded.

---

## 5. Validated checks

```bash
docker compose exec django-backend python manage.py test_llm
docker compose exec django-backend python manage.py test_rag_pipeline
```

| Gate | What it proves |
|------|----------------|
| `test_llm` | Ollama qwen3.5 smoke |
| `test_rag_pipeline` | BGE-M3 1024-dim embeddings, reranker score, ISO 4406 exact match |

---

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| RAG / chat errors about missing model | Run `bash scripts/setup_assets.sh` before `docker compose up` (downloads BGE weights + corpus) |
| Empty MANAS answer | Models still warming on first boot — wait for `ollama-warmup` to finish; retry |
| Library doc selector empty | Corpus not ingested — set `INGEST_CORPUS_ON_START=1` and restart `django-backend` |
| First boot slow | Ollama is pulling ~7 GB of qwen weights — allow 10–20 min once |
| Node nodes / alerts not live | Confirm `ui-console` is healthy and the WebSocket to `/ws/telemetry` is connected |
