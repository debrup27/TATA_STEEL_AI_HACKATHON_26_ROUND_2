"use client";

import AuthGate from "@/components/AuthGate";
import { HubManasNotifyProvider } from "./components/HubManasNotify";

export default function SansadHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <HubManasNotifyProvider>{children}</HubManasNotifyProvider>
    </AuthGate>
  );
}
