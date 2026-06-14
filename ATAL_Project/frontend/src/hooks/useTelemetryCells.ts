"use client";

import { useState, useEffect } from "react";
import {
  fetchTelemetryCells,
  applyTelemetryWsUpdate,
  getInitialTelemetryCells,
  CELL_TICK_INTERVAL,
} from "@/services/telemetry";
import { connectWebSocket } from "@/lib/ws";
import type { TelemetryCell } from "@/services/types";

export function useTelemetryCells(intervalMs = CELL_TICK_INTERVAL): TelemetryCell[] {
  const [cells, setCells] = useState<TelemetryCell[]>(getInitialTelemetryCells);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const next = await fetchTelemetryCells();
      if (!cancelled) setCells(next);
    };

    void load();
    const poll = setInterval(() => void load(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [intervalMs]);

  useEffect(() => {
    const ws = connectWebSocket("/ws/telemetry", (data) => {
      const incoming = data.cells as TelemetryCell[] | undefined;
      if (incoming?.length) {
        setCells((prev) => applyTelemetryWsUpdate(prev, incoming));
      }
    });
    return () => ws.close();
  }, []);

  return cells;
}

/** @deprecated alias */
export const useMockTelemetryCells = useTelemetryCells;
