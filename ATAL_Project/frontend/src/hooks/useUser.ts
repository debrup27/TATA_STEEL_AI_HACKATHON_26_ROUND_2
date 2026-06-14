"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

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

export function readUserFromToken(): UserInfo | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("atal_access");
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const rawUsername =
    (payload.username as string) ??
    (payload.user_id !== undefined ? String(payload.user_id) : null) ??
    "User";
  return { username: rawUsername, role: roleLabel((payload.role as string) ?? "") };
}

export function useUser() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);

  const refreshUser = () => {
    setUser(readUserFromToken());
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshUser();
    }, 0);

    // Listen to storage changes in other tabs
    window.addEventListener("storage", refreshUser);
    
    // Listen to custom login/logout events in the same tab
    window.addEventListener("user-state-change", refreshUser);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", refreshUser);
      window.removeEventListener("user-state-change", refreshUser);
    };
  }, [pathname]);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("atal_access");
      localStorage.removeItem("atal_refresh");
      setUser(null);
      // Dispatch event to sync other mounted components instantly
      window.dispatchEvent(new Event("user-state-change"));
      window.location.href = "/login";
    }
  };

  return { user, refreshUser, logout };
}
