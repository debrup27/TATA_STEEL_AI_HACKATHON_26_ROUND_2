# Project Structure

```
TATA_STEEL_AI_HACKATHON_26_ROUND_2/
├── README.md                       ← overview + setup (full + low-VRAM)
├── INSTRUCTIONS_TO_RUN.md          ← step-by-step run guide
├── TROUBLESHOOTING.md              ← GPU/CDI, low-VRAM, assets, ports, resets
├── docker-compose.yml              ← full-tier stack (9 services, GPU via deploy.resources)
├── docker-compose.low.yml          ← low-VRAM override (0.8b serves all roles)
├── docs/                           ← this documentation set
│   ├── README.md                   ← doc index
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── API_REFERENCE.md
│   ├── USER_GUIDE.md
│   ├── BACKEND_GUIDE.md
│   ├── FRONTEND_GUIDE.md
│   ├── PROJECT_STRUCTURE.md
│   ├── METHODOLOGY.md
│   └── deliverables/               ← problem-statement §9 deliverables
│       ├── DATA_AND_SYSTEM_FLOW.md
│       ├── MODEL_DESIGN.md
│       ├── ALERTING_AND_PREDICTION_LOGIC.md
│       ├── EQUIPMENT_PHYSICS.md
│       ├── ASSUMPTIONS_AND_LIMITATIONS.md
│       └── SAMPLE_IO.md
├── snapshots/                      ← UI screenshots
├── scripts/
│   ├── setup_assets.sh             ← one-time host download of BGE + corpus (optional)
│   ├── doctor.sh                   ← environment diagnostics + fixes
│   ├── ci_checks.sh                ← jest + orchestration smoke gate
│   └── create_submission_zip.sh    ← build the submission ZIP
└── ATAL_Project/
    ├── frontend/                   ← Next.js 16.2 app
    │   └── src/
    │       ├── app/                ← routes: /, /login, /sansad/*, /manas/chat
    │       ├── services/           ← typed API clients
    │       ├── hooks/              ← useChatStream, usePlantSnapshot, …
    │       ├── components/         ← shared UI + ai-components (markdown/citations)
    │       └── lib/                ← markdown-stream, mappers, ws, api
    └── backend/                    ← Django 6 + Celery + RAG + ML
        ├── backend/                ← settings (base/dev/prod), urls, asgi, celery
        ├── apps/                   ← assets, twins, telemetry, synthetic, ml, agents,
        │                             consolidation, maintenance, reports, alerts, rag,
        │                             feedback, users
        ├── data/corpus/            ← RAG corpus (auto-downloaded on first boot)
        ├── models/                 ← BGE weights (auto-downloaded; gitignored)
        ├── docker/                 ← Dockerfile + entrypoint.sh (boot pipeline)
        └── scripts/                ← download_models.sh, download_corpus.sh, warmup, verify
```

## What ships in the submission ZIP

Everything above **except**: secrets (`.env*`), BGE model weights, Ollama weights,
`node_modules`, `.next`, `__pycache__`, internal planning dirs. The **RAG corpus is
included** so it can be seeded at runtime; BGE + Ollama weights auto-download on first boot.
