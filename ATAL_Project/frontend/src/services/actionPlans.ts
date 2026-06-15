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
  }>(`/api/v1/maintenance/action-plans/${q}`, { cache: "no-store" });
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
  const row = await apiJson<BackendActionPlan>(
    `/api/v1/maintenance/action-plans/${assetId}/`,
    { cache: "no-store" },
  );
  return mapActionPlan(row);
}

export async function fetchPlanRegenerationStatus(): Promise<PlanRegenerationStatus> {
  return apiJson<PlanRegenerationStatus>(
    "/api/v1/maintenance/action-plans/regeneration-status/",
    { cache: "no-store" },
  );
}

export async function triggerQuickPlanRegenerate(assetId: string): Promise<{
  status: string;
  report_id?: string;
  plan?: BackendActionPlan;
  error?: string;
}> {
  return apiJson(`/api/v1/maintenance/action-plans/${assetId}/regenerate/`, {
    method: "POST",
    body: "{}",
    cache: "no-store",
  });
}

export interface GeneratedWorkOrder {
  id: string;
  asset: string;
  assetId: string;
  factory: string;
  title: string;
  priority: string;
  description: string;
  recommendedActions: string[];
  spareRequirements: string[];
  estimatedDurationHrs: number;
  safetyNotes: string;
  status: string;
  source: string;
  createdAt: string;
}

export async function generateWorkOrder(assetId: string): Promise<{
  status: string;
  work_order?: GeneratedWorkOrder;
  error?: string;
}> {
  return apiJson(`/api/v1/maintenance/work-orders/${assetId}/generate/`, {
    method: "POST",
    body: "{}",
    cache: "no-store",
  });
}
