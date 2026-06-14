import concurrent.futures
import logging
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings.dev")

logger = logging.getLogger(__name__)


def _apply_pending_migrations() -> None:
    """Volume-mounted code + uvicorn --reload: apply new migrations on worker start."""
    from django.core.management import call_command

    call_command("migrate", "--noinput", verbosity=0)


def _run_startup_migrations() -> None:
    """
    Uvicorn --reload imports this module inside an async context; Django DB
    access must run on a sync thread. Entrypoint also runs ensure_migrations,
    but this catches new migration files after a hot reload.
    """
    import django

    django.setup()
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            pool.submit(_apply_pending_migrations).result(timeout=120)
    except Exception:
        logger.exception("asgi_startup_migrate_failed")
        raise


_run_startup_migrations()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

django_asgi_app = get_asgi_application()

from backend.routing import websocket_urlpatterns  # noqa: E402
from apps.users.middleware import JWTAuthMiddlewareStack  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns))
        ),
    }
)
