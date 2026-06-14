import { apiJson } from "@/lib/api";
import type { DiagnosticAsset } from "@/services/sansadOutputs";
import { mapDiagnosticAsset, type BackendDiagnosticAsset } from "@/lib/mappers";
import { fetchPlantSnapshot } from "@/services/plantSnapshot";

export async function fetchDiagnostics(factoryId?: string): Promise<DiagnosticAsset[]> {
  const snap = await fetchPlantSnapshot(factoryId);
  return snap.assets;
}

export async function fetchDiagnosticDetail(assetId: string): Promise<DiagnosticAsset> {
  const row = await apiJson<BackendDiagnosticAsset>(`/api/v1/diagnostics/${assetId}/`);
  return mapDiagnosticAsset(row);
}

export async function refreshDiagnostics(assetId: string): Promise<{ ml_task_id: string; consolidation_task_id: string }> {
  return apiJson(`/api/v1/diagnostics/${assetId}/refresh/`, { method: "POST", body: "{}" });
}

export interface DiagnosticInlineInsight {
  insight: string;
  insight_angle: string;
  router: string;
}

export async function fetchRcaOverviewInsight(assetId: string): Promise<DiagnosticInlineInsight> {
  return apiJson(`/api/v1/diagnostics/${assetId}/rca-insight/`, {
    method: "POST",
    body: "{}",
  });
}

export async function fetchDefectCorrelationInsight(assetId: string): Promise<DiagnosticInlineInsight> {
  return apiJson(`/api/v1/diagnostics/${assetId}/defect-insight/`, {
    method: "POST",
    body: "{}",
  });
}
