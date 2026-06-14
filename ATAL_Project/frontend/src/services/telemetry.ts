import { apiJson, apiList, getAccessToken, ApiError } from "@/lib/api";
import { createAssetAliasResolver, resolveLogModuleLabel } from "@/lib/assetAliases";
import { mapTelemetryCell } from "@/lib/mappers";
import { formatAlertLogText, formatAlertSeverity, formatReportLogText } from "@/lib/systemLogFormat";
import type { TelemetryCell, LogEntry } from "./types";

const FALLBACK_CELLS: TelemetryCell[] = [
  { label: "SYS_CK", value: "—", status: "nominal" },
  { label: "FLW_RT", value: "—", status: "nominal" },
  { label: "ANOM_ST", value: "—", status: "nominal" },
  { label: "VLV_04", value: "—", status: "nominal" },
  { label: "BF1_PRS", value: "—", status: "nominal" },
  { label: "BF1_TMP", value: "—", status: "nominal" },
];

/** Placeholder cells shown before the first API / WS payload arrives. */
export function getInitialTelemetryCells(): TelemetryCell[] {
  return FALLBACK_CELLS.map((c) => ({ ...c }));
}

function normalizeCellStatus(status?: string): TelemetryCell["status"] {
  if (status === "critical") return "critical";
  if (status === "warning") return "warning";
  return "nominal";
}

/** Merge WebSocket telemetry cells into the current display set (match by label). */
export function applyTelemetryWsUpdate(
  prev: TelemetryCell[],
  incoming: TelemetryCell[],
): TelemetryCell[] {
  if (!incoming.length) return prev;

  const byLabel = new Map(prev.map((c) => [c.label, c]));
  for (const raw of incoming) {
    if (!raw.label) continue;
    byLabel.set(raw.label, {
      label: raw.label,
      value: raw.value ?? "—",
      status: normalizeCellStatus(raw.status),
    });
  }

  const merged = prev.map((c) => byLabel.get(c.label) ?? c);
  for (const raw of incoming) {
    if (!raw.label || merged.some((m) => m.label === raw.label)) continue;
    merged.push({
      label: raw.label,
      value: raw.value ?? "—",
      status: normalizeCellStatus(raw.status),
    });
  }
  return merged.slice(0, 6);
}

export async function fetchTelemetryCells(assetId?: string): Promise<TelemetryCell[]> {
  try {
    const assets = await apiList<{ id: string }>("/api/v1/assets/");
    const targetId = assetId ?? assets[0]?.id;
    if (!targetId) return FALLBACK_CELLS;

    const ts = await apiJson<{
      readings: { sensor_name: string; value: number; unit: string; time?: string }[];
    }>(`/api/v1/telemetry/${targetId}/?limit=20&order=desc`);

    if (!ts.readings?.length) return FALLBACK_CELLS;

    const latestBySensor = new Map<string, (typeof ts.readings)[0]>();
    for (const r of ts.readings) {
      const prev = latestBySensor.get(r.sensor_name);
      if (!prev || (r.time && prev.time && r.time > prev.time) || !prev.time) {
        latestBySensor.set(r.sensor_name, r);
      }
    }

    return Array.from(latestBySensor.values())
      .slice(0, 6)
      .map((r) =>
        mapTelemetryCell({
          label: r.sensor_name.replace(/_/g, " ").slice(0, 10),
          value: `${r.value.toFixed(1)}${r.unit}`,
          status: "nominal",
        }),
      );
  } catch {
    return FALLBACK_CELLS;
  }
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

function formatTime(iso?: string | null): string {
  if (!iso) return new Date().toTimeString().slice(0, 8);
  return iso.slice(11, 19) || new Date().toTimeString().slice(0, 8);
}

export type AlertLogsFetchStatus = "ok" | "auth_required" | "error";

export interface AlertLogsResult {
  entries: LogEntry[];
  status: AlertLogsFetchStatus;
}

/** Live system log stream: alerts, maintenance events, and AI maintenance reports. */
export async function fetchAlertLogs(limit = 50): Promise<LogEntry[]> {
  const result = await fetchAlertLogsDetailed(limit);
  return result.entries;
}

export async function fetchAlertLogsDetailed(limit = 50): Promise<AlertLogsResult> {
  if (typeof window !== "undefined" && !getAccessToken()) {
    return { entries: [], status: "auth_required" };
  }

  try {
    const [alerts, events, reports, assets] = await Promise.all([
      apiList<{
        id: string; message?: string; alarm_type?: string; asset_id?: string;
        severity?: string; asset_name?: string; created_at?: string;
      }>("/api/v1/alerts/?acknowledged=false&limit=40"),
      apiList<{
        id: string; event_type?: string; description?: string;
        asset?: string; asset_name?: string; created_at?: string; completed_date?: string;
      }>("/api/v1/maintenance/events/?limit=25"),
      apiList<{
        id: string; diagnosis?: string; risk_level?: string;
        asset?: string; asset_name?: string; asset_code?: string; created_at?: string;
        recommendations?: { step?: string; rationale?: string }[];
        immediate_actions?: string[];
      }>("/api/v1/reports/?limit=15"),
      apiList<{ id: string; name: string; asset_type?: string }>("/api/v1/assets/"),
    ]);

    const resolveModule = createAssetAliasResolver(assets);

    const alertEntries: LogEntry[] = alerts
      .map((a, i) => {
        const assetModule = resolveLogModuleLabel(resolveModule, {
          id: a.asset_id,
          name: a.asset_name,
        });
        if (!assetModule) return null;
        const sev = formatAlertSeverity(a.severity);
        return {
          id: 1000 + i,
          time: formatTime(a.created_at),
          module: assetModule,
          text: `[${sev}] ${formatAlertLogText(a)}`,
        };
      })
      .filter((e): e is LogEntry => e !== null);

    const eventEntries: LogEntry[] = events
      .map((e, i) => {
        const assetModule = resolveLogModuleLabel(resolveModule, {
          id: typeof e.asset === "string" ? e.asset : undefined,
          name: e.asset_name,
        });
        if (!assetModule) return null;
        const eventLabel = e.event_type
          ? e.event_type.toUpperCase().replace(/_/g, " ")
          : "EVENT";
        return {
          id: 2000 + i,
          time: formatTime(e.completed_date ?? e.created_at),
          module: assetModule,
          text: `[MAINT] ${eventLabel}: ${(e.description ?? "").slice(0, 100)}`,
        };
      })
      .filter((e): e is LogEntry => e !== null);

    const reportEntries: LogEntry[] = reports
      .map((r, i) => {
        const assetModule = resolveLogModuleLabel(resolveModule, {
          id: typeof r.asset === "string" ? r.asset : undefined,
          name: r.asset_name,
          code: r.asset_code,
        });
        if (!assetModule) return null;
        return {
          id: 3000 + i,
          time: formatTime(r.created_at),
          module: assetModule,
          text: `[${(r.risk_level ?? "INFO").toUpperCase()}] ${formatReportLogText({
            ...r,
            asset_name: assetModule,
          })}`,
        };
      })
      .filter((e): e is LogEntry => e !== null);

    return {
      entries: [...alertEntries, ...eventEntries, ...reportEntries]
        .sort((a, b) => b.time.localeCompare(a.time))
        .slice(0, limit),
      status: "ok",
    };
  } catch (err) {
    const status = err instanceof ApiError && err.status === 401 ? "auth_required" : "error";
    if (process.env.NODE_ENV !== "production") {
      console.warn("[fetchAlertLogs] failed:", err);
    }
    return { entries: [], status };
  }
}
