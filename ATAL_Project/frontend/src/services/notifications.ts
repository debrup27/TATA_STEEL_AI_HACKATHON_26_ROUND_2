import { apiJson } from "@/lib/api";
import type { TickerItem } from "@/services/types";

export interface NotificationFeed {
  alerts: Array<{
    id: string;
    kind: string;
    asset_id?: string;
    asset_name?: string;
    factory?: string;
    severity?: string;
    message?: string;
  }>;
  predictions: Array<{
    id: string;
    asset_name?: string;
    rul_hours?: number;
    health_score?: number;
  }>;
  orchestration: Array<{
    id: string;
    asset_name?: string;
    status?: string;
  }>;
  ticker_items: TickerItem[];
}

export async function fetchNotificationFeed(factoryId?: string): Promise<NotificationFeed> {
  const params = new URLSearchParams({ limit: "30" });
  if (factoryId) params.set("factory_id", factoryId);
  return apiJson<NotificationFeed>(`/api/v1/notifications/feed/?${params.toString()}`);
}
