import { apiList, apiJson } from "@/lib/api";
import type { BackendAssetHealth, BackendFactory } from "@/lib/mappers";
import type { FlowNode, SensorReading } from "@/components/workflow/types";
import { NODE_LAYOUT_STEP } from "@/components/workflow/layout";

export type FactoryWorkflowKey = "horizon" | "zephyr";

const FACTORY_CODES: Record<FactoryWorkflowKey, string> = {
  horizon: "F1",
  zephyr: "F2",
};

const ASSET_ORDER: Record<FactoryWorkflowKey, string[]> = {
  horizon: ["SRF", "HHPD", "FS", "HAGCC"],
  zephyr: ["APT", "TCMS", "CGP", "HPAK"],
};

/** Default horizontal pipeline — NodeWorkflow centers this group in the viewport */
const ASSET_LAYOUT: Record<FactoryWorkflowKey, Record<string, { x: number; y: number }>> = {
  horizon: {
    SRF: { x: 0, y: 0 },
    HHPD: { x: NODE_LAYOUT_STEP, y: 0 },
    FS: { x: NODE_LAYOUT_STEP * 2, y: 0 },
    HAGCC: { x: NODE_LAYOUT_STEP * 3, y: 0 },
  },
  zephyr: {
    APT: { x: 0, y: 0 },
    TCMS: { x: NODE_LAYOUT_STEP, y: 0 },
    CGP: { x: NODE_LAYOUT_STEP * 2, y: 0 },
    HPAK: { x: NODE_LAYOUT_STEP * 3, y: 0 },
  },
};

interface BackendAsset {
  id: string;
  factory: string;
  name: string;
  asset_type: string;
  criticality_level?: string;
}

interface BackendSensorDef {
  id: string;
  asset: string;
  sensor_name: string;
  sensor_type: string;
  unit: string;
  normal_min?: number | null;
  normal_max?: number | null;
  alert_threshold?: number | null;
  trip_threshold?: number | null;
}

interface TelemetryReading {
  time: string;
  sensor_name: string;
  value: number;
  unit: string;
  quality_flag?: number;
}

function sensorStatus(
  value: number,
  def?: BackendSensorDef,
): SensorReading["status"] {
  if (!def) return "OK";

  const alert = def.alert_threshold;
  const trip = def.trip_threshold;

  if (alert != null && trip != null && trip < alert) {
    if (value <= trip) return "CRITICAL";
    if (value <= alert) return "HIGH";
    return "OK";
  }

  if (trip != null && value >= trip) return "CRITICAL";
  if (alert != null && value >= alert) return "HIGH";
  return "OK";
}

function healthToColor(healthScore: number, status: string): string {
  if (status === "critical" || healthScore < 40) return "#ef4444";
  if (status === "warning" || healthScore < 60) return "#f97316";
  if (status === "caution" || healthScore < 80) return "#eab308";
  return "#3b82f6";
}

function healthToFlowStatus(
  healthScore: number,
  status: string,
): FlowNode["status"] {
  if (status === "critical" || healthScore < 40) return "running";
  if (healthScore >= 80) return "completed";
  return "idle";
}

function formatSensorValue(value: number, unit: string): string {
  const u = unit ?? "";
  if (u.includes("°") || u.toLowerCase() === "c" || u.toLowerCase() === "°c") {
    return `${value.toFixed(1)}${u}`;
  }
  const decimals = Math.abs(value) >= 100 ? 1 : Math.abs(value) >= 10 ? 1 : 2;
  return `${value.toFixed(decimals)}${u}`;
}

function buildSensors(
  defs: BackendSensorDef[],
  readings: TelemetryReading[],
): SensorReading[] {
  const latest = new Map<string, TelemetryReading>();
  for (const r of readings) {
    const prev = latest.get(r.sensor_name);
    if (!prev || new Date(r.time).getTime() > new Date(prev.time).getTime()) {
      latest.set(r.sensor_name, r);
    }
  }

  const defsByName = new Map(defs.map((d) => [d.sensor_name, d]));

  const fromReadings = Array.from(latest.values()).map((r) => ({
    name: r.sensor_name.replace(/_/g, " ").slice(0, 14),
    value: formatSensorValue(r.value, r.unit),
    status: sensorStatus(r.value, defsByName.get(r.sensor_name)),
  }));

  if (fromReadings.length > 0) {
    return fromReadings.slice(0, 8);
  }

  return defs.slice(0, 3).map((d) => ({
    name: d.sensor_name.replace(/_/g, " ").slice(0, 14),
    value: "—",
    status: "OK" as const,
  }));
}

const CAMPAIGN_MAX_HOURS: Record<string, number> = {
  SRF: 8000, HHPD: 6000, FS: 12000, HAGCC: 5000,
  APT: 4000, TCMS: 10000, CGP: 15000, HPAK: 3000,
};

function resolveRulHours(
  assetType: string,
  health: BackendAssetHealth | undefined,
): number | undefined {
  if (health?.rul_hours != null) return health.rul_hours;
  const campaign = health?.campaign_hours ?? 0;
  const maxH = CAMPAIGN_MAX_HOURS[assetType] ?? 8000;
  return Math.round(Math.max(0, maxH - campaign) * 10) / 10;
}

function assetToNode(
  asset: BackendAsset,
  health: BackendAssetHealth | undefined,
  sensors: SensorReading[],
  nextId: string | null,
  position: { x: number; y: number },
): FlowNode {
  const score = health?.health_score ?? 100;
  const status = health?.status ?? "healthy";
  const resolvedRulHours = resolveRulHours(asset.asset_type, health);

  return {
    id: asset.id,
    title: asset.name,
    subtitle: asset.asset_type,
    x: position.x,
    y: position.y,
    type: "telemetry",
    statusColor: healthToColor(score, status),
    status: healthToFlowStatus(score, status),
    nextNodes: nextId ? [nextId] : [],
    rulDays: resolvedRulHours != null ? Math.max(1, Math.round(resolvedRulHours / 24)) : undefined,
    sensors,
    // ML/health fields for expanded node panel
    healthScore: score,
    rulHours: resolvedRulHours,
    anomalyScore: health?.anomaly_score ?? undefined,
    faultClass: health?.fault_classification ?? undefined,
    campaignHours: health?.campaign_hours ?? undefined,
    activeAlerts: health?.active_alerts_count ?? 0,
    lastMaintenance: health?.last_maintenance ?? null,
  };
}

async function resolveFactory(factoryKey: FactoryWorkflowKey): Promise<BackendFactory | null> {
  const code = FACTORY_CODES[factoryKey];
  const factories = await apiList<BackendFactory>("/api/v1/factories/");
  return factories.find((f) => f.code === code) ?? null;
}

interface SnapshotReading {
  sensor_name: string;
  value: number;
  unit: string;
  time: string;
  quality_flag?: number;
}

interface SnapshotResponse {
  snapshot: Record<string, SnapshotReading[]>;
  timestamp: string;
}

/**
 * Fetch only the latest sensor values for all assets in a factory — single
 * request used by the 10s live-data poll (much cheaper than full node reload).
 */
export async function fetchFactorySnapshot(
  factoryId: string,
): Promise<Record<string, SensorReading[]>> {
  const data = await apiJson<SnapshotResponse>(
    `/api/v1/telemetry/snapshot/?factory=${factoryId}`,
  );

  const result: Record<string, SensorReading[]> = {};
  for (const [assetId, readings] of Object.entries(data.snapshot)) {
    result[assetId] = buildSensors([], readings);
  }
  return result;
}

export function mergeNodePositions(prev: FlowNode[], next: FlowNode[]): FlowNode[] {
  const posById = new Map(prev.map((n) => [n.id, { x: n.x, y: n.y }]));
  return next.map((n) => {
    const pos = posById.get(n.id);
    return pos ? { ...n, x: pos.x, y: pos.y } : n;
  });
}

/** Apply snapshot sensor readings into existing nodes by asset ID. */
export function applySnapshotToNodes(
  nodes: FlowNode[],
  snapshot: Record<string, SensorReading[]>,
): FlowNode[] {
  return nodes.map((node) => {
    const sensors = snapshot[node.id];
    if (!sensors?.length) return node;
    return { ...node, sensors };
  });
}

/** Merge fresh telemetry/health into existing nodes without resetting canvas positions. */
export function mergeNodeTelemetry(prev: FlowNode[], next: FlowNode[]): FlowNode[] {
  const nextById = new Map(next.map((n) => [n.id, n]));
  return prev.map((node) => {
    const fresh = nextById.get(node.id);
    if (!fresh) return node;
    return {
      ...node,
      sensors: fresh.sensors,
      status: fresh.status,
      statusColor: fresh.statusColor,
      rulDays: fresh.rulDays,
      rulHours: fresh.rulHours,
      healthScore: fresh.healthScore,
      anomalyScore: fresh.anomalyScore,
      faultClass: fresh.faultClass,
      campaignHours: fresh.campaignHours,
      activeAlerts: fresh.activeAlerts,
      lastMaintenance: fresh.lastMaintenance,
      subtitle: fresh.subtitle,
      title: fresh.title,
    };
  });
}

interface WsTelemetryCell {
  asset_id?: string;
  sensor_name?: string;
  value?: string;
  status?: string;
}

function wsStatusToSensor(status?: string): SensorReading["status"] {
  if (status === "critical") return "CRITICAL";
  if (status === "warning") return "HIGH";
  return "OK";
}

/** Patch node sensor readings from /ws/telemetry broadcast cells. */
export function applyWsCellsToNodes(nodes: FlowNode[], cells: WsTelemetryCell[]): FlowNode[] {
  if (!cells.length) return nodes;

  const byAsset = new Map<string, WsTelemetryCell[]>();
  for (const cell of cells) {
    if (!cell.asset_id || !cell.sensor_name) continue;
    const list = byAsset.get(cell.asset_id) ?? [];
    list.push(cell);
    byAsset.set(cell.asset_id, list);
  }

  return nodes.map((node) => {
    const updates = byAsset.get(node.id);
    if (!updates?.length || !node.sensors?.length) return node;

    const sensors = node.sensors.map((sensor) => {
      const match = updates.find((u) => {
        const raw = u.sensor_name!.toLowerCase();
        const display = sensor.name.toLowerCase();
        return display === raw.replace(/_/g, " ").slice(0, 14) || display.includes(raw.slice(0, 8));
      });
      if (!match?.value) return sensor;
      return {
        ...sensor,
        value: match.value,
        status: wsStatusToSensor(match.status),
      };
    });

    return { ...node, sensors };
  });
}

export async function fetchFactoryWorkflowNodes(
  factoryKey: FactoryWorkflowKey,
): Promise<FlowNode[]> {
  const factory = await resolveFactory(factoryKey);
  if (!factory) {
    throw new Error(`Factory ${FACTORY_CODES[factoryKey]} not found`);
  }

  const assets = await apiList<BackendAsset>(
    `/api/v1/assets/?factory_id=${factory.id}`,
  );

  const order = ASSET_ORDER[factoryKey];
  const layout = ASSET_LAYOUT[factoryKey];
  const sorted = [...assets].sort((a, b) => {
    const ai = order.indexOf(a.asset_type);
    const bi = order.indexOf(b.asset_type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const nodes: FlowNode[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const asset = sorted[i];
    const nextAsset = sorted[i + 1];

    const [health, telemetry, sensorDefs] = await Promise.all([
      apiJson<BackendAssetHealth>(`/api/v1/assets/${asset.id}/health/`).catch(() => undefined),
      apiJson<{ readings: TelemetryReading[] }>(
        `/api/v1/telemetry/${asset.id}/?limit=50&order=desc`,
      ).catch(() => ({ readings: [] })),
      apiList<BackendSensorDef>(`/api/v1/sensors/?asset=${asset.id}`).catch(() => []),
    ]);

    const position = layout[asset.asset_type] ?? {
      x: i * NODE_LAYOUT_STEP,
      y: 0,
    };

    nodes.push(
      assetToNode(
        asset,
        health,
        buildSensors(sensorDefs, telemetry.readings ?? []),
        nextAsset?.id ?? null,
        position,
      ),
    );
  }

  return nodes;
}
