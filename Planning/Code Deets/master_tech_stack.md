# 🛠️ Master Tech Stack Documentation: Project ATAL — Tata Steel Maintenance Wizard

This document specifies the audited, multi-tier system architecture for Project ATAL. It establishes clear separation between the **Process Layer** (industrial telemetry simulation and ML inference) and the **Cognitive Layer** (asynchronous multi-agent reasoning, RAG retrieval, and LLM orchestration).

---

## 🏗️ Architectural Core Breakdown

### 1. ⚙️ The Process Layer (Telemetry & Engine Simulation)

- **Execution Environment:** Python 3.12-slim runtimes running inside isolated, lightweight Docker containers. *(Python 3.12 is required by Django 6.0.6)*
- **Core Libraries & Validation:**
  - `numpy` (v2.4.6) & `pandas` (v3.0.3): High-performance execution of coupled physics equations, linear regressions for structural degradation, and rolling time-window averages.
  - `pydantic` (v2.13.4): Enforces strict data-validation filtering on incoming sensor inputs to catch bad readings before writing to storage layers.
- **Asynchronous Process Coordinator:**
  - `Celery` (v5.6.3): Offloads continuous state computations, cascading delay formulas, and high-volume background telemetry generation from the main web process.
  - `Redis` (v8.8.0-alpine) — Broker: Functions as the low-latency message broker feeding tasks directly to dedicated Celery background workers.
- **Storage Intersection:** Streams live processing data blocks simultaneously to Redis memory lines and inserts state changes directly into PostgreSQL via Django ORM transactional bindings.

---

### 2. 🗄️ Storage & Persistent Database Layer

- **Enterprise Core & Asset Ledger (`Django` 6.0.6 + Django REST Framework 3.17.1 + Django Channels):**
  - *Role:* Primary backend framework handling all API routing, WebSocket connections, administrative state, and configuration ledgers.
  - Django manages asset structural modeling for the 6 sequential factories (F1 to F6), user permission levels, spare parts warehouse catalogs, historical breakdown logs, and engineer troubleshooting forms.
  - `Django REST Framework (DRF)`: Exposes all REST API endpoints consumed by the Next.js frontend.
  - `Django Channels`: Implements the bidirectional WebSocket pipeline (`/ws/telemetry`) to continuously stream live machinery telemetry and multi-agent token outputs to the frontend client.
  - `Uvicorn` (ASGI server): Replaces Django's default WSGI server to enable full async support across DRF and Channels.
  - `django-celery-results` (v2.6.0): Maps background Celery task execution outcomes natively into Django-managed database views.

- **Relational Storage (`PostgreSQL` 17-alpine):**
  - *Role:* Central physical storage repository. Persists continuous relational telemetry logs written from simulation workers alongside Django's master transactional records. Supports temporal constraints to enforce historical telemetry boundaries over precise date ranges.

- **AI Vector Database & Agent Memory Node (`Weaviate` v1.30.x + `weaviate-client` v4.21.2):**
  - *Role:* High-performance vector data ecosystem used to index all unstructured documentation. Handles hybrid semantic matching and Maximum Marginal Relevance (MMR) ranking queries over engineering equipment manuals, plant-specific SOPs, and safety codes.
  - *Agentic Context:* Leverages Weaviate's native Model Context Protocol (MCP) handlers to act as a stateful long-term memory module where the Maintenance Wizard can programmatically adjust collections and store real-time learning schemas.

- **In-Memory Caching & Session Storage (`Redis` v8.8.0-alpine):**
  - *Role:* Multi-use, ultra-fast key-value memory system.
    - **Celery Broker:** Message transport layer for background task workers.
    - **Chat Session Memory:** Stores historical LLM conversation contexts and active chat windows for maintenance personnel.
    - **State Caching:** Houses real-time telemetry snapshots served instantly to frontend endpoints without querying the main database.

---

### 3. 🧠 The Cognitive Layer (Agentic Orchestration & AI Wizard)

- **Agentic Framework:** `LangGraph` (v1.2.4)
  - *Role:* Dictates deterministic multi-agent collaboration via stateful execution graphs, preventing infinite reasoning loops during live problem evaluation. Orchestrates the Diagnostic Agent, RCA Agent, RUL Predictor Agent, and Recommendation Agent as discrete, composable graph nodes. LangGraph 1.0+ is production-stable with durable state persistence — agent execution survives server restarts without losing context.

- **RAG Retrieval Engine:** `LangChain` (v1.3.2) + `weaviate-client` (v4.21.2)
  - *Embedding Strategy:* Localized vector calculations using `sentence-transformers` (v5.5.1) with model `all-MiniLM-L6-v2` to encode markdown text chunks into 384-dimensional floating-point arrays, stored and retrieved via Weaviate.

- **ML Models (Prediction & Anomaly Detection):**
  - `scikit-learn` (v1.9.0): Isolation Forest for real-time anomaly detection; baseline statistical models.
  - `XGBoost` (v3.2.0) & `LightGBM` (v4.6.0): Gradient boosting models for failure classification and risk scoring.
  - `SciPy` (v1.17.1): Statistical signal processing on sensor time-series data.

- **ML Experiment Tracking (`MLflow` v3.13.0):**
  - *Role:* Tracks all ML training runs, hyperparameter configurations, and evaluation metrics for XGBoost, LightGBM, and anomaly detection experiments. Maintains a model registry to version and promote models from experimentation to production inference cleanly.

- **Target Inference Models:**
  - *Primary API:* Anthropic `claude-sonnet-4-20250514` or OpenAI `gpt-4o` via public API.
  - *On-Premises SLM Strategy:* Localized execution via `Ollama` hosting `Llama-3-8B-Instruct` or `Phi-3-Mini` inside a GPU-passthrough container to simulate data sovereignty behind Tata Steel's firewall.

---

### 4. 💻 The Presentation Layer (Custom Control Console)

- **Framework:** `Next.js 16.2.0` with `React 19.0.0` and `TypeScript` (v5.7.3)
  - *Role:* Implements an administrative control layout designed to mirror Tata Steel's iROC (Industrial Revolution Optimization Center) operational console. Next.js 16.2 enables Turbopack compilation by default for near-instantaneous state updates and direct telemetry tracing in the UI thread.

- **Visual Engine & Styling:**
  - `TailwindCSS` (v3.4.17): Enforces sharp, high-density dashboard grid layouts and custom dark-theme control terminals.
  - `ECharts`: Powers complex industrial visualizations — equipment health heatmaps, multi-axis sensor overlays, and plant-level bottleneck maps.
  - `Recharts` (v2.15.1): Drives real-time lightweight chart rendering for continuous sensor array tracking.

- **Data Transmission Protocols:**
  - **HTTP REST:** DRF endpoints handle transactional requests — user commands, manual tool triggers, and work order submissions.
  - **WebSockets (`/ws/telemetry`):** Django Channels pipeline continuously streams live machinery parameters and multi-agent token generations to the frontend client.

---

## 📦 Containerization & Service Management

The complete system runs exclusively inside a multi-service `docker-compose.yml` layout:

| Service Name | Base Image | Internal Port | External Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `ui-console` | `node:20-alpine` | 3000 | 3000 | Next.js 16.2 frontend dashboard console |
| `django-backend` | `python:3.12-slim` | 8000 | 8000 | Django 6.0.6 + DRF 3.17.1 + Channels — API, WebSockets, agent orchestration |
| `celery-worker` | `python:3.12-slim` | — | — | Celery 5.6.3 background workers — telemetry simulation and async tasks |
| `postgres-db` | `postgres:17-alpine` | 5432 | 5432 | Persistent relational storage — telemetry logs, asset records |
| `weaviate` | `cr.weaviate.io/semitechnologies/weaviate:1.30.4` | 8080 | 8001 | Vector store — document embeddings, RAG retrieval |
| `redis` | `redis:8.8.0-alpine` | 6379 | 6379 | Celery broker + session cache + telemetry state |
| `mlflow` | `ghcr.io/mlflow/mlflow:v3.13.0` | 5000 | 5000 | ML experiment tracking and model registry |

---

## 🔒 Security & Data Sovereignty Blueprint

To align with Tata Steel's information frameworks, the stack implements 3 structural network boundaries:

1. **Isolated Task Brokers:** Redis and Celery run entirely within an internal Docker network, making async worker interactions inaccessible to external web vectors.
2. **Deterministic Tool Boundaries:** The LLM cannot directly modify data rows. It interacts with systems via strict Python tool decorators that sanitize input parameters before hitting PostgreSQL via the Django ORM.
3. **Local Vector Security:** Weaviate runs as a local container with persistent volume mounts, ensuring all technical manuals and maintenance histories remain within the deployment boundary and are never sent to external cloud services.