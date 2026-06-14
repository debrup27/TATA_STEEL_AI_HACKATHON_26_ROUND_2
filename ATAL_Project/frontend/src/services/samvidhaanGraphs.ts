import { apiJson } from "@/lib/api";
import { mapReportListItem, type BackendReport } from "@/lib/mappers";

export const SAMVIDHAAN_GRAPH_REFRESH_MS = 10 * 60 * 1000;

export interface MaintenanceAssetRow {
  asset_id: string;
  asset_name: string;
  asset_type: string;
  criticality_level: string;
  health_score: number;
  rul_hours: number;
  rul_days: number;
  rul_max_hours: number;
  rul_band: "urgent" | "soon" | "ok";
  risk_level: string;
  urgency_score: number;
  anomaly_score?: number;
  spares_availability?: number;
  action_label: string;
  plain_explanation: string;
}

export interface FactoryMaintenanceSnapshot {
  factory_id: string;
  factory_name: string;
  factory_code: string;
  factory_label: string;
  plant_health_score: number;
  avg_rul_hours: number;
  assets_needing_attention: number;
  assets: MaintenanceAssetRow[];
  layman_summary?: string;
}

export interface SamvidhaanGraphsPayload {
  refresh_interval_seconds: number;
  updated_at: string;
  sim_max_rul_hours?: number;
  factories: FactoryMaintenanceSnapshot[];
}

export async function fetchSamvidhaanGraphs(): Promise<SamvidhaanGraphsPayload> {
  return apiJson<SamvidhaanGraphsPayload>("/api/v1/samvidhaan/graphs/");
}

/** @deprecated Use fetchSamvidhaanGraphs */
export async function fetchSamvidhaanParetoGraphs(): Promise<SamvidhaanGraphsPayload> {
  return fetchSamvidhaanGraphs();
}

/** @deprecated Use fetchSamvidhaanGraphs */
export async function fetchSamvidhaanLiveGraphs(): Promise<SamvidhaanGraphsPayload> {
  return fetchSamvidhaanGraphs();
}

export async function fetchSamvidhaanHistoricalReports() {
  const res = await apiJson<{ reports: BackendReport[]; count: number }>(
    "/api/v1/samvidhaan/historical-reports/",
  );
  return (res.reports ?? []).map(mapReportListItem);
}
