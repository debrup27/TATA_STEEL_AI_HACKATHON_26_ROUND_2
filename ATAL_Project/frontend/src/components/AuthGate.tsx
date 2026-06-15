"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getAccessToken } from "@/lib/api";

/**
 * Redirects unauthenticated visitors to /login and re-checks when auth is cleared
 * (e.g. logout from another page in the same tab).
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => {
      if (!getAccessToken()) {
        setAllowed(false);
        window.location.href = "/login/";
        return;
      }
      setAllowed(true);
    };

    check();
    window.addEventListener("user-state-change", check);
    return () => window.removeEventListener("user-state-change", check);
  }, [pathname]);

  if (!allowed) return null;

  return <>{children}</>;
}
