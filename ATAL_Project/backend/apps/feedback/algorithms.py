"""
Feedback-Driven Improvement Algorithms.

Two mechanisms:
1. IMMEDIATE — build_prompt_patch(): aggregate confirmed/corrected feedback into a
   structured addendum injected into the MANAS supervisor system prompt at inference
   time. No retraining. Redis-cached for 1 hour. Invalidated on every new feedback.

2. WEEKLY — generate_training_dataset(): compress the last 7 days of conversation
   pairs (filtered by quality signals) into a JSONL file for future fine-tuning.
   Max 500 pairs. Scored and sampled to fit memory constraints.
"""
from __future__ import annotations
import json
import logging
from datetime import timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

# ─── Constants ───────────────────────────────────────────────────────────────
_MAX_TRAINING_PAIRS = 500
_PATCH_CACHE_KEY = "feedback_prompt_patch_v1"
_PATCH_CACHE_TTL = 3600  # 1 hour


# ─── 1. Prompt Patch ─────────────────────────────────────────────────────────

def build_prompt_patch(lookback_days: int = 30) -> str:
    """
    Aggregate recent expert feedback into a structured prompt addendum.

    Reads from:
    - Feedback(feedback_type=confirm) → validated diagnosis patterns
    - Feedback(feedback_type=correct) → known correction pairs (was → should be)

    Returns a multiline string to append to the supervisor system prompt.
    Returns "" if no actionable feedback exists yet.
    """
    try:
        from django.utils import timezone
        from apps.feedback.models import Feedback

        cutoff = timezone.now() - timedelta(days=lookback_days)
        feedbacks = (
            Feedback.objects
            .filter(created_at__gte=cutoff)
            .select_related("report")
            .exclude(feedback_type="reject")
            .order_by("-created_at")[:200]
        )

        confirmations: list[str] = []
        corrections: list[str] = []

        for fb in feedbacks:
            report = fb.report
            if fb.feedback_type == "confirm" and report:
                # Expert confirmed this diagnosis as correct
                diag = (report.diagnosis or "")[:200]
                risk = report.risk_level or ""
                if diag:
                    confirmations.append(f"- [{risk}] {diag}")
            elif fb.feedback_type == "correct" and fb.corrected_values:
                # Expert provided a correction
                cv = fb.corrected_values
                original_diag = (report.diagnosis or "") if report else ""
                corrected_diag = cv.get("diagnosis", "")
                corrected_risk = cv.get("risk_level", "")
                if corrected_diag:
                    corrections.append(
                        f"- ORIGINAL: '{original_diag[:120]}' → "
                        f"CORRECTED: '{corrected_diag[:120]}'"
                        + (f" (risk: {corrected_risk})" if corrected_risk else "")
                    )

        if not confirmations and not corrections:
            return ""

        lines = [
            "\n\nCALIBRATED FROM EXPERT MAINTENANCE ENGINEER FEEDBACK:",
            "Use the patterns below to bias your diagnosis toward expert-validated conclusions.",
        ]
        if confirmations:
            lines.append("\nValidated diagnosis patterns (experts confirmed these as correct):")
            lines.extend(confirmations[:15])
        if corrections:
            lines.append("\nKnown corrections (experts corrected AI output — learn from these):")
            lines.extend(corrections[:10])

        return "\n".join(lines)

    except Exception as exc:
        logger.warning("build_prompt_patch_failed error=%s", str(exc))
        return ""


def get_cached_prompt_patch() -> str:
    """Return the prompt patch from Redis cache, recomputing if expired."""
    try:
        from django.core.cache import cache
        patch = cache.get(_PATCH_CACHE_KEY)
        if patch is None:
            patch = build_prompt_patch()
            cache.set(_PATCH_CACHE_KEY, patch, timeout=_PATCH_CACHE_TTL)
        return patch or ""
    except Exception as exc:
        logger.debug("get_cached_prompt_patch error=%s", exc)
        return ""


def invalidate_prompt_patch_cache() -> None:
    """Call after any new feedback is saved."""
    try:
        from django.core.cache import cache
        cache.delete(_PATCH_CACHE_KEY)
    except Exception:
        pass


# ─── 2. Weekly Training Dataset Generator ────────────────────────────────────

def generate_training_dataset(days_back: int = 7, max_pairs: int = _MAX_TRAINING_PAIRS) -> Path:
    """
    Compress last `days_back` days of conversation history into a training JSONL file.

    Scoring algorithm per pair:
      +3  feedback_type == "confirm"
      +2  has citations (non-empty)
      +1  assistant message length > 200 chars
      +1  contains ISO reference pattern
      -2  feedback_type == "reject"
      +0  no feedback (neutral — include if quality signals pass)

    Returns Path to the generated JSONL file.
    """
    import re
    from django.utils import timezone
    from django.conf import settings
    from apps.agents.models import ChatSession, ChatMessage
    from apps.feedback.models import Feedback
    from apps.reports.models import MaintenanceReport

    cutoff = timezone.now() - timedelta(days=days_back)
    _ISO_RE = re.compile(r"ISO\s+\d+", re.IGNORECASE)

    # Build feedback index: report_id → feedback_type, corrected_values
    feedback_index: dict = {}
    for fb in Feedback.objects.filter(created_at__gte=cutoff).select_related("report"):
        rid = str(fb.report_id)
        if rid not in feedback_index or fb.created_at > feedback_index[rid]["created_at"]:
            feedback_index[rid] = {
                "type": fb.feedback_type,
                "corrected": fb.corrected_values,
                "created_at": fb.created_at,
            }

    # Build report index for session lookup (asset context)
    report_asset: dict = {}
    for r in MaintenanceReport.objects.filter(created_at__gte=cutoff).values("id", "asset_id"):
        report_asset[str(r["id"])] = str(r["asset_id"])

    pairs: list[dict] = []

    sessions = ChatSession.objects.filter(created_at__gte=cutoff)
    for session in sessions:
        messages = list(
            ChatMessage.objects.filter(session=session)
            .order_by("timestamp")
            .values("id", "role", "content", "citations", "timestamp")
        )
        # Build user→assistant pairs
        for i, msg in enumerate(messages):
            if msg["role"] != "user":
                continue
            # Find the next assistant message
            assistant = next(
                (m for m in messages[i + 1:] if m["role"] == "assistant"), None
            )
            if not assistant:
                continue

            content = assistant["content"] or ""
            citations = assistant["citations"] or []
            if not content.strip():
                continue

            # Score
            score = 0
            score += 1 if len(content) > 200 else 0
            score += 1 if citations else 0
            score += 1 if _ISO_RE.search(content) else 0

            # Feedback signals (tie feedback to reports in same session's asset)
            fb_type = None
            corrected_values = {}
            for rid, fb in feedback_index.items():
                if report_asset.get(rid) == str(session.asset_id or ""):
                    fb_type = fb["type"]
                    corrected_values = fb["corrected"]
                    break

            if fb_type == "confirm":
                score += 3
            elif fb_type == "reject":
                score -= 2
            elif fb_type == "correct":
                score += 2

            if score < 0:
                continue  # skip rejected pairs

            # For corrected feedback, use the corrected completion
            completion = content
            if fb_type == "correct" and corrected_values.get("diagnosis"):
                completion = (
                    f"{corrected_values.get('diagnosis', content)}\n\n"
                    f"Risk level: {corrected_values.get('risk_level', '')}\n"
                    f"RCA: {corrected_values.get('rca', '')}"
                ).strip()

            pairs.append({
                "score": score,
                "prompt": msg["content"][:2000],
                "completion": completion[:4000],
                "metadata": {
                    "session_id": str(session.id),
                    "asset_id": str(session.asset_id or ""),
                    "has_citations": bool(citations),
                    "feedback_type": fb_type,
                    "timestamp": assistant["timestamp"].isoformat(),
                },
            })

    # Sort by score descending, sample top max_pairs
    pairs.sort(key=lambda p: p["score"], reverse=True)
    selected = pairs[:max_pairs]

    # Remove score from output (internal only)
    for p in selected:
        del p["score"]

    # Write to DATA_ARTIFACT_ROOT/training/YYYY-MM-DD.jsonl
    artifact_root = Path(getattr(settings, "DATA_ARTIFACT_ROOT", "/model-artifacts/data"))
    training_dir = artifact_root / "training"
    training_dir.mkdir(parents=True, exist_ok=True)

    from django.utils.timezone import now
    filename = f"{now().strftime('%Y-%m-%d')}_conversation_pairs.jsonl"
    output_path = training_dir / filename

    with open(output_path, "w", encoding="utf-8") as f:
        for p in selected:
            f.write(json.dumps(p, ensure_ascii=False) + "\n")

    logger.info(
        "training_dataset_written path=%s pairs=%d total_candidates=%d",
        output_path, len(selected), len(pairs),
    )
    return output_path
