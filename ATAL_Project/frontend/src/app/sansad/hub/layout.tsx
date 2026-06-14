"use client";

import { HubManasNotifyProvider } from "./components/HubManasNotify";

export default function SansadHubLayout({ children }: { children: React.ReactNode }) {
  return <HubManasNotifyProvider>{children}</HubManasNotifyProvider>;
}
