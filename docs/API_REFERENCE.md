# API Reference

Base URL: `http://localhost:8000` (direct) or `http://localhost/` (via nginx).
All API routes are under `/api/v1/`. Auth is JWT (bearer token); demo login
`tech_demo` / `TechDemo@123`. WebSockets are under `/ws/`.

> This is a functional map grouped by domain. Request/response shapes are defined by the
> DRF serializers in each app; the frontend `src/services/*` modules are the canonical
> typed clients.

## Health
| Method | Path | Purpose |
|---|---|---|
| GET | `/health/` | Liveness |
| GET | `/health/ready/` | Readiness (DB, migrations, seed complete) |

## Auth & users — `/api/v1/auth/`, `/api/v1/admin/`
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/token/` | Obtain JWT access/refresh |
| POST | `/auth/token/refresh/` | Refresh access token |
| GET | `/admin/users/` | (admin) user management |

## Assets, factories, sensors, spares
| Method | Path | Purpose |
|---|---|---|
| GET | `/factories/` | List factories (Horizon, Zephyr) with aggregated health |
| GET | `/assets/` | List assets |
| GET | `/assets/<id>/` | Asset detail |
| GET | `/sensors/...` | Sensor definitions / envelopes |
| GET | `/spares/...` | Spare parts catalog, stock, lead time |
| GET | `/glossary/...` | Equipment/term glossary |

## Twins & telemetry
| Method | Path | Purpose |
|---|---|---|
| GET | `/twins/...` | Asset twin state (health, RUL, anomaly snapshot) |
| GET | `/telemetry/...` | Telemetry cells / windows |
| POST | `/telemetry/...` | Threshold evaluation triggers |

## Diagnostics & prediction — `/api/v1/diagnostics/`
| Method | Path | Purpose |
|---|---|---|
| GET | `/diagnostics/` | Plant-wide diagnostic snapshot (per-asset health/RUL/fault) |
| GET | `/diagnostics/<asset_id>/` | Single-asset diagnostic (RCA, root causes, sensors) |
| POST | `/diagnostics/<asset_id>/refresh/` | Recompute ML (Celery) + agentic consolidation (background thread) |
| POST | `/diagnostics/<asset_id>/rca-insight/` | Inline RCA overview insight (LLM) |
| POST | `/diagnostics/<asset_id>/defect-insight/` | Defect-correlation insight (LLM) |

## ML — `/api/v1/ml/`
| Method | Path | Purpose |
|---|---|---|
| POST | `/ml/<asset_id>/<model_type>/predict/async/` | Queue inference |
| POST | `/ml/<asset_id>/<model_type>/retrain/` | Queue dataset build + retrain |
| GET | `/ml/cross-stage/<asset_id>/` | Cross-stage defect propagation |

## Consolidation & agentic — `/api/v1/consolidate/`
| Method | Path | Purpose |
|---|---|---|
| POST | `/consolidate/<asset_id>/` | Synchronous two-tier agentic orchestration → DecisionOutput |

> The former async/result consolidation endpoints were removed — the agentic graph runs
> inline (in a request thread), never in Celery.

## Plant-level — `/api/v1/plant/`
| Method | Path | Purpose |
|---|---|---|
| GET | `/plant/kpis/` | Proactive rate, avg RUL at intervention, false-alarm rate, MTTR, plant health |
| GET | `/plant/cost-analysis/` | Factory predictive loss-if-no-action vs PdM savings (₹ lakhs) + methodology |
| POST | `/plant/bottleneck-score/` | Ranked plant bottlenecks (criticality, delay, spares, lead time) |
| POST | `/plant/bottleneck-insight/<asset_id>/` | Inline bottleneck/risk insight (LLM) |

## Risk — served via `/plant/bottleneck-score/` and mapped client-side to the Risk & Priority page.

## Maintenance — `/api/v1/maintenance/`
| Method | Path | Purpose |
|---|---|---|
| GET | `/maintenance/action-plans/` | List asset action plans |
| GET | `/maintenance/action-plans/<asset_id>/` | Single plan (immediate actions, spares w/ stock + order decision) |
| POST | `/maintenance/action-plans/<asset_id>/regenerate/` | Regenerate plan (inline LLM, refetch after) |
| GET | `/maintenance/action-plans/regeneration-status/` | Redis-backed regen status (stale-guarded) |
| POST | `/maintenance/work-orders/<asset_id>/generate/` | Generate a work/maintenance order (LLM, from SANSAD feeds) |
| POST | `/maintenance/fault-messages/` | Ingest equipment fault/error message |
| POST | `/maintenance/failure-reports/` | Ingest failure analysis report |

## Reports — `/api/v1/reports/`
| Method | Path | Purpose |
|---|---|---|
| GET | `/reports/...` | Intelligence reports, abnormal-alert reports, decision summaries, digital logbook |

## Alerts & notifications — `/api/v1/alerts/`, `/api/v1/notifications/`
| Method | Path | Purpose |
|---|---|---|
| GET | `/alerts/...` | Alarm events / abnormal-alert reports |
| GET | `/notifications/...` | User-specific notifications |

## RAG — `/api/v1/rag/`
| Method | Path | Purpose |
|---|---|---|
| GET | `/rag/...` | List library documents / collections |
| POST | `/rag/...` | Upload + ingest a document (Celery) |

## MANAS chat — `/api/v1/chat/`
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/chat/sessions/` | List / create chat sessions |
| GET/DELETE | `/chat/sessions/<id>/` | Session detail / delete |
| POST | `/chat/sessions/<id>/message/` | Send a message (spawns streaming thread; tokens via WS) |
| POST | `/chat/sessions/<id>/cancel/` | Cancel in-flight generation |
| POST | `/chat/sessions/<id>/compact/` | Manual context compaction |
| POST | `/chat/sessions/<id>/sansad-mode/activate/` `…/deactivate/` `…/update/` | Live-plant context linking |
| POST | `/chat/warmup/` | Pre-load Ollama + RAG models |
| POST | `/chat/optimize-prompt/` | 0.8b prompt rewrite |
| POST | `/chat/messages/<id>/feedback/` | Thumbs up/down → personality learning |

## Feedback & simulation
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/feedback/...` | Feedback-driven improvement; invalidates cached prompt patch |
| POST | `/api/v1/simulate/...` | Abnormality toggle + scenario simulation |
| GET | `/api/v1/samvidhaan/...` | Constitutional/history graph data |

## WebSockets
| Channel | Purpose |
|---|---|
| `/ws/chat/<session_id>/` | MANAS token/think/phase/citations/compacting/done stream |
| `/ws/orchestration/<asset_id>/` | Agentic step / tool.call / tool.result / decision.done events |
