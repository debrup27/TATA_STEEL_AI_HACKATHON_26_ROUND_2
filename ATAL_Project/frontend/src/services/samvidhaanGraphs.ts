import { apiJson, apiList } from "@/lib/api";
import { fetchPlantKpis, type PlantKpis } from "./reports";
import { fetchRiskAssets } from "./prediction";

export interface ChartSeries {
  label: string;
  values: number[];
  color?: string;
}

export interface LabeledValue {
  label: string;
  value: number;
}

export interface SamvidhaanAssetGraph {
  id: string;
  assetId: string;
  code: string;
  date: string;
  asset: string;
  factory: string;
  assetType: string;
  healthScore: number;
  rulDays: number;
  anomalyScore: number;
  urgencyScore: number;
  description: string;
  sensorLabel: string;
  thresholdLabel: string;
  conditionTrend: number[];
  healthTrend: number[];
  alertCount30d: number;
}

export interface SamvidhaanDashboardData {
  assets: SamvidhaanAssetGraph[];
  plantKpis: PlantKpis;
  maintenanceMix: LabeledValue[];
  alertSeverityMix: LabeledValue[];
  fleetHealth: LabeledValue[];
  urgencyRanking: LabeledValue[];
}

interface AssetRow {
  id: string;
  name: string;
  asset_type?: string;
  factory?: string;
}

interface HealthRow {
  health_score?: number;
  rul_hours?: number | null;
  anomaly_score?: number | null;
  active_alerts_count?: number;
}

interface TelemetryRow {
  time: string;
  sensor_name: string;
  value: number;
  unit?: string;
}

interface MaintenanceRow {
  id: string;
  asset?: string;
  asset_name?: string;
  event_type?: string;
  description?: string;
  downtime_hours?: number;
  completed_date?: string | null;
}

interface AlertRow {
  severity?: string;
  asset_id?: string;
  created_at?: string;
}

function normalizeSeries(values: number[], points = 16): number[] {
  if (!values.length) return Array(points).fill(50);
  const slice = values.slice(-points);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const span = max - min || 1;
  const scaled = slice.map((v) => Math.round(((v - min) / span) * 100));
  while (scaled.length < points) {
    scaled.unshift(scaled[0] ?? 50);
  }
  return scaled.slice(-points);
}

function buildHealthTrend(health: number, points = 16): number[] {
  const start = Math.min(100, health + 18);
  return Array.from({ length: points }, (_, i) =>
    Math.round(start - ((start - health) * i) / Math.max(points - 1, 1)),
  );
}

function pickSensorName(readings: TelemetryRow[]): string | undefined {
  const vibr = readings.find((r) => /vibr|bpfo|pressure|temp/i.test(r.sensor_name));
  return vibr?.sensor_name ?? readings[0]?.sensor_name;
}

function severityBucket(sev?: string): string {
  const s = (sev ?? "info").toLowerCase();
  if (s === "trip" || s === "critical") return "Critical";
  if (s === "alert" || s === "warning" || s === "high") return "Warning";
  return "Info";
}

export async function fetchSamvidhaanDashboard(): Promise<SamvidhaanDashboardData> {
  const [assets, maintenance, alerts, plantKpis, riskAssets] = await Promise.all([
    apiList<AssetRow>("/api/v1/assets/").catch(() => [] as AssetRow[]),
    apiList<MaintenanceRow>("/api/v1/maintenance/events/?limit=100").catch(
      () => [] as MaintenanceRow[],
    ),
    apiList<AlertRow>("/api/v1/alerts/?limit=200").catch(() => [] as AlertRow[]),
    fetchPlantKpis().catch(
      () =>
        ({
          proactive_maintenance_rate: 0,
          avg_rul_at_intervention: 0,
          false_alarm_rate: 0,
          mean_time_to_repair_hrs: 0,
          period_days: 30,
        }) as PlantKpis,
    ),
    fetchRiskAssets().catch(() => []),
  ]);

  const riskById = new Map(riskAssets.map((r) => [r.id, r]));

  const maintenanceMixMap = new Map<string, number>();
  for (const e of maintenance) {
    const key = (e.event_type ?? "other").replace(/_/g, " ").toUpperCase();
    maintenanceMixMap.set(key, (maintenanceMixMap.get(key) ?? 0) + 1);
  }
  const maintenanceMix = [...maintenanceMixMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const alertMixMap = new Map<string, number>();
  for (const a of alerts) {
    const bucket = severityBucket(a.severity);
    alertMixMap.set(bucket, (alertMixMap.get(bucket) ?? 0) + 1);
  }
  const alertSeverityMix = ["Critical", "Warning", "Info"].map((label) => ({
    label,
    value: alertMixMap.get(label) ?? 0,
  }));

  const profiles: SamvidhaanAssetGraph[] = [];

  for (const asset of assets) {
    const health = await apiJson<HealthRow>(`/api/v1/assets/${asset.id}/health/`).catch(
      () => ({}) as HealthRow,
    );
    const healthScore = Math.round(health.health_score ?? 80);
    const rulHours = health.rul_hours ?? null;
    const rulDays = rulHours != null ? Math.max(1, Math.round(rulHours / 24)) : 0;
    const anomalyScore = Math.round((health.anomaly_score ?? 0) * 100);
    const risk = riskById.get(asset.id);

    const telemetry = await apiJson<{ readings: TelemetryRow[] }>(
      `/api/v1/telemetry/${asset.id}/?limit=48&order=asc`,
    ).catch(() => ({ readings: [] as TelemetryRow[] }));

    const sensorName = pickSensorName(telemetry.readings);
    const sensorReadings = sensorName
      ? telemetry.readings.filter((r) => r.sensor_name === sensorName).map((r) => r.value)
      : [];

    const assetAlerts = alerts.filter((a) => a.asset_id === asset.id).length;

    const latestMaint = maintenance
      .filter((m) => m.asset === asset.id)
      .sort((a, b) => (b.completed_date ?? "").localeCompare(a.completed_date ?? ""))[0];

    profiles.push({
      id: asset.id,
      assetId: asset.id,
      code: asset.asset_type ?? asset.id.slice(0, 8).toUpperCase(),
      date: new Date().toISOString().slice(0, 10),
      asset: asset.name,
      factory: typeof asset.factory === "string" ? asset.factory : "Plant",
      assetType: asset.asset_type ?? "ASSET",
      healthScore,
      rulDays,
      anomalyScore,
      urgencyScore: risk?.score ?? Math.max(0, 100 - healthScore),
      description:
        latestMaint?.description ??
        `Health ${healthScore}% · ${assetAlerts} active alerts · RUL ${
          rulDays > 0 ? `${rulDays}d` : "pending ML"
        }`,
      sensorLabel: sensorName?.replace(/_/g, " ") ?? "Condition index",
      thresholdLabel: sensorName ? `Live ${sensorName.replace(/_/g, " ")}` : "Fleet health index",
      conditionTrend: normalizeSeries(sensorReadings.length ? sensorReadings : [healthScore]),
      healthTrend: buildHealthTrend(healthScore),
      alertCount30d: assetAlerts,
    });
  }

  profiles.sort((a, b) => b.urgencyScore - a.urgencyScore);

  const fleetHealth = profiles.map((p) => ({
    label: p.assetType,
    value: p.healthScore,
  }));

  const urgencyRanking = profiles.slice(0, 8).map((p) => ({
    label: p.assetType,
    value: p.urgencyScore,
  }));

  return {
    assets: profiles,
    plantKpis,
    maintenanceMix,
    alertSeverityMix,
    fleetHealth,
    urgencyRanking,
  };
}
