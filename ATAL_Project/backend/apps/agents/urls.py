from django.urls import path
from apps.agents.views import ChatSessionListView, ChatSessionDetailView, ChatMessageView

urlpatterns = [
    path("sessions/", ChatSessionListView.as_view()),
    path("sessions/<uuid:session_id>/", ChatSessionDetailView.as_view()),
    path("sessions/<uuid:session_id>/message/", ChatMessageView.as_view()),
]
