# Project Hand-Off Summary

**Last updated:** 2026-06-14  
**Full session handoff (temp):** `/tmp/atal-handoff.md`

---

## Agent Conventions

**Rule:** `.cursor/rules/atal-docker-fish.mdc` — `fish -c "..."`, `docker compose up atal`, host tools only for git/graphify/`download_*.sh`.

**Rule:** `.cursor/rules/graphify.mdc` — graphify before Read/Grep/Glob.

---

## Current Project State (2026-06-14)

### LLM
- **Ollama** (`ollama/ollama:latest`) serving `qwen3.5:9b`
- OpenAI-compatible endpoint: `http://ollama:11434/v1/chat/completions`
- Always pass `"think": false` in payload
- Env: `ATAL_Project/backend/env/.env.gpu` → `cp .env.gpu .env` before compose up
- Test: `fish -c "docker compose exec django-backend python manage.py test_llm"` → **PASS**

### RAG Pipeline
- **Embedder:** `BAAI/bge-m3` via `FlagEmbedding.BGEM3FlagModel` (`apps/rag/embedder.py`)
- **Reranker:** `BAAI/bge-reranker-v2-m3` via raw `transformers` (`AutoModelForSequenceClassification` + `PreTrainedTokenizerFast(tokenizer_file=...)`) — no sentencepiece needed
- **Hybrid retrieval:** BM25 + dense RRF (`apps/rag/retrieval.py`)
- **Vector store:** ChromaDB embedded, `chroma-data` volume
- Test: `fish -c "docker compose exec django-backend python manage.py test_rag_pipeline"` → **ALL PASS**

| Gate | Description | Status |
|---|---|---|
| P2-042 | Ollama chat completion | ✅ |
| P2-043 | BGE-M3 1024-dim embedding | ✅ |
| P2-044 | Reranker score ≥ 0.96 | ✅ |
| P2-045 | ISO 4406 16/14/11 exact retrieval | ✅ |

---

## Canonical Structure (post-restructure, 2026-06-14)

```
TATA_STEEL_AI_HACKATHON_26_ROUND_2/
├── docker-compose.yml          ← production mounts: ./ATAL_Project/backend/models/... 
├── docker-compose.override.yml ← dev: bind ./ATAL_Project/backend:/app + env overrides
├── .env                        ← active (gitignored); copy from backend/env/.env.gpu
└── ATAL_Project/backend/
    ├── data/corpus/            ← 14 corpus files (gitignored, re-run download_corpus.sh)
    ├── env/.env.gpu            ← GPU profile template (committed)
    ├── models/bge-m3/          ← BGE weights (gitignored)
    ├── models/bge-reranker-v2-m3/
    └── scripts/                ← download_corpus.sh, download_models.sh, dev-start.sh, verify-deploy.sh
```

Root is clean — no `data/`, `models/`, `scripts/`, `.env.gpu`, `.env.test` at repo root.

---

## What Changed This Session

1. **Restructured** `data/`, `models/`, `scripts/`, `.env.gpu` from repo root → `ATAL_Project/backend/`
2. **Deleted** stale `.env.test` (had `SKIP_VLLM_WAIT=1`)
3. **Fixed** `docker-compose.override.yml` — removed old root `./models/` mounts, added `/app/models/` env overrides
4. **Fixed** `apps/rag/reranker.py` — raw transformers instead of `sentence_transformers.CrossEncoder` / `FlagEmbedding`
5. **Updated** `CLAUDE.md` — full rewrite with correct structure, quickstart, test gate table
6. **Graphify** `--update` triggered — 13 subagents processing 278 changed files (in progress at handoff time)

---

## Prior History (brief)

- Docker pip/npm timeouts → resolved
- Frontend Manas/JWT/UserPill work
- Backend NaN + logging patches
- Full RAG implementation from scratch
- vLLM → removed (GGUF `qwen35` unsupported); switched to Ollama
- BGE models downloaded; reranker compat fix (`FlagEmbedding` → `transformers`)

---

## Next Steps

1. Complete graphify update (subagents finish → merge + recluster + new `graph.json`)
2. Wire frontend mocks → real backend (WebSocket `/ws/telemetry`, SSE chat)
3. ML pipeline: `apps/ml/trainer.py`, `inference.py` stubs
4. Frontend audit fixes (see `CLAUDE.md` Known Issues)

---

## Suggested Skills

`diagnose`, `karpathy-guidelines`, `graphify`, `handoff`, `cavecrew`.
