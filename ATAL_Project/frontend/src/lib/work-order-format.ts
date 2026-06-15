import type { GeneratedWorkOrder } from "@/services/actionPlans";

/** Render spare line whether API returns a string or { part, qty, order_status }. */
export function formatSpareRequirement(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (!item || typeof item !== "object") return String(item ?? "");

  const row = item as Record<string, unknown>;
  const part = String(row.part ?? row.name ?? "Part").trim();
  const qty = row.qty ?? row.quantity;
  const status = row.order_status ?? row.status ?? row.decision;
  const bits = [part];
  if (qty != null && String(qty).trim()) bits.push(`qty ${qty}`);
  if (status != null && String(status).trim()) bits.push(String(status));
  return bits.join(" — ");
}

export function formatWorkOrderAction(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (!item || typeof item !== "object") return String(item ?? "");
  const row = item as Record<string, unknown>;
  if (typeof row.step === "string") return row.step;
  if (typeof row.action === "string") return row.action;
  return JSON.stringify(item);
}

export function normalizeGeneratedWorkOrder(wo: GeneratedWorkOrder): GeneratedWorkOrder {
  return {
    ...wo,
    recommendedActions: (wo.recommendedActions ?? []).map(formatWorkOrderAction),
    spareRequirements: (wo.spareRequirements ?? []).map(formatSpareRequirement),
  };
}
