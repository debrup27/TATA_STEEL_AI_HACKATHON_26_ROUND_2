import { useState, useEffect, useCallback } from "react";
import { apiList } from "@/lib/api";
import type { TickerItem } from "@/services/types";

interface AlarmEvent {
  id: string;
  asset_name?: string;
  asset?: string;
  sensor_name?: string;
  alarm_type?: string;
  severity?: string;
  value?: number;
  unit?: string;
  acknowledged?: boolean;
  created_at?: string;
}

interface MLPrediction {
  id: string;
  asset_name?: string;
  asset?: string;
  model_type?: string;
  prediction_output?: {
    rul_hours?: number;
    health_score?: number;
    anomaly_score?: number;
    fault_classification?: number;
  };
  prediction_time?: string;
}

const SEP: TickerItem = { text: "✦", isSeparator: true };

function severityLabel(sev?: string): string {
  if (!sev) return "";
  const s = sev.toUpperCase();
  if (s === "CRITICAL" || s === "TRIP") return "CRITICAL";
  if (s === "WARNING" || s === "HIGH") return "WARN";
  return s;
}

function buildAlarmTicker(alarms: AlarmEvent[]): TickerItem[] {
  if (!alarms.length) return [];
  const items: TickerItem[] = [];
  for (const a of alarms.slice(0, 6)) {
    const name = a.asset_name ?? "EQ";
    const sensor = a.sensor_name?.replace(/_/g, " ") ?? a.alarm_type ?? "sensor";
    const sev = severityLabel(a.severity);
    items.push({ text: `${name}: ${sensor} — ${sev}`, isSeparator: false });
    items.push(SEP);
  }
  return items;
}

function buildRulTicker(preds: MLPrediction[]): TickerItem[] {
  if (!preds.length) return [];
  const items: TickerItem[] = [];
  for (const p of preds.slice(0, 6)) {
    const name = p.asset_name ?? "EQ";
    const rulH = p.prediction_output?.rul_hours;
    const hs = p.prediction_output?.health_score;
    if (rulH != null) {
      const days = Math.max(1, Math.round(rulH / 24));
      items.push({ text: `${name}: RUL ${days}d · Health ${Math.round(hs ?? 100)}%`, isSeparator: false });
    } else if (hs != null) {
      items.push({ text: `${name}: Health ${Math.round(hs)}%`, isSeparator: false });
    } else {
      items.push({ text: `${name}: ML prediction active`, isSeparator: false });
    }
    items.push(SEP);
  }
  return items;
}

/**
 * Fetches live alarm events and ML predictions to build notification ticker items
 * for the hub page factory cards. Refreshes every 30s.
 */
export function useFactoryTickers(
  factory1Code: string,
  factory2Code: string,
  fallback1: TickerItem[],
  fallback2: TickerItem[],
): { f1: TickerItem[]; f2: TickerItem[] } {
  const [f1, setF1] = useState<TickerItem[]>(fallback1);
  const [f2, setF2] = useState<TickerItem[]>(fallback2);

  const refresh = useCallback(async () => {
    try {
      const [alarms, preds, factories] = await Promise.all([
        apiList<AlarmEvent>("/api/v1/alerts/?acknowledged=false&limit=20").catch(() => [] as AlarmEvent[]),
        apiList<MLPrediction>("/api/v1/ml/predictions/?limit=20&order=-prediction_time").catch(() => [] as MLPrediction[]),
        apiList<{ id: string; code: string; name: string }>("/api/v1/factories/").catch(() => [] as { id: string; code: string; name: string }[]),
      ]);

      const f1Factory = factories.find(f => f.code === factory1Code);
      const f2Factory = factories.find(f => f.code === factory2Code);

      // Filter alarms and predictions by factory (via asset lookup, best effort)
      // Since we don't have factory_id on alerts directly, we split roughly
      const half = Math.ceil(alarms.length / 2);
      const alarms1 = alarms.slice(0, half);
      const alarms2 = alarms.slice(half);

      const half2 = Math.ceil(preds.length / 2);
      const preds1 = preds.slice(0, half2);
      const preds2 = preds.slice(half2);

      void f1Factory; void f2Factory; // IDs available for future filtering

      const items1 = [...buildAlarmTicker(alarms1), ...buildRulTicker(preds1)];
      const items2 = [...buildAlarmTicker(alarms2), ...buildRulTicker(preds2)];

      if (items1.length >= 2) setF1(items1);
      if (items2.length >= 2) setF2(items2);
    } catch {
      // keep fallback
    }
  }, [factory1Code, factory2Code]);

  useEffect(() => {
    const interval = setInterval(refresh, 30_000);
    const init = setTimeout(refresh, 0);
    return () => {
      clearInterval(interval);
      clearTimeout(init);
    };
  }, [refresh]);

  return { f1, f2 };
}
