from django.urls import path
from apps.twins.views import TwinStateView, TwinHistoryView

urlpatterns = [
    path("<uuid:asset_id>/", TwinStateView.as_view()),
    path("<uuid:asset_id>/history/", TwinHistoryView.as_view()),
]
