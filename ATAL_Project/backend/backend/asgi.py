import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings.dev")


def _apply_pending_migrations() -> None:
    """Volume-mounted code + uvicorn --reload: apply new migrations on worker start."""
    import django
    from django.core.management import call_command

    django.setup()
    call_command("migrate", "--noinput", verbosity=0)


_apply_pending_migrations()

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
