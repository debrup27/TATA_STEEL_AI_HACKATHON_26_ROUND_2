from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.assets.models import Asset, Factory
from apps.assets.samvidhaan_service import (
    HISTORICAL_TITLE,
    build_asset_live_graph,
    build_samvidhaan_graphs_payload,
    upsert_historical_factory_report,
)
from apps.reports.models import MaintenanceReport
from apps.reports.serializers import ReportListSerializer


class SamvidhaanGraphsView(APIView):
    """GET /api/v1/samvidhaan/graphs/ — factory maintenance snapshots (F1 + F2)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        asset_id = request.query_params.get("asset_id")
        if asset_id:
            asset = get_object_or_404(Asset.objects.select_related("factory"), pk=asset_id)
            return Response(build_asset_live_graph(asset))
        return Response(build_samvidhaan_graphs_payload())


class SamvidhaanHistoricalReportsView(APIView):
    """GET /api/v1/samvidhaan/historical-reports/ — 2 factory dossiers."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = (
            MaintenanceReport.objects.select_related("asset", "asset__factory")
            .filter(title__startswith="Historical Plant Dossier —")
            .order_by("asset__factory__name", "-created_at")
        )
        # One per factory (latest)
        seen = set()
        unique = []
        for r in rows:
            fname = r.asset.factory.name
            if fname in seen:
                continue
            seen.add(fname)
            unique.append(r)
        return Response({
            "reports": ReportListSerializer(unique, many=True).data,
            "count": len(unique),
        })


class SamvidhaanSeedHistoricalView(APIView):
    """POST — regenerate historical factory dossiers (idempotent)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        created = []
        for factory in Factory.objects.all():
            report = upsert_historical_factory_report(factory)
            created.append({
                "factory": factory.name,
                "report_id": str(report.id),
                "title": report.title,
            })
        return Response({"generated": created, "count": len(created)})
