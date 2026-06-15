import type { LogEntry } from "@/services/types";

export function logStreamEntryKey(entry: Pick<LogEntry, "time" | "module" | "text">): string {
  return `${entry.time}|${entry.module}|${entry.text}`;
}
