import { getApiBase } from "@/lib/api";

export const BOOT_ID_STORAGE_KEY = "atal_last_boot_id";

export interface BackendReadyStatus {
  ready: boolean;
  bootId?: string;
}

/** Django bootstrap + smoke tests finished (see /health/ready/). */
export async function fetchBackendStatus(
  signal?: AbortSignal,
): Promise<BackendReadyStatus> {
  try {
    const url = `${getApiBase()}/health/ready/`;
    const res = await fetch(url, { cache: "no-store", signal });
    if (!res.ok) return { ready: false };
    const body = (await res.json()) as { status?: string; boot_id?: string };
    return {
      ready: body.status === "ready",
      bootId: body.boot_id,
    };
  } catch {
    return { ready: false };
  }
}

export async function fetchBackendReady(signal?: AbortSignal): Promise<boolean> {
  const status = await fetchBackendStatus(signal);
  return status.ready;
}

export function readStoredBootId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(BOOT_ID_STORAGE_KEY);
}

export function storeBootId(bootId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BOOT_ID_STORAGE_KEY, bootId);
}

export function shouldSkipStartupSplash(bootId?: string): boolean {
  if (!bootId) return false;
  return readStoredBootId() === bootId;
}
