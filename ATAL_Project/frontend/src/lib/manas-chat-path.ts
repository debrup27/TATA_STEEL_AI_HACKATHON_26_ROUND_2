import { isBackendSessionId } from "@/lib/session-id";

const CHAT_BASE = "/manas/chat";

/** `/manas/chat` or `/manas/chat/<uuid>` */
export function manasChatPath(sessionId?: string | null): string {
  if (sessionId && isBackendSessionId(sessionId)) {
    return `${CHAT_BASE}/${sessionId}`;
  }
  return CHAT_BASE;
}

export function parseManasChatSessionId(pathname: string): string | null {
  if (pathname === CHAT_BASE || pathname === `${CHAT_BASE}/`) {
    return null;
  }
  const match = pathname.match(new RegExp(`^${CHAT_BASE}/([^/]+)/?$`));
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  return isBackendSessionId(id) ? id : null;
}

/** Update the address bar without triggering a Next.js navigation (no remount). */
export function updateManasChatUrl(
  sessionId: string | null,
  method: "push" | "replace" = "replace",
): string {
  const path = manasChatPath(sessionId);
  if (typeof window === "undefined") return path;
  const search = window.location.search;
  const target = `${path}${search}`;
  if (window.location.pathname + window.location.search === target) return target;
  const state = window.history.state;
  if (method === "push") {
    window.history.pushState(state, "", target);
  } else {
    window.history.replaceState(state, "", target);
  }
  return target;
}
