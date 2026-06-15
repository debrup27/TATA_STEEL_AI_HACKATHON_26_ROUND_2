"use client";

import AuthGate from "@/components/AuthGate";

export default function ManasChatLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
