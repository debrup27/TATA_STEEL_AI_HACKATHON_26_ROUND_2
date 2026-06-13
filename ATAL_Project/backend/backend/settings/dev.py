from .base import *  # noqa

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True

# Expose TimescaleDB port for dev inspection
DATABASES["default"]["PORT"] = config("POSTGRES_PORT", default="5432")  # noqa

# Celery eager in tests (override per test if needed)
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = True

INTERNAL_IPS = ["127.0.0.1"]
