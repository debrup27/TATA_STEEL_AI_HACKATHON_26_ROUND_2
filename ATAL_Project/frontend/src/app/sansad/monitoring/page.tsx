"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, FileText, Brain, Clock, ArrowUpRight, Terminal, 
  ArrowLeft, Cpu, Layers, ShieldAlert, Wrench, Database 
} from "lucide-react";
import ClickSpark from "../../../animations/ClickSpark";
import NodeWorkflow from "../../../components/NodeWorkflow";
import LogoLoop from "../../../animations/LogoLoop";

// Pre-defined list of potential live logs for simulation (focused on Sansad & Agent Army)
const agentLogsPool = [
  { module: "CokeOven-Agent", text: "Carbonizing temperature optimal (1085°C). Hearth sensors stable." },
  { module: "Sinter-Agent", text: "BTP matched to strand speed of 3.2m/min." },
  { module: "ThermalCascade-Predictor", text: "Upstream heat variations mapped to F3 Blast Furnace input delay." },
  { module: "LadleTransfer-Optimizer", text: "Ladle transfer transit lag calculated at 42 minutes." },
  { module: "CokeOven-Agent", text: "Centrifugal exhauster F1-EQ09 health index: 24%. RUL stable at 14 days." },
  { module: "Sinter-Agent", text: "Calibration offset applied to Belt FeO Analyzer (BCFA)." },
  { module: "LadleTransfer-Optimizer", text: "Liquid iron mass flow matches SMS caster throughput." },
  { module: "ThermalCascade-Predictor", text: "No cascade anomalies detected in HSM coil coiler yard." },
  { module: "CokeOven-Agent", text: "F1-EQ11 electrostatic precipitator electrode voltage at 48 kV." },
  { module: "Sinter-Agent", text: "FeO Susceptibility index shifted to 8.3%. Checking moisture parameters." },
  { module: "Sansad-Hub", text: "Synchronized active RUL telemetry matrices to Manas Vector Database." },
  { module: "Sansad-Hub", text: "Structured Work Order WO-2026-F1-09 compiled and routed to Manas." },
  // RUL Alerts directly in the logs
  { module: "CokeOven-Agent", text: "CRITICAL: F1-EQ09 Exhauster bearing RUL at 14 days. Extreme vibration peaks." },
  { module: "Sinter-Agent", text: "WARNING: F2-EQ04 Drive sprocket tooth root fatigue. RUL at 18 days." },
  { module: "Sinter-Agent", text: "NOMINAL: F2-EQ09 Waste Gas Fan Impeller wear level normal. RUL at 42 days." },
  { module: "CokeOven-Agent", text: "NOMINAL: F1-EQ11 Electrostatic Precipitator electrodes stable. RUL at 95 days." },
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
  { text: "MR-2024-270 — Electrode cleaning · F1-EQ11", isSeparator: false },
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

export default function SansadMonitoringPage() {
  const [viewMode, setViewMode] = useState<"menu" | "workflow">("menu");
  const [selectedFactory, setSelectedFactory] = useState<"horizon" | "apex" | "zephyr">("horizon");
  const [isMobile, setIsMobile] = useState(false);
  const [isSansadHubHovered, setIsSansadHubHovered] = useState(false);

  // Simulated telemetry states
  const [exhausterVibration, setExhausterVibration] = useState(6.42);
  const [exhausterHealth, setExhausterHealth] = useState(24);
  const [sinterFeO, setSinterFeO] = useState(8.3);
  const [strandSpeed, setStrandSpeed] = useState(3.1);

  // Live Scrolling Logs State (Big Text Lines)
  const [logs, setLogs] = useState<Array<{ id: number; time: string; module: string; text: string }>>([
    { id: 1, time: "11:08:12", module: "CokeOven-Agent", text: "Running FFT frequency scan on F1-EQ09 bearing." },
    { id: 2, time: "11:09:45", module: "CokeOven-Agent", text: "CRITICAL: F1-EQ09 Exhauster bearing RUL at 14 days. Extreme vibration peaks." },
    { id: 3, time: "11:10:04", module: "ThermalCascade-Predictor", text: "Cascade risk triggered: Oxygen ingress in raw gas main." },
    { id: 4, time: "11:10:30", module: "Sansad-Hub", text: "Generating structured Work Order WO-2026-F1-09." },
    { id: 5, time: "11:10:35", module: "Sansad-Hub", text: "Work Order payload dispatched to Manas Chat." },
  ]);

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

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
    if (viewMode !== "menu") return;

    let logIdCounter = 6;
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

      // Append new log at the bottom
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      const randomLogTemplate = agentLogsPool[Math.floor(Math.random() * agentLogsPool.length)];
      
      setLogs((prev) => {
        const nextLogs = [...prev, { id: logIdCounter++, time: timeStr, module: randomLogTemplate.module, text: randomLogTemplate.text }];
        return nextLogs.slice(-25); // keep last 25 logs
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [viewMode]);

  // Handle Auto-scroll and scroll-to-bottom trigger
  useEffect(() => {
    if (isAutoScrollRef.current && logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [logs]);

  const handleLogScroll = () => {
    const container = logContainerRef.current;
    if (!container) return;

    // Check if user is scrolled up
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 40;
    isAutoScrollRef.current = isAtBottom;
    setShowScrollBottom(!isAtBottom);
  };

  const handleScrollToBottom = () => {
    isAutoScrollRef.current = true;
    setShowScrollBottom(false);
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  const handleLaunchFactory = (fac: "horizon" | "apex" | "zephyr") => {
    setSelectedFactory(fac);
    setViewMode("workflow");
  };

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
              <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">Factory 01 // COBPP</span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 uppercase">Coke Oven & Exhauster</h3>
            <div className="mt-2 space-y-1 font-mono text-[10px] text-zinc-500">
              <div>Exhauster Vibr: {exhausterVibration} mm/s</div>
              <div>Exhauster Health: {exhausterHealth}%</div>
            </div>
            <button 
              onClick={() => handleLaunchFactory("horizon")}
              className="mt-4 w-full py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            >
              Open Pipeline Editor
            </button>
          </div>

          {/* F2 Mobile */}
          <div className="bg-[#FAF6EE] border border-zinc-200 p-5 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">Factory 02 // Sinter</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 uppercase">Sintering Plant</h3>
            <div className="mt-2 space-y-1 font-mono text-[10px] text-zinc-500">
              <div>FeO Content: {sinterFeO}%</div>
              <div>Strand Speed: {strandSpeed} m/min</div>
            </div>
            <button 
              onClick={() => handleLaunchFactory("apex")}
              className="mt-4 w-full py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            >
              Open Pipeline Editor
            </button>
          </div>

          {/* Sansad Mobile */}
          <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-xs">
            <h3 className="text-sm font-bold text-zinc-800 uppercase" style={{ fontFamily: "var(--font-pixeloid)" }}>Sansad Agent Army</h3>
            <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed font-light">
              Autonomous bots tracing RUL and thermodynamic physical cascades, reporting directly to Manas.
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/manas" className="flex-1 text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer">
                Consult Manas
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
            
            <AnimatePresence mode="wait">
              {viewMode === "workflow" ? (
                // NODE CANVAS EDITOR
                <motion.div 
                  key="canvas-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col p-12 bg-[#FAF9F5] overflow-y-auto"
                >
                  <div className="w-full flex items-center justify-between mb-4 border-b border-zinc-200 pb-4 select-none">
                    <div>
                      <h2 className="text-xl font-black uppercase text-zinc-950" style={{ fontFamily: "var(--font-pixeloid)" }}>
                        Asset Troubleshooting Pipeline
                      </h2>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mt-1">
                        Active Sandbox // Editing Factory Pipeline Node Path
                      </span>
                    </div>
                    <button 
                      onClick={() => setViewMode("menu")}
                      className="px-4 py-2 border border-zinc-900 bg-white hover:bg-zinc-50 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all select-none"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Console Grid
                    </button>
                  </div>
                  
                  <div className="w-full flex-grow flex items-center justify-center">
                    <NodeWorkflow 
                      initialFactory={selectedFactory} 
                      onBack={() => setViewMode("menu")} 
                    />
                  </div>
                </motion.div>
              ) : (
                // SANSAD LINE PARTITIONED GRID (No inner nested grids/colors, expands & fills solid orange on hover)
                <motion.div 
                  key="grid-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col"
                >
                  {/* Top Header Bar — centered SANSAD title */}
                  <div className="h-16 border-b border-zinc-200 flex items-center justify-between px-10 bg-[#FAF9F5] z-30 select-none flex-shrink-0">
                    <div className="absolute left-1/2 -translate-x-1/2">
                      <span className="text-2xl font-black uppercase tracking-tight text-[#1b253c]" style={{ fontFamily: "var(--font-pixeloid)" }}>
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
                    
                    {/* Left block (70% width) */}
                    <div className="w-[70%] h-full flex flex-col border-r border-zinc-200">
                      
                      {/* Top Row: Factory 1 & Factory 2 (48% height) */}
                      <div className="h-[48%] flex border-b border-zinc-200">
                        
                        {/* Factory 1 Box (50% of left column) */}
                        <div onClick={() => handleLaunchFactory("horizon")} className="group w-1/2 h-full p-8 border-r border-zinc-200 flex flex-col relative transition-all duration-300 ease-in-out hover:bg-[#f97316] hover:scale-[1.01] hover:z-10 hover:shadow-2xl cursor-pointer">
                          <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>
                          <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>

                          {/* Smaller spacer — title sits ~40% from top */}
                          <div className="flex-[0.4]" />

                          <h2 className="text-5xl font-black text-[#1b253c] group-hover:text-white uppercase leading-none" style={{ fontFamily: "var(--font-questrial)" }}>
                            FACTORY<br />01
                          </h2>

                          {/* Italic description */}
                          <p className="mt-5 text-sm italic text-zinc-400 group-hover:text-orange-100 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                            Coke Oven & By-Product Plant — extracts coke breeze, cleans COG, and feeds the blast furnace energy chain.
                          </p>

                          {/* Push ticker to bottom */}
                          <div className="flex-[2]" />

                          {/* Notification ticker + arrow row at bottom */}
                          <div className="flex flex-col gap-2">
                            <div className="overflow-hidden border-t border-[#1b253c]/8 group-hover:border-white/15 pt-2">
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
                                        ? "text-[#1b253c]/20 group-hover:text-white/30"
                                        : item.text?.includes("CRITICAL") || item.text?.includes("WARN")
                                          ? "text-rose-500 group-hover:text-red-200 font-bold"
                                          : "text-[#1b253c]/50 group-hover:text-white/70"
                                    }`}
                                  >
                                    {item.text}
                                  </span>
                                )}
                              />
                            </div>
                            <div className="flex justify-end">
                              <ArrowUpRight className="w-7 h-7 text-[#1b253c]/0 group-hover:text-white transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                            </div>
                          </div>
                        </div>

                        {/* Factory 2 Box (50% of left column) */}
                        <div onClick={() => handleLaunchFactory("apex")} className="group w-1/2 h-full p-8 flex flex-col relative transition-all duration-300 ease-in-out hover:bg-[#f97316] hover:scale-[1.01] hover:z-10 hover:shadow-2xl cursor-pointer">
                          <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>
                          <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>

                          {/* Smaller spacer */}
                          <div className="flex-[0.4]" />

                          <h2 className="text-5xl font-black text-[#1b253c] group-hover:text-white uppercase leading-none" style={{ fontFamily: "var(--font-questrial)" }}>
                            FACTORY<br />02
                          </h2>

                          {/* Italic description */}
                          <p className="mt-5 text-sm italic text-zinc-400 group-hover:text-orange-100 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                            Sintering Plant — agglomerates iron ore fines, monitors BTP position and belt FeO to optimise blast furnace burden.
                          </p>

                          {/* Push ticker to bottom */}
                          <div className="flex-[2]" />

                          {/* Notification ticker + arrow row at bottom */}
                          <div className="flex flex-col gap-2">
                            <div className="overflow-hidden border-t border-[#1b253c]/8 group-hover:border-white/15 pt-2">
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
                                        ? "text-[#1b253c]/20 group-hover:text-white/30"
                                        : item.text?.includes("WARN")
                                          ? "text-amber-500 group-hover:text-amber-200 font-bold"
                                          : "text-[#1b253c]/50 group-hover:text-white/70"
                                    }`}
                                  >
                                    {item.text}
                                  </span>
                                )}
                              />
                            </div>
                            <div className="flex justify-end">
                              <ArrowUpRight className="w-7 h-7 text-[#1b253c]/0 group-hover:text-white transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Bottom Row: SANSAD HUB — L-shaped layout */}
                      <div className="flex-1 flex flex-col border-t border-zinc-200">

                        {/* Top half: split SANSAD HUB Details (left) and Stacked sub-panels (right) */}
                        <div className="flex-1 flex min-h-0">

                          {/* Left: SANSAD HUB details card */}
                          <Link 
                            href="/manas/chat" 
                            onMouseEnter={() => setIsSansadHubHovered(true)}
                            onMouseLeave={() => setIsSansadHubHovered(false)}
                            className={`w-[52%] h-full p-8 flex flex-col relative border-r transition-all duration-300 ease-in-out hover:scale-[1.01] hover:z-10 hover:shadow-2xl cursor-pointer ${
                              isSansadHubHovered ? "bg-[#f97316] text-white border-transparent" : "bg-transparent text-[#1b253c] border-zinc-200"
                            }`}
                          >
                            <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>
                            <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>

                            {/* Pushed text down as requested */}
                            <div className="flex-[1.4]" />

                            <h2 className={`text-5xl font-black uppercase leading-none transition-colors duration-300 ${
                              isSansadHubHovered ? "text-white" : "text-[#1b253c]"
                            }`} style={{ fontFamily: "var(--font-questrial)" }}>
                              SANSAD HUB
                            </h2>
                            <p className={`mt-5 text-sm italic leading-snug transition-colors duration-300 ${
                              isSansadHubHovered ? "text-orange-100" : "text-zinc-400"
                            }`} style={{ fontFamily: "var(--font-questrial)" }}>
                              Agentic concierge orchestrating the agent army — monitors RUL, traces multi-stage failure cascades, and routes structured diagnostics directly to Manas.
                            </p>

                            <div className="flex-[0.6]" />

                            <div className="flex justify-end">
                              <ArrowUpRight className={`w-7 h-7 transition-all duration-300 ${
                                isSansadHubHovered ? "text-white translate-x-1 -translate-y-1" : "text-[#1b253c]/0"
                              }`} />
                            </div>
                          </Link>

                          {/* Right: 3 stacked sub-panels */}
                          <div className="flex-1 h-full flex flex-col overflow-hidden">

                            {/* Sub-panel A: RUL Monitor */}
                            <div className="group flex-1 p-6 border-b border-zinc-200 flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out hover:bg-[#3f6212] hover:scale-[1.01] hover:z-10 hover:shadow-2xl">
                              <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>
                              <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>

                              <div className="flex-[0.3]" />
                              <span className="font-mono text-[8px] font-bold text-zinc-400 group-hover:text-lime-200 uppercase tracking-widest mb-1 select-none">Predictive Maintenance</span>
                              <h3 className="text-2xl font-black text-[#1b253c] group-hover:text-white uppercase leading-none" style={{ fontFamily: "var(--font-questrial)" }}>RUL Monitor</h3>
                              <p className="mt-2 text-xs italic text-zinc-400 group-hover:text-lime-100 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                                Equipment Remaining Useful Life predictions from live sensor telemetry.
                              </p>
                              <div className="flex-[2]" />
                              <div className="overflow-hidden border-t border-[#1b253c]/8 group-hover:border-white/15 pt-2">
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
                                          : item.text?.includes("CRITICAL") ? "text-rose-500 group-hover:text-red-200 font-bold"
                                          : item.text?.includes("WARN") ? "text-amber-500 group-hover:text-amber-200 font-semibold"
                                          : "text-emerald-600 group-hover:text-emerald-200"
                                      }`}
                                    >{item.text}</span>
                                  )}
                                />
                              </div>
                            </div>

                            {/* Sub-panel B: Historical Logs */}
                            <div className="group flex-1 p-6 border-b border-zinc-200 flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out hover:bg-[#3f6212] hover:scale-[1.01] hover:z-10 hover:shadow-2xl">
                              <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>
                              <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>

                              <div className="flex-[0.3]" />
                              <span className="font-mono text-[8px] font-bold text-zinc-400 group-hover:text-lime-200 uppercase tracking-widest mb-1 select-none">Knowledge Base</span>
                              <h3 className="text-2xl font-black text-[#1b253c] group-hover:text-white uppercase leading-none" style={{ fontFamily: "var(--font-questrial)" }}>Historical Logs</h3>
                              <p className="mt-2 text-xs italic text-zinc-400 group-hover:text-lime-100 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                                Past maintenance records, failure analyses, and SOP-driven repair history.
                              </p>
                              <div className="flex-[2]" />
                              <div className="overflow-hidden border-t border-[#1b253c]/8 group-hover:border-white/15 pt-2">
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
                                        item.isSeparator
                                          ? "text-[#1b253c]/20 group-hover:text-white/30"
                                          : "text-[#1b253c]/55 group-hover:text-white/80"
                                      }`}
                                    >{item.text}</span>
                                  )}
                                />
                              </div>
                            </div>

                            {/* Sub-panel C: Risk Priority */}
                            <div className="group flex-1 p-6 flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out hover:bg-[#3f6212] hover:scale-[1.01] hover:z-10 hover:shadow-2xl">
                              <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>
                              <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>

                              <div className="flex-[0.3]" />
                              <span className="font-mono text-[8px] font-bold text-zinc-400 group-hover:text-lime-200 uppercase tracking-widest mb-1 select-none">Bottleneck Triage</span>
                              <h3 className="text-2xl font-black text-[#1b253c] group-hover:text-white uppercase leading-none" style={{ fontFamily: "var(--font-questrial)" }}>Risk Priority</h3>
                              <p className="mt-2 text-xs italic text-zinc-400 group-hover:text-lime-100 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                                Criticality scoring by process impact, delay severity and spares availability.
                              </p>
                              <div className="flex-[2]" />
                              <div className="overflow-hidden border-t border-[#1b253c]/8 group-hover:border-white/15 pt-2">
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
                                          : item.text?.includes("CRITICAL") ? "text-rose-500 group-hover:text-red-200 font-bold"
                                          : item.text?.includes("HIGH") ? "text-orange-500 group-hover:text-orange-200 font-semibold"
                                          : item.text?.includes("MEDIUM") ? "text-amber-500 group-hover:text-amber-200"
                                          : "text-emerald-600 group-hover:text-emerald-200"
                                      }`}
                                    >{item.text}</span>
                                  )}
                                />
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* Bottom half: SANSAD HUB Notification Loop (base of the L-shape) */}
                        <Link 
                          href="/manas/chat" 
                          onMouseEnter={() => setIsSansadHubHovered(true)}
                          onMouseLeave={() => setIsSansadHubHovered(false)}
                          className={`h-14 flex items-center overflow-hidden transition-all duration-300 cursor-pointer ${
                            isSansadHubHovered ? "bg-[#f97316]" : "bg-[#FAF9F5]"
                          }`}
                        >
                          <div className="w-full px-8">
                            <div className={`overflow-hidden border-t pt-2 transition-colors duration-300 ${
                              isSansadHubHovered ? "border-white/15" : "border-[#1b253c]/8"
                            }`}>
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
                                        ? isSansadHubHovered ? "text-white/30" : "text-[#1b253c]/20"
                                        : item.text?.includes("ACTIVE") || item.text?.includes("LIVE")
                                          ? isSansadHubHovered ? "text-emerald-200 font-bold" : "text-emerald-600 font-bold"
                                          : isSansadHubHovered ? "text-white/70" : "text-[#1b253c]/50"
                                    }`}
                                  >
                                    {item.text}
                                  </span>
                                )}
                              />
                            </div>
                          </div>
                        </Link>

                      </div>

                    </div>

                    {/* Right column — full-height LOG STREAM (30% width) */}
                    <div className="group w-[30%] h-full flex flex-col p-8 relative transition-all duration-300 ease-in-out hover:bg-[#f97316] hover:scale-[1.01] hover:z-10 hover:shadow-2xl">
                      <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>
                      <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white select-none">+</div>

                      <div className="flex-shrink-0 mb-4 select-none">
                        <span className="font-mono text-[8px] font-bold text-zinc-400 group-hover:text-orange-200 uppercase tracking-widest block mb-1">RUL & Live Telemetry</span>
                        <h2 className="text-3xl font-black text-[#1b253c] group-hover:text-white uppercase" style={{ fontFamily: "var(--font-questrial)" }}>
                          LOG STREAM
                        </h2>
                      </div>

                      <div className="flex-1 min-h-0 relative">
                        <div
                          ref={logContainerRef}
                          onScroll={handleLogScroll}
                          className="sansad-custom-scroll h-full overflow-y-auto space-y-4 scroll-smooth"
                        >
                          <AnimatePresence mode="popLayout">
                            {logs.map((log) => {
                              const isCritical = log.text.includes("CRITICAL") || log.text.includes("fatigue") || log.text.includes("risk") || log.text.includes("extreme");
                              const isWarning = log.text.includes("WARNING") || log.text.includes("drift") || log.text.includes("vibration");
                              let timeColor = "text-[#1b253c]/40 group-hover:text-orange-200";
                              let moduleColor = "text-[#1b253c]/65 group-hover:text-orange-100";
                              let textStyle = "text-[#1b253c]/80 group-hover:text-white";
                              let dot = "bg-zinc-300 group-hover:bg-white/50";
                              if (isCritical) { timeColor = "text-rose-500/60 group-hover:text-red-200"; moduleColor = "text-rose-600 group-hover:text-white"; textStyle = "text-rose-600 group-hover:text-white font-semibold"; dot = "bg-rose-500 group-hover:bg-red-200"; }
                              else if (isWarning) { timeColor = "text-amber-600/60 group-hover:text-amber-200"; moduleColor = "text-amber-600 group-hover:text-white"; textStyle = "text-amber-600 group-hover:text-white"; dot = "bg-amber-500 group-hover:bg-amber-200"; }
                              return (
                                <motion.div
                                  key={log.id}
                                  layout
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.4, ease: "easeOut" }}
                                  className={`flex gap-2 items-start border-b border-[#1b253c]/5 group-hover:border-white/10 pb-3 ${textStyle}`}
                                >
                                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${dot}`} />
                                  <div>
                                    <span className={`font-mono text-[9px] block mb-0.5 ${timeColor}`}>[{log.time}]&nbsp;<span className={`font-bold ${moduleColor}`}>{log.module}</span></span>
                                    <span className="font-mono text-[13px] leading-snug">{log.text}</span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>

                        {/* Scroll to bottom */}
                        <AnimatePresence>
                          {showScrollBottom && (
                            <motion.button
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              onClick={handleScrollToBottom}
                              className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3.5 py-1.5 bg-[#1b253c] text-[#FAF9F5] group-hover:bg-white group-hover:text-[#f97316] rounded-full text-[9px] font-bold uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-1 select-none z-20"
                            >
                              ↓ Latest
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      )}
    </ClickSpark>
  );
}
