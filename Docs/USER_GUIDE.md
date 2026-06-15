# ATAL User Guide

A practical guide for maintenance engineers, supervisors, and demo reviewers using **SANSAD** (plant intelligence) and **MANAS** (conversational maintenance wizard).

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [SANSAD Overview](#2-sansad-overview)
3. [Hub Monitoring](#3-hub-monitoring)
4. [Factory Pipelines](#4-factory-pipelines)
5. [Samvidhaan Command Center](#5-samvidhaan-command-center)
6. [Intelligence Pillars (§5.1–§5.4)](#6-intelligence-pillars-5154)
7. [MANAS Chat](#7-manas-chat)
8. [Roles and Permissions](#8-roles-and-permissions)
9. [Anomaly Simulation (Demo)](#9-anomaly-simulation-demo)
10. [Tips and Troubleshooting](#10-tips-and-troubleshooting)

---

## 1. Getting Started

### 1.1 Access the application

1. Start the stack (see [README.md](./README.md#quick-start)).
2. Open **http://localhost:3000** (or **http://localhost** via nginx).
3. Use the top pill navigation: **Home** · **ATAL Sansad** · **ATAL Manas**.

### 1.2 Log in

1. Go to **/login**.
2. Sign in with a demo account:

| Account | Password | Best for |
|---------|----------|----------|
| `tech_demo` | `TechDemo@123` | Day-to-day troubleshooting, MANAS chat |
| `supervisor_demo` | `SuperDemo@123` | Action plans, work orders, reports |
| `admin_demo` | `AdminDemo@123` | Admin features, ML retrain, RAG ingest |

3. On success you are redirected to the home page. Your session uses JWT tokens stored in the browser (`atal_access`, `atal_refresh`).

> **Note:** The landing-page MANAS demo (home page and `/manas`) is a **preview only**. It replies with a login prompt. Full chat requires **/manas/chat** after authentication.

### 1.3 What you can do without login

- Browse marketing pages (`/`, `/sansad`, `/manas`).
- View the home-page SANSAD/MANAS preview widgets.
- Some hub pages may show limited data or auth prompts for live logs.

Most live telemetry, chat sessions, and intelligence APIs require JWT authentication.

---

## 2. SANSAD Overview

**SANSAD** (Steel Analytics & Notification Agent Dashboard) is the plant orchestration layer. It combines:

- Live sensor telemetry and digital twin health scores
- ML predictions (RUL, anomaly score, fault classification)
- Structured outputs aligned with the hackathon problem statement §5
- Optional MANAS inline insights on diagnostics and risk pages

### Navigation map

```
/sansad                    Marketing landing
/sansad/hub                Main monitoring grid
/sansad/hub/horizon-foundry   Factory F1 — hot rolling canvas
/sansad/hub/zephyr-sinter     Factory F2 — cold rolling canvas
/sansad/hub/samvidhaan        Plant command center + workflow graph
/sansad/hub/diagnostics       §5.1 Diagnostics & Prediction
/sansad/hub/risk              §5.2 Risk & Priority
/sansad/hub/actions           §5.3 Maintenance Actions
/sansad/hub/reports           §5.4 Intelligence Reports
/sansad/hub/logs              Full system log console
/sansad/hub/samvidhaan/graphs Predictive maintenance cost charts
/sansad/hub/samvidhaan/legend Glossary with MANAS deep-links
/sansad/hub/samvidhaan/reports  Historical factory dossiers
```

Legacy URLs redirect automatically (e.g. `/hub/monitor` → `/hub/diagnostics`).

---

## 3. Hub Monitoring

**Route:** `/sansad/hub`

The hub is your entry point to the simulated plant.

### Layout (desktop)

| Column | Content |
|--------|---------|
| **Left** | **Horizon Foundry** (F1 hot rolling) + **Samvidhaan** entry |
| **Center** | **Zephyr Sinter** (F2 cold rolling) + Diagnostics/Risk shortcuts |
| **Right** | Live **system log stream** + Actions/Reports shortcuts |

### What to watch

- **Notification tickers** — scrolling alerts, RUL highlights, orchestration status (from `/api/v1/notifications/feed/`).
- **System log stream** — maintenance events, threshold breaches, agent activity. Click **expand** for `/sansad/hub/logs`.
- **Anomaly trip control** (top bar) — inject or clear a simulated abnormality on selected equipment (see [§9](#9-anomaly-simulation-demo)).

### Factory descriptions (canonical)

- **Horizon Foundry (F1):** Hot rolling — slab reheating (SRF), high-pressure descaling (HHPD), finishing stands (FS), hydraulic AGC (HAGCC).
- **Zephyr Sinter (F2):** Cold rolling & coating — acid pickling (APT), tandem cold mill (TCMS), continuous galvanizing (CGP), high-pressure air knives (HPAK).

---

## 4. Factory Pipelines

**Routes:** `/sansad/hub/horizon-foundry`, `/sansad/hub/zephyr-sinter`

Each factory page shows an interactive **NodeWorkflow** canvas:

- Nodes represent the four assets in that factory's production sequence.
- **Health score**, **RUL**, sensors, and status colors update from the plant snapshot API and WebSocket telemetry.
- Click a node for detail panels, sensor pills, and links to diagnostics.
- Alerts may appear as floating workflow notifications when thresholds are breached.

### Live data sources

| Source | Updates |
|--------|---------|
| `GET /api/v1/plant/snapshot/` | Unified asset health, sensors, anomaly flags |
| `WS /ws/telemetry` | Real-time cell updates on the canvas |
| `GET /api/v1/diagnostics/{asset_id}/` | Deep diagnostic payload per asset |

---

## 5. Samvidhaan Command Center

**Route:** `/sansad/hub/samvidhaan`

Samvidhaan is the **agentic concierge** hub — a draggable node graph connecting:

- **F1 Horizon** and **F2 Zephyr** factory nodes
- **Samvidhaan** orchestration center
- **MANAS** chat entry

### Features

- **Plant KPIs** — health score and average RUL in the ticker bar.
- **Factory modals** — click F1/F2 nodes for live KPI cards (vibration, RUL, pressure, pot temperature, etc.).
- **Sub-pages:**
  - **Graphs** — F1 vs F2 predictive cost analysis (loss if no action vs Predictive Maintenance savings).
  - **Legend** — searchable glossary; terms link to MANAS with pre-filled questions.
  - **Reports** — 90-day historical factory dossiers used as MANAS context.

---

## 6. Intelligence Pillars (§5.1–§5.4)

These four pages map directly to hackathon **Expected Outputs §5**.

### 6.1 Diagnostics & Prediction — `/sansad/hub/diagnostics`

**Purpose:** Fault diagnosis, RCA, RUL, early warnings, process defect links.

| UI element | Backend |
|------------|---------|
| Asset list with health/RUL | `GET /api/v1/diagnostics/` |
| Selected asset detail | `GET /api/v1/diagnostics/{id}/` |
| Refresh ML consolidation | `POST /api/v1/diagnostics/{id}/refresh/` |
| **Ask MANAS** — RCA insight | `POST .../rca-insight/` |
| **Ask MANAS** — defect correlation | `POST .../defect-insight/` |
| Predictive cost panel | `GET /api/v1/plant/cost-analysis/` |

**Typical workflow:**
1. Select the lowest-health asset from the list.
2. Review probable fault, root causes, sensor envelopes, and RUL.
3. Click **Ask MANAS** for an LLM narrative on RCA or cross-stage defects.
4. Open **MANAS Chat** from the hub shell for follow-up questions.

### 6.2 Risk & Priority — `/sansad/hub/risk`

**Purpose:** Risk classification, urgency scoring, bottleneck ranking, spares.

| UI element | Backend |
|------------|---------|
| Ranked risk table | Plant bottleneck + risk APIs |
| **Ask MANAS** risk insight | `POST /api/v1/plant/bottleneck-score/{id}/insight/` |
| Cost analysis | `GET /api/v1/plant/cost-analysis/` |

Urgency combines process criticality, delay severity, spares availability, and procurement lead time.

### 6.3 Maintenance Actions — `/sansad/hub/actions`

**Purpose:** Immediate steps, monitoring plans, optimized schedules, work orders.

| Action | Description |
|--------|-------------|
| View action plans | Per-asset plans with immediate actions, steps, spares, monitoring |
| **Regenerate plan** | Triggers fresh intelligence report + LLM polish (`POST .../regenerate/`) |
| **Generate work order** | MANAS-drafted work order from live condition (`POST .../work-orders/{id}/generate/`) |

Plans show risk level, structured steps with safety notes, and spares with stock/lead-time decisions.

### 6.4 Intelligence Reports — `/sansad/hub/reports`

**Purpose:** Maintenance reports, abnormal alerts, decision summaries, logbook entries.

- Filter and open reports generated by the consolidation/intelligence pipeline.
- Submit **feedback** (confirm / correct / reject) to improve future recommendations.
- Trigger **alert reports** from active alarms.

---

## 7. MANAS Chat

**Route:** `/manas/chat` (requires login)

MANAS is the conversational Maintenance Wizard grounded in plant data and document RAG.

### 7.1 Workspace layout

| Area | Function |
|------|----------|
| **Left sidebar** | Session list — create, switch, delete conversations |
| **Center** | Message thread with streaming assistant replies |
| **Right context panel** | Citations, reasoning (deep thinking), selected RAG docs |
| **Input bar** | Prompt, slash commands, role selector, attachments |

### 7.2 Starting a session

1. Open `/manas/chat` — a new session is created or select an existing one.
2. Optionally open the **RAG document selector** to attach OEM manuals, SOPs, ISO standards from the plant library.
3. Type a maintenance question and send.

### 7.3 Slash commands

Type `/` in the input to see commands, e.g.:

- **`/optimize`** — sharpen your draft into a focused maintenance question (calls backend prompt optimizer).

### 7.4 MANAS modes

| Mode | Effect |
|------|--------|
| **Role** (Technician / Supervisor / Reliability Engineer) | Tailors system prompt via 0.8b advisory worker before 9b answer |
| **Advice mode** | Runs role advisory workers for dual-lens guidance |
| **Deep thinking** | Streams private reasoning tokens before the visible answer |
| **RAG documents** | Grounds answers in selected corpus + optional PDF uploads |

### 7.5 Message feedback

Thumbs up/down on assistant messages feeds preference learning (`POST /api/v1/chat/messages/{id}/feedback/`).

### 7.6 Deep links from SANSAD

- Glossary legend → MANAS with pre-filled prompt (`/manas/chat?...`).
- Diagnostics/Risk **Ask MANAS** → inline insight cards (separate from full chat sessions).
- Hub shell always links to **Manas Chat** in the header.

### 7.7 How streaming works

1. You send a message → `POST /api/v1/chat/sessions/{id}/message/` (202 Accepted).
2. Backend runs RAG retrieval + Ollama generation (Celery or inline thread).
3. Tokens stream over **WebSocket** `ws/chat/{session_id}/?token=...`.
4. Citations and reasoning events appear in the context panel as they arrive.

---

## 8. Roles and Permissions

| Role | Typical access |
|------|----------------|
| **Technician** | View diagnostics, chat, acknowledge alerts |
| **Supervisor** | + Create maintenance events, broader report actions |
| **Admin** | + ML retrain, RAG ingest, user/org admin APIs |

JWT claims include `role` and `username`. The UI shows a user pill; some admin APIs are not exposed in the frontend.

---

## 9. Anomaly Simulation (Demo)

For hackathon demos, you can **inject a simulated abnormality** without waiting for natural degradation.

1. On any hub page, find **Generate Abnormality** in the top bar (`AnomalyTripControl`).
2. Select equipment from the dropdown (defaults to worst-health or descaler).
3. Click **Generate Abnormality** — backend injects fault via `POST /api/v1/simulate/trip/`.
4. Watch health scores, logs, and diagnostics update within seconds (rapid polling activates).
5. Click **Stop Abnormality** to clear via `POST /api/v1/simulate/trip/clear/`.

Use this to demonstrate early warning, risk escalation, and MANAS troubleshooting in a controlled way.

---

## 10. Tips and Troubleshooting

### Backend not ready

On first boot, the UI may show a **startup splash** while Django ingests corpus, trains ML stubs, and warms Ollama. Wait for `GET /health/ready/` to return 200.

### Empty MANAS responses

- Ensure Ollama is running: `docker compose logs ollama --tail=20`
- Run `python manage.py test_llm` inside `django-backend`
- Try disabling deep thinking if the model returns empty content after reasoning

### RAG citations missing

- Select documents in the RAG selector before asking
- Verify Chroma collections: `python manage.py test_rag_pipeline`
- Re-ingest: set `INGEST_CORPUS_ON_START=1` and restart backend

### Logs show "Sign in required"

Open `/login`, authenticate, then return to `/sansad/hub/logs`.

### Session URL

MANAS chat URLs support optional session IDs: `/manas/chat/{sessionId}/` for bookmarking and back/forward navigation.

---

## Quick Reference — Demo Script (5 minutes)

1. **Login** as `tech_demo` → open **SANSAD Hub**.
2. **Generate Abnormality** on High-Pressure Descaler → show log stream + health drop.
3. Open **Diagnostics** → select affected asset → **Ask MANAS** for RCA.
4. Open **Risk** → show urgency ranking and cost analysis.
5. Open **Actions** → regenerate plan → generate work order.
6. Switch to **MANAS Chat** → attach HAGCC manual → ask ISO 4406 cleanliness question with citations.
7. Open **Samvidhaan → Graphs** → show F1 vs F2 predictive cost chart.

---

*For API details see [API_DOCS.md](./API_DOCS.md). For architecture see [Custom_docs.md](./Custom_docs.md).*
