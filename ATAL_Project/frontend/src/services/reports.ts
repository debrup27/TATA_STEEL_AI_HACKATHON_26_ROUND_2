import { apiJson, apiList } from "@/lib/api";
import { mapReportListItem, type BackendReport } from "@/lib/mappers";

export interface ReportItem {
  id: string;
  code: string;
  date: string;
  asset: string;
  module: string;
  author: string;
  verdict: string;
  reportMarkdown: string;
}

export interface PlantKpis {
  proactive_maintenance_rate: number;
  avg_rul_at_intervention: number | null;
  false_alarm_rate: number;
  mean_time_to_repair_hrs: number;
  plant_health_score?: number;
  min_asset_rul_hours?: number | null;
  avg_asset_rul_hours?: number | null;
  total_alarms_30d?: number;
  period_days: number;
}

export async function fetchReports(): Promise<ReportItem[]> {
  const rows = await apiList<BackendReport>("/api/v1/reports/");
  return rows.map(mapReportListItem);
}

export async function fetchReportDetail(id: string): Promise<ReportItem | undefined> {
  const r = await apiJson<BackendReport>(`/api/v1/reports/${id}/`);
  return mapReportListItem(r);
}

export async function fetchPlantKpis(): Promise<PlantKpis> {
  return apiJson<PlantKpis>("/api/v1/plant/kpis/");
}

export async function triggerConsolidationAsync(assetId: string): Promise<{ task_id: string }> {
  return apiJson(`/api/v1/consolidate/${assetId}/async/`, { method: "POST", body: "{}" });
}

export async function fetchConsolidationResult(taskId: string) {
  return apiJson(`/api/v1/consolidate/result/${taskId}/`);
}

export async function fetchCrossStageData(assetId: string) {
  return apiJson(`/api/v1/ml/cross-stage/${assetId}/`);
}
