import { useState, useEffect } from "react";
import { apiList } from "@/lib/api";

export interface NodeAlert {
  id: string;
  sensor_name?: string;
  alarm_type?: string;
  severity?: string;
  message?: string;
  value?: number;
  unit?: string;
  created_at?: string;
  acknowledged?: boolean;
}

export interface NodeRecommendation {
  step: string;
  priority: "immediate" | "urgent" | "monitor";
}

export interface NodeInsights {
  alerts: NodeAlert[];
  recommendations: NodeRecommendation[];
  riskLevel?: string;
  diagnosis?: string;
  isLoading: boolean;
}

interface ReportRec {
  step?: string;
  rationale?: string;
  iso_ref?: string;
}

interface MaintenanceReportRow {
  id: string;
  risk_level?: string;
  diagnosis?: string;
  report_text?: string;
  recommendations?: ReportRec[];
  immediate_actions?: string[];
}

function priorityFromText(text: string): NodeRecommendation["priority"] {
  const lower = text.toLowerCase();
  if (lower.includes("immediate") || lower.includes("shutdown") || lower.includes("critical")) return "immediate";
  if (lower.includes("urgent") || lower.includes("replace") || lower.includes("inspect")) return "urgent";
  return "monitor";
}

function buildRecommendations(report: MaintenanceReportRow): NodeRecommendation[] {
  const recs: NodeRecommendation[] = [];

  for (const action of report.immediate_actions ?? []) {
    if (!action?.trim()) continue;
    recs.push({ step: action.trim().slice(0, 140), priority: "immediate" });
    if (recs.length >= 4) return recs;
  }

  for (const item of report.recommendations ?? []) {
    const step = item.step ?? item.rationale ?? "";
    if (!step.trim()) continue;
    recs.push({ step: step.trim().slice(0, 140), priority: priorityFromText(step) });
    if (recs.length >= 4) return recs;
  }

  if (recs.length === 0 && report.report_text) {
    for (const line of report.report_text.split("\n")) {
      const trimmed = line.trim().replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "");
      if (!trimmed || trimmed.length < 10) continue;
      recs.push({ step: trimmed.slice(0, 140), priority: priorityFromText(trimmed) });
      if (recs.length >= 4) break;
    }
  }

  if (recs.length === 0 && report.diagnosis) {
    recs.push({ step: report.diagnosis.slice(0, 140), priority: priorityFromText(report.diagnosis) });
  }

  return recs;
}

/**
 * Fetch asset-specific alerts and maintenance recommendations when a node is expanded.
 */
export function useNodeInsights(assetId: string | null, isExpanded: boolean): NodeInsights {
  const [alerts, setAlerts] = useState<NodeAlert[]>([]);
  const [recommendations, setRecommendations] = useState<NodeRecommendation[]>([]);
  const [riskLevel, setRiskLevel] = useState<string | undefined>();
  const [diagnosis, setDiagnosis] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!assetId || !isExpanded) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [alertData, reports] = await Promise.all([
          apiList<NodeAlert>(`/api/v1/alerts/?asset_id=${assetId}&limit=10`).catch(() => [] as NodeAlert[]),
          apiList<MaintenanceReportRow>(`/api/v1/reports/?asset=${assetId}&limit=3`).catch(() => [] as MaintenanceReportRow[]),
        ]);
        if (cancelled) return;

        setAlerts(alertData);

        const report = reports[0];
        if (report) {
          setRiskLevel(report.risk_level ?? undefined);
          setDiagnosis(report.diagnosis ?? undefined);
          setRecommendations(buildRecommendations(report));
        } else if (alertData.length > 0) {
          // Fallback recommendations from active alerts when no report yet
          setRecommendations(
            alertData.slice(0, 3).map((a) => ({
              step: `Investigate ${a.alarm_type ?? "sensor"} alert: ${(a.message ?? "").slice(0, 90)}`,
              priority: a.severity === "critical" || a.severity === "trip" ? "immediate" as const : "urgent" as const,
            })),
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    const interval = setInterval(() => void load(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [assetId, isExpanded]);

  return { alerts, recommendations, riskLevel, diagnosis, isLoading };
}
