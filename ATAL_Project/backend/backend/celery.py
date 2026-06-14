import os
from celery import Celery
from celery.signals import task_prerun, worker_process_init

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings.dev")

app = Celery("atal")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@worker_process_init.connect
def reset_connections_after_fork(**kwargs):
    """
    Close ALL inherited connections after ForkPool creates a worker subprocess.
    Handles: PostgreSQL, Redis (channel layer + cache + broker), ChromaDB.
    Without this, forked workers inherit file descriptors from the parent and
    deadlock on their first DB or cache access.
    """
    # Django DB connections
    from django.db import connections
    for conn in connections.all():
        conn.close()

    # Django cache (Redis)
    try:
        from django.core.cache import caches
        for alias in caches:
            try:
                caches[alias].close()
            except Exception:
                pass
    except Exception:
        pass

    # ChromaDB client — reset the singleton so the worker gets its own client
    try:
        import apps.rag.chroma_client as cc
        cc._client = None
    except Exception:
        pass


@task_prerun.connect
def close_old_db_connections(task_id, task, args, kwargs, **extras):
    """Ensure each task starts with a fresh DB connection."""
    from django.db import close_old_connections
    close_old_connections()
