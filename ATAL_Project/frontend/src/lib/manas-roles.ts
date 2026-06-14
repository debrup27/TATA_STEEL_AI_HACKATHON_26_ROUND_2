/** MANAS chat personas — tailors system prompt per selected role. */
export const MANAS_ROLES = [
  { id: "technician", label: "Technician" },
  { id: "supervisor", label: "Supervisor" },
  { id: "reliability_engineer", label: "Reliability Engineer" },
  { id: "maintenance_planner", label: "Maintenance Planner" },
  { id: "operations_manager", label: "Operations Manager" },
  { id: "safety_officer", label: "Safety Officer" },
] as const;

export type ManasRoleId = (typeof MANAS_ROLES)[number]["id"];

export function manasRoleLabel(roleId: string | null | undefined): string | null {
  if (!roleId) return null;
  return MANAS_ROLES.find((r) => r.id === roleId)?.label ?? roleId.replace(/_/g, " ");
}

export function manasRoleTag(roleId: string | null | undefined): string | null {
  const label = manasRoleLabel(roleId);
  return label ? `role: ${label}` : null;
}
