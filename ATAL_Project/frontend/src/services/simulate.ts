import { apiJson } from "@/lib/api";

export interface AnomalyTripResult {
  status: string;
  asset_id: string;
  asset_name: string;
  fault_type: string;
  message: string;
  anomalyActive: boolean;
  tripActive: boolean;
  faultInjected: boolean;
  report_id?: string;
  snapshot?: {
    anomaly_flags: PlantAnomalyFlags;
    generated_at: string;
  };
}

export interface PlantAnomalyFlags {
  any_anomaly_active: boolean;
  any_trip_active: boolean;
  injected_asset_ids: string[];
  trip_asset_ids: string[];
  anomaly_asset_ids: string[];
}

export const PLANT_SNAPSHOT_REFRESH_EVENT = "sansad:plant-snapshot-refresh";

export function requestPlantSnapshotRefresh(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PLANT_SNAPSHOT_REFRESH_EVENT));
  }
}

export async function triggerAnomalyTrip(opts?: {
  assetId?: string;
  faultType?: string;
}): Promise<AnomalyTripResult> {
  const result = await apiJson<AnomalyTripResult>("/api/v1/simulate/trip/", {
    method: "POST",
    body: JSON.stringify({
      asset_id: opts?.assetId,
      fault_type: opts?.faultType,
    }),
  });
  requestPlantSnapshotRefresh();
  return result;
}

export async function clearAnomalyTrip(assetId?: string): Promise<{ status: string; assets_updated: number }> {
  const result = await apiJson<{ status: string; assets_updated: number }>(
    "/api/v1/simulate/trip/clear/",
    {
      method: "POST",
      body: JSON.stringify({ asset_id: assetId }),
    },
  );
  requestPlantSnapshotRefresh();
  return result;
}
