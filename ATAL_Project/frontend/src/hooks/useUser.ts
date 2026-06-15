"use client";

import { useCallback, useSyncExternalStore } from "react";
import { clearTokens } from "@/lib/api";
import { triggerPageTransition } from "@/animations/PageTransition";

export interface UserInfo {
  username: string;
  role: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    technician: "Technician",
    supervisor: "Supervisor",
    admin: "Admin",
    plant_manager: "Plant Manager",
  };
  return map[role?.toLowerCase()] ?? role ?? "User";
}

function parseUserFromToken(token: string | null): UserInfo | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const rawUsername =
    (payload.username as string) ??
    (payload.user_id !== undefined ? String(payload.user_id) : null) ??
    "User";
  return { username: rawUsername, role: roleLabel((payload.role as string) ?? "") };
}

// useSyncExternalStore requires a stable snapshot reference between reads.
let cachedTokenKey: string | null | undefined;
let cachedUserSnapshot: UserInfo | null = null;

function getAuthSnapshot(): UserInfo | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("atal_access");
  if (token === cachedTokenKey) {
    return cachedUserSnapshot;
  }

  cachedTokenKey = token;
  cachedUserSnapshot = parseUserFromToken(token);
  return cachedUserSnapshot;
}

export function readUserFromToken(): UserInfo | null {
  return getAuthSnapshot();
}

function subscribeToAuthStore(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("user-state-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("user-state-change", onStoreChange);
  };
}

const SERVER_AUTH_SNAPSHOT: UserInfo | null = null;

function getAuthServerSnapshot(): UserInfo | null {
  return SERVER_AUTH_SNAPSHOT;
}

export function useUser() {
  const user = useSyncExternalStore(
    subscribeToAuthStore,
    getAuthSnapshot,
    getAuthServerSnapshot,
  );

  const refreshUser = useCallback(() => {
    window.dispatchEvent(new Event("user-state-change"));
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    triggerPageTransition("/login");
  }, []);

  return { user, refreshUser, logout };
}
