export interface TelemetryCell {
  label: string;
  value: string;
  status: "nominal" | "warning" | "critical";
}

export interface LogEntry {
  id: number;
  time: string;
  module: string;
  text: string;
}

export interface SystemLog {
  id: number;
  time: string;
  module: string;
  text: string;
}

export interface MaintenanceLog {
  id: string;
  code: string;
  date: string;
  asset: string;
  module: string;
  description: string;
  verdict: string;
  operator: string;
  pdfUrl?: string;
  onlineContent?: string;
}

export interface RiskAsset {
  id: string;
  name: string;
  score: number;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  impact: string;
  sparesAvailable: boolean;
  sparesStatus?: "full" | "partial" | "none";
  downtimeHours: number;
  recommendation: string;
  factory?: string;
  riskLevel?: "low" | "medium" | "high" | "critical";
  urgencyScore?: number;
  bottleneckRank?: number;
  processCriticality?: number;
  delaySeverity?: number;
  procurementLeadDays?: number;
}

export interface AssetHealth {
  id: string;
  name: string;
  section: string;
  rulDays: number;
  health: number;
  status: "nominal" | "warning" | "critical";
  lastMaintenance: string;
  vibration: string;
  temp: string;
  comments: string;
}

export interface FactoryData {
  id: string;
  name: string;
  code: string;
  description: string;
  parts: AssetHealth[];
}

export interface MessageFile {
  name: string;
  type: string;
  pages?: string[];
  /** Plain or markdown text for expanded text preview. */
  body?: string;
  /** Library document id — fetches raw file for PDF viewer. */
  documentId?: string;
  /** Blob URL for uploaded PDFs — native browser viewer. */
  pdfUrl?: string;
  sourceFormat?: DocumentSourceFormat;
}

export type DocumentSourceFormat = "pdf" | "markdown" | "html" | "text" | "image";

export interface Citation {
  /** 1-based source number matching inline [n] markers in the answer. */
  index?: number;
  doc: string;
  section?: string;
  /** Retrieved passage shown in the sources panel. */
  excerpt?: string;
  score?: number;
  source?: "library" | "upload";
  documentId?: string;
}

export interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  /** Model chain-of-thought when Deep Thinking is enabled. */
  reasoning?: string;
  files?: MessageFile[];
  citations?: Citation[];
  isCompacting?: boolean;
  /** User thumbs feedback on assistant replies. */
  feedbackRating?: "up" | "down";
}

export interface RagDoc {
  id?: string;
  name: string;
  size: string;
  type?: string;
  docType?: string;
  pages?: string[];
  /** Blob URL for uploaded PDF — session-scoped native viewer. */
  pdfUrl?: string;
  /** Extracted plain text sent to backend RAG (not base64 previews). */
  textContent?: string;
  isCustom?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
  /** Sidebar preview from list API before full history is loaded. */
  lastMessagePreview?: string;
  ragDocs?: RagDoc[];
}

export interface TickerItem {
  text: string;
  isSeparator: boolean;
}

export interface ProductionLineData {
  name: string;
  statusText: string;
  type: "active" | "warning" | "normal" | "critical";
  outputRate: string;
  iconBgColor: string;
}
