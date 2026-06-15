/** ML fault-class index → operator-readable label (matches backend deterministic engine). */
export const FAULT_CLASS_LABELS: Record<number, string> = {
  0: "Nominal — no classified fault",
  1: "Bearing / mechanical wear",
  2: "Thermal excursion",
  3: "Crystallization / coating defect",
};

export function faultClassLabel(faultClass: number): string {
  return FAULT_CLASS_LABELS[faultClass] ?? `Class ${faultClass} fault`;
}

export function faultClassShort(faultClass: number): string {
  if (faultClass <= 0) return "None";
  const base = FAULT_CLASS_LABELS[faultClass]?.split("—")[0]?.trim() ?? `Class ${faultClass}`;
  return base;
}
