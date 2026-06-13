import type { TelemetryCell, LogEntry, SystemLogTemplate } from "./types";

const TELEMETRY_CELL_TEMPLATES: { label: string; nominal: string; warning: string; critical: string }[] = [
  { label: "BF1_TMP", nominal: "89°C", warning: "98°C", critical: "106°C" },
  { label: "BF1_PRS", nominal: "3.1b", warning: "3.1b", critical: "3.1b" },
  { label: "VLV_04", nominal: "OPEN", warning: "OPEN", critical: "OPEN" },
  { label: "ANOM_ST", nominal: "NOM", warning: "WARN", critical: "CRIT" },
  { label: "FLW_RT", nominal: "240L", warning: "240L", critical: "240L" },
  { label: "SYS_CK", nominal: "NOM", warning: "NOM", critical: "FAIL" },
];

export function getInitialTelemetryCells(): TelemetryCell[] {
  return [
    { label: "BF1_TMP", value: "98°C", status: "warning" },
    { label: "BF1_PRS", value: "3.1b", status: "nominal" },
    { label: "VLV_04", value: "OPEN", status: "critical" },
    { label: "ANOM_ST", value: "WARN", status: "warning" },
    { label: "FLW_RT", value: "240L", status: "nominal" },
    { label: "SYS_CK", value: "NOM", status: "nominal" },
  ];
}

export function tickTelemetryCells(prev: TelemetryCell[]): TelemetryCell[] {
  return prev.map((cell) => {
    if (Math.random() > 0.85) {
      const statuses: TelemetryCell["status"][] = ["nominal", "warning", "critical"];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const template = TELEMETRY_CELL_TEMPLATES.find((t) => t.label === cell.label);
      const val = template
        ? template[randomStatus]
        : cell.value;
      return { ...cell, status: randomStatus, value: val };
    }
    return cell;
  });
}

export function getHubTelemetry() {
  return {
    exhausterVibration: 6.42,
    exhausterHealth: 24,
    sinterFeO: 8.3,
    strandSpeed: 3.1,
  };
}

export function tickExhausterVibration(val: number): number {
  const delta = (Math.random() - 0.5) * 0.12;
  return Math.max(6.2, Math.min(6.8, parseFloat((val + delta).toFixed(2))));
}

export function tickSinterFeO(val: number): number {
  const delta = (Math.random() - 0.5) * 0.08;
  return Math.max(8.0, Math.min(8.48, parseFloat((val + delta).toFixed(2))));
}

export function tickStrandSpeed(val: number): number {
  const delta = (Math.random() - 0.5) * 0.05;
  return Math.max(2.8, Math.min(3.4, parseFloat((val + delta).toFixed(1))));
}

export function tickExhausterHealth(val: number): number {
  if (Math.random() > 0.8) {
    return Math.max(20, val - 1);
  }
  return val;
}

export const HUB_TICK_INTERVAL = 3500;
export const CELL_TICK_INTERVAL = 2000;

const SYSTEM_LOG_POOL: SystemLogTemplate[] = [
  { module: "CokeOven-Agent", text: "Carbonizing temperature optimal (1085°C). Hearth sensors stable." },
  { module: "ThermalCascade-Predictor", text: "Upstream heat variations mapped to F3 Blast Furnace input delay." },
  { module: "LadleTransfer-Optimizer", text: "Ladle transfer transit lag calculated at 42 minutes." },
  { module: "Calibration-Service", text: "Calibration offset applied to Belt FeO Analyzer (BCFA)." },
  { module: "LadleTransfer-Optimizer", text: "Liquid iron mass flow matches SMS caster throughput." },
  { module: "ThermalCascade-Predictor", text: "No cascade anomalies detected in HSM coil coiler yard." },
  { module: "Sansad-Hub", text: "Structured Work Order WO-2026-F1-09 compiled and routed to Manas." },
  { module: "Sansad-Hub", text: "Synchronized active RUL telemetry matrices to Manas Vector Database." },
  { module: "CokeOven-Agent", text: "F1-EQ11 electrostatic precipitator electrode voltage at 48 kV." },
  { module: "CokeOven-Agent", text: "CRITICAL: F1-EQ09 Exhauster bearing RUL at 14 days. Extreme vibration peaks." },
  { module: "Sinter-Agent", text: "WARNING: F2-EQ04 Drive sprocket tooth root fatigue. RUL at 18 days." },
  { module: "Sinter-Agent", text: "NOMINAL: F2-EQ09 Waste Gas Fan Impeller wear level normal. RUL at 42 days." },
];

export function generateSystemLog(nextId: number, pool?: SystemLogTemplate[]): LogEntry {
  const source = pool ?? SYSTEM_LOG_POOL;
  const template = source[Math.floor(Math.random() * source.length)];
  const now = new Date();
  const time = now.toTimeString().slice(0, 8);
  return { id: nextId, time, module: template.module, text: template.text };
}

export function getSystemLogPool(): SystemLogTemplate[] {
  return SYSTEM_LOG_POOL;
}
