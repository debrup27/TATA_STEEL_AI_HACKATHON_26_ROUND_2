from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.assets.glossary_data import GLOSSARY_ENTRIES


class GlossaryView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    category = request.query_params.get("category")
    q = (request.query_params.get("q") or "").strip().lower()
    entries = GLOSSARY_ENTRIES
    if category:
      entries = [e for e in entries if e.get("category", "").lower() == category.lower()]
    if q:
      entries = [
        e for e in entries
        if q in e.get("term", "").lower()
        or q in e.get("shortForm", "").lower()
        or q in e.get("definition", "").lower()
      ]
    categories = sorted({e.get("category", "General") for e in GLOSSARY_ENTRIES})
    return Response({"entries": entries, "categories": categories, "count": len(entries)})
