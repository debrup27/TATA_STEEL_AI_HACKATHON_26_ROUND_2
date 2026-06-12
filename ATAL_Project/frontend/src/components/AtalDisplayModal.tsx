"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, RefreshCw } from "lucide-react";
import { triggerPageTransition } from "../animations/PageTransition";
import {
  Steps,
  StepsContent,
  StepsItem,
  StepsTrigger,
  StepsBar
} from "./ai-components/steps";
import { TextShimmerLoader } from "./ai-components/loader";
import {
  Source,
  SourceContent,
  SourceTrigger
} from "./ai-components/source";

interface TabItem {
  id: "atal_sansad" | "atal_manas";
  label: string;
  icon: React.ReactNode;
}

interface RightPanelItem {
  title: string;
  badgeText: string;
  badgeType: "critical" | "warning" | "healthy" | "info";
  subtext: string;
  iconBgColor: string;
  icon: React.ReactNode;
}

interface TelemetryCell {
  label: string;
  value: string;
  status: "nominal" | "warning" | "critical";
}

export default function AtalDisplayModal() {
  const [activeTab, setActiveTab] = useState<"atal_sansad" | "atal_manas">("atal_sansad");

  // Sansad State
  const [cells, setCells] = useState<TelemetryCell[]>([
    { label: "BF1_TMP", value: "98°C", status: "warning" },
    { label: "BF1_PRS", value: "3.1b", status: "nominal" },
    { label: "VLV_04", value: "OPEN", status: "critical" },
    { label: "ANOM_ST", value: "WARN", status: "warning" },
    { label: "FLW_RT", value: "240L", status: "nominal" },
    { label: "SYS_CK", value: "NOM", status: "nominal" }
  ]);

  // Manas State
  const [demoMessages, setDemoMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi! I am Manas. Ask me anything about ATAL's assets or diagnostics." }
  ]);
  const [manasInput, setManasInput] = useState("");
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [showDemoProcessing, setShowDemoProcessing] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  const handleTabChange = (tabId: "atal_sansad" | "atal_manas") => {
    setActiveTab(tabId);
  };

  // Live updates for telemetry cells (always active to feel alive)
  useEffect(() => {
    const interval = setInterval(() => {
      setCells((prev) =>
        prev.map((cell) => {
          if (Math.random() > 0.85) {
            const statuses: ("nominal" | "warning" | "critical")[] = ["nominal", "warning", "critical"];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            let val = cell.value;
            if (cell.label === "BF1_TMP") {
              val = randomStatus === "critical" ? "106°C" : randomStatus === "warning" ? "98°C" : "89°C";
            } else if (cell.label === "ANOM_ST") {
              val = randomStatus === "critical" ? "CRIT" : randomStatus === "warning" ? "WARN" : "NOM";
            } else if (cell.label === "SYS_CK") {
              val = randomStatus === "critical" ? "FAIL" : "NOM";
            }

            return {
              ...cell,
              status: randomStatus,
              value: val
            };
          }
          return cell;
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Simulated AI diagnostics handler for Manas demo
  const handleSendDemoMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manasInput.trim() || isDemoLoading) return;
    const userMsg = manasInput.trim();
    setDemoMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setManasInput("");
    setIsDemoLoading(true);
    setDemoStep(0);
  };

  useEffect(() => {
    if (!isDemoLoading) return;
    const timer = setTimeout(() => {
      setShowDemoProcessing(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [isDemoLoading]);

  useEffect(() => {
    if (!showDemoProcessing) return;
    const stepCount = 3;
    const stepTimer = setInterval(() => {
      setDemoStep((prev) => {
        if (prev >= stepCount - 1) {
          clearInterval(stepTimer);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    const doneTimer = setTimeout(() => {
      setDemoMessages((prev) => {
        const lastUserMsg = prev[prev.length - 1]?.content || "";
        let reply = "Analysis complete. Asset integrity levels are nominal. Predictive wear models estimate 1,200 run hours before replacement. Let me know if you would like me to schedule a diagnostic run.";
        const query = lastUserMsg.toLowerCase();
        if (query.includes("status") || query.includes("check")) {
          reply = "System status checks: SYS_OK. Telemetry readings are nominal and stable across all furnace segments.";
        } else if (query.includes("valve") || query.includes("flow")) {
          reply = "Optimal valve flow rate calculated at 240L/min. Command stages ready to execute.";
        } else if (query.includes("ticket") || query.includes("generate")) {
          reply = "Ticket ATAL-889 generated successfully for turbine diagnostic inspections.";
        }
        return [...prev, { role: "assistant", content: reply }];
      });
      setShowDemoProcessing(false);
      setIsDemoLoading(false);
      setDemoStep(0);
    }, 1200 * stepCount + 400);

    return () => {
      clearInterval(stepTimer);
      clearTimeout(doneTimer);
    };
  }, [showDemoProcessing]);

  const tabs: TabItem[] = [
    {
      id: "atal_sansad",
      label: "ATAL Sansad",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: "atal_manas",
      label: "ATAL Manas",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    }
  ];

  const manasPredictions: RightPanelItem[] = [
    {
      title: "BF Taphole Drill",
      badgeText: "RUL: 14d",
      badgeType: "critical",
      subtext: "Degradation Rate: Fast • Risk: High",
      iconBgColor: "#3b82f6",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      title: "HSM Roller Coiler",
      badgeText: "RUL: 45d",
      badgeType: "healthy",
      subtext: "Degradation Rate: Normal • Risk: Low",
      iconBgColor: "#22c55e",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "BOF Lance Motor",
      badgeText: "RUL: 8d",
      badgeType: "critical",
      subtext: "Degradation Rate: Accelerated • Risk: High",
      iconBgColor: "#ef4444",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Sinter Exhaust Blower",
      badgeText: "RUL: 120d",
      badgeType: "healthy",
      subtext: "Degradation Rate: Minimal • Risk: Normal",
      iconBgColor: "#eab308",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  // 9x9 Grid layout for drawing letter 'A'
  const gridA = [
    [0, 0, 0, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0]
  ];

  const gridCells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      gridCells.push({ row: r, col: c, isActive: gridA[r][c] === 1 });
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      {/* Dynamic Text on Top describing Tata Steel Challenge and ATAL Copilot */}
      <div className="text-center mb-8 max-w-4xl px-4">
        <h2 className="text-3xl md:text-5xl tracking-tight text-zinc-950 mb-2 select-none flex flex-wrap justify-center items-center gap-x-2 md:gap-x-3 leading-tight font-sans">
          <span className="font-thin italic text-zinc-500">Reliable infrastructure</span>
          <span className="font-extrabold text-zinc-900">to manage factories</span>
        </h2>
      </div>

      {/* Main Display Modal Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-zinc-100 shadow-xl overflow-hidden p-6 md:p-8 flex flex-col transition-all duration-300">
        
        {/* Navigation Tabs Pill Container */}
        <div className="w-full flex justify-start md:justify-center overflow-x-auto pb-4 mb-6 border-b border-zinc-50 scrollbar-none">
          <div className="flex bg-zinc-100/70 p-1.5 rounded-full items-center gap-1.5 min-w-max relative">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer select-none z-10 ${
                    isActive ? "text-blue-600" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span className={isActive ? "text-blue-600" : "text-zinc-400"}>
                    {tab.icon}
                  </span>
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBackground"
                      className="absolute inset-0 bg-white shadow-[0_2px_8px_rgba(59,130,246,0.15)] border border-blue-50/50 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Main Grid splits Left / Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: (8 Columns) - Displays page visual layout */}
          <div className="md:col-span-7 flex flex-col items-center justify-center relative min-h-[350px]">
            {activeTab === "atal_sansad" ? (
              /* Sansad Page Redesign Visual: Interactive 9x9 Grid layout */
              <div className="w-full h-full flex flex-col items-center justify-center border border-zinc-100 rounded-2xl p-6 bg-zinc-50/40 relative">
                <div className="relative p-8 bg-[#FAF6EE]/50 border border-black/15 rounded-3xl flex items-center justify-center w-full max-w-sm aspect-square shadow-sm">
                  {/* Top Ruler */}
                  <div className="absolute top-2.5 left-10 right-10 flex justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
                    <span>0.0</span>
                    <span className="opacity-40 tracking-[0.25em] font-black uppercase">X-AXIS</span>
                    <span>9.0</span>
                  </div>

                  {/* Bottom Ruler */}
                  <div className="absolute bottom-2.5 left-10 right-10 flex justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
                    <span>0.0</span>
                    <span className="text-orange-500 font-bold tracking-[0.25em] uppercase">SYS_OK</span>
                    <span>9.0</span>
                  </div>

                  {/* Left Ruler */}
                  <div className="absolute left-2.5 top-10 bottom-10 flex flex-col justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
                    <span>9.0</span>
                    <span className="origin-center rotate-90 opacity-40 tracking-[0.25em] font-black uppercase my-4">SANSAD</span>
                    <span>0.0</span>
                  </div>

                  {/* Right Ruler */}
                  <div className="absolute right-2.5 top-10 bottom-10 flex flex-col justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
                    <span>9.0</span>
                    <span className="origin-center rotate-90 opacity-40 tracking-[0.25em] font-black uppercase my-4">ATAL</span>
                    <span>0.0</span>
                  </div>

                  {/* Grid of Squares */}
                  <div className="grid grid-cols-9 gap-1.5 p-2 bg-[#FAF9F5] border border-black/25 rounded-xl relative">
                    {/* Corner crop marks / ticks */}
                    <div className="absolute -top-1.5 -left-1.5 font-mono text-[9px] text-zinc-400 font-bold select-none leading-none">+</div>
                    <div className="absolute -top-1.5 -right-1.5 font-mono text-[9px] text-zinc-400 font-bold select-none leading-none">+</div>
                    <div className="absolute -bottom-1.5 -left-1.5 font-mono text-[9px] text-zinc-400 font-bold select-none leading-none">+</div>
                    <div className="absolute -bottom-1.5 -right-1.5 font-mono text-[9px] text-zinc-400 font-bold select-none leading-none">+</div>

                    {/* Animated Squares */}
                    {gridCells.map((cell, idx) => {
                      return (
                        <motion.div
                          key={idx}
                          whileHover={
                            cell.isActive
                              ? { scale: 1.25, rotate: 90, backgroundColor: "#ea580c" }
                              : { scale: 1.2, backgroundColor: "rgba(249, 115, 22, 0.2)" }
                          }
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-[4px] cursor-pointer transition-shadow ${
                            cell.isActive
                              ? "bg-[#f97316] shadow-md shadow-orange-500/20 border border-black/15"
                              : "border border-black/15 bg-[#FAF9F5]/60 hover:border-orange-300"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Manas Page Redesign Visual: Safari Browser mockup Chat Client */
              <div 
                className="w-full h-full flex flex-col items-center justify-center p-4 border border-zinc-100 bg-zinc-50/40 rounded-2xl overflow-hidden relative"
                style={{
                  backgroundImage: "url('/pastel.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }}
              >
                {/* Safari Browser Window Mockup */}
                <div className="w-full h-full min-h-[300px] max-h-[380px] rounded-2xl bg-white/80 backdrop-blur-md border border-black/15 flex flex-col overflow-hidden shadow-xl">
                  {/* Browser Header Bar */}
                  <div className="border-b border-black/10 px-4 py-2.5 flex items-center justify-between bg-white/90 backdrop-blur-xs select-none">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="size-2 rounded-full bg-[#ff5f56]" />
                      <span className="size-2 rounded-full bg-[#ffbd2e]" />
                      <span className="size-2 rounded-full bg-[#27c93f]" />
                    </div>
                    <span 
                      className="text-[10px] font-bold text-zinc-700 tracking-wider uppercase select-none font-mono"
                    >
                      ATAL MANAS
                    </span>
                    <button 
                      onClick={() => {
                        setDemoMessages([
                          { role: "assistant", content: "Hi! I am Manas. Ask me anything about ATAL's assets or diagnostics." }
                        ]);
                        setManasInput("");
                        setIsDemoLoading(false);
                        setShowDemoProcessing(false);
                        setDemoStep(0);
                      }}
                      className="text-zinc-400 hover:text-orange-500 transition-colors bg-transparent border-none p-0 cursor-pointer"
                    >
                      <RefreshCw size={12} />
                    </button>
                  </div>

                  {/* Chat Messages Panel */}
                  <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 bg-transparent text-[11px] sm:text-xs [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {demoMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 leading-normal shadow-xs ${
                            msg.role === "user"
                              ? "bg-zinc-900 text-white rounded-tr-sm"
                              : "bg-white border border-zinc-200/80 text-zinc-700 rounded-tl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {showDemoProcessing && (
                      <div className="max-w-[85%] self-start text-[11px]">
                        <Steps defaultOpen>
                          <StepsTrigger>
                            <TextShimmerLoader
                              text="Processing your request"
                              size="sm"
                            />
                          </StepsTrigger>
                          <StepsContent bar={<StepsBar />}>
                            <div className="space-y-1 mt-1 font-medium">
                              <StepsItem status={demoStep > 0 ? "complete" : demoStep === 0 ? "active" : "pending"}>
                                Parsing telemetry feeds
                              </StepsItem>
                              <StepsItem status={demoStep > 1 ? "complete" : demoStep === 1 ? "active" : "pending"}>
                                <Source>
                                  <SourceTrigger label="datalake.atal" showFavicon />
                                  <SourceContent
                                    title="ATAL Diagnostic Lake"
                                    description="Primary index for asset sensor feeds."
                                  />
                                </Source>{" "}
                                referenced
                              </StepsItem>
                              <StepsItem status={demoStep > 2 ? "complete" : demoStep === 2 ? "active" : "pending"}>
                                Formulating diagnosis
                              </StepsItem>
                            </div>
                          </StepsContent>
                        </Steps>
                      </div>
                    )}
                  </div>

                  {/* Browser Input Bar */}
                  <form 
                    onSubmit={handleSendDemoMessage}
                    className="border-t border-black/5 p-2 bg-white/90 backdrop-blur-xs flex gap-2 items-center shrink-0"
                  >
                    <input
                      type="text"
                      value={manasInput}
                      onChange={(e) => setManasInput(e.target.value)}
                      placeholder="Ask Manas..."
                      disabled={isDemoLoading}
                      className="flex-1 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!manasInput.trim() || isDemoLoading}
                      className="p-2 bg-zinc-950 text-white rounded-xl hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-zinc-950 shrink-0"
                    >
                      <Send size={12} />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Side Status list / Alert list (5 Columns) */}
          <div className="md:col-span-5 flex flex-col justify-between p-1">
            {activeTab === "atal_sansad" ? (
              <div>
                {/* Header inside Panel */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-zinc-800 select-none">
                    Telemetry Indicators
                  </h3>
                  <button 
                    onClick={() => triggerPageTransition("/sansad")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer select-none"
                  >
                    View details
                  </button>
                </div>

                {/* Telemetry Cells Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {cells.map((cell) => {
                    let badgeColors = "bg-green-50 text-green-600 border border-green-200/50";
                    if (cell.status === "critical") {
                      badgeColors = "bg-red-50 text-red-600 border border-red-200/50";
                    } else if (cell.status === "warning") {
                      badgeColors = "bg-amber-50 text-amber-600 border border-amber-200/50";
                    }
                    return (
                      <div 
                        key={cell.label}
                        className="bg-white border border-zinc-100 rounded-xl p-3 flex flex-col justify-between h-[85px] shadow-2xs hover:shadow-xs transition-shadow"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{cell.label}</span>
                          <span className={`w-2 h-2 rounded-full ${
                            cell.status === "critical" 
                              ? "bg-red-500 animate-pulse" 
                              : cell.status === "warning" 
                              ? "bg-amber-400" 
                              : "bg-emerald-500"
                          }`} />
                        </div>
                        <span className="font-mono text-base font-black text-zinc-800 leading-none my-1">{cell.value}</span>
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider text-center w-fit ${badgeColors}`}>
                          {cell.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                {/* Header inside Panel */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-zinc-800 select-none">
                    Asset Health
                  </h3>
                  <button 
                    onClick={() => triggerPageTransition("/manas")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer select-none"
                  >
                    View all
                  </button>
                </div>

                {/* List of items */}
                <div className="flex flex-col gap-4">
                  {manasPredictions.map((item, index) => {
                    let badgeColors = "bg-blue-50 text-blue-600";
                    if (item.badgeType === "critical") {
                      badgeColors = "bg-red-50 text-red-600";
                    } else if (item.badgeType === "warning") {
                      badgeColors = "bg-orange-50 text-orange-600";
                    } else if (item.badgeType === "healthy") {
                      badgeColors = "bg-green-50 text-green-600";
                    }

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-zinc-50/70 border border-transparent hover:border-zinc-100 transition-all duration-300 group cursor-pointer"
                      >
                        {/* Colored icon */}
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-sm"
                          style={{ backgroundColor: item.iconBgColor }}
                        >
                          {item.icon}
                        </div>

                        {/* Content block */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-sm font-bold text-zinc-800 truncate">
                              {item.title}
                            </h4>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide select-none ${badgeColors}`}>
                              {item.badgeText}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-zinc-400 truncate">
                            {item.subtext}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer inside Right Panel */}
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-zinc-100">
              <span className="text-xs font-bold text-zinc-500 select-none">
                {activeTab === "atal_sansad" ? "Pipeline Operations?" : "Diagnostic Chat?"}
              </span>
              <button 
                onClick={() => triggerPageTransition("/login")}
                className="bg-[#1b253c] hover:bg-zinc-800 text-white text-[11px] font-bold px-4 py-2.5 rounded-full transition-all duration-300 cursor-pointer shadow-md transform hover:scale-105 active:scale-95 select-none"
              >
                {activeTab === "atal_sansad" ? "Launch Control" : "Try Manas Now"}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Button below card */}
      <button 
        onClick={() => triggerPageTransition("/login")}
        className="mt-8 bg-white border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-6 py-3.5 rounded-full transition-all duration-300 cursor-pointer shadow-sm select-none transform hover:scale-105 active:scale-95"
      >
        {activeTab === "atal_sansad" ? "Initialize Sansad Copilot" : "Initialize Manas Copilot"}
      </button>
    </div>
  );
}
