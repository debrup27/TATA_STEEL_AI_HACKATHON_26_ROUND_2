import { assetSystemTag } from "@/lib/asset-system-tag";

export const SYSTEM_EMIT_TAG = "SYSTEM EMIT";

/** Replace legacy unknown/plant tags with canonical system-emit label. */
export function normalizeSystemEmitTags(text: string): string {
  return text
    .replace(/\[UNKNOWN\]/gi, `[${SYSTEM_EMIT_TAG}]`)
    .replace(/\[PLANT\]/gi, `[${SYSTEM_EMIT_TAG}]`);
}

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** e.g. hysteresis_deviation_um → Hysteresis deviation */
export function humanizeSensorName(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUm\b/g, "μm")
    .replace(/\bMm\b/g, "mm")
    .replace(/\bBar\b/g, "bar")
    .replace(/\bA\b/g, "A");
}

export function stripUuids(text: string): string {
  return text.replace(UUID_RE, "").replace(/\s{2,}/g, " ").trim();
}

export function humanizeHealthScoreText(text: string): string {
  return text
    .replace(/health_score\s*=\s*(\d+(?:\.\d+)?)/gi, (_, n) => `health ${Math.round(Number(n))}%`)
    .replace(/\(severely degraded\)/gi, "(critically low)")
    .replace(/shows critical condition with/gi, "is in critical condition —");
}

function roundReading(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n >= 100 ? n.toFixed(0) : n.toFixed(1);
}

export function formatAlertLogText(alert: {
  message?: string;
  alarm_type?: string;
  severity?: string;
}): string {
  const msg = alert.message?.trim();
  if (msg) {
    const thresholdMatch = msg.match(
      /^(Trip|Alert|Abnormality) threshold breached:\s*([a-z0-9_]+)\s*=\s*([\d.]+)\s*(.*)$/i,
    );
    if (thresholdMatch) {
      const [, kind, sensor, value, unit] = thresholdMatch;
      const sensorLabel = humanizeSensorName(sensor);
      const limitLabel =
        kind.toLowerCase() === "trip" || kind.toLowerCase() === "abnormality"
          ? "Abnormality limit exceeded"
          : "Warning threshold exceeded";
      const unitLabel = unit.trim();
      return `${sensorLabel} — ${limitLabel} (${roundReading(value)}${unitLabel ? ` ${unitLabel}` : ""})`;
    }

    const pressureMatch = msg.match(
      /^([A-Z]+) header pressure below (\d+) bar:\s*([a-z0-9_]+)\s*=\s*([\d.]+)\s*(.*)$/i,
    );
    if (pressureMatch) {
      const [, code, limit, sensor, value, unit] = pressureMatch;
      const sensorLabel = humanizeSensorName(sensor);
      return `${code} ${sensorLabel} low — ${roundReading(value)} ${unit.trim() || "bar"} (limit ${limit} bar)`;
    }

    return humanizeHealthScoreText(stripUuids(msg));
  }

  const sensorLabel = alert.alarm_type
    ? humanizeSensorName(alert.alarm_type.replace(/_(trip|alert|warning)$/i, ""))
    : "Sensor";
  const sev = (alert.severity ?? "alert").toLowerCase();
  if (sev === "trip") return `${sensorLabel} — Abnormality limit exceeded`;
  if (sev === "alert" || sev === "warning") return `${sensorLabel} — Warning threshold exceeded`;
  return `${sensorLabel} — Condition requires attention`;
}

type ReportRecommendation = { step?: string; rationale?: string };

export function formatReportLogText(report: {
  asset_name?: string;
  asset_code?: string;
  diagnosis?: string;
  risk_level?: string;
  recommendations?: ReportRecommendation[];
  immediate_actions?: string[];
}): string {
  const tag = assetSystemTag({
    code: report.asset_code,
    name: report.asset_name,
  });

  const recStep = report.recommendations?.find((r) => r?.step)?.step;
  if (recStep) return normalizeSystemEmitTags(recStep);

  const action = report.immediate_actions?.find((a) => typeof a === "string" && a.trim());
  if (action) return normalizeSystemEmitTags(action);

  const cleaned = report.diagnosis
    ? humanizeHealthScoreText(stripUuids(report.diagnosis))
    : "";

  if (cleaned && !cleaned.match(UUID_RE) && cleaned.length <= 140) {
    const withTag = cleaned.replace(/^Asset\s+/i, `[${tag}] `);
    return normalizeSystemEmitTags(withTag);
  }

  const risk = (report.risk_level ?? "medium").toLowerCase();
  if (risk === "critical") {
    return normalizeSystemEmitTags(`[${tag}] needs immediate attention — critical health detected`);
  }
  if (risk === "high") {
    return normalizeSystemEmitTags(`[${tag}] needs urgent maintenance review`);
  }
  return normalizeSystemEmitTags(`[${tag}] — predictive maintenance review available`);
}

export function formatAlertSeverity(severity?: string): string {
  const s = (severity ?? "INFO").toUpperCase();
  if (s === "TRIP") return "ABNORMALITY";
  if (s === "ALERT") return "WARNING";
  return s;
}
