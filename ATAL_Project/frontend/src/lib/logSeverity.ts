export type LogSeverity = "critical" | "warning" | "info";

/** Infer display severity from backend alert / report log text. */
export function getLogSeverity(text: string): LogSeverity {
  const upper = text.toUpperCase();
  if (
    upper.includes("[CRITICAL]") ||
    upper.includes("CRITICAL") ||
    upper.includes("[TRIP]") ||
    upper.includes("TRIP") ||
    upper.includes("[ABNORMALITY]") ||
    upper.includes("ABNORMALITY") ||
    upper.includes("[HIGH]") ||
    /\bHIGH\b/.test(upper)
  ) {
    return "critical";
  }
  if (
    upper.includes("[WARNING]") ||
    upper.includes("[WARN]") ||
    upper.includes("WARNING")
  ) {
    return "warning";
  }
  return "info";
}
