"use client";
import { useState, useEffect } from "react";
import { getInitialTelemetryCells, tickTelemetryCells, CELL_TICK_INTERVAL } from "@/services/telemetry";
import type { TelemetryCell } from "@/services/types";

export function useMockTelemetryCells(intervalMs = CELL_TICK_INTERVAL): TelemetryCell[] {
  const [cells, setCells] = useState<TelemetryCell[]>(getInitialTelemetryCells);

  useEffect(() => {
    const interval = setInterval(() => {
      setCells((prev) => tickTelemetryCells(prev));
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return cells;
}
