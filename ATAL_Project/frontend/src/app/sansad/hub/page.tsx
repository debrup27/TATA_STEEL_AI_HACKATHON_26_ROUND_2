"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import ClickSpark from "../../../animations/ClickSpark";
import UserPill from "@/components/UserPill";
import AnomalyTripControl from "./components/AnomalyTripControl";
import { LOG_STREAM_POLL_MS, LOG_STREAM_REVEAL_MS } from "@/services/telemetry";
import { usePlantSnapshot } from "@/hooks/usePlantSnapshot";
import { useTelemetryLogs } from "@/hooks";
import { useFactoryTickers } from "@/hooks/useFactoryTickers";
import { useNotificationFeed } from "@/hooks/useNotificationFeed";
import { FACTORY_DESCRIPTIONS } from "@/lib/factory-display";
import type { LogEntry } from "@/services/types";

import { SystemLogItem } from "./components/SystemLogItem";
import { SystemLogControls } from "./components/SystemLogControls";
import MobileMonitoringView from "./components/MobileMonitoringView";
import VerticalMarquee from "./components/VerticalMarquee";
import FactoryCard from "./components/FactoryCard";
import SubPanelCard from "./components/SubPanelCard";
import LogDetailModal from "./components/LogDetailModal";

const EMPTY_TICKERS: { text: string; isSeparator: boolean }[] = [
  { text: "Awaiting live plant feed…", isSeparator: false },
];

export default function SansadMonitoringPage() {
  const [isMobile, setIsMobile] = useState(false);

  const { f1: factory1Notifications, f2: factory2Notifications } = useFactoryTickers(
    "F1",
    "F2",
    EMPTY_TICKERS,
    EMPTY_TICKERS,
  );
  const { tickers: hubTickers } = useNotificationFeed(undefined, 30_000);
  const pillarTickers = hubTickers.length >= 2 ? hubTickers : EMPTY_TICKERS;

  const [isLogStreamLive, setIsLogStreamLive] = useState(true);
  const { logs: systemLogs, clear: clearSystemLogs, status: logStreamStatus } = useTelemetryLogs(
    LOG_STREAM_POLL_MS,
    25,
    isLogStreamLive,
    { order: "asc", revealIntervalMs: LOG_STREAM_REVEAL_MS, instantInitialLoad: true },
  );

  const [activeLogForModal, setActiveLogForModal] = useState<LogEntry | null>(null);
  const handleSelectLog = useCallback((log: LogEntry) => setActiveLogForModal(log), []);
  const systemLogContainerRef = useRef<HTMLDivElement>(null);

  const { assets: snapAssets } = usePlantSnapshot();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isLogStreamLive || !systemLogContainerRef.current) return;
    systemLogContainerRef.current.scrollTop = systemLogContainerRef.current.scrollHeight;
  }, [systemLogs, isLogStreamLive]);

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={8}
      sparkRadius={18}
      sparkCount={6}
      duration={350}
      className="relative min-h-screen w-full bg-[#FAF9F5] flex flex-col justify-start overflow-hidden select-none"
    >
      {isMobile ? (
        <MobileMonitoringView assets={snapAssets} />
      ) : (
        <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex select-none">
          <VerticalMarquee direction="up" side="left" text="SANSAD" />
          <VerticalMarquee direction="down" side="right" text="ATAL" />

          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5]">
            <div className="w-full h-full flex flex-col">
              <div className="shrink-0 border-b border-zinc-200 bg-[#FAF9F5] z-30 select-none relative overflow-visible">
              <div className="min-h-14 flex items-center justify-between px-4 py-2 relative gap-2">
                <Link
                  href="/"
                  className="rounded-full p-1.5 bg-white inline-flex items-center justify-center overflow-hidden shadow-sm cursor-pointer w-[40px] h-[40px] transition-transform duration-500 hover:rotate-360 shrink-0"
                  title="Home"
                >
                  <img src="/short_form_logo.webp" alt="ATAL Logo" className="w-full h-full object-cover block" />
                </Link>
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
                  <span
                    className="text-2xl font-black uppercase tracking-tight text-[#1b253c] inline-block"
                    style={{ fontFamily: "var(--font-pixeloid)" }}
                  >
                    SANSAD
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <AnomalyTripControl />
                  <Link
                    href="/manas/chat"
                    className="group/link text-[10px] font-mono font-bold uppercase hover:text-[#f97316] text-[#1b253c] tracking-widest flex items-center gap-1 select-none whitespace-nowrap"
                  >
                    Manas Chat <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:rotate-45" />
                  </Link>
                  <UserPill
                    containerClassName="rounded-full p-1.5 bg-white inline-flex items-center justify-center shadow-sm w-[40px] h-[40px] group cursor-pointer relative"
                    className="w-full h-full"
                  />
                </div>
              </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Column 1 — Horizon + Samvidhaan */}
                <div className="w-[35%] h-full flex flex-col border-r border-zinc-200">
                  <FactoryCard
                    href="/sansad/hub/horizon-foundry"
                    title={<>HORIZON<br />FOUNDRY</>}
                    description={FACTORY_DESCRIPTIONS.horizon}
                    logos={factory1Notifications}
                    speed={22}
                    heightClass="h-[48%]"
                    borderClass="border-b border-zinc-200"
                  />
                  <FactoryCard
                    href="/sansad/hub/samvidhaan"
                    title={<>SANSAD<br />SAMVIDHAAN</>}
                    description="Agentic concierge orchestrating the agent army — monitors RUL, traces multi-stage failure cascades, and routes structured diagnostics directly to Manas."
                    logos={pillarTickers}
                    speed={25}
                    heightClass="h-[52%]"
                    isSamvidhaan
                  />
                </div>

                {/* Column 2 — Zephyr + §5.1 / §5.2 */}
                <div className="w-[35%] h-full flex flex-col border-r border-zinc-200">
                  <FactoryCard
                    href="/sansad/hub/zephyr-sinter"
                    title={<>ZEPHYR<br />SINTER</>}
                    description={FACTORY_DESCRIPTIONS.zephyr}
                    logos={factory2Notifications}
                    speed={18}
                    heightClass="h-[48%]"
                    borderClass="border-b border-zinc-200"
                  />
                  <div className="h-[52%] flex flex-col">
                    <SubPanelCard
                      href="/sansad/hub/diagnostics"
                      title="Diagnostics & Prediction"
                      description="Fault diagnosis, RCA, RUL estimates, early warnings, and cross-stage process defect links."
                      logos={pillarTickers}
                      borderClass="border-b border-zinc-200"
                    />
                    <SubPanelCard
                      href="/sansad/hub/risk"
                      title="Risk & Priority"
                      description="Risk classification, urgency scoring, bottleneck ranking, and spares availability."
                      logos={pillarTickers}
                    />
                  </div>
                </div>

                {/* Column 3 — Log stream + §5.3 / §5.4 */}
                <div className="w-[30%] h-full flex flex-col">
                  <div className="group h-[48%] border-b border-zinc-200 p-6 flex flex-col relative transition-all duration-300 ease-in-out hover:bg-[#FAF6EE] hover:scale-[1.01] hover:z-10 hover:shadow-2xl">
                    <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-[#1b253c]/60 transition-colors duration-300 select-none">
                      +
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-[#1b253c]/60 transition-colors duration-300 select-none">
                      +
                    </div>

                    <div className="flex-shrink-0 mb-3 flex justify-between items-center select-none gap-2">
                      <h2
                        className="text-xl font-black text-[#1b253c] uppercase"
                        style={{ fontFamily: "var(--font-questrial)" }}
                      >
                        SYSTEM LOG STREAM
                      </h2>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <SystemLogControls
                          compact
                          isLive={isLogStreamLive}
                          onToggleLive={() => setIsLogStreamLive((v) => !v)}
                          onClear={clearSystemLogs}
                        />
                        <Link
                          href="/sansad/hub/logs"
                          className="flex items-center gap-1 text-[10px] font-bold text-[#1b253c]/40 hover:text-[#f97316] uppercase tracking-wider transition-colors duration-300 font-mono group/expand cursor-pointer"
                        >
                          <span>Click here to expand</span>
                          <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover/expand:rotate-45" />
                        </Link>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 relative">
                      <div
                        ref={systemLogContainerRef}
                        className="sansad-scroll-hide h-full overflow-y-auto space-y-3 scroll-smooth"
                      >
                        <AnimatePresence mode="popLayout">
                          {systemLogs.length === 0 ? (
                            <p
                              className="text-[11px] text-[#1b253c]/45 uppercase tracking-wider font-mono py-4"
                              style={{ fontFamily: "var(--font-questrial)" }}
                            >
                              {logStreamStatus === "auth_required"
                                ? "Sign in required — open /login to view live system logs"
                                : logStreamStatus === "error"
                                  ? "Unable to reach log API — check backend is running"
                                  : isLogStreamLive
                                    ? "Awaiting system alerts and maintenance events…"
                                    : "Stream paused — resume to load new entries"}
                            </p>
                          ) : (
                            systemLogs.map((log) => (
                              <SystemLogItem key={log.id} log={log} onSelect={handleSelectLog} />
                            ))
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <SubPanelCard
                    href="/sansad/hub/actions"
                    title="Maintenance Actions"
                    description="Immediate steps, long-term monitoring plans, and optimised maintenance schedules."
                    logos={pillarTickers}
                    borderClass="border-b border-zinc-200"
                  />
                  <SubPanelCard
                    href="/sansad/hub/reports"
                    title="Intelligence Reports"
                    description="Maintenance reports, abnormal alerts, decision summaries, and digital logbook entries."
                    logos={pillarTickers}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <LogDetailModal log={activeLogForModal} onClose={() => setActiveLogForModal(null)} />
    </ClickSpark>
  );
}
