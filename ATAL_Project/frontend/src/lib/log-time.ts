const IST = "Asia/Kolkata";

/** Wall-clock time for system log stream (Asia/Kolkata). */
export function formatLogTimeKolkata(iso?: string | null): string {
  if (!iso) {
    return new Date().toLocaleTimeString("en-IN", {
      timeZone: IST,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return formatLogTimeKolkata(null);
  }

  return d.toLocaleTimeString("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Sort key — full instant in IST context (not HH:MM:SS alone). */
export function logSortKey(iso?: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}
