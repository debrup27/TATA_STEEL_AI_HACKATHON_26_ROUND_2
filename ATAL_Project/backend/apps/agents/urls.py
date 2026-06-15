from django.urls import path
from apps.agents.views import (
    ChatSessionListView,
    ChatSessionDetailView,
    ChatMessageView,
    ChatWarmupView,
    ChatCompactView,
    ChatOptimizePromptView,
    ChatMessageFeedbackView,
    ChatCancelView,
)

urlpatterns = [
    path("warmup/", ChatWarmupView.as_view()),
    path("optimize-prompt/", ChatOptimizePromptView.as_view()),
    path("messages/<uuid:message_id>/feedback/", ChatMessageFeedbackView.as_view()),
    path("sessions/", ChatSessionListView.as_view()),
    path("sessions/<uuid:session_id>/", ChatSessionDetailView.as_view()),
    path("sessions/<uuid:session_id>/cancel/", ChatCancelView.as_view()),
    path("sessions/<uuid:session_id>/message/", ChatMessageView.as_view()),
    path("sessions/<uuid:session_id>/compact/", ChatCompactView.as_view()),
]
