import { apiJson } from "@/lib/api";
import type { MaintenanceActionPlan } from "@/services/sansadOutputs";
import { mapActionPlan, type BackendActionPlan } from "@/lib/mappers";

export async function fetchActionPlans(factoryId?: string): Promise<MaintenanceActionPlan[]> {
  const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : "";
  const res = await apiJson<{ plans: BackendActionPlan[] }>(`/api/v1/maintenance/action-plans/${q}`);
  return (res.plans ?? []).map(mapActionPlan);
}

export async function fetchActionPlan(assetId: string): Promise<MaintenanceActionPlan> {
  const row = await apiJson<BackendActionPlan>(`/api/v1/maintenance/action-plans/${assetId}/`);
  return mapActionPlan(row);
}

export { triggerConsolidationAsync, fetchConsolidationResult } from "@/services/reports";
