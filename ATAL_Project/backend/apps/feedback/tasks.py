"""Celery tasks for feedback-driven prompt improvement and training data export."""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="apps.feedback.invalidate_prompt_patch", queue="default")
def invalidate_prompt_patch():
    """Invalidate the cached prompt patch after new feedback is saved."""
    from apps.feedback.algorithms import invalidate_prompt_patch_cache
    invalidate_prompt_patch_cache()
    logger.info("prompt_patch_cache_invalidated")


@shared_task(name="apps.feedback.export_training_dataset", queue="default", time_limit=300)
def export_training_dataset(days_back: int = 7, max_pairs: int = 500):
    """
    Weekly: compress last `days_back` days of conversations into a training JSONL.
    Scores and samples up to max_pairs quality pairs.
    """
    from apps.feedback.algorithms import generate_training_dataset
    try:
        path = generate_training_dataset(days_back=days_back, max_pairs=max_pairs)
        logger.info("export_training_dataset_complete path=%s", path)
        return {"status": "ok", "path": str(path)}
    except Exception as exc:
        logger.error("export_training_dataset_failed error=%s", str(exc))
        raise
