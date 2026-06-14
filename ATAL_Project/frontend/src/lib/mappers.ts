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
  created_at: string;
  source?: string;
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

export function mapRiskAsset(r: BackendRankedAsset, _index = 0): RiskAsset {
  void _index;
  const score = Math.min(100, Math.round(r.urgency_score * 25));
  let urgency: RiskAsset["urgency"] = "LOW";
  if (score >= 80) urgency = "CRITICAL";
  else if (score >= 60) urgency = "HIGH";
  else if (score >= 40) urgency = "MEDIUM";

  return {
    id: r.asset_id,
    name: r.asset_name,
    score,
    urgency,
    impact: `Factory: ${r.factory}. Health score ${Math.round(r.health_score)}%. Criticality: ${r.criticality_level ?? "medium"}.`,
    sparesAvailable: true,
    downtimeHours: Math.max(2, Math.round((100 - r.health_score) / 10)),
    recommendation:
      urgency === "CRITICAL"
        ? "Schedule immediate inspection and prepare replacement spares."
        : "Monitor closely and plan maintenance during next outage window.",
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

export function mapChatSession(
  s: BackendChatSession,
  messages: BackendChatMessage[] = [],
): ChatSession {
  const ts = s.last_active ?? s.created_at ?? new Date().toISOString();
  const mappedMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as Message["role"],
      content: m.content,
      reasoning: m.reasoning?.trim() || undefined,
      citations: Array.isArray(m.citations)
        ? (m.citations as Citation[])
        : undefined,
    }));
  const lastMessagePreview =
    mappedMessages.length > 0
      ? mappedMessages[mappedMessages.length - 1].content
      : s.last_message?.content;

  return {
    id: s.id,
    title: (s.metadata?.title as string) ?? `Session ${s.id.slice(0, 8)}`,
    createdAt: new Date(ts).toLocaleString(),
    messages: mappedMessages,
    lastMessagePreview,
  };
}

export function mapReportListItem(r: BackendReport & { asset_name?: string }): {
  id: string;
  code: string;
  date: string;
  asset: string;
  module: string;
  author: string;
  verdict: string;
  reportMarkdown: string;
} {
  return {
    id: r.id,
    code: `REP-${r.id.slice(0, 8).toUpperCase()}`,
    date: r.created_at?.slice(0, 10) ?? "—",
    asset: r.asset_name ?? r.asset,
    module: r.source ?? "AI-Generated",
    author: "MANAS",
    verdict: (r.risk_level ?? "pending").toUpperCase(),
    reportMarkdown: r.report_text ?? r.diagnosis ?? "No report body available.",
  };
}
