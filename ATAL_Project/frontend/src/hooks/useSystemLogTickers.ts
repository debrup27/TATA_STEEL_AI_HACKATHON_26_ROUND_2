"use client";

import { useMemo } from "react";
import { useTelemetryLogs } from "@/hooks/useTelemetryLogs";
import { LOG_STREAM_POLL_MS, LOG_STREAM_REVEAL_MS } from "@/services/telemetry";
import type { TickerItem } from "@/services/types";

const SEP: TickerItem = { text: "✦", isSeparator: true };

/** System-log ticker rows for Samvidhaan / MANAS notification strips (replaces notification carousel). */
export function useSystemLogTickers(limit = 12, isLive = true) {
  const { logs, status } = useTelemetryLogs(LOG_STREAM_POLL_MS, limit, isLive, {
    order: "asc",
    revealIntervalMs: LOG_STREAM_REVEAL_MS,
    instantInitialLoad: true,
  });

  const tickers = useMemo((): TickerItem[] => {
    if (!logs.length) {
      return status === "ok"
        ? [{ text: "System nominal — awaiting new log events", isSeparator: false }]
        : [{ text: "Connecting to system logs…", isSeparator: false }];
    }
    const items: TickerItem[] = [];
    for (const log of logs.slice(-8).reverse()) {
      const text = `[${log.module}] ${log.text}`.slice(0, 96);
      items.push({ text, isSeparator: false });
      items.push(SEP);
    }
    return items;
  }, [logs, status]);

  return { logs, tickers, status };
}
