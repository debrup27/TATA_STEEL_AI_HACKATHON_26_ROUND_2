from django.urls import re_path
from apps.telemetry.consumers import TelemetryConsumer
from apps.twins.consumers import TwinStateConsumer
from apps.alerts.consumers import AlertConsumer
from apps.agents.consumers import LLMStreamConsumer, OrchestrationConsumer

websocket_urlpatterns = [
    re_path(r"^ws/telemetry$", TelemetryConsumer.as_asgi()),
    re_path(r"^ws/twins/(?P<asset_id>[^/]+)/$", TwinStateConsumer.as_asgi()),
    re_path(r"^ws/alerts/$", AlertConsumer.as_asgi()),
    re_path(r"^ws/chat/(?P<session_id>[^/]+)/$", LLMStreamConsumer.as_asgi()),
    re_path(r"^ws/llm/(?P<session_id>[^/]+)/$", LLMStreamConsumer.as_asgi()),  # legacy alias
    re_path(r"^ws/orchestration/(?P<asset_id>[^/]+)/$", OrchestrationConsumer.as_asgi()),
]
