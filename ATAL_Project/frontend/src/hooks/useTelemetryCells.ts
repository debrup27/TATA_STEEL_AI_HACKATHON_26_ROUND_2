"use client";

import { useState, useEffect } from "react";
import {
  fetchTelemetryCells,
  applyTelemetryWsUpdate,
  getInitialTelemetryCells,
  CELL_TICK_INTERVAL,
} from "@/services/telemetry";
import { connectWebSocket } from "@/lib/ws";
import { getAccessToken } from "@/lib/api";
import { getDemoTelemetryCells, tickDemoTelemetryCells } from "@/lib/landing-demo";
import type { TelemetryCell } from "@/services/types";

const SSR_PLACEHOLDER: TelemetryCell[] = [
  { label: "SYS_CK", value: "—", status: "nominal" },
  { label: "FLW_RT", value: "—", status: "nominal" },
  { label: "ANOM_ST", value: "—", status: "nominal" },
  { label: "VLV_04", value: "—", status: "nominal" },
  { label: "BF1_PRS", value: "—", status: "nominal" },
  { label: "BF1_TMP", value: "—", status: "nominal" },
];

export function useTelemetryCells(intervalMs = CELL_TICK_INTERVAL): TelemetryCell[] {
  const [cells, setCells] = useState<TelemetryCell[]>(() =>
    SSR_PLACEHOLDER.map((c) => ({ ...c })),
  );
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const syncDemoMode = () => setDemoMode(!getAccessToken());
    syncDemoMode();
    window.addEventListener("storage", syncDemoMode);
    window.addEventListener("user-state-change", syncDemoMode);
    return () => {
      window.removeEventListener("storage", syncDemoMode);
      window.removeEventListener("user-state-change", syncDemoMode);
    };
  }, []);

  useEffect(() => {
    if (demoMode) {
      setCells(getDemoTelemetryCells());
      const tick = setInterval(() => {
        setCells((prev) => tickDemoTelemetryCells(prev));
      }, intervalMs);
      return () => clearInterval(tick);
    }

    setCells(getInitialTelemetryCells());

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
  }, [intervalMs, demoMode]);

  useEffect(() => {
    if (demoMode) return;

    const ws = connectWebSocket("/ws/telemetry", (data) => {
      const incoming = data.cells as TelemetryCell[] | undefined;
      if (incoming?.length) {
        setCells((prev) => applyTelemetryWsUpdate(prev, incoming));
      }
    });
    return () => ws.close();
  }, [demoMode]);

  return cells;
}

/** @deprecated alias */
export const useMockTelemetryCells = useTelemetryCells;
