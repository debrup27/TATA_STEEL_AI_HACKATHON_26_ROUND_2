/** MANAS chat personas — 0.8b role workers brief 9b; admin gets both lenses. */
export const MANAS_ROLES = [
  { id: "technician", label: "Technician" },
  { id: "supervisor", label: "Supervisor" },
  { id: "admin", label: "Admin (both)" },
] as const;

export type ManasRoleId = (typeof MANAS_ROLES)[number]["id"];

export function isManasRoleId(id: string | null | undefined): id is ManasRoleId {
  return !!id && MANAS_ROLES.some((r) => r.id === id);
}

export function manasRoleLabel(roleId: string | null | undefined): string | null {
  if (!roleId) return null;
  return MANAS_ROLES.find((r) => r.id === roleId)?.label ?? null;
}

export function manasRoleTag(roleId: string | null | undefined): string | null {
  const label = manasRoleLabel(roleId);
  return label ? `role: ${label}` : null;
}
