import type { TickerItem } from "@/services/types";
import type { FactoryMaintenanceSnapshot } from "@/services/samvidhaanGraphs";
import type { GlossaryEntry } from "@/services/glossary";

const SEP: TickerItem = { text: "✦", isSeparator: true };

function withSeparators(rows: string[]): TickerItem[] {
  if (!rows.length) return [];
  const items: TickerItem[] = [];
  for (const text of rows) {
    items.push({ text, isSeparator: false });
    items.push(SEP);
  }
  return items;
}

export function maintenanceGraphTickers(
  factories: FactoryMaintenanceSnapshot[],
  loading: boolean,
): TickerItem[] {
  if (loading && !factories.length) {
    return [{ text: "Loading maintenance priority boards…", isSeparator: false }];
  }
  if (!factories.length) {
    return [{ text: "No maintenance snapshots available", isSeparator: false }];
  }

  const rows: string[] = [];
  for (const f of factories) {
    rows.push(
      `${f.factory_label}: plant health ${Math.round(f.plant_health_score)}% · avg RUL ${Math.round(f.avg_rul_hours)}h`,
    );
    rows.push(`${f.factory_label}: ${f.assets_needing_attention} assets need attention`);
    const lead = [...f.assets].sort((a, b) => b.urgency_score - a.urgency_score)[0];
    if (lead) {
      rows.push(`${lead.asset_name} — ${lead.action_label}`);
    }
    if (f.layman_summary) {
      rows.push(f.layman_summary.slice(0, 88));
    }
  }
  return withSeparators(rows);
}

export function glossaryLegendTickers(
  entries: GlossaryEntry[],
  loading: boolean,
): TickerItem[] {
  if (loading && !entries.length) {
    return [{ text: "Loading glossary — ISO · roles · equipment terms", isSeparator: false }];
  }
  if (!entries.length) {
    return [{ text: "Samvidhaan legend — abbreviations and plant terminology", isSeparator: false }];
  }
  return withSeparators(
    entries.slice(0, 14).map((e) => `${e.shortForm} — ${e.term}`),
  );
}

export function historicalReportTickers(
  items: { factory: string; title: string; date: string }[],
  loading: boolean,
): TickerItem[] {
  if (loading && !items.length) {
    return [{ text: "Loading historical plant dossiers…", isSeparator: false }];
  }
  if (!items.length) {
    return [{ text: "90-day factory dossiers for MANAS intelligence context", isSeparator: false }];
  }
  return withSeparators(
    items.map((item) => `${item.factory} · ${item.title} · ${item.date}`),
  );
}
