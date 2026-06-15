import { apiJson, apiList, getAccessToken, ApiError } from "@/lib/api";
import { createAssetAliasResolver, resolveLogModuleLabel, isUuid } from "@/lib/assetAliases";
import { assetSystemTag } from "@/lib/asset-system-tag";
import { formatLogTimeKolkata, logSortKey } from "@/lib/log-time";
import { mapTelemetryCell } from "@/lib/mappers";
import { formatAlertLogText, formatAlertSeverity, formatReportLogText, normalizeSystemEmitTags, SYSTEM_EMIT_TAG } from "@/lib/systemLogFormat";
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
/** System log stream — poll backend + drip new rows into the UI. */
export const LOG_STREAM_POLL_MS = 6500;
export const LOG_STREAM_REVEAL_MS = 1400;
export const CELL_TICK_INTERVAL = 2000;

function formatTime(iso?: string | null): string {
  return formatLogTimeKolkata(iso);
}

type RawLogRow = {
  id: number;
  time: string;
  sortAt: number;
  module: string;
  text: string;
};

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

    const resolveTag = (input: {
      id?: string | null;
      name?: string | null;
      code?: string | null;
    }): string => {
      const catalogName = resolveLogModuleLabel(resolveModule, input);
      const row = catalogName
        ? assets.find((a) => a.id === input.id || a.name === catalogName)
        : undefined;
      if (catalogName) {
        return assetSystemTag({
          name: catalogName,
          asset_type: row?.asset_type,
          code: input.code ?? row?.asset_type,
        });
      }
      if (input.name?.trim() && !isUuid(input.name)) {
        return assetSystemTag({ name: input.name, code: input.code });
      }
      return SYSTEM_EMIT_TAG;
    };

    const alertEntries: RawLogRow[] = alerts
      .map((a, i) => {
        const assetModule = resolveTag({
          id: a.asset_id,
          name: a.asset_name,
        });
        const sev = formatAlertSeverity(a.severity);
        const created = a.created_at ?? null;
        return {
          id: 1000 + i,
          time: formatTime(created),
          sortAt: logSortKey(created),
          module: assetModule,
          text: normalizeSystemEmitTags(`[${sev}] ${formatAlertLogText(a)}`),
        };
      });

    const eventEntries: RawLogRow[] = events
      .map((e, i) => {
        const assetModule = resolveTag({
          id: typeof e.asset === "string" ? e.asset : undefined,
          name: e.asset_name,
        });
        const eventLabel = e.event_type
          ? e.event_type.toUpperCase().replace(/_/g, " ")
          : "EVENT";
        const created = e.completed_date ?? e.created_at ?? null;
        return {
          id: 2000 + i,
          time: formatTime(created),
          sortAt: logSortKey(created),
          module: assetModule,
          text: normalizeSystemEmitTags(
            `[MAINT] ${eventLabel}: ${(e.description ?? "").slice(0, 100)}`,
          ),
        };
      });

    const reportEntries: RawLogRow[] = reports
      .map((r, i) => {
        const assetModule = resolveTag({
          id: typeof r.asset === "string" ? r.asset : undefined,
          name: r.asset_name,
          code: r.asset_code,
        });
        const created = r.created_at ?? null;
        return {
          id: 3000 + i,
          time: formatTime(created),
          sortAt: logSortKey(created),
          module: assetModule,
          text: normalizeSystemEmitTags(
            `[${(r.risk_level ?? "INFO").toUpperCase()}] ${formatReportLogText({
              ...r,
              asset_code: assetModule === SYSTEM_EMIT_TAG ? undefined : assetModule,
            })}`,
          ),
        };
      });

    const merged = [...alertEntries, ...eventEntries, ...reportEntries].sort(
      (a, b) => a.sortAt - b.sortAt,
    );
    const window = merged.slice(-limit);

    return {
      entries: window.map((entry) => {
          const { sortAt: _ignored, ...rest } = entry;
          void _ignored;
          return rest;
        }),
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
