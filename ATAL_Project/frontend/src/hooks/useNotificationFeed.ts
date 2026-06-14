import { useState, useEffect, useCallback } from "react";
import { fetchNotificationFeed, type NotificationFeed } from "@/services/notifications";
import type { TickerItem } from "@/services/types";

const SEP: TickerItem = { text: "✦", isSeparator: true };

export function feedToTickers(feed: NotificationFeed | null): TickerItem[] {
  if (feed?.ticker_items?.length) return feed.ticker_items;
  return [];
}

/** Build ticker rows from feed sections when backend omits ticker_items. */
export function buildTickersFromFeed(feed: NotificationFeed | null): TickerItem[] {
  const fromApi = feedToTickers(feed);
  if (fromApi.length) return fromApi;

  if (!feed) return [];
  const items: TickerItem[] = [];

  for (const a of feed.alerts?.slice(0, 4) ?? []) {
    const label = a.asset_name ?? a.asset_id ?? "Asset";
    items.push({ text: `${label}: ${a.message ?? a.kind}`.slice(0, 64), isSeparator: false });
    items.push(SEP);
  }
  for (const p of feed.predictions?.slice(0, 4) ?? []) {
    const days = p.rul_hours != null ? Math.max(1, Math.round(p.rul_hours / 24)) : null;
    const text = days != null
      ? `${p.asset_name ?? "Asset"}: RUL ${days}d`
      : `${p.asset_name ?? "Asset"}: health ${Math.round(p.health_score ?? 0)}%`;
    items.push({ text, isSeparator: false });
    items.push(SEP);
  }
  for (const o of feed.orchestration?.slice(0, 2) ?? []) {
    items.push({ text: `${o.asset_name ?? "Asset"}: ${o.status ?? "orchestrating"}`, isSeparator: false });
    items.push(SEP);
  }
  return items;
}

export function useNotificationFeed(factoryId?: string, refreshMs = 30_000) {
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchNotificationFeed(factoryId);
      setFeed(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [factoryId]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), refreshMs);
    return () => clearInterval(interval);
  }, [refresh, refreshMs]);

  const tickers = buildTickersFromFeed(feed);
  return { feed, tickers, loading, error, refresh };
}
