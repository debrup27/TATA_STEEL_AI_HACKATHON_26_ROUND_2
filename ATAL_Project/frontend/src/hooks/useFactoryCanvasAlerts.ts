import { useState, useEffect, useRef } from "react";
import { apiList } from "@/lib/api";
import type { FlowNode } from "@/components/workflow/types";

export interface CanvasAlertMessage {
  id: string;
  assetId: string;
  assetName: string;
  kind: "system" | "predictive";
  text: string;
  severity: "critical" | "warning" | "info";
  priority?: "immediate" | "urgent" | "monitor";
}

interface NodeAlert {
  id: string;
  asset_id?: string;
  sensor_name?: string;
  alarm_type?: string;
  severity?: string;
  message?: string;
}

interface ReportRec {
  step?: string;
  rationale?: string;
}

interface MaintenanceReportRow {
  id: string;
  asset: string;
  risk_level?: string;
  diagnosis?: string;
  report_text?: string;
  recommendations?: ReportRec[];
  immediate_actions?: string[];
}

function priorityFromText(text: string): CanvasAlertMessage["priority"] {
  const lower = text.toLowerCase();
  if (lower.includes("immediate") || lower.includes("shutdown") || lower.includes("critical")) return "immediate";
  if (lower.includes("urgent") || lower.includes("replace") || lower.includes("inspect")) return "urgent";
  return "monitor";
}

function alertSeverity(sev?: string): CanvasAlertMessage["severity"] {
  const s = (sev ?? "").toLowerCase();
  if (s === "critical" || s === "trip") return "critical";
  if (s === "warning" || s === "high") return "warning";
  return "info";
}

const MAX_VISIBLE = 3;
const ROTATE_INTERVAL_MS = 4500;

/** Fallback alerts removed — canvas shows empty state when backend has no alerts. */
/** Live system + predictive messages for factory canvas nodes, scoped to the active factory. */
export function useFactoryCanvasAlerts(
  nodes: FlowNode[],
  factoryCode?: "F1" | "F2",
): CanvasAlertMessage[] {
  const [allMessages, setAllMessages] = useState<CanvasAlertMessage[]>([]);
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);

  const nodeKey = nodes.map((n) => n.id).join(",");

  useEffect(() => {
    if (!nodes.length) return;

    const assetIds = new Set(nodes.map((n) => n.id));
    const nameById = new Map(nodes.map((n) => [n.id, n.title]));

    let cancelled = false;

    const load = async () => {
      const [factories, assets] = await Promise.all([
        apiList<{ id: string; code: string }>("/api/v1/factories/").catch(() => [] as { id: string; code: string }[]),
        apiList<{ id: string; factory?: string }>("/api/v1/assets/").catch(() => [] as { id: string; factory?: string }[]),
      ]);
      const factoryId = factoryCode
        ? factories.find((f) => f.code === factoryCode)?.id
        : undefined;
      const alertUrl = factoryId
        ? `/api/v1/alerts/?limit=50&factory_id=${encodeURIComponent(factoryId)}`
        : "/api/v1/alerts/?limit=50";

      const [alerts, reports] = await Promise.all([
        apiList<NodeAlert>(alertUrl).catch(() => [] as NodeAlert[]),
        apiList<MaintenanceReportRow>("/api/v1/reports/?limit=30").catch(() => [] as MaintenanceReportRow[]),
      ]);
      if (cancelled) return;

      const assetFactory = new Map(assets.map((a) => [a.id, a.factory]));
      const inFactory = (assetId: string) =>
        !factoryId || assetFactory.get(assetId) === factoryId;

      const next: CanvasAlertMessage[] = [];

      for (const a of alerts) {
        const aid = a.asset_id;
        if (!aid || !assetIds.has(aid)) continue;
        next.push({
          id: `alert-${a.id}`,
          assetId: aid,
          assetName: nameById.get(aid) ?? "Equipment",
          kind: "system",
          text: a.message ?? `${a.alarm_type ?? "Sensor"} threshold breach`,
          severity: alertSeverity(a.severity),
        });
      }

      for (const r of reports) {
        if (!assetIds.has(r.asset) || !inFactory(r.asset)) continue;
        const assetName = nameById.get(r.asset) ?? "Equipment";

        for (const action of r.immediate_actions ?? []) {
          if (!action?.trim()) continue;
          next.push({
            id: `pred-${r.id}-ia-${action.slice(0, 12)}`,
            assetId: r.asset,
            assetName,
            kind: "predictive",
            text: action.trim().slice(0, 160),
            severity: r.risk_level === "critical" ? "critical" : r.risk_level === "high" ? "warning" : "info",
            priority: "immediate",
          });
        }

        for (const item of r.recommendations ?? []) {
          const step = item.step ?? item.rationale ?? "";
          if (!step.trim()) continue;
          next.push({
            id: `pred-${r.id}-rec-${step.slice(0, 12)}`,
            assetId: r.asset,
            assetName,
            kind: "predictive",
            text: step.trim().slice(0, 160),
            severity: r.risk_level === "critical" ? "critical" : "warning",
            priority: priorityFromText(step),
          });
        }

        if ((r.immediate_actions?.length ?? 0) === 0 && (r.recommendations?.length ?? 0) === 0 && r.diagnosis) {
          next.push({
            id: `pred-${r.id}-diag`,
            assetId: r.asset,
            assetName,
            kind: "predictive",
            text: r.diagnosis.slice(0, 160),
            severity: alertSeverity(r.risk_level),
            priority: priorityFromText(r.diagnosis),
          });
        }
      }

      // Sort: critical system first, then predictive immediate
      const rank = (m: CanvasAlertMessage) => {
        if (m.kind === "system" && m.severity === "critical") return 0;
        if (m.kind === "predictive" && m.priority === "immediate") return 1;
        if (m.severity === "warning") return 2;
        return 3;
      };
      next.sort((a, b) => rank(a) - rank(b));

      setAllMessages(next);
      offsetRef.current = 0;
      setOffset(0);
    };

    void load();
    const interval = setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [nodeKey, factoryCode]);

  // Rotate visible window independently of API refetch
  useEffect(() => {
    if (allMessages.length <= MAX_VISIBLE) return;
    const timer = setInterval(() => {
      offsetRef.current = (offsetRef.current + 1) % allMessages.length;
      setOffset(offsetRef.current);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [allMessages.length]);

  if (!nodes.length || !allMessages.length) return [];

  // Slice a rotating window of MAX_VISIBLE from the full list
  const total = allMessages.length;
  const visible: CanvasAlertMessage[] = [];
  for (let i = 0; i < Math.min(MAX_VISIBLE, total); i++) {
    visible.push(allMessages[(offset + i) % total]);
  }
  return visible;
}
