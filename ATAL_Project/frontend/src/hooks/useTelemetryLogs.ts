"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchAlertLogsDetailed, type AlertLogsFetchStatus } from "@/services/telemetry";
import type { LogEntry } from "@/services/types";

function logKey(log: LogEntry): string {
  return `${log.time}|${log.module}|${log.text}`;
}

/**
 * Live streaming log hook — alerts, maintenance events, and AI reports from backend.
 * Pause stops frontend polling; clear empties the view only (does not touch the backend).
 */
export function useTelemetryLogs(
  intervalMs = 2500,
  maxLogs = 50,
  isLive = true,
): {
  logs: LogEntry[];
  clear: () => void;
  isLive: boolean;
  status: AlertLogsFetchStatus;
} {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<AlertLogsFetchStatus>("ok");
  const seenKeys = useRef<Set<string>>(new Set());
  const nextId = useRef(1);

  useEffect(() => {
    let cancelled = false;
    seenKeys.current = new Set();

    const applyEntries = (entries: LogEntry[], replace: boolean) => {
      if (!entries.length) {
        if (replace) setLogs([]);
        return;
      }

      if (replace) {
        const seeded: LogEntry[] = [];
        for (const e of entries) {
          const key = logKey(e);
          seenKeys.current.add(key);
          seeded.push({ ...e, id: nextId.current++ });
        }
        setLogs(seeded.slice(0, maxLogs));
        return;
      }

      setLogs((prev) => {
        const newEntries: LogEntry[] = [];
        for (const e of entries) {
          const key = logKey(e);
          if (seenKeys.current.has(key)) continue;
          seenKeys.current.add(key);
          newEntries.push({ ...e, id: nextId.current++ });
        }
        if (!newEntries.length) return prev;
        return [...newEntries, ...prev].slice(0, maxLogs);
      });
    };

    const load = async (replace = false) => {
      const result = await fetchAlertLogsDetailed(maxLogs);
      if (cancelled) return;
      setStatus(result.status);
      applyEntries(result.entries, replace);
    };

    void load(true);
    if (!isLive) {
      return () => {
        cancelled = true;
      };
    }

    const timer = setInterval(() => void load(false), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs, maxLogs, isLive]);

  const clear = useCallback(() => {
    setLogs([]);
  }, []);

  return { logs, clear, isLive, status };
}

/** @deprecated alias */
export const useMockTelemetryLogs = useTelemetryLogs;
