import type { TickerItem } from "./types";

export function getFactory1Notifications(): TickerItem[] {
  return [
    { text: "EXHAUSTER VIBRATION: 6.42 mm/s", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "BEARING RUL: 14 DAYS", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "COG PRESSURE: NOMINAL", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "F1-EQ09: CRITICAL ALERT", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "HEARTH TEMP: 1085°C", isSeparator: false },
    { text: "✦", isSeparator: true },
  ];
}

export function getFactory2Notifications(): TickerItem[] {
  return [
    { text: "BELT FeO CONTENT: 8.3%", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "STRAND SPEED: 3.1 m/min", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "BTP POSITION: STABLE", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "F2-EQ04: WARN — FATIGUE", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "SINTER YIELD: OPTIMAL", isSeparator: false },
    { text: "✦", isSeparator: true },
  ];
}

export function getSansadHubLogos(): TickerItem[] {
  return [
    { text: "CokeOven-Agent: ACTIVE", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "Sinter-Agent: ACTIVE", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "Cascade-Predictor: RUNNING", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "Manas Sync: LIVE", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "LadleTransfer-Optimizer: ACTIVE", isSeparator: false },
    { text: "✦", isSeparator: true },
  ];
}

export function getRulMonitorLogos(): TickerItem[] {
  return [
    { text: "F1-EQ09 Exhauster — 14d ⚠ CRITICAL", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "F2-EQ04 Drive Sprocket — 18d WARN", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "F2-EQ09 Waste Fan — 42d OK", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "F1-EQ11 Precipitator — 95d OK", isSeparator: false },
    { text: "✦", isSeparator: true },
  ];
}

export function getHistoricalLogsLogos(): TickerItem[] {
  return [
    { text: "MR-2024-441 — Bearing replacement · F1-EQ09", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "MR-2024-388 — Sprocket lubrication · F2-EQ04", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "MR-2024-301 — Fan blade inspection · F2-EQ09", isSeparator: false },
    { text: "✦", isSeparator: true },
  ];
}

export function getRiskPriorityLogos(): TickerItem[] {
  return [
    { text: "F1-EQ09 Exhauster — CRITICAL · Score 97", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "F2-EQ04 Sprocket — HIGH · Score 81", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "F2-EQ09 Waste Fan — MEDIUM · Score 54", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "F1-EQ11 Precipitator — LOW · Score 22", isSeparator: false },
    { text: "✦", isSeparator: true },
  ];
}

export function getDiagnosticsTicker(): TickerItem[] {
  return [
    { text: "F1-EQ09 — Spalling 87% confidence", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "RUL: 14 days · Exhauster", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "Early warning: seizure risk 10d", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "RCA: grease ISO 4406 breach", isSeparator: false },
    { text: "✦", isSeparator: true },
  ];
}

export function getRiskTicker(): TickerItem[] {
  return getRiskPriorityLogos();
}

export function getActionsTicker(): TickerItem[] {
  return [
    { text: "LOTO SOP-SAF-04 — step 1 queued", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "SKF 22224 EK — PO expedite", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "Window-14 outage slot reserved", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "5-step repair plan ready", isSeparator: false },
    { text: "✦", isSeparator: true },
  ];
}

export function getReportsTicker(): TickerItem[] {
  return [
    { text: "REP-F1-EQ09 — critical diagnostic", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "ALT-F2-EQ04 — abnormal alert", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "DEC-OPS — bottleneck summary", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "LOG-MNT-118 — digital log entry", isSeparator: false },
    { text: "✦", isSeparator: true },
  ];
}

/** @deprecated Use getReportsTicker — RAG removed from hub */
export function getRagLogsLogos(): TickerItem[] {
  return getReportsTicker();
}

export function getManasTickerLogos(): TickerItem[] {
  return [
    { text: "RAG SYNCED — 4 vector stores merged", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "Query Latency: 12ms avg", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "Reasoning Agent: ACTIVE", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "Alert Dispatch — WO-2026-F1-09", isSeparator: false },
    { text: "✦", isSeparator: true },
  ];
}

export function getSamvidhaanTickerLogos(): TickerItem[] {
  return [
    { text: "System: ACTIVE — Monitoring 142 assets", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "RUL avg: 1,162h across fleet", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "Safety Compliance: 100%", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "Work Order Compliance: 7/9 matching", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "Self-Healing: Active", isSeparator: false },
    { text: "✦", isSeparator: true },
    { text: "Policies Enforced: 4 active", isSeparator: false },
    { text: "✦", isSeparator: true },
  ];
}
