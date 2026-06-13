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
  downtimeHours: number;
  recommendation: string;
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
  pages: string[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  files?: MessageFile[];
}

export interface RagDoc {
  name: string;
  size: string;
  type?: string;
  pages?: string[];
  isCustom?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
  ragDocs?: RagDoc[];
}

export interface TickerItem {
  text: string;
  isSeparator: boolean;
}

export interface SystemLogTemplate {
  module: string;
  text: string;
}

export interface ProductionLineData {
  name: string;
  statusText: string;
  type: "active" | "warning" | "normal" | "critical";
  outputRate: string;
  iconBgColor: string;
}
