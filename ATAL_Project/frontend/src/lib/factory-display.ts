import type { DiagnosticAsset } from "@/services/sansadOutputs";

/** Canonical copy aligned with backend `FactoryOnboardService` + glossary. */
export const FACTORY_DESCRIPTIONS = {
  horizon:
    "Hot rolling complex — slab reheating (SRF), high-pressure descaling (HHPD), finishing stands (FS), and hydraulic AGC (HAGCC).",
  zephyr:
    "Cold rolling & coating line — acid pickling (APT), tandem cold mill (TCMS), continuous galvanizing (CGP), and high-pressure air knives (HPAK).",
} as const;

export type FactoryKind = "horizon" | "zephyr";

export function factoryKindFromName(name: string): FactoryKind | null {
  const n = name.toLowerCase();
  if (n.includes("horizon")) return "horizon";
  if (n.includes("zephyr")) return "zephyr";
  return null;
}

export function assetsForFactory(assets: DiagnosticAsset[], kind: FactoryKind): DiagnosticAsset[] {
  return assets.filter((a) => factoryKindFromName(a.factory) === kind);
}

export function pickFactoryAsset(assets: DiagnosticAsset[], kind: FactoryKind): DiagnosticAsset | null {
  const rows = assetsForFactory(assets, kind);
  if (!rows.length) return null;
  return [...rows].sort((a, b) => a.health - b.health)[0];
}

export function readFactorySensor(
  assets: DiagnosticAsset[],
  kind: FactoryKind,
  match: RegExp,
  preferAsset?: RegExp,
): { value: string; unit?: string } | null {
  const rows = assetsForFactory(assets, kind);
  const ordered = preferAsset
    ? [...rows.filter((a) => preferAsset.test(a.name)), ...rows.filter((a) => !preferAsset.test(a.name))]
    : rows;

  for (const asset of ordered) {
    const row = asset.sensors.find((s) => match.test(s.label.toLowerCase()));
    if (row?.value && row.value !== "—") {
      const num = row.value.replace(/[^\d.]/g, "");
      const unit = row.value.replace(num, "").trim();
      return { value: num || row.value, unit: unit || undefined };
    }
  }
  return null;
}

export type FactoryTelemetrySnapshot = Record<
  string,
  Array<{ sensor_name: string; value: number; unit?: string }>
>;

export function readTelemetryFactorySensor(
  snapshot: FactoryTelemetrySnapshot | undefined,
  match: RegExp,
): { value: string; unit?: string } | null {
  if (!snapshot) return null;
  for (const readings of Object.values(snapshot)) {
    for (const r of readings) {
      if (match.test(r.sensor_name.toLowerCase())) {
        return { value: String(r.value), unit: r.unit || undefined };
      }
    }
  }
  return null;
}

export interface FactoryKpiRow {
  label: string;
  value: string;
  unit?: string;
  accent?: "rose" | "amber" | "emerald" | "zinc";
}

export function horizonKpis(
  assets: DiagnosticAsset[],
  telemetry?: FactoryTelemetrySnapshot,
): FactoryKpiRow[] {
  return buildLiveFactoryKpis(assets, "horizon", telemetry);
}

export function zephyrKpis(
  assets: DiagnosticAsset[],
  telemetry?: FactoryTelemetrySnapshot,
): FactoryKpiRow[] {
  return buildLiveFactoryKpis(assets, "zephyr", telemetry);
}

function sensorAccent(status?: string): FactoryKpiRow["accent"] {
  if (status === "critical") return "rose";
  if (status === "warning") return "amber";
  return "zinc";
}

function parseSensorValue(raw: string): { value: string; unit?: string } {
  const num = raw.replace(/[^\d.-]/g, "");
  const unit = raw.replace(num, "").trim();
  return { value: num || raw, unit: unit || undefined };
}

/** KPI rows from real factory assets + telemetry — no hardcoded slab/coating placeholders. */
function buildLiveFactoryKpis(
  assets: DiagnosticAsset[],
  kind: FactoryKind,
  telemetry?: FactoryTelemetrySnapshot,
): FactoryKpiRow[] {
  const rows = assetsForFactory(assets, kind);
  const kpis: FactoryKpiRow[] = [];
  const seen = new Set<string>();

  const push = (row: FactoryKpiRow) => {
    if (seen.has(row.label)) return;
    seen.add(row.label);
    kpis.push(row);
  };

  const lead = pickFactoryAsset(assets, kind);
  if (lead) {
    const rulH =
      lead.rulHours != null
        ? Math.round(lead.rulHours)
        : lead.rulDays != null
          ? Math.round(lead.rulDays * 24)
          : null;
    push({
      label: `${lead.name} — RUL`,
      value: rulH != null ? String(rulH) : "—",
      unit: rulH != null ? "hours" : undefined,
      accent:
        rulH != null && rulH < 72 ? (kind === "horizon" ? "rose" : "amber") : "zinc",
    });
  }

  for (const asset of [...rows].sort((a, b) => a.health - b.health)) {
    for (const s of asset.sensors) {
      if (!s.value || s.value === "—") continue;
      const { value, unit } = parseSensorValue(s.value);
      if (!value || value === "—") continue;
      push({
        label: `${asset.name} — ${s.label}`,
        value,
        unit,
        accent: sensorAccent(s.status),
      });
      break;
    }
    if (kpis.length >= 4) break;
  }

  if (kpis.length < 4 && telemetry) {
    for (const [key, readings] of Object.entries(telemetry)) {
      const asset = rows.find(
        (a) =>
          a.id === key ||
          a.name.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(a.name.split(/\s+/)[0]?.toLowerCase() ?? ""),
      );
      for (const r of readings) {
        const label = asset
          ? `${asset.name} — ${r.sensor_name.replace(/_/g, " ")}`
          : r.sensor_name.replace(/_/g, " ");
        push({
          label,
          value: String(r.value),
          unit: r.unit,
        });
        if (kpis.length >= 4) break;
      }
      if (kpis.length >= 4) break;
    }
  }

  return kpis.slice(0, 4);
}
