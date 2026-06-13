"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ShieldAlert, AlertTriangle, CheckCircle } from "lucide-react";
import ClickSpark from "../../../animations/ClickSpark";
import LogoLoop from "../../../animations/LogoLoop";

// Pre-defined list of potential live logs for simulation (focused on Sansad & Agent Army)
const systemLogsPool = [
  { module: "CokeOven-Agent", text: "Carbonizing temperature optimal (1085°C). Hearth sensors stable." },
  { module: "ThermalCascade-Predictor", text: "Upstream heat variations mapped to F3 Blast Furnace input delay." },
  { module: "LadleTransfer-Optimizer", text: "Ladle transfer transit lag calculated at 42 minutes." },
  { module: "Calibration-Service", text: "Calibration offset applied to Belt FeO Analyzer (BCFA)." },
  { module: "LadleTransfer-Optimizer", text: "Liquid iron mass flow matches SMS caster throughput." },
  { module: "ThermalCascade-Predictor", text: "No cascade anomalies detected in HSM coil coiler yard." },
  { module: "Sansad-Hub", text: "Structured Work Order WO-2026-F1-09 compiled and routed to Manas." },
  { module: "Sansad-Hub", text: "Synchronized active RUL telemetry matrices to Manas Vector Database." },
  { module: "CokeOven-Agent", text: "F1-EQ11 electrostatic precipitator electrode voltage at 48 kV." },
];


// Factory notification ticker data
const factory1Notifications = [
  { text: "EXHAUSTER VIBRATION: 6.42 mm/s", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "BEARING RUL: 14 DAYS", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "COG PRESSURE: NOMINAL", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "F1-EQ09: CRITICAL ALERT", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "HEARTH TEMP: 1085°C", isSeparator: false },
  { text: "✦", isSeparator: true },
];

const factory2Notifications = [
  { text: "BELT FeO CONTENT: 8.3%", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "STRAND SPEED: 3.1 m/min", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "BTP POSITION: STABLE", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "F2-EQ04: WARN — FATIGUE", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "SINTER YIELD: OPTIMAL", isSeparator: false },
  { text: "✦", isSeparator: true },
];

const sansadHubLogos = [
  { text: "CokeOven-Agent: ACTIVE", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "Sinter-Agent: ACTIVE", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "Cascade-Predictor: RUNNING", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "Manas Sync: LIVE", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "LadleTransfer-Optimizer: ACTIVE", isSeparator: false },
  { text: "✦", isSeparator: true },
];

const rulMonitorLogos = [
  { text: "F1-EQ09 Exhauster — 14d ⚠ CRITICAL", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "F2-EQ04 Drive Sprocket — 18d WARN", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "F2-EQ09 Waste Fan — 42d OK", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "F1-EQ11 Precipitator — 95d OK", isSeparator: false },
  { text: "✦", isSeparator: true },
];

const historicalLogsLogos = [
  { text: "MR-2024-441 — Bearing replacement · F1-EQ09", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "MR-2024-388 — Sprocket lubrication · F2-EQ04", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "MR-2024-301 — Fan blade inspection · F2-EQ09", isSeparator: false },
  { text: "✦", isSeparator: true },
];

const riskPriorityLogos = [
  { text: "F1-EQ09 Exhauster — CRITICAL · Score 97", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "F2-EQ04 Sprocket — HIGH · Score 81", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "F2-EQ09 Waste Fan — MEDIUM · Score 54", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "F1-EQ11 Precipitator — LOW · Score 22", isSeparator: false },
  { text: "✦", isSeparator: true },
];

const ragLogsLogos = [
  { text: "QUERY: F1-EQ09 EXHAUSTER BEARING — RAG MATCH 98.4%", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "VECTOR SEARCH: CASCADE SIMILARITY INDEX", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "PROMPT COMPILED: SANSAD WORK ORDER PAYLOAD", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "CONTEXT RETRIEVED: 3 HISTORICAL CASES", isSeparator: false },
  { text: "✦", isSeparator: true },
];

interface SystemLog {
  id: number;
  time: string;
  module: string;
  text: string;
}

export default function SansadMonitoringPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [isSansadHubHovered, setIsSansadHubHovered] = useState(false);

  // Simulated telemetry states
  const [exhausterVibration, setExhausterVibration] = useState(6.42);
  const [exhausterHealth, setExhausterHealth] = useState(24);
  const [sinterFeO, setSinterFeO] = useState(8.3);
  const [strandSpeed, setStrandSpeed] = useState(3.1);

  // Live Scrolling Logs State
  const [systemLogs, setSystemLogs] = useState<Array<SystemLog>>([
    { id: 1, time: "22:19:02", module: "Sansad-Hub", text: "Synchronized active RUL telemetry matrices to Manas Vector Database." },
    { id: 2, time: "22:19:12", module: "ThermalCascade-Predictor", text: "Upstream heat variations mapped to F3 Blast Furnace input delay." },
    { id: 3, time: "22:19:16", module: "Sansad-Hub", text: "Structured Work Order WO-2026-F1-09 compiled and routed to Manas." },
    { id: 4, time: "22:19:19", module: "Sansad-Hub", text: "Synchronized active RUL telemetry matrices to Manas Vector Database." },
    { id: 5, time: "22:19:22", module: "CokeOven-Agent", text: "Carbonizing temperature optimal (1085°C). Hearth sensors stable." },
    { id: 6, time: "22:19:26", module: "Sinter-Agent", text: "Calibration offset applied to Belt FeO Analyzer (BCFA)." },
    { id: 7, time: "22:19:30", module: "CokeOven-Agent", text: "NOMINAL: F1-EQ11 Electrostatic Precipitator electrodes stable. RUL at 95 days." },
  ]);

  const [activeLogForModal, setActiveLogForModal] = useState<SystemLog | null>(null);

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

  // Fluctuating values and log appending simulation
  useEffect(() => {
    let logIdCounter = 100;
    const interval = setInterval(() => {
      setExhausterVibration((prev) => {
        const delta = (Math.random() - 0.5) * 0.12;
        const next = prev + delta;
        return parseFloat(Math.max(6.2, Math.min(6.8, next)).toFixed(2));
      });

      setSinterFeO((prev) => {
        const delta = (Math.random() - 0.5) * 0.08;
        const next = prev + delta;
        return parseFloat(Math.max(8.0, Math.min(8.48, next)).toFixed(2));
      });

      setStrandSpeed((prev) => {
        const delta = (Math.random() - 0.5) * 0.05;
        const next = prev + delta;
        return parseFloat(Math.max(2.8, Math.min(3.4, next)).toFixed(1));
      });

      setExhausterHealth((prev) => {
        if (Math.random() > 0.8) {
          return Math.max(20, prev - 1);
        }
        return prev;
      });

      // Append new log to system logs
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      const template = systemLogsPool[Math.floor(Math.random() * systemLogsPool.length)];
      setSystemLogs((prev) => {
        const nextLogs = [...prev, { id: logIdCounter++, time: timeStr, module: template.module, text: template.text }];
        return nextLogs.slice(-25);
      });
    }, 3500);

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
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes marqueeDown {
            0% { transform: translateY(-50%); }
            100% { transform: translateY(0%); }
          }
          @keyframes marqueeUp {
            0% { transform: translateY(0%); }
            100% { transform: translateY(-50%); }
          }
          .animate-marquee-up {
            animation: marqueeUp 35s linear infinite;
          }
          .animate-marquee-down {
            animation: marqueeDown 35s linear infinite;
          }
          .atal-text-filled {
            font-family: var(--font-pixeloid);
            font-weight: 900;
            color: #000000;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            transform: rotate(90deg);
            display: inline-block;
          }
          .atal-text-filled:hover {
            color: #f97316;
            transform: scale(1.1) rotate(90deg);
          }
          
          /* Hide scrollbar but keep scroll functional */
          .sansad-custom-scroll::-webkit-scrollbar {
            width: 0px;
            background: transparent;
          }
          .sansad-custom-scroll {
            scrollbar-width: none;
          }
        `
      }} />

      {isMobile ? (
        // MOBILE FALLBACK VIEW
        <div className="flex flex-col gap-6 w-full px-6 pt-24 pb-12 select-none max-w-lg mx-auto z-10">
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-xs">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter uppercase leading-none" style={{ fontFamily: "var(--font-pixeloid)" }}>
              SANSAD<br />MONITORING
            </h1>
            <p className="text-[9px] text-[#f97316] mt-3 font-bold uppercase tracking-[0.2em]">
              Agentic iROC Telemetry Control
            </p>
          </div>

          {/* F1 Mobile */}
          <div className="bg-[#FAF6EE] border border-zinc-200 p-5 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">Horizon Foundry</span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 uppercase">Coke Oven & Exhauster</h3>
            <div className="mt-2 space-y-1 font-mono text-[10px] text-zinc-500">
              <div>Exhauster Vibr: {exhausterVibration} mm/s</div>
              <div>Exhauster Health: {exhausterHealth}%</div>
            </div>
            <Link 
              href="/sansad/hub/horizon-foundry"
              className="mt-4 block w-full py-2 bg-zinc-900 text-white text-center rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            >
              Open Pipeline Editor
            </Link>
          </div>

          {/* F2 Mobile */}
          <div className="bg-[#FAF6EE] border border-zinc-200 p-5 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">Zephyr Sinter</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 uppercase">Sintering Plant</h3>
            <div className="mt-2 space-y-1 font-mono text-[10px] text-zinc-500">
              <div>FeO Content: {sinterFeO}%</div>
              <div>Strand Speed: {strandSpeed} m/min</div>
            </div>
            <Link 
              href="/sansad/hub/zephyr-sinter"
              className="mt-4 block w-full py-2 bg-zinc-950 text-white text-center rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            >
              Open Pipeline Editor
            </Link>
          </div>

          {/* Sansad Mobile */}
          <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-xs">
            <h3 className="text-sm font-bold text-zinc-800 uppercase" style={{ fontFamily: "var(--font-pixeloid)" }}>Sansad Agent Army</h3>
            <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed font-light">
              Autonomous bots tracing RUL and thermodynamic physical cascades, reporting directly to Manas.
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/sansad/hub/samvidhaan" className="flex-1 text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer">
                SANSAD SAMVIDHAAN
              </Link>
            </div>
          </div>
        </div>
      ) : (
        // DESKTOP GRID PARTITION LAYOUT
        <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex select-none">
          
          {/* Left Gutter Vertical Marquee (8vw width) */}
          <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-r border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-up flex flex-col items-center w-full">
              {Array(6).fill("SANSAD").concat(Array(6).fill("SANSAD")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Gutter Vertical Marquee (8vw width) */}
          <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-l border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-down flex flex-col items-center w-full">
              {Array(6).fill("ATAL").concat(Array(6).fill("ATAL")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Centered partitioned area spanning exactly 84vw */}
          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5]">
            
            <div className="w-full h-full flex flex-col">
              {/* Top Header Bar — centered SANSAD title (with hover effect) */}
              <div className="h-16 border-b border-zinc-200 flex items-center justify-between px-10 bg-[#FAF9F5] z-30 select-none flex-shrink-0">
                <div className="absolute left-1/2 -translate-x-1/2">
                  <span 
                    className="text-2xl font-black uppercase tracking-tight text-[#1b253c] hover:text-[#f97316] hover:scale-105 transition-all duration-300 cursor-pointer inline-block" 
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
                  <Link href="/sansad/hub/horizon-foundry" className="group h-[48%] p-8 border-b border-zinc-200 flex flex-col relative transition-all duration-300 ease-in-out hover:bg-[#FAF6EE] hover:scale-[1.01] hover:z-10 hover:shadow-2xl cursor-pointer">
                    <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-[#1b253c]/60 transition-colors duration-300 select-none">+</div>
                    <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-[#1b253c]/60 transition-colors duration-300 select-none">+</div>

                    {/* Smaller spacer — title sits ~40% from top */}
                    <div className="flex-[0.4]" />

                    <h2 className="text-5xl font-black text-[#1b253c] uppercase leading-none transition-colors duration-300" style={{ fontFamily: "var(--font-questrial)" }}>
                      HORIZON<br />FOUNDRY
                    </h2>

                    {/* Italic description */}
                    <p className="mt-5 text-sm italic text-zinc-400 group-hover:text-zinc-500 transition-colors duration-300 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                      Coke Oven & By-Product Plant — extracts coke breeze, cleans COG, and feeds the blast furnace energy chain.
                    </p>

                    {/* Push ticker to bottom */}
                    <div className="flex-[2]" />

                    {/* Notification ticker + arrow row at bottom */}
                    <div className="flex flex-col gap-2">
                      <div className="overflow-hidden border-t border-[#1b253c]/8 transition-colors duration-300 pt-2">
                        <LogoLoop
                          logos={factory1Notifications}
                          speed={22}
                          direction="left"
                          logoHeight={16}
                          gap={20}
                          pauseOnHover
                          renderItem={(item) => (
                            <span
                              style={{ fontFamily: "var(--font-questrial)" }}
                              className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-sm ${
                                item.isSeparator
                                  ? "text-[#1b253c]/20 group-hover:text-[#1b253c]/30"
                                  : item.text?.includes("CRITICAL") || item.text?.includes("WARN")
                                    ? "text-rose-500 group-hover:text-rose-600 font-bold"
                                    : "text-[#1b253c]/50 group-hover:text-[#1b253c]/85"
                              }`}
                            >
                              {item.text}
                            </span>
                          )}
                        />
                      </div>
                      {/* Rotating Arrow Indicator */}
                      <div className="flex justify-end">
                        <ArrowUpRight className="w-7 h-7 text-[#1b253c] group-hover:text-[#f97316] transition-all duration-300 group-hover:rotate-45" />
                      </div>
                    </div>
                  </Link>

                  {/* Sansad Samvidhaan Box */}
                  <Link 
                    href="/sansad/hub/samvidhaan" 
                    onMouseEnter={() => setIsSansadHubHovered(true)}
                    onMouseLeave={() => setIsSansadHubHovered(false)}
                    className={`group h-[52%] p-8 flex flex-col relative transition-all duration-300 ease-in-out cursor-pointer origin-bottom-left ${
                      isSansadHubHovered 
                        ? "bg-[#FAF6EE] text-[#1b253c] border-transparent scale-[1.01] z-20 shadow-2xl" 
                        : "bg-transparent text-[#1b253c] border-zinc-200"
                    }`}
                  >
                    <div className={`absolute top-2.5 left-2.5 font-mono text-[9px] transition-colors duration-300 select-none ${isSansadHubHovered ? "text-[#1b253c]/60" : "text-[#1b253c]/35"}`}>+</div>
                    <div className={`absolute bottom-2.5 right-2.5 font-mono text-[9px] transition-colors duration-300 select-none ${isSansadHubHovered ? "text-[#1b253c]/60" : "text-[#1b253c]/35"}`}>+</div>

                    <div className="flex-[0.4]" />

                    <h2 className="text-5xl font-black uppercase leading-none text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
                      SANSAD<br />SAMVIDHAAN
                    </h2>
                    
                    <p className={`mt-5 text-sm italic leading-snug transition-colors duration-300 ${
                      isSansadHubHovered ? "text-zinc-500" : "text-zinc-400"
                    }`} style={{ fontFamily: "var(--font-questrial)" }}>
                      Agentic concierge orchestrating the agent army — monitors RUL, traces multi-stage failure cascades, and routes structured diagnostics directly to Manas.
                    </p>

                    <div className="flex-[2]" />

                    <div className="flex flex-col gap-2">
                      <div className="overflow-hidden border-t border-[#1b253c]/8 transition-colors duration-300 pt-2">
                        <LogoLoop
                          logos={sansadHubLogos}
                          speed={25}
                          direction="left"
                          logoHeight={16}
                          gap={20}
                          pauseOnHover
                          renderItem={(item) => (
                            <span
                              style={{ fontFamily: "var(--font-questrial)" }}
                              className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-sm ${
                                item.isSeparator
                                  ? isSansadHubHovered ? "text-[#1b253c]/30" : "text-[#1b253c]/20"
                                  : item.text?.includes("ACTIVE") || item.text?.includes("LIVE")
                                    ? "text-emerald-600 font-bold"
                                    : isSansadHubHovered ? "text-[#1b253c]/80" : "text-[#1b253c]/50"
                              }`}
                            >
                              {item.text}
                            </span>
                          )}
                        />
                      </div>
                      <div className="flex justify-end">
                        <ArrowUpRight className={`w-7 h-7 transition-all duration-300 ${
                          isSansadHubHovered ? "text-[#f97316] rotate-45" : "text-[#1b253c]"
                        }`} />
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Column 2 (35% width) */}
                <div className="w-[35%] h-full flex flex-col border-r border-zinc-200">
                  {/* Factory 2 Box */}
                  <Link href="/sansad/hub/zephyr-sinter" className="group h-[48%] p-8 border-b border-zinc-200 flex flex-col relative transition-all duration-300 ease-in-out hover:bg-[#FAF6EE] hover:scale-[1.01] hover:z-10 hover:shadow-2xl cursor-pointer">
                    <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-[#1b253c]/60 transition-colors duration-300 select-none">+</div>
                    <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-[#1b253c]/60 transition-colors duration-300 select-none">+</div>

                    {/* Smaller spacer */}
                    <div className="flex-[0.4]" />

                    <h2 className="text-5xl font-black text-[#1b253c] uppercase leading-none transition-colors duration-300" style={{ fontFamily: "var(--font-questrial)" }}>
                      ZEPHYR<br />SINTER
                    </h2>

                    {/* Italic description */}
                    <p className="mt-5 text-sm italic text-zinc-400 group-hover:text-zinc-500 transition-colors duration-300 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                      Sintering Plant — agglomerates iron ore fines, monitors BTP position and belt FeO to optimise blast furnace burden.
                    </p>

                    {/* Push ticker to bottom */}
                    <div className="flex-[2]" />

                    {/* Notification ticker + arrow row at bottom */}
                    <div className="flex flex-col gap-2">
                      <div className="overflow-hidden border-t border-[#1b253c]/8 transition-colors duration-300 pt-2">
                        <LogoLoop
                          logos={factory2Notifications}
                          speed={18}
                          direction="left"
                          logoHeight={16}
                          gap={20}
                          pauseOnHover
                          renderItem={(item) => (
                            <span
                              style={{ fontFamily: "var(--font-questrial)" }}
                              className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-sm ${
                                item.isSeparator
                                  ? "text-[#1b253c]/20 group-hover:text-[#1b253c]/30"
                                  : item.text?.includes("WARN")
                                    ? "text-rose-500 group-hover:text-rose-600 font-bold"
                                    : "text-[#1b253c]/50 group-hover:text-[#1b253c]/85"
                              }`}
                            >
                              {item.text}
                            </span>
                          )}
                        />
                      </div>
                      {/* Rotating Arrow Indicator */}
                      <div className="flex justify-end">
                        <ArrowUpRight className="w-7 h-7 text-[#1b253c] group-hover:text-[#f97316] transition-all duration-300 group-hover:rotate-45" />
                      </div>
                    </div>
                  </Link>

                  {/* Bottom stacked sub-panels */}
                  <div className="h-[52%] flex flex-col">
                    {/* Sub-panel A: RUL Monitor */}
                    <Link href="/sansad/hub/monitor" className="group flex-1 py-6 px-8 border-b border-zinc-200 flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out hover:bg-[#4A582E] hover:scale-[1.01] hover:z-10 hover:shadow-2xl cursor-pointer">
                      <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white/40 transition-colors duration-300 select-none">+</div>
                      <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white/40 transition-colors duration-300 select-none">+</div>

                      <div className="flex-[0.2]" />
                      <h3 className="text-3xl font-black text-[#1b253c] group-hover:text-white uppercase leading-none transition-colors duration-300" style={{ fontFamily: "var(--font-questrial)" }}>RUL Monitor</h3>
                      <p className="mt-2 text-sm italic text-zinc-400 group-hover:text-white/80 transition-colors duration-300 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                        Equipment Remaining Useful Life predictions from live sensor telemetry.
                      </p>
                      <div className="flex-[1.5]" />
                      <div className="flex items-center justify-between gap-4 border-t border-[#1b253c]/8 group-hover:border-transparent transition-colors duration-300 pt-2">
                        <div className="overflow-hidden flex-1">
                          <LogoLoop
                            logos={rulMonitorLogos}
                            speed={22}
                            direction="left"
                            logoHeight={14}
                            gap={18}
                            pauseOnHover
                            renderItem={(item) => (
                              <span
                                style={{ fontFamily: "var(--font-questrial)" }}
                                className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-xs ${
                                  item.isSeparator ? "text-[#1b253c]/20 group-hover:text-white/30"
                                    : item.text?.includes("CRITICAL") ? "text-rose-500 group-hover:text-rose-450 font-bold"
                                    : item.text?.includes("WARN") ? "text-amber-500 group-hover:text-amber-455 font-semibold"
                                    : "text-emerald-600 group-hover:text-emerald-300 font-bold"
                                }`}
                              >{item.text}</span>
                            )}
                          />
                        </div>
                        <ArrowUpRight className="w-6 h-6 text-[#1b253c] group-hover:text-[#f97316] transition-transform duration-300 group-hover:rotate-45 shrink-0" />
                      </div>
                    </Link>

                    {/* Sub-panel B: Abnormality Prediction */}
                    <Link href="/sansad/hub/abpred" className="group flex-1 py-6 px-8 flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out hover:bg-[#4A582E] hover:scale-[1.01] hover:z-10 hover:shadow-2xl cursor-pointer">
                      <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white/40 transition-colors duration-300 select-none">+</div>
                      <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white/40 transition-colors duration-300 select-none">+</div>

                      <div className="flex-[0.2]" />
                      <h3 className="text-3xl font-black text-[#1b253c] group-hover:text-white uppercase leading-none transition-colors duration-300" style={{ fontFamily: "var(--font-questrial)" }}>Abnormality Prediction</h3>
                      <p className="mt-2 text-sm italic text-zinc-400 group-hover:text-white/80 transition-colors duration-300 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                        Criticality scoring by process impact, delay severity and spares availability.
                      </p>
                      <div className="flex-[1.5]" />
                      <div className="flex items-center justify-between gap-4 border-t border-[#1b253c]/8 group-hover:border-transparent transition-colors duration-300 pt-2">
                        <div className="overflow-hidden flex-1">
                          <LogoLoop
                            logos={riskPriorityLogos}
                            speed={22}
                            direction="left"
                            logoHeight={14}
                            gap={18}
                            pauseOnHover
                            renderItem={(item) => (
                              <span
                                style={{ fontFamily: "var(--font-questrial)" }}
                                className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-xs ${
                                  item.isSeparator ? "text-[#1b253c]/20 group-hover:text-white/30"
                                    : item.text?.includes("CRITICAL") ? "text-rose-500 group-hover:text-rose-455 font-bold"
                                    : item.text?.includes("HIGH") ? "text-orange-500 group-hover:text-orange-400 font-semibold"
                                    : item.text?.includes("MEDIUM") ? "text-amber-500 group-hover:text-amber-300"
                                    : "text-emerald-600 group-hover:text-emerald-300"
                                }`}
                              >{item.text}</span>
                            )}
                          />
                        </div>
                        <ArrowUpRight className="w-6 h-6 text-[#1b253c] group-hover:text-[#f97316] transition-transform duration-300 group-hover:rotate-45 shrink-0" />
                      </div>
                    </Link>
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
                        className="sansad-custom-scroll h-full overflow-y-auto space-y-3 scroll-smooth"
                      >
                        <AnimatePresence mode="popLayout">
                          {systemLogs.map((log) => {
                            const isCritical = log.text.includes("CRITICAL") || log.text.includes("fatigue") || log.text.includes("risk") || log.text.includes("extreme");
                            const isWarning = log.text.includes("WARNING") || log.text.includes("drift") || log.text.includes("vibration");
                            let timeColor = "text-[#1b253c]/40 group-hover:text-[#1b253c]/60";
                            let moduleColor = "text-[#1b253c]/65 group-hover:text-[#1b253c]/85";
                            let textStyle = "text-[#1b253c]/80 group-hover:text-[#1b253c]";
                            let dot = "bg-zinc-300 group-hover:bg-zinc-400";
                            if (isCritical) { timeColor = "text-rose-500/60 group-hover:text-rose-600/80"; moduleColor = "text-rose-600 group-hover:text-rose-700"; textStyle = "text-rose-600 group-hover:text-rose-700 font-semibold"; dot = "bg-rose-500 group-hover:bg-rose-600"; }
                            else if (isWarning) { timeColor = "text-amber-600/60 group-hover:text-amber-700/80"; moduleColor = "text-amber-600 group-hover:text-amber-700"; textStyle = "text-amber-600 group-hover:text-amber-700"; dot = "bg-amber-500 group-hover:bg-amber-600"; }
                            return (
                              <motion.div
                                key={log.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setActiveLogForModal(log);
                                }}
                                className={`flex gap-2 items-start border-b border-[#1b253c]/5 group-hover:border-[#1b253c]/10 pb-2 transition-colors duration-300 cursor-pointer ${textStyle}`}
                              >
                                <span className={`mt-2 h-1.5 w-1.5 rounded-full flex-shrink-0 transition-colors duration-300 ${dot}`} />
                                <div>
                                  <span style={{ fontFamily: "var(--font-questrial)" }} className={`text-[11px] block mb-0.5 transition-colors duration-300 ${timeColor}`}>[{log.time}]&nbsp;<span className={`font-bold transition-colors duration-300 ${moduleColor}`}>{log.module}</span></span>
                                  <span style={{ fontFamily: "var(--font-questrial)" }} className="text-[14px] leading-snug transition-colors duration-300">{log.text}</span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* HISTORICAL LOGS (middle 26%) */}
                  <Link href="/sansad/hub/historical-logs" className="group h-[26%] border-b border-zinc-200 py-6 px-8 flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out hover:bg-[#4A582E] hover:scale-[1.01] hover:z-10 hover:shadow-2xl cursor-pointer">
                    <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white/40 transition-colors duration-300 select-none">+</div>
                    <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white/40 transition-colors duration-300 select-none">+</div>

                    <div className="flex-[0.2]" />
                    <h3 className="text-3xl font-black text-[#1b253c] group-hover:text-white uppercase leading-none transition-colors duration-300" style={{ fontFamily: "var(--font-questrial)" }}>Historical Logs</h3>
                    <p className="mt-2 text-sm italic text-zinc-400 group-hover:text-white/80 transition-colors duration-300 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                      Past maintenance records, failure analyses, and SOP-driven repair history.
                    </p>
                    <div className="flex-[1.5]" />
                    <div className="flex items-center justify-between gap-4 border-t border-[#1b253c]/8 group-hover:border-transparent transition-colors duration-300 pt-2">
                      <div className="overflow-hidden flex-1">
                        <LogoLoop
                          logos={historicalLogsLogos}
                          speed={22}
                          direction="left"
                          logoHeight={14}
                          gap={18}
                          pauseOnHover
                          renderItem={(item) => (
                            <span
                              style={{ fontFamily: "var(--font-questrial)" }}
                              className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-xs ${
                                item.isSeparator ? "text-[#1b253c]/20 group-hover:text-white/30"
                                  : "text-[#1b253c]/55 group-hover:text-white"
                              }`}
                            >{item.text}</span>
                          )}
                        />
                      </div>
                      <ArrowUpRight className="w-6 h-6 text-[#1b253c] group-hover:text-[#f97316] transition-transform duration-300 group-hover:rotate-45 shrink-0" />
                    </div>
                  </Link>

                  {/* RAG LOGS (bottom 26%) */}
                  <Link href="/manas/chat" className="group h-[26%] py-6 px-8 flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out hover:bg-[#4A582E] hover:scale-[1.01] hover:z-10 hover:shadow-2xl cursor-pointer">
                    <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white/40 transition-colors duration-300 select-none">+</div>
                    <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white/40 transition-colors duration-300 select-none">+</div>

                    <div className="flex-[0.2]" />
                    <h3 className="text-3xl font-black text-[#1b253c] group-hover:text-white uppercase leading-none transition-colors duration-300" style={{ fontFamily: "var(--font-questrial)" }}>RAG Logs</h3>
                    <p className="mt-2 text-sm italic text-zinc-400 group-hover:text-white/80 transition-colors duration-300 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                      Manas vector search queries, agent prompts, and context retrievals.
                    </p>
                    <div className="flex-[1.5]" />
                    <div className="flex items-center justify-between gap-4 border-t border-[#1b253c]/8 group-hover:border-transparent transition-colors duration-300 pt-2">
                      <div className="overflow-hidden flex-1">
                        <LogoLoop
                          logos={ragLogsLogos}
                          speed={22}
                          direction="left"
                          logoHeight={14}
                          gap={18}
                          pauseOnHover
                          renderItem={(item) => (
                            <span
                              style={{ fontFamily: "var(--font-questrial)" }}
                              className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-xs ${
                                item.isSeparator ? "text-[#1b253c]/20 group-hover:text-white/30"
                                  : "text-[#1b253c]/55 group-hover:text-white"
                              }`}
                            >{item.text}</span>
                          )}
                        />
                      </div>
                      <ArrowUpRight className="w-6 h-6 text-[#1b253c] group-hover:text-[#f97316] transition-transform duration-300 group-hover:rotate-45 shrink-0" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog for detailed log view */}
      {activeLogForModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-6 animate-in fade-in duration-200 cursor-default"
          onClick={() => setActiveLogForModal(null)}
        >
          <div 
            className="bg-white border border-zinc-200/80 rounded-3xl p-10 max-w-3xl w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Corner Indicators */}
            <div className="absolute top-3.5 left-3.5 font-mono text-[10px] text-[#1b253c]/20 select-none">+</div>
            <div className="absolute bottom-3.5 right-3.5 font-mono text-[10px] text-[#1b253c]/20 select-none">+</div>

            <div className="flex justify-between items-start border-b border-zinc-150 pb-5 mb-6">
              <div>
                <span className="font-mono text-sm font-bold text-[#f97316] uppercase tracking-[0.2em]">[{activeLogForModal.time}] SYSTEM LOG</span>
                <h3 className="text-4xl lg:text-5xl font-black text-[#1b253c] uppercase mt-1 leading-tight" style={{ fontFamily: "var(--font-questrial)" }}>
                  {activeLogForModal.module}
                </h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider shrink-0 ${
                activeLogForModal.text.includes("CRITICAL") || activeLogForModal.text.includes("fatigue") || activeLogForModal.text.includes("risk") || activeLogForModal.text.includes("extreme")
                  ? "text-rose-600 bg-rose-50 border-rose-200/50 animate-pulse"
                  : activeLogForModal.text.includes("WARNING") || activeLogForModal.text.includes("drift") || activeLogForModal.text.includes("vibration")
                    ? "text-amber-600 bg-amber-50 border-amber-200/50"
                    : "text-emerald-600 bg-emerald-50 border-emerald-200/50"
              }`}>
                {activeLogForModal.text.includes("CRITICAL") || activeLogForModal.text.includes("fatigue") || activeLogForModal.text.includes("risk") || activeLogForModal.text.includes("extreme")
                  ? "critical"
                  : activeLogForModal.text.includes("WARNING") || activeLogForModal.text.includes("drift") || activeLogForModal.text.includes("vibration")
                    ? "warning"
                    : "info"}
              </div>
            </div>

            {/* Detailed Log Statement container */}
            <div className="bg-[#FAF9F5] p-8 rounded-2xl border border-zinc-150 mb-8 select-text">
              <span className="block font-mono text-[11px] text-zinc-400 font-extrabold uppercase tracking-wider mb-2 select-none">Log Statement</span>
              <p className="text-xl lg:text-2xl font-bold leading-relaxed text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
                {activeLogForModal.text}
              </p>
            </div>

            {/* Simulated Recommendation context based on text/severity */}
            <div className={`p-6 rounded-2xl border flex items-start gap-4 select-none mb-8 ${
              activeLogForModal.text.includes("CRITICAL") || activeLogForModal.text.includes("fatigue") || activeLogForModal.text.includes("risk") || activeLogForModal.text.includes("extreme")
                ? "bg-rose-50 border-rose-100 text-rose-950"
                : activeLogForModal.text.includes("WARNING") || activeLogForModal.text.includes("drift") || activeLogForModal.text.includes("vibration")
                  ? "bg-amber-50 border-amber-100 text-amber-950"
                  : "bg-emerald-50 border-emerald-100 text-emerald-950"
            }`}>
              {activeLogForModal.text.includes("CRITICAL") || activeLogForModal.text.includes("fatigue") || activeLogForModal.text.includes("risk") || activeLogForModal.text.includes("extreme") ? (
                <ShieldAlert className="w-6 h-6 shrink-0 text-rose-500 mt-0.5" />
              ) : activeLogForModal.text.includes("WARNING") || activeLogForModal.text.includes("drift") || activeLogForModal.text.includes("vibration") ? (
                <AlertTriangle className="w-6 h-6 shrink-0 text-amber-500 mt-0.5" />
              ) : (
                <CheckCircle className="w-6 h-6 shrink-0 text-emerald-500 mt-0.5" />
              )}
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider block text-zinc-500">Recommended SOP Action</span>
                <p className="text-sm mt-1.5 leading-relaxed font-sans font-medium">
                  {activeLogForModal.text.includes("CRITICAL") || activeLogForModal.text.includes("fatigue") || activeLogForModal.text.includes("risk") || activeLogForModal.text.includes("extreme")
                    ? "CRITICAL INCIDENT: Telemetry loop has registered severe anomalous operation. Inspect target device immediately, verify standby device engagement, and notify the site operations command."
                    : activeLogForModal.text.includes("WARNING") || activeLogForModal.text.includes("drift") || activeLogForModal.text.includes("vibration")
                      ? "WARNING ALARM: System parameter drift observed. Perform secondary calibration checks, flag the physical components in the asset manager database, and monitor telemetry on the next shift cycle."
                      : "NOMINAL STATUS: System diagnostics operating within normal boundaries. No intervention required. Logs successfully routed to Manas vector database."}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-mono text-zinc-400 border-t border-zinc-150 pt-5">
              <span>Telemetry Timestamp: {activeLogForModal.time}</span>
              <button
                onClick={() => setActiveLogForModal(null)}
                className="h-9 px-5 bg-zinc-900 hover:bg-[#f97316] text-white rounded-xl transition-all duration-300 font-bold uppercase text-[10px] cursor-pointer"
                style={{ fontFamily: "var(--font-pixeloid)" }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
