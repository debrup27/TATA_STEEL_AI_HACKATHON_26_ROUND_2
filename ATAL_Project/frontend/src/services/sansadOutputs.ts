/**
 * SANSAD §5 output types and hub pillar metadata.
 * All pages fetch live data via services/diagnostics, prediction, actionPlans, reports.
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface DiagnosticAsset {
  id: string;
  name: string;
  factory: string;
  stage: string;
  health: number;
  rulDays: number | null;
  rulHours?: number | null;
  probableFault: string;
  faultConfidence: number;
  rootCauses: { factor: string; weight: number; evidence: string }[];
  earlyWarning: string | null;
  processDefects: { stage: string; defect: string; link: string }[];
  sensors: { label: string; value: string; status: "nominal" | "warning" | "critical" }[];
  isNormalOperation?: boolean;
  anomalyActive?: boolean;
  tripActive?: boolean;
  faultInjected?: boolean;
  simulationFaultType?: string | null;
}

export interface RiskPriorityAsset {
  id: string;
  name: string;
  factory: string;
  riskLevel: RiskLevel;
  urgencyScore: number;
  bottleneckRank: number;
  processCriticality: number;
  delaySeverity: number;
  sparesAvailable: boolean;
  sparesStatus?: "full" | "partial" | "none";
  procurementLeadDays: number;
  impact: string;
  recommendation: string;
}

export interface MaintenanceActionPlan {
  id: string;
  asset: string;
  factory: string;
  riskLevel: RiskLevel;
  immediateActions: string[];
  steps: { order: number; action: string; safety: string; duration: string }[];
  longTermMonitoring: string[];
  spares: { part: string; qty: number; leadDays: number; inStock: boolean }[];
  optimizedPlanSummary: string;
  assetId?: string;
  workOrderId?: string;
  reportId?: string;
}

export interface MaintenanceReport {
  id: string;
  code: string;
  type: "maintenance" | "abnormal_alert" | "decision_summary" | "digital_log";
  title: string;
  asset: string;
  factory: string;
  date: string;
  author: string;
  audience: "engineer" | "supervisor" | "operations";
  riskLevel: RiskLevel;
  summary: string;
  body: string;
}

export const SANSAD_OUTPUT_PILLARS = [
  {
    id: "diagnostics",
    href: "/sansad/hub/diagnostics",
    section: "§5.1",
    title: "Diagnostics & Prediction",
    subtitle: "Fault diagnosis · RCA · RUL · early warning",
    description:
      "Probable faults, ranked root causes, remaining useful life, catastrophic early warnings, and cross-stage process defect links.",
    accent: "from-sky-500/10 to-cyan-500/5",
    border: "hover:border-sky-300",
  },
  {
    id: "risk",
    href: "/sansad/hub/risk",
    section: "§5.2",
    title: "Risk & Priority",
    subtitle: "Classification · urgency · bottleneck triage",
    description:
      "Risk levels, intervention urgency, plant bottleneck ranking, and prioritisation by criticality, delays, spares, and lead time.",
    accent: "from-rose-500/10 to-orange-500/5",
    border: "hover:border-rose-300",
  },
  {
    id: "actions",
    href: "/sansad/hub/actions",
    section: "§5.3",
    title: "Maintenance Actions",
    subtitle: "Repair steps · plans · spares strategy",
    description:
      "Step-by-step recommendations, immediate action points, optimised maintenance plans, monitoring guidance, and procurement.",
    accent: "from-emerald-500/10 to-lime-500/5",
    border: "hover:border-emerald-300",
  },
  {
    id: "reports",
    href: "/sansad/hub/reports",
    section: "§5.4",
    title: "Intelligence Reports",
    subtitle: "Structured reports · alerts · decision logs",
    description:
      "Maintenance reports, abnormal alert digests, supervisor decision summaries, and equipment digital logbook entries.",
    accent: "from-violet-500/10 to-purple-500/5",
    border: "hover:border-violet-300",
  },
] as const;

export function riskLevelColor(level: RiskLevel): string {
  switch (level) {
    case "critical": return "text-rose-600 bg-rose-50 border-rose-200";
    case "high": return "text-orange-600 bg-orange-50 border-orange-200";
    case "medium": return "text-amber-600 bg-amber-50 border-amber-200";
    default: return "text-emerald-600 bg-emerald-50 border-emerald-200";
  }
}
