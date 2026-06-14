import { apiJson } from "@/lib/api";
import type { PlantAnomalyFlags } from "@/services/simulate";
import type { DiagnosticAsset } from "@/services/sansadOutputs";
import { mapDiagnosticAsset, type BackendDiagnosticAsset } from "@/lib/mappers";
import type { SensorReading } from "@/components/workflow/types";

export interface PlantSnapshot {
  generated_at: string;
  factories: { id: string; name: string; code: string }[];
  assets: DiagnosticAsset[];
  diagnostics: DiagnosticAsset[];
  by_factory: Record<string, DiagnosticAsset[]>;
  count: number;
  anomaly_flags?: PlantAnomalyFlags;
}

interface BackendPlantSnapshot {
  generated_at: string;
  factories: { id: string; name: string; code: string }[];
  assets: BackendDiagnosticAsset[];
  diagnostics?: BackendDiagnosticAsset[];
  by_factory?: Record<string, BackendDiagnosticAsset[]>;
  count: number;
  anomaly_flags?: PlantAnomalyFlags;
}

function mapSnapshot(res: BackendPlantSnapshot): PlantSnapshot {
  const assets = (res.assets ?? res.diagnostics ?? []).map(mapDiagnosticAsset);
  const byFactory: Record<string, DiagnosticAsset[]> = {};
  for (const row of assets) {
    const key = row.factory || "unknown";
    (byFactory[key] ??= []).push(row);
  }
  return {
    generated_at: res.generated_at,
    factories: res.factories ?? [],
    assets,
    diagnostics: assets,
    by_factory: res.by_factory
      ? Object.fromEntries(
          Object.entries(res.by_factory).map(([k, v]) => [k, v.map(mapDiagnosticAsset)]),
        )
      : byFactory,
    count: res.count ?? assets.length,
    anomaly_flags: res.anomaly_flags,
  };
}

/** Unified plant snapshot — health, RUL, sensors, RCA for all SANSAD pages. */
export async function fetchPlantSnapshot(factoryId?: string): Promise<PlantSnapshot> {
  const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : "";
  const res = await apiJson<BackendPlantSnapshot>(`/api/v1/plant/snapshot/${q}`);
  return mapSnapshot(res);
}

export function snapshotAssetById(
  snap: PlantSnapshot,
  assetId: string,
): DiagnosticAsset | undefined {
  return snap.assets.find((a) => a.id === assetId);
}

export function snapshotSensorsToFlow(
  sensors: DiagnosticAsset["sensors"],
): SensorReading[] {
  return sensors.map((s) => ({
    name: s.label,
    value: s.value,
    status:
      s.status === "critical" ? "CRITICAL" : s.status === "warning" ? "HIGH" : "OK",
  }));
}

export function snapshotHealthStatus(asset: DiagnosticAsset): string {
  if (asset.isNormalOperation) return "healthy";
  if (asset.health < 40) return "critical";
  if (asset.health < 65) return "warning";
  return "caution";
}
