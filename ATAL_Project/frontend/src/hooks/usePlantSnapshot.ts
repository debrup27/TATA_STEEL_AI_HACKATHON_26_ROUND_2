"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchPlantSnapshot,
  type PlantSnapshot,
} from "@/services/plantSnapshot";
import type { DiagnosticAsset } from "@/services/sansadOutputs";
import { HUB_TICK_INTERVAL } from "@/services/telemetry";
import { PLANT_SNAPSHOT_REFRESH_EVENT } from "@/services/simulate";

export function usePlantSnapshot(factoryId?: string, pollMs = HUB_TICK_INTERVAL * 3) {
  const [snapshot, setSnapshot] = useState<PlantSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const snap = await fetchPlantSnapshot(factoryId);
        setSnapshot(snap);
        setError(null);
        return snap;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load plant snapshot";
        if (!silent) setError(msg);
        return null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [factoryId],
  );

  // While any abnormality is active, poll at 5 s to match the backend rapid-degrade loop.
  const anomalyActive = Boolean(snapshot?.anomaly_flags?.any_anomaly_active);
  const effectiveMs = anomalyActive ? Math.min(pollMs, 5000) : pollMs;

  useEffect(() => {
    void reload();
    const interval = setInterval(() => void reload(true), effectiveMs);
    const onRefresh = () => void reload(true);
    window.addEventListener(PLANT_SNAPSHOT_REFRESH_EVENT, onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(PLANT_SNAPSHOT_REFRESH_EVENT, onRefresh);
    };
  }, [reload, effectiveMs]);

  const byId = useMemo(() => {
    const map = new Map<string, DiagnosticAsset>();
    for (const row of snapshot?.assets ?? []) map.set(row.id, row);
    return map;
  }, [snapshot]);

  const byName = useMemo(() => {
    const map = new Map<string, DiagnosticAsset>();
    for (const row of snapshot?.assets ?? []) {
      map.set(row.name.toLowerCase(), row);
    }
    return map;
  }, [snapshot]);

  return {
    snapshot,
    assets: snapshot?.assets ?? [],
    byId,
    byName,
    loading,
    error,
    reload,
  };
}
