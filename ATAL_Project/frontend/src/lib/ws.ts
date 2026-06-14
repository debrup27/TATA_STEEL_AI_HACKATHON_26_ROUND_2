import { getAccessToken } from "./api";

/**
 * Build a WebSocket URL pointing DIRECTLY at the Django backend.
 * Next.js HTTP rewrites cannot proxy WebSocket upgrades, so we bypass the
 * dev server and connect straight to port 8000 (or NEXT_PUBLIC_WS_URL).
 */
export function getWsUrl(path: string): string {
  const token = getAccessToken();
  // Derive the backend WS base: honour explicit env var, otherwise swap
  // the page origin port to 8000 (the Django/Uvicorn port exposed by Docker).
  let wsBase: string;
  if (process.env.NEXT_PUBLIC_WS_URL) {
    wsBase = process.env.NEXT_PUBLIC_WS_URL;
  } else if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    wsBase = `${proto}//${window.location.hostname}:8000`;
  } else {
    wsBase = "ws://localhost:8000";
  }
  const url = `${wsBase}${path}`;
  if (!token) return url;
  const sep = path.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

export type WsMessageHandler = (data: Record<string, unknown>) => void;

export function connectWebSocket(
  path: string,
  onMessage: WsMessageHandler,
  onError?: (err: Event) => void,
): WebSocket {
  const ws = new WebSocket(getWsUrl(path));
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string) as Record<string, unknown>;
      onMessage(data);
    } catch {
      // ignore malformed frames
    }
  };
  if (onError) ws.onerror = onError;
  return ws;
}
