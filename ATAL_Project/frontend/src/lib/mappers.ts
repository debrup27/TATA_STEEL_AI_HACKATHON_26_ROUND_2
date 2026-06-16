import type {
  AssetHealth,
  Citation,
  FactoryData,
  MaintenanceLog,
  RagDoc,
  RiskAsset,
  TelemetryCell,
  ChatSession,
  Message,
} from "@/services/types";
import { stripMarkdownPreview } from "@/lib/chat-preview";

export interface BackendFactory {
  id: string;
  name: string;
  code: string;
  location?: string;
  metadata?: Record<string, unknown>;
}

export interface BackendAssetHealth {
  asset_id: string;
  name: string;
  health_score: number;
  rul_hours: number | null;
  status: string;
  active_alerts_count?: number;
  anomaly_score?: number | null;
  fault_classification?: number | null;
  campaign_hours?: number;
  last_maintenance?: {
    date: string;
    event_type: string;
    description: string;
    outcome?: string;
  } | null;
  twin_state_summary?: Record<string, unknown>;
}

export interface BackendFactoryHealth {
  factory_id: string;
  name: string;
  health_score: number;
  asset_rankings: BackendAssetHealth[];
}

export interface BackendRankedAsset {
  asset_id: string;
  asset_name: string;
  factory: string;
  urgency_score: number;
  health_score: number;
  criticality_level?: string;
  risk_level?: string;
  bottleneck_rank?: number;
  process_criticality?: number;
  delay_severity?: number;
  spares_available?: boolean;
  spares_status?: "full" | "partial" | "none";
  procurement_lead_days?: number;
  impact?: string;
  recommendation?: string;
  composite_score?: number;
}

export interface BackendDiagnosticAsset {
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
  faultClass?: number;
  anomalyActive?: boolean;
  tripActive?: boolean;
  faultInjected?: boolean;
  simulationFaultType?: string | null;
}

export interface BackendActionPlan {
  id: string;
  assetId?: string;
  asset: string;
  factory: string;
  riskLevel: string;
  immediateActions: string[];
  steps: { order: number; action: string; safety: string; duration: string }[];
  longTermMonitoring: string[];
  spares: {
    part: string;
    qty: number;
    leadDays: number;
    inStock: boolean;
    stockQty?: number;
    reorderLevel?: number;
    orderDecision?: "order" | "in_stock";
  }[];
  optimizedPlanSummary: string;
  workOrderId?: string | null;
  reportId?: string | null;
  generatedAt?: string | null;
}

export interface BackendMaintenanceEvent {
  id: string;
  asset: string;
  event_type: string;
  description?: string;
  outcome?: string;
  completed_date?: string | null;
  created_at?: string;
}

export interface BackendReport {
  id: string;
  asset: string;
  asset_name?: string;
  factory_name?: string;
  created_at: string;
  source?: string;
  report_type?: string;
  title?: string;
  risk_level?: string;
  urgency_score?: number;
  diagnosis?: string;
  report_text?: string;
  feedback_status?: string;
}

export interface BackendChatSession {
  id: string;
  asset_id?: string | null;
  created_at?: string;
  last_active?: string;
  metadata?: Record<string, unknown>;
  last_message?: { role: string; content: string };
}

export interface BackendChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
  citations?: unknown[];
  created_at?: string;
  feedback_rating?: "up" | "down" | null;
}

function healthStatus(score: number, status?: string): AssetHealth["status"] {
  if (status === "critical" || score < 30) return "critical";
  if (status === "warning" || score < 60) return "warning";
  return "nominal";
}

export function mapAssetHealth(h: BackendAssetHealth, section = ""): AssetHealth {
  const rulDays = h.rul_hours != null ? Math.max(0, Math.round(h.rul_hours / 24)) : 0;
  const twin = h.twin_state_summary ?? {};
  return {
    id: h.asset_id,
    name: h.name,
    section,
    rulDays,
    health: Math.round(h.health_score),
    status: healthStatus(h.health_score, h.status),
    lastMaintenance: (twin.last_maintenance as string) ?? "—",
    vibration: twin.vibration != null ? `${twin.vibration} mm/s` : "—",
    temp: twin.temperature != null ? `${twin.temperature}°C` : "—",
    comments:
      (twin.summary as string) ??
      `Health ${Math.round(h.health_score)}% · ${h.active_alerts_count ?? 0} active alert(s)`,
  };
}

export function mapFactoryHealth(
  factory: BackendFactory,
  health: BackendFactoryHealth,
): FactoryData {
  return {
    id: factory.id,
    name: factory.name,
    code: factory.code,
    description: (factory.metadata?.description as string) ?? factory.location ?? factory.name,
    parts: health.asset_rankings.map((a) => mapAssetHealth(a, factory.name)),
  };
}

export function mapRiskAsset(r: BackendRankedAsset, index = 0): RiskAsset {
  const score = Math.min(100, Math.round(r.urgency_score));
  const riskLevel = (r.risk_level ?? "").toLowerCase();
  // Fall back to the asset's criticality when the backend didn't send an explicit
  // risk_level, so a high/critical asset never reads as LOW just because its score is low.
  const crit = (r.criticality_level ?? "").toLowerCase();
  let urgency: RiskAsset["urgency"] = "LOW";
  if (score >= 80 || riskLevel === "critical" || crit === "critical") urgency = "CRITICAL";
  else if (score >= 60 || riskLevel === "high" || crit === "high") urgency = "HIGH";
  else if (score >= 40 || riskLevel === "medium" || crit === "medium") urgency = "MEDIUM";

  return {
    id: r.asset_id,
    name: r.asset_name,
    score,
    urgency,
    impact: r.impact ?? `Factory: ${r.factory}. Health score ${Math.round(r.health_score)}%.`,
    sparesAvailable: r.spares_available ?? (r.spares_status ? r.spares_status !== "none" : false),
    sparesStatus: (r.spares_status ?? (r.spares_available ? "full" : "none")) as "full" | "partial" | "none",
    downtimeHours: Math.max(2, Math.round((r.delay_severity ?? (100 - r.health_score)) / 10)),
    recommendation: r.recommendation ?? "Monitor and plan maintenance during next outage window.",
    factory: r.factory,
    riskLevel: (riskLevel || urgency.toLowerCase()) as RiskAsset["riskLevel"],
    urgencyScore: score,
    bottleneckRank: r.bottleneck_rank ?? index + 1,
    processCriticality: r.process_criticality ?? 50,
    delaySeverity: r.delay_severity ?? 0,
    procurementLeadDays: r.procurement_lead_days ?? 0,
  };
}

export function mapDiagnosticAsset(d: BackendDiagnosticAsset) {
  const asText = (v: unknown, fallback = ""): string => {
    if (v == null) return fallback;
    if (typeof v === "string") return v;
    if (typeof v === "object") {
      const row = v as Record<string, unknown>;
      if (row.sensor != null) {
        const dev = row.deviation_pct != null ? ` — ${row.deviation_pct}% deviation` : "";
        return `${row.sensor}${dev}`;
      }
      if (row.factor != null) return String(row.factor);
    }
    return String(v);
  };

  return {
    ...d,
    probableFault: asText(d.probableFault, ""),
    rulDays: d.rulDays ?? null,
    rulHours: d.rulHours ?? null,
    earlyWarning: d.earlyWarning ? asText(d.earlyWarning) : null,
    rootCauses: (d.rootCauses ?? []).map((rc) => ({
      factor: asText(rc.factor, "Unknown factor"),
      weight: Number(rc.weight) || 0,
      evidence: asText(rc.evidence, "—"),
    })),
    processDefects: (d.processDefects ?? []).map((pd) => ({
      stage: asText(pd.stage, "—"),
      defect: asText(pd.defect, "Process deviation"),
      link: asText(pd.link, ""),
    })),
    sensors: (d.sensors ?? []).map((s) => ({
      label: asText(s.label, "Sensor"),
      value: asText(s.value, "—"),
      status: s.status ?? "nominal",
    })),
    isNormalOperation: Boolean(d.isNormalOperation),
    faultClass: typeof d.faultClass === "number" ? d.faultClass : undefined,
    anomalyActive: Boolean(d.anomalyActive),
    tripActive: Boolean(d.tripActive),
    faultInjected: Boolean(d.faultInjected),
    simulationFaultType: d.simulationFaultType ?? null,
  };
}

export function mapActionPlan(
  p: BackendActionPlan,
): import("@/services/sansadOutputs").MaintenanceActionPlan {
  return {
    id: p.id,
    asset: p.asset,
    factory: p.factory,
    riskLevel: (p.riskLevel ?? "medium") as import("@/services/sansadOutputs").RiskLevel,
    immediateActions: p.immediateActions ?? [],
    steps: p.steps ?? [],
    longTermMonitoring: p.longTermMonitoring ?? [],
    spares: p.spares ?? [],
    optimizedPlanSummary: p.optimizedPlanSummary ?? "",
    assetId: p.assetId,
    workOrderId: p.workOrderId ?? undefined,
    reportId: p.reportId ?? undefined,
    generatedAt: p.generatedAt ?? undefined,
  };
}

export function mapMaintenanceEvent(
  e: BackendMaintenanceEvent & { asset_name?: string },
): MaintenanceLog {
  const date = e.completed_date ?? e.created_at ?? new Date().toISOString();
  return {
    id: e.id,
    code: e.event_type?.toUpperCase() ?? "EVT",
    date: date.slice(0, 10),
    asset: e.asset_name ?? e.asset,
    module: "Maintenance",
    description: e.description ?? "",
    verdict: e.outcome ?? "Completed",
    operator: "—",
  };
}

export function mapTelemetryCell(raw: {
  label: string;
  value: string;
  status: string;
}): TelemetryCell {
  const status = raw.status as TelemetryCell["status"];
  return {
    label: raw.label,
    value: raw.value,
    status: status === "critical" || status === "warning" ? status : "nominal",
  };
}

export function mapRagDoc(d: {
  id?: string;
  title: string;
  doc_type?: string;
}): RagDoc {
  return {
    name: d.title,
    size: d.doc_type ?? "document",
    type: d.doc_type,
  };
}

export function isGenericSessionTitle(title: string | undefined, sessionId?: string): boolean {
  const t = (title ?? "").trim();
  if (!t || t === "New Chat" || t === "New Session") return true;
  if (/^Session [0-9a-f]{8}$/i.test(t)) return true;
  if (sessionId && t === `Session ${sessionId.slice(0, 8)}`) return true;
  return false;
}

function titleFromUserContent(content: string): string {
  const plain = stripMarkdownPreview(content, 40);
  if (!plain) return "";
  return plain.length > 25 ? `${plain.slice(0, 25)}...` : plain;
}

function titleFromMessages(messages: Message[]): string | undefined {
  const first = messages.find((m) => m.role === "user" && m.content?.trim());
  return first ? titleFromUserContent(first.content) || undefined : undefined;
}

/** Prefer stored title; fall back to first user message, then Session <id>. */
export function resolveSessionTitle(opts: {
  sessionId: string;
  metadataTitle?: string;
  existingTitle?: string;
  lastMessage?: { role: string; content: string };
  messages?: Message[];
}): string {
  const { sessionId, metadataTitle, existingTitle, lastMessage, messages } = opts;

  for (const t of [existingTitle, metadataTitle]) {
    if (t && !isGenericSessionTitle(t, sessionId)) return t.trim();
  }

  const fromMessages = messages?.length ? titleFromMessages(messages) : undefined;
  if (fromMessages) return fromMessages;

  if (lastMessage?.role === "user" && lastMessage.content?.trim()) {
    const fromLast = titleFromUserContent(lastMessage.content);
    if (fromLast) return fromLast;
  }

  return `Session ${sessionId.slice(0, 8)}`;
}

export function mapChatSession(
  s: BackendChatSession,
  messages: BackendChatMessage[] = [],
): ChatSession {
  const ts = s.last_active ?? s.created_at ?? new Date().toISOString();
  const mappedMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "system")
    .map((m) => ({
      id: m.id,
      role: m.role as Message["role"],
      content: m.content ?? "",
      reasoning: m.reasoning?.trim() || undefined,
      feedbackRating:
        m.feedback_rating === "up" || m.feedback_rating === "down"
          ? m.feedback_rating
          : undefined,
      citations: Array.isArray(m.citations)
        ? (m.citations as Citation[]).map((c) => ({
            ...c,
            documentId:
              c.documentId ?? (c as Citation & { document_id?: string }).document_id,
          }))
        : undefined,
    }));
  const lastUser = [...mappedMessages]
    .reverse()
    .find((m) => m.role === "user" && m.content?.trim());
  const lastMessagePreview = lastUser
    ? stripMarkdownPreview(lastUser.content)
    : s.last_message?.role === "user" && s.last_message.content?.trim()
      ? stripMarkdownPreview(s.last_message.content)
      : undefined;

  return {
    id: s.id,
    title: resolveSessionTitle({
      sessionId: s.id,
      metadataTitle: s.metadata?.title as string | undefined,
      lastMessage: s.last_message,
      messages: mappedMessages,
    }),
    createdAt: new Date(ts).toLocaleString(),
    messages: mappedMessages,
    lastMessagePreview,
    metadata: s.metadata,
  };
}

export function mapReportListItem(r: BackendReport & { asset_name?: string }): {
  id: string;
  code: string;
  date: string;
  asset: string;
  factory: string;
  module: string;
  author: string;
  verdict: string;
  reportMarkdown: string;
  type: "maintenance" | "abnormal_alert" | "decision_summary" | "digital_log";
  title: string;
  summary: string;
  audience: "engineer" | "supervisor" | "operations";
  assetId: string;
} {
  const type = (r.report_type ?? "maintenance") as "maintenance" | "abnormal_alert" | "decision_summary" | "digital_log";
  const title = r.title || r.diagnosis?.slice(0, 80) || "Maintenance Report";
  const body = r.report_text ?? r.diagnosis ?? "No report body available.";
  return {
    id: r.id,
    code: `REP-${r.id.slice(0, 8).toUpperCase()}`,
    date: r.created_at?.slice(0, 10) ?? "—",
    asset: r.asset_name ?? r.asset,
    factory: r.factory_name ?? "—",
    module: r.source ?? "AI-Generated",
    author: "MANAS",
    verdict: (r.risk_level ?? "pending").toUpperCase(),
    reportMarkdown: body,
    type,
    title,
    summary: r.diagnosis?.slice(0, 200) ?? body.slice(0, 200),
    audience: type === "decision_summary" ? "supervisor" : "engineer",
    assetId: r.asset,
  };
}
