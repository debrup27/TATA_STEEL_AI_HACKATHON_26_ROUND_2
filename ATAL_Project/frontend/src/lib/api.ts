export const ACCESS_TOKEN_KEY = "atal_access";
export const REFRESH_TOKEN_KEY = "atal_refresh";

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Strip trailing slash from a URL origin/base. */
function normalizeBase(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Browser talks directly to Django on :8000 (CORS-enabled).
 * Next.js HTTP rewrites hit a trailing-slash 301 loop with Django — same reason WS bypasses the dev proxy.
 * SSR uses BACKEND_INTERNAL_URL inside Docker.
 */
export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) {
      try {
        const parsed = new URL(envUrl);
        // Keep API host aligned with the page (localhost vs 127.0.0.1).
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
          parsed.hostname = window.location.hostname;
        }
        return normalizeBase(parsed.origin);
      } catch {
        return normalizeBase(envUrl);
      }
    }
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return normalizeBase(
    process.env.BACKEND_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:8000",
  );
}

export const API_BASE = getApiBase();

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  window.dispatchEvent(new Event("user-state-change"));
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.dispatchEvent(new Event("user-state-change"));
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${getApiBase()}/api/v1/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = (await res.json()) as { access: string };
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
  return data.access;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
  retry = true,
): Promise<Response> {
  const token = getAccessToken();
  const isFormBody = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormBody ? {} : { "Content-Type": "application/json" }),
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  // Do not attach Authorization header to authentication endpoints to avoid
  // JWTAuthentication middleware rejecting stale/expired tokens before the view runs.
  const isAuthEndpoint = path.startsWith("/api/v1/auth/");
  if (token && !headers.Authorization && !isAuthEndpoint) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBase()}${path}`, { ...init, headers });

  if (res.status === 401 && retry && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      return fetch(`${getApiBase()}${path}`, { ...init, headers });
    }
  }

  return res;
}

export async function apiBlob(path: string, init?: RequestInit): Promise<Blob> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail =
      (body as { detail?: string }).detail ??
      (body as { error?: string }).error ??
      res.statusText;
    throw new ApiError(res.status, detail, body);
  }
  return res.blob();
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail =
      (body as { detail?: string }).detail ??
      (body as { error?: string }).error ??
      res.statusText;
    throw new ApiError(res.status, detail, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Unwrap DRF paginated `{ results: T[] }` or plain array responses. */
export async function apiList<T>(path: string, init?: RequestInit): Promise<T[]> {
  const data = await apiJson<{ results?: T[] } | T[]>(path, init);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}
