"use client";

import { useSystemLogTickers } from "@/hooks/useSystemLogTickers";
import SamvidhaanTickerStrip from "./SamvidhaanTickerStrip";

/** Live hub system-log ticker — use only on the main Samvidhaan command centre. */
export default function SystemLogTickerStrip({ className = "" }: { className?: string }) {
  const { tickers } = useSystemLogTickers(16, true);
  return <SamvidhaanTickerStrip logos={tickers} className={className} />;
}
