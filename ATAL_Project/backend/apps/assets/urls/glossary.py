from django.urls import path
from apps.assets.glossary_views import GlossaryView

urlpatterns = [
  path("", GlossaryView.as_view()),
]
