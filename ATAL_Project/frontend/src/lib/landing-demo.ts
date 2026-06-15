import type { TelemetryCell } from "@/services/types";
import type { RulPredictionData } from "@/services/prediction";

/** Realistic plant telemetry for the public landing page (no auth required). */
export function getDemoTelemetryCells(): TelemetryCell[] {
  return [
    { label: "HYST_DEV", value: "4152 μm", status: "warning" },
    { label: "OIL_PRS", value: "302.2 bar", status: "nominal" },
    { label: "VIB_RMS", value: "6.4 mm/s", status: "warning" },
    { label: "GAP_POS", value: "20.0 mm", status: "nominal" },
    { label: "SRF_TMP", value: "1184 °C", status: "nominal" },
    { label: "ANOM_SC", value: "0.72", status: "critical" },
  ];
}

/** Nudge demo readings slightly so the landing grid feels live. */
export function tickDemoTelemetryCells(cells: TelemetryCell[]): TelemetryCell[] {
  return cells.map((cell) => {
    if (cell.label === "HYST_DEV") {
      const base = 4140 + Math.random() * 24;
      return { ...cell, value: `${base.toFixed(0)} μm` };
    }
    if (cell.label === "VIB_RMS") {
      const base = 6.2 + Math.random() * 0.35;
      return { ...cell, value: `${base.toFixed(1)} mm/s` };
    }
    if (cell.label === "ANOM_SC") {
      const base = 0.68 + Math.random() * 0.08;
      return { ...cell, value: base.toFixed(2) };
    }
    if (cell.label === "OIL_PRS") {
      const base = 300 + Math.random() * 4;
      return { ...cell, value: `${base.toFixed(1)} bar` };
    }
    return cell;
  });
}

export function getDemoManasPredictions(): RulPredictionData[] {
  return [
    {
      title: "High-Pressure Descaler",
      badgeText: "Score: 78",
      badgeType: "critical",
      subtext: "CRITICAL · Schedule inspection next shift — header pressure drift…",
      iconBgColor: "#ef4444",
    },
    {
      title: "Hydraulic AGC Cylinders",
      badgeText: "Score: 62",
      badgeType: "warning",
      subtext: "HIGH · Hysteresis envelope breach — verify servo response…",
      iconBgColor: "#f97316",
    },
    {
      title: "Slab Reheating Furnace",
      badgeText: "Score: 41",
      badgeType: "warning",
      subtext: "MEDIUM · Plan outage window before RUL horizon…",
      iconBgColor: "#f97316",
    },
    {
      title: "Finishing Stands F1-F7",
      badgeText: "Score: 28",
      badgeType: "healthy",
      subtext: "LOW · Routine monitoring — vibration within ISO band…",
      iconBgColor: "#22c55e",
    },
  ];
}
