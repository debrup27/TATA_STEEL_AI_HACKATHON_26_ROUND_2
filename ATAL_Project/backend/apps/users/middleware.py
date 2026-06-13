import hashlib
import json
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from apps.users.models import AuditLog


class AuditLogMiddleware:
    AUDIT_METHODS = {"POST", "PATCH", "PUT", "DELETE"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.method in self.AUDIT_METHODS and hasattr(request, "user") and request.user.is_authenticated:
            try:
                body = request.body
                payload_hash = hashlib.sha256(body).hexdigest() if body else ""
                path_parts = request.path.strip("/").split("/")
                resource_type = path_parts[2] if len(path_parts) > 2 else request.path
                resource_id = path_parts[3] if len(path_parts) > 3 else ""
                AuditLog.objects.create(
                    user=request.user,
                    action=f"{request.method} {request.path}",
                    resource_type=resource_type,
                    resource_id=resource_id,
                    request_ip=self._get_ip(request),
                    payload_hash=payload_hash,
                    outcome="success" if response.status_code < 400 else "failure",
                )
            except Exception:
                pass
        return response

    def _get_ip(self, request):
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded:
            return x_forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")


@database_sync_to_async
def _get_user_from_token(token_string):
    from apps.users.models import User
    try:
        token = AccessToken(token_string)
        return User.objects.get(id=token["user_id"])
    except (InvalidToken, TokenError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token = None
        for part in query_string.split("&"):
            if part.startswith("token="):
                token = part[6:]
                break
        if token:
            scope["user"] = await _get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
