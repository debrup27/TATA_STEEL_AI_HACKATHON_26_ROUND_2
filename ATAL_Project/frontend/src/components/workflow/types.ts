export interface SensorReading {
  name: string;
  value: string;
  status: "OK" | "HIGH" | "CRITICAL";
}

export interface FlowNode {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  type: "telemetry" | "classifier" | "action" | "alert" | "end" | "ticket";
  statusColor: string;
  status: "completed" | "running" | "idle";
  nextNodes: string[]; // Child node IDs
  sensors?: SensorReading[];
  threshold?: {
    field: string;
    operator: string;
    value: string;
  };
  valveFlow?: number;
  valveName?: string;
  alertChannels?: { type: string; target: string; msg: string }[];
  ticketId?: string;
  rulDays?: number;
}
