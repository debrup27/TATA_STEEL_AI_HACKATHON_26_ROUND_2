from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config("DJANGO_SECRET_KEY", default="change-me-in-production")

DEBUG = False

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",")

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "channels",
    "django_celery_beat",
    "django_celery_results",
]

LOCAL_APPS = [
    "apps.users",
    "apps.assets",
    "apps.twins",
    "apps.telemetry",
    "apps.synthetic",
    "apps.ml",
    "apps.rag",
    "apps.agents",
    "apps.consolidation",
    "apps.maintenance",
    "apps.alerts",
    "apps.reports",
    "apps.feedback",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.users.middleware.AuditLogMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

ASGI_APPLICATION = "backend.asgi.application"
WSGI_APPLICATION = "backend.wsgi.application"

# --- Database (PostgreSQL + TimescaleDB) ---
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("POSTGRES_DB", default="atal_db"),
        "USER": config("POSTGRES_USER", default="atal_user"),
        "PASSWORD": config("POSTGRES_PASSWORD", default="atal_password"),
        "HOST": config("POSTGRES_HOST", default="localhost"),
        "PORT": config("POSTGRES_PORT", default="5432"),
        "OPTIONS": {
            "options": "-c search_path=public",
        },
    }
}

# --- Redis ---
REDIS_URL = config("REDIS_URL", default="redis://localhost:6379/0")

# --- Channels ---
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    },
}

# --- Celery ---
CELERY_BROKER_URL = config("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = "django-db"
CELERY_CACHE_BACKEND = "django-cache"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TASK_ROUTES = {
    "apps.synthetic.*": {"queue": "high"},
    "apps.ml.*": {"queue": "high"},
    "apps.twins.*": {"queue": "high"},
    "apps.alerts.*": {"queue": "high"},
    "apps.consolidation.*": {"queue": "high"},
    "apps.rag.*": {"queue": "low"},
    "apps.reports.*": {"queue": "low"},
}

# --- Cache ---
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

# --- Auth ---
AUTH_USER_MODEL = "users.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "SIGNING_KEY": config("JWT_SIGNING_KEY", default=SECRET_KEY),
}

# --- CORS ---
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS", default="http://localhost:3000"
).split(",")

# --- Static ---
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- ChromaDB (embedded, no separate service) ---
CHROMA_PERSIST_DIR = config("CHROMA_PERSIST_DIR", default=str(BASE_DIR / "chroma_data"))

# --- LLM (self-hosted vLLM — no external API calls) ---
# vLLM serves Qwen 3.5 9B MTP (4-bit) on an OpenAI-compatible REST endpoint.
VLLM_BASE_URL = config("VLLM_BASE_URL", default="http://vllm:8000")
VLLM_MODEL = config("VLLM_MODEL", default="Qwen/Qwen3-9B-MTP-UD-Q4_K_M")

# --- DVC artifact root ---
DVC_ARTIFACT_ROOT = BASE_DIR / "artifacts"
MODEL_ARTIFACT_ROOT = DVC_ARTIFACT_ROOT / "models"
DATA_ARTIFACT_ROOT = DVC_ARTIFACT_ROOT / "data"
