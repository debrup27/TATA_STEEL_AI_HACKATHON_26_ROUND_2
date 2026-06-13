"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { generateSystemLog } from "@/services/telemetry";
import type { LogEntry } from "@/services/types";

export function useMockTelemetryLogs(
  intervalMs: number,
  maxLogs: number,
  enabled = true,
  initialLogs?: LogEntry[],
): { logs: LogEntry[]; clear: () => void } {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs ?? []);
  const idRef = useRef(initialLogs && initialLogs.length > 0 ? initialLogs[initialLogs.length - 1].id + 1 : Date.now());

  const clear = useCallback(() => {
    const fresh: LogEntry[] = [{ id: idRef.current++, time: new Date().toTimeString().slice(0, 8), module: "Sansad-Hub", text: "Diagnostics loop reset manual signal." }];
    setLogs(fresh);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setLogs((prev) => {
        const next = [...prev, generateSystemLog(idRef.current++)];
        return next.slice(-maxLogs);
      });
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, maxLogs, enabled]);

  return { logs, clear };
}
