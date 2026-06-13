"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import ClickSpark from "../../../animations/ClickSpark";
import {
  tickExhausterVibration,
  tickSinterFeO,
  tickStrandSpeed,
  tickExhausterHealth,
  HUB_TICK_INTERVAL,
} from "@/services/telemetry";
import { useMockTelemetryLogs } from "@/hooks";
import {
  getFactory1Notifications,
  getFactory2Notifications,
  getSansadHubLogos,
  getRulMonitorLogos,
  getHistoricalLogsLogos,
  getRiskPriorityLogos,
  getRagLogsLogos,
} from "@/services/tickers";
import type { LogEntry } from "@/services/types";

// Import modular components
import { SystemLogItem } from "./components/SystemLogItem";
import MobileMonitoringView from "./components/MobileMonitoringView";
import VerticalMarquee from "./components/VerticalMarquee";
import FactoryCard from "./components/FactoryCard";
import SubPanelCard from "./components/SubPanelCard";
import LogDetailModal from "./components/LogDetailModal";

const factory1Notifications = getFactory1Notifications();
const factory2Notifications = getFactory2Notifications();
const sansadHubLogos = getSansadHubLogos();
const rulMonitorLogos = getRulMonitorLogos();
const historicalLogsLogos = getHistoricalLogsLogos();
const riskPriorityLogos = getRiskPriorityLogos();
const ragLogsLogos = getRagLogsLogos();

export default function SansadMonitoringPage() {
  const [isMobile, setIsMobile] = useState(false);

  // Simulated telemetry states
  const [exhausterVibration, setExhausterVibration] = useState(6.42);
  const [exhausterHealth, setExhausterHealth] = useState(24);
  const [sinterFeO, setSinterFeO] = useState(8.3);
  const [strandSpeed, setStrandSpeed] = useState(3.1);

  // Live Scrolling Logs State
  const { logs: systemLogs } = useMockTelemetryLogs(HUB_TICK_INTERVAL, 25, true, [
    { id: 1, time: "22:19:02", module: "Sansad-Hub", text: "Synchronized active RUL telemetry matrices to Manas Vector Database." },
    { id: 2, time: "22:19:12", module: "ThermalCascade-Predictor", text: "Upstream heat variations mapped to F3 Blast Furnace input delay." },
    { id: 3, time: "22:19:16", module: "Sansad-Hub", text: "Structured Work Order WO-2026-F1-09 compiled and routed to Manas." },
    { id: 4, time: "22:19:19", module: "Sansad-Hub", text: "Synchronized active RUL telemetry matrices to Manas Vector Database." },
    { id: 5, time: "22:19:22", module: "CokeOven-Agent", text: "Carbonizing temperature optimal (1085°C). Hearth sensors stable." },
    { id: 6, time: "22:19:26", module: "Sinter-Agent", text: "Calibration offset applied to Belt FeO Analyzer (BCFA)." },
    { id: 7, time: "22:19:30", module: "CokeOven-Agent", text: "NOMINAL: F1-EQ11 Electrostatic Precipitator electrodes stable. RUL at 95 days." },
  ]);

  const [activeLogForModal, setActiveLogForModal] = useState<LogEntry | null>(null);
  
  const handleSelectLog = useCallback((log: LogEntry) => {
    setActiveLogForModal(log);
  }, []);

  const systemLogContainerRef = useRef<HTMLDivElement>(null);

  // Handle Resize for Mobile check
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fluctuating values simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setExhausterVibration((prev) => tickExhausterVibration(prev));
      setSinterFeO((prev) => tickSinterFeO(prev));
      setStrandSpeed((prev) => tickStrandSpeed(prev));
      setExhausterHealth((prev) => tickExhausterHealth(prev));
    }, HUB_TICK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Handle Auto-scroll for the system logs container
  useEffect(() => {
    if (systemLogContainerRef.current) {
      systemLogContainerRef.current.scrollTop = systemLogContainerRef.current.scrollHeight;
    }
  }, [systemLogs]);

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
        // MOBILE FALLBACK VIEW
        <MobileMonitoringView
          exhausterVibration={exhausterVibration}
          exhausterHealth={exhausterHealth}
          sinterFeO={sinterFeO}
          strandSpeed={strandSpeed}
        />
      ) : (
        // DESKTOP GRID PARTITION LAYOUT
        <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex select-none">
          
          {/* Left Gutter Vertical Marquee (8vw width) */}
          <VerticalMarquee direction="up" side="left" text="SANSAD" />

          {/* Right Gutter Vertical Marquee (8vw width) */}
          <VerticalMarquee direction="down" side="right" text="ATAL" />

          {/* Centered partitioned area spanning exactly 84vw */}
          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5]">
            
            <div className="w-full h-full flex flex-col">
              {/* Top Header Bar — centered SANSAD title */}
              <div className="h-16 border-b border-zinc-200 flex items-center justify-between px-10 bg-[#FAF9F5] z-30 select-none flex-shrink-0">
                <div className="absolute left-1/2 -translate-x-1/2">
                  <span 
                    className="text-2xl font-black uppercase tracking-tight text-[#1b253c] inline-block" 
                    style={{ fontFamily: "var(--font-pixeloid)" }}
                  >
                    SANSAD
                  </span>
                </div>
                <div />
                <div className="flex gap-4">
                  <Link href="/manas/chat" className="group/link text-[10px] font-mono font-bold uppercase hover:text-[#f97316] text-[#1b253c] tracking-widest flex items-center gap-1 select-none">
                    Manas Chat <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:rotate-45" />
                  </Link>
                </div>
              </div>

              {/* Grid divisions (Adjacent layout boxes below the header) */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* Column 1 (35% width) */}
                <div className="w-[35%] h-full flex flex-col border-r border-zinc-200">
                  {/* Factory 1 Box */}
                  <FactoryCard
                    href="/sansad/hub/horizon-foundry"
                    title={<>HORIZON<br />FOUNDRY</>}
                    description="Coke Oven & By-Product Plant — extracts coke breeze, cleans COG, and feeds the blast furnace energy chain."
                    logos={factory1Notifications}
                    speed={22}
                    heightClass="h-[48%]"
                    borderClass="border-b border-zinc-200"
                  />

                  {/* Sansad Samvidhaan Box */}
                  <FactoryCard
                    href="/sansad/hub/samvidhaan"
                    title={<>SANSAD<br />SAMVIDHAAN</>}
                    description="Agentic concierge orchestrating the agent army — monitors RUL, traces multi-stage failure cascades, and routes structured diagnostics directly to Manas."
                    logos={sansadHubLogos}
                    speed={25}
                    heightClass="h-[52%]"
                    isSamvidhaan={true}
                  />
                </div>

                {/* Column 2 (35% width) */}
                <div className="w-[35%] h-full flex flex-col border-r border-zinc-200">
                  {/* Factory 2 Box */}
                  <FactoryCard
                    href="/sansad/hub/zephyr-sinter"
                    title={<>ZEPHYR<br />SINTER</>}
                    description="Sintering Plant — agglomerates iron ore fines, monitors BTP position and belt FeO to optimise blast furnace burden."
                    logos={factory2Notifications}
                    speed={18}
                    heightClass="h-[48%]"
                    borderClass="border-b border-zinc-200"
                  />

                  {/* Bottom stacked sub-panels */}
                  <div className="h-[52%] flex flex-col">
                    {/* Sub-panel A: RUL Monitor */}
                    <SubPanelCard
                      href="/sansad/hub/monitor"
                      title="RUL Monitor"
                      description="Equipment Remaining Useful Life predictions from live sensor telemetry."
                      logos={rulMonitorLogos}
                      borderClass="border-b border-zinc-200"
                    />

                    {/* Sub-panel B: Abnormality Prediction */}
                    <SubPanelCard
                      href="/sansad/hub/abpred"
                      title="Abnormality Prediction"
                      description="Criticality scoring by process impact, delay severity and spares availability."
                      logos={riskPriorityLogos}
                    />
                  </div>
                </div>

                {/* Column 3 (30% width) */}
                <div className="w-[30%] h-full flex flex-col">
                  
                  {/* LOG STREAM (top 48%) */}
                  <div className="group h-[48%] border-b border-zinc-200 p-6 flex flex-col relative transition-all duration-300 ease-in-out hover:bg-[#FAF6EE] hover:scale-[1.01] hover:z-10 hover:shadow-2xl">
                    <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-[#1b253c]/60 transition-colors duration-300 select-none">+</div>
                    <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-[#1b253c]/60 transition-colors duration-300 select-none">+</div>

                    <div className="flex-shrink-0 mb-3 flex justify-between items-center select-none">
                      <h2 className="text-xl font-black text-[#1b253c] uppercase" style={{ fontFamily: "var(--font-questrial)" }}>
                        SYSTEM LOG STREAM
                      </h2>
                      <Link href="/sansad/hub/logs" className="flex items-center gap-1 text-[10px] font-bold text-[#1b253c]/40 hover:text-[#f97316] uppercase tracking-wider transition-colors duration-300 font-mono group/expand cursor-pointer">
                        <span>Click here to expand</span>
                        <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover/expand:rotate-45" />
                      </Link>
                    </div>

                    <div className="flex-1 min-h-0 relative">
                      <div
                        ref={systemLogContainerRef}
                        className="sansad-scroll-hide h-full overflow-y-auto space-y-3 scroll-smooth"
                      >
                        <AnimatePresence mode="popLayout">
                          {systemLogs.map((log) => (
                            <SystemLogItem key={log.id} log={log} onSelect={handleSelectLog} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* HISTORICAL LOGS (middle 26%) */}
                  <SubPanelCard
                    href="/sansad/hub/historical-logs"
                    title="Historical Logs"
                    description="Past maintenance records, failure analyses, and SOP-driven repair history."
                    logos={historicalLogsLogos}
                    borderClass="border-b border-zinc-200"
                  />

                  {/* RAG LOGS (bottom 26%) */}
                  <SubPanelCard
                    href="/manas/chat?rag=1"
                    title="RAG"
                    description="Manas vector search queries, agent prompts, and context retrievals."
                    logos={ragLogsLogos}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog for detailed log view */}
      <LogDetailModal
        log={activeLogForModal}
        onClose={() => setActiveLogForModal(null)}
      />
    </ClickSpark>
  );
}
