import { apiJson } from "@/lib/api";
import type { MaintenanceActionPlan } from "@/services/sansadOutputs";
import { mapActionPlan, type BackendActionPlan } from "@/lib/mappers";

export interface PlanRegenerationStatus {
  active: boolean;
  completed: number;
  total: number;
  trigger: string;
  updated_at: string | null;
}

export async function fetchActionPlans(factoryId?: string): Promise<{
  plans: MaintenanceActionPlan[];
  regeneration: PlanRegenerationStatus;
}> {
  const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : "";
  const res = await apiJson<{
    plans: BackendActionPlan[];
    regeneration?: PlanRegenerationStatus;
  }>(`/api/v1/maintenance/action-plans/${q}`);
  return {
    plans: (res.plans ?? []).map(mapActionPlan),
    regeneration: res.regeneration ?? {
      active: false,
      completed: 0,
      total: 0,
      trigger: "",
      updated_at: null,
    },
  };
}

export async function fetchActionPlan(assetId: string): Promise<MaintenanceActionPlan> {
  const row = await apiJson<BackendActionPlan>(`/api/v1/maintenance/action-plans/${assetId}/`);
  return mapActionPlan(row);
}

export async function fetchPlanRegenerationStatus(): Promise<PlanRegenerationStatus> {
  return apiJson<PlanRegenerationStatus>("/api/v1/maintenance/action-plans/regeneration-status/");
}

export async function triggerQuickPlanRegenerate(assetId: string): Promise<{
  status: string;
  report_id?: string;
  error?: string;
}> {
  return apiJson(`/api/v1/maintenance/action-plans/${assetId}/regenerate/`, {
    method: "POST",
    body: "{}",
  });
}
