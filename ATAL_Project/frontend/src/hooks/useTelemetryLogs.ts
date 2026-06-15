"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  fetchAlertLogsDetailed,
  LOG_STREAM_POLL_MS,
  LOG_STREAM_REVEAL_MS,
  type AlertLogsFetchStatus,
} from "@/services/telemetry";
import { logStreamEntryKey } from "@/lib/log-stream-key";
import { getLogSeverity } from "@/lib/logSeverity";
import type { LogEntry } from "@/services/types";

export type LogStreamOrder = "asc" | "desc";

export interface TelemetryLogsOptions {
  /** Hub stream: oldest first (newest at bottom). Logs page: newest first. */
  order?: LogStreamOrder;
  /** Ms between each new row appearing in the UI. */
  revealIntervalMs?: number;
  pollIntervalMs?: number;
  /** First fetch shows all backlog instantly; only later polls drip new rows. */
  instantInitialLoad?: boolean;
}

/**
 * Live system log stream — same backend source as hub SYSTEM LOG STREAM.
 * Polls on an interval; new rows drip in one at a time instead of bulk refresh.
 */
export function useTelemetryLogs(
  pollIntervalMs = LOG_STREAM_POLL_MS,
  maxLogs = 50,
  isLive = true,
  options: TelemetryLogsOptions = {},
): {
  logs: LogEntry[];
  clear: () => void;
  isLive: boolean;
  status: AlertLogsFetchStatus;
  metrics: { total: number; critical: number; warning: number };
} {
  const order = options.order ?? "asc";
  const revealIntervalMs = options.revealIntervalMs ?? LOG_STREAM_REVEAL_MS;
  const effectivePollMs = options.pollIntervalMs ?? pollIntervalMs;
  const instantInitialLoad = options.instantInitialLoad ?? false;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<AlertLogsFetchStatus>("ok");
  const [metricsSnapshot, setMetricsSnapshot] = useState<LogEntry[]>([]);

  const nextId = useRef(1);
  const pendingQueue = useRef<LogEntry[]>([]);
  const displayedKeys = useRef<Set<string>>(new Set());
  const pendingKeys = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);
  const pollConfigRef = useRef({ order, instantInitialLoad });

  useEffect(() => {
    pollConfigRef.current = { order, instantInitialLoad };
  }, [order, instantInitialLoad]);

  const computeMetrics = useCallback((entries: LogEntry[]) => {
    let critical = 0;
    let warning = 0;
    for (const log of entries) {
      const sev = getLogSeverity(log.text);
      if (sev === "critical") critical += 1;
      else if (sev === "warning") warning += 1;
    }
    return { total: entries.length, critical, warning };
  }, []);

  const enqueueNewEntries = useCallback((incoming: LogEntry[]) => {
    const streamOrder = pollConfigRef.current.order;
    const fresh = incoming.filter((e) => {
      const key = logStreamEntryKey(e);
      return !displayedKeys.current.has(key) && !pendingKeys.current.has(key);
    });
    if (!fresh.length) return;

    const ordered = streamOrder === "desc" ? [...fresh].reverse() : fresh;
    for (const row of ordered) {
      pendingKeys.current.add(logStreamEntryKey(row));
    }
    pendingQueue.current.push(...ordered);
  }, []);

  const clear = useCallback(() => {
    nextId.current = 1;
    pendingQueue.current = [];
    displayedKeys.current = new Set();
    pendingKeys.current = new Set();
    bootstrappedRef.current = false;
    setLogs([]);
    setMetricsSnapshot([]);
  }, []);

  // Poll backend — update metrics immediately; queue unseen rows for drip reveal.
  useEffect(() => {
    let cancelled = false;

    const syncFromBackend = async (isInitial = false) => {
      const { order: streamOrder, instantInitialLoad: instantSeed } = pollConfigRef.current;
      const result = await fetchAlertLogsDetailed(maxLogs);
      if (cancelled) return;

      setStatus(result.status);
      const snapshot = result.entries.map((e) => ({ ...e, id: 0 }));
      setMetricsSnapshot(snapshot);

      const targetKeys = new Set(snapshot.map(logStreamEntryKey));

      setLogs((prev) => {
        const pruned = prev.filter((row) => targetKeys.has(logStreamEntryKey(row)));
        for (const row of prev) {
          if (!targetKeys.has(logStreamEntryKey(row))) {
            const key = logStreamEntryKey(row);
            displayedKeys.current.delete(key);
            pendingKeys.current.delete(key);
          }
        }
        return pruned;
      });

      if (isInitial && snapshot.length > 0) {
        if (instantSeed) {
          const seedOrder = streamOrder === "desc" ? [...snapshot].reverse() : snapshot;
          const mapped = seedOrder.map((e) => {
            const entry = { ...e, id: nextId.current++ };
            displayedKeys.current.add(logStreamEntryKey(entry));
            return entry;
          });
          pendingQueue.current = [];
          pendingKeys.current = new Set();
          bootstrappedRef.current = true;
          setLogs(mapped);
          return;
        }

        displayedKeys.current = new Set();
        pendingKeys.current = new Set();
        pendingQueue.current = [];
        const seedOrder = streamOrder === "desc" ? [...snapshot].reverse() : snapshot;
        for (const row of seedOrder) {
          pendingKeys.current.add(logStreamEntryKey(row));
        }
        pendingQueue.current.push(...seedOrder.map((e) => ({ ...e, id: 0 })));
        bootstrappedRef.current = true;
        return;
      }

      if (!bootstrappedRef.current && snapshot.length > 0) {
        bootstrappedRef.current = true;
      }

      enqueueNewEntries(snapshot);
    };

    void syncFromBackend(true);

    if (!isLive) {
      return () => {
        cancelled = true;
      };
    }

    const timer = setInterval(() => void syncFromBackend(false), effectivePollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [effectivePollMs, maxLogs, isLive]);

  // Drip one queued row into the visible list at a time.
  useEffect(() => {
    const revealNext = () => {
      const next = pendingQueue.current.shift();
      if (!next) return;

      const key = logStreamEntryKey(next);
      if (displayedKeys.current.has(key)) return;

      displayedKeys.current.add(key);
      pendingKeys.current.delete(key);
      const entry: LogEntry = { ...next, id: nextId.current++ };

      setLogs((prev) => {
        const merged = order === "desc" ? [entry, ...prev] : [...prev, entry];
        return merged.slice(0, maxLogs);
      });
    };

    const timer = setInterval(revealNext, revealIntervalMs);
    return () => clearInterval(timer);
  }, [order, revealIntervalMs, maxLogs]);

  const metrics = useMemo(
    () => computeMetrics(metricsSnapshot),
    [metricsSnapshot, computeMetrics],
  );

  return { logs, clear, isLive, status, metrics };
}

/** @deprecated alias */
export const useMockTelemetryLogs = useTelemetryLogs;
