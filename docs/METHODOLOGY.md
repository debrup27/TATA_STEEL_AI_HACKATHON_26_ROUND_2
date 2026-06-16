# Methodology & Design Decisions

This document explains the *why* behind ATAL's architecture — the trade-offs a reviewer
will want to see reasoned about.

## 1. Deterministic engine as the source of truth

**Decision:** health, RUL, anomaly and fault are computed by a deterministic,
physics-grounded engine — not by an ML model.

**Why:** a maintenance decision-support tool must be *consistent, explainable and never
wrong-by-surprise*. Early prototypes that let an XGBoost model drive `twin.health_score`
produced contradictory, sometimes NaN outputs that poisoned every downstream page. A
bounded deterministic function (sensor-stress + campaign-age + alarms + criticality) is
fast, traceable to inputs, and impossible to break. ML accuracy is a nice-to-have;
sane explainable numbers are a must-have. So we inverted the usual hierarchy.

**Trade-off:** we don't headline a fancy model. We mitigate by keeping the trained models
as a **sanity-gated** refinement (used only when fresh, plausible and anomaly-consistent),
so good ML helps and bad ML is harmless.

## 2. No LLM in Celery

**Decision:** every LLM call runs in a request-spawned daemon thread, never a Celery task.

**Why:** LLM inference inside the Celery worker (threads pool + GPU contention) deadlocked
and crashed in practice. Threads tied to the request give predictable lifecycle, clean
cancellation and DB-connection release. Celery still does what it's good at — deterministic,
IO-bound, retryable work (telemetry, ML inference, ingestion, backups).

## 3. Two-tier agentic graph with a deterministic floor

**Decision:** a 9b supervisor dispatches whitelisted tools and 0.8b workers; the aggregator
falls back to the deterministic engine if the LLM doesn't converge.

**Why:** this is the "Agentic AI Challenge" centrepiece, but LLMs loop or hallucinate. We
make it robust: tools are whitelisted + audit-logged (explainability), the real `asset_id`
is forced (no hallucinated targets), and a non-empty `DecisionOutput` is *guaranteed* by the
deterministic fallback. The agentic layer adds reasoning and narrative; it can never leave
the operator with a blank report.

## 4. Full vs low-VRAM tiers, no CPU mode

**Decision:** one flag (`ATAL_LOW_VRAM`) collapses every role to the 0.8b model for small
GPUs; there is no CPU path.

**Why:** the stack is GPU-only by design (BGE + qwen on CUDA). Rather than a slow,
half-working CPU mode, we offer a genuine small-GPU tier that keeps the deterministic engine
(and thus dashboard correctness) identical and only trims narrative richness.

## 5. Self-hosted, no external APIs

**Decision:** qwen3.5 and BGE run locally; nothing leaves the host at inference time.

**Why:** industrial data sensitivity + the requirement to run without cloud dependencies.
It also makes the demo reproducible offline after first-boot downloads.

## 6. Hybrid RAG with reranking

**Decision:** dense (BGE-M3) + BM25 lexical, fused and reranked by a cross-encoder.

**Why:** dense retrieval misses exact codes (ISO 4406, part numbers); BM25 catches them;
the cross-encoder reranker fixes ordering. Together they give grounded, citeable answers —
satisfying the "explainable, traceable" requirement.

## 7. Feedback loop

**Decision:** thumbs up/down updates an EWMA style-trait vector appended to the prompt.

**Why:** the problem statement asks for feedback-driven improvement. A lightweight,
per-user style adaptation is honest (it really changes behaviour), cheap, and avoids the
cost/instability of online fine-tuning during a demo. (Domain fine-tuning of qwen is a
documented future step.)

## 8. Resilience details that matter

- Native `/api/chat` (not `/v1`) so qwen thinking models return content, not empty bodies.
- Auto-download of BGE + corpus on first boot (chown + HF-Xet-disable for portability).
- GPU via `deploy.resources` (not `gpus: all`) to avoid the Docker CDI failure on some
  hosts.
- Inactivity-timer re-arming so compaction/RAG never flash a false chat error.
- Conservative markdown normalizer so technical notation renders cleanly, not as broken
  italic math.
