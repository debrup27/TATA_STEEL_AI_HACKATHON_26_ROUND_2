# Technology Stack

Everything is **self-hosted** — no external cloud LLM/API calls. The whole system runs on
one machine with one NVIDIA GPU.

## Frontend

| Tech | Version | Why |
|---|---|---|
| Next.js | 16.2 (Turbopack) | App Router, RSC, fast dev/build |
| React | 19 | UI |
| TypeScript | 5 | Type safety across the service layer |
| Tailwind CSS | v4 | Styling |
| react-markdown + remark-gfm/-math + rehype-katex | — | Chat/report rendering with KaTeX for technical notation |
| lucide-react | — | Icons |
| Jest | 30 | Unit tests (markdown normalizer, mappers, adapters, …) |

## Backend

| Tech | Version | Why |
|---|---|---|
| Django | 6.0 | Core web framework |
| Django REST Framework | — | REST API |
| Django Channels + uvicorn | — | WebSockets / ASGI streaming |
| Celery | 5.6 | Async **non-LLM** tasks (telemetry, ML inference, ingestion, backups) |
| Python | 3.12 | — |

## Data

| Tech | Version | Why |
|---|---|---|
| PostgreSQL / TimescaleDB | pg17 | Relational data + time-series telemetry hypertables |
| Redis | 8 | Celery broker/result backend + cache (regen status, prompt patch) |
| ChromaDB | embedded | Vector store for RAG (in-process in Django + Celery) |

## AI / ML

| Tech | Version | Why |
|---|---|---|
| Ollama | latest | Local LLM server (OpenAI-compatible + native `/api/chat`) |
| qwen3.5:9b | — | Agentic supervisor + MANAS chat (full tier) |
| qwen3.5:0.8b | — | Parallel workers, prompt optimisation, low-VRAM all-role model |
| LangGraph | — | Two-tier supervisor/worker orchestration graph |
| LangChain (core + ollama) | — | LLM client plumbing, guardrail runnable |
| BAAI/bge-m3 | — | 1024-dim dense embeddings (GPU) |
| BAAI/bge-reranker-v2-m3 | — | Cross-encoder reranker |
| BM25 (rank_bm25) | — | Lexical retrieval for hybrid search |
| XGBoost | — | RUL regressor + fault classifier (per asset type) |
| scikit-learn (IsolationForest) | — | Unsupervised anomaly detector |
| SHAP | — | Feature attribution for ML explainability |
| better-profanity | — | Input/output guardrail term filter |

## Runtime / infra

| Tech | Why |
|---|---|
| Docker Compose | One-command orchestration of all 9 services |
| NVIDIA Container Toolkit | GPU passthrough (declared via `deploy.resources`, not `gpus: all`, to avoid CDI issues) |
| nginx 1.27 | Reverse proxy |
| Hugging Face Hub | Model + corpus download on first boot (Xet disabled for portability) |

## Notable conventions

- **Native `/api/chat`** for all qwen calls — the OpenAI-compat `/v1` endpoint ignores
  `think=false` for thinking models and returns empty content.
- **No LLM in Celery** — every LLM path runs in a request-spawned daemon thread.
- **GPU-only** — there is no CPU fallback; the low-VRAM tier trims VRAM, not the GPU.
- **No external APIs** — qwen, BGE and all data stay on the host.
