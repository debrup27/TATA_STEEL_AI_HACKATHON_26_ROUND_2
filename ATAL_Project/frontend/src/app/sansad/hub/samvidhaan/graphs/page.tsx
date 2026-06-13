"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Activity, Calendar, ShieldAlert } from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";

interface GraphItem {
  id: string;
  code: string;
  date: string;
  asset: string;
  module: string;
  anomalyRate: string;
  rulDays: number;
  description: string;
  vibrationData: number[];
  rulCurveData: number[];
  thresholdVal: string;
}

export default function GraphsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [activeItemId, setActiveItemId] = useState<string>("graph-1");

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const items: GraphItem[] = [
    {
      id: "graph-1",
      code: "DIAG-2026-901",
      date: "2026-06-13",
      asset: "F1-EQ09 Centrifugal Exhauster",
      module: "CokeOven-Agent",
      anomalyRate: "88%",
      rulDays: 14,
      description: "Exhauster bearing vibration spectra showing critical frequency peak at 2.4 kHz (1x cage speed frequency). Automated diagnostic suggests immediate bearing replacement order.",
      vibrationData: [12, 15, 18, 14, 25, 45, 95, 30, 20, 15, 12, 10, 8, 11, 14],
      rulCurveData: [90, 84, 75, 68, 59, 48, 36, 28, 20, 14],
      thresholdVal: "> 5.5 mm/s",
    },
    {
      id: "graph-2",
      code: "DIAG-2026-842",
      date: "2026-06-10",
      asset: "F2-EQ09 Waste Gas Fan Impeller",
      module: "Sinter-Agent",
      anomalyRate: "42%",
      rulDays: 18,
      description: "Moderate impeller blade wear tracked via process temperature differentials. FFT baseline remains within the 2nd tier warning limit.",
      vibrationData: [10, 12, 11, 14, 15, 28, 45, 30, 18, 14, 11, 10, 9, 8, 9],
      rulCurveData: [85, 78, 72, 65, 58, 51, 45, 38, 30, 18],
      thresholdVal: "> 6.8 mm/s",
    },
    {
      id: "graph-3",
      code: "DIAG-2026-773",
      date: "2026-06-05",
      asset: "F2-EQ04 Drive Sprocket",
      module: "Sinter-Agent",
      anomalyRate: "12%",
      rulDays: 120,
      description: "Torsional vibration profiles on drive shaft sprocket. Minor offset matching mechanical load change, baseline remains nominal.",
      vibrationData: [8, 9, 8, 11, 12, 15, 18, 14, 12, 10, 8, 7, 8, 9, 9],
      rulCurveData: [98, 95, 92, 89, 85, 81, 78, 74, 71, 120], // reset trend
      thresholdVal: "> 8.0 mm/s",
    },
    {
      id: "graph-4",
      code: "DIAG-2026-611",
      date: "2026-05-28",
      asset: "F1-EQ11 Electrostatic Precipitator",
      module: "CokeOven-Agent",
      anomalyRate: "5%",
      rulDays: 240,
      description: "Corona discharge current tracking timeline. Normal alignment levels checked across collector plates, zero phase anomalies detected.",
      vibrationData: [5, 6, 5, 7, 8, 6, 8, 7, 6, 5, 5, 4, 5, 6, 5],
      rulCurveData: [100, 99, 98, 96, 95, 93, 92, 90, 88, 240],
      thresholdVal: "> 12.0 kV",
    },
  ];

  const activeItem = items.find((i) => i.id === activeItemId) || items[0];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = selectedModule === "all" || item.module === selectedModule;
    return matchesSearch && matchesModule;
  });

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
        <div className="flex flex-col gap-6 w-full px-6 pt-24 pb-12 select-none max-w-lg mx-auto z-10">
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-xs">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter uppercase leading-none" style={{ fontFamily: "var(--font-pixeloid)" }}>
              SANSAD<br />SAMVIDHAAN
            </h1>
            <p className="text-[9px] text-[#f97316] mt-3 font-bold uppercase tracking-[0.2em]">
              Graphs & Trends
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
            <p className="text-sm text-zinc-600">Please open this page on a desktop viewport to inspect diagnostic plots and curves.</p>
            <Link href="/sansad/hub/samvidhaan" className="mt-4 block text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider">
              Back to Command Center
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex select-none">
          {/* Left Gutter Vertical Marquee */}
          <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-r border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-up flex flex-col items-center w-full">
              {Array(6).fill("GRAPHS").concat(Array(6).fill("GRAPHS")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Gutter Vertical Marquee */}
          <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-l border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-down flex flex-col items-center w-full">
              {Array(6).fill("TRENDS").concat(Array(6).fill("TRENDS")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Centered partitioned area */}
          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5] p-12 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
            <div className="w-full flex items-center justify-between mb-4 border-b border-zinc-200 pb-4 select-none">
              <div className="w-1/4 flex justify-start">
                <Link href="/sansad/hub/samvidhaan" className="flex items-center select-none">
                  <div 
                    className="h-10 px-4 bg-[#1b253c] hover:bg-[#f97316] text-white rounded-xl flex items-center justify-center gap-0 hover:gap-2 transition-all duration-300 ease-out overflow-hidden group/btn cursor-pointer shadow-xs font-bold" 
                    style={{ fontFamily: "var(--font-pixeloid)" }}
                  >
                    <ArrowLeft className="w-0 h-5 text-white opacity-0 transition-all duration-300 ease-out group-hover/btn:w-5 group-hover/btn:opacity-100 shrink-0" />
                    <span className="text-xs uppercase tracking-wider">Back</span>
                  </div>
                </Link>
              </div>
              <div className="flex-1 text-center">
                <h1 className="text-4xl font-black uppercase text-zinc-950 tracking-tight" style={{ fontFamily: "var(--font-questrial)" }}>
                  DIAGNOSTIC GRAPHS
                </h1>
                <span className="text-[10px] font-mono text-zinc-450 uppercase tracking-widest block mt-1">
                  Predictive RUL degradation & frequency spectra
                </span>
              </div>
              <div className="w-1/4" />
            </div>

            <div className="flex-1 flex gap-8 min-h-0">
              {/* Left sidebar listing monitored assets */}
              <div className="w-[42%] h-full flex flex-col gap-4">
                <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search asset, telemetry code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-zinc-200 text-[#1b253c] placeholder:text-[#1b253c]/40 focus:bg-white focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none transition-all duration-200 font-semibold"
                    />
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <div className="flex gap-2">
                    {["all", "CokeOven-Agent", "Sinter-Agent"].map((mod) => (
                      <button
                        key={mod}
                        onClick={() => setSelectedModule(mod)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          selectedModule === mod 
                            ? "bg-[#1b253c] text-white" 
                            : "bg-[#FAF9F5] text-zinc-500 border border-zinc-200 hover:text-[#1b253c] hover:border-zinc-350"
                        }`}
                      >
                        {mod === "all" ? "All Modules" : mod}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-none">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-sm font-mono text-zinc-400">
                      No assets found.
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const isActive = item.id === activeItemId;
                      const isCritical = item.rulDays < 15;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setActiveItemId(item.id)}
                          className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none relative ${
                            isActive 
                              ? "bg-[#1b253c] border-[#1b253c] shadow-md text-white mr-1" 
                              : "bg-white border-zinc-200 hover:border-[#1b253c] mr-1"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${isActive ? "text-zinc-350" : "text-zinc-400"}`}>{item.code}</span>
                            <span className={`font-mono text-[10px] font-bold ${isCritical ? "text-red-500" : "text-[#75864C]"}`}>{item.rulDays}d Remaining</span>
                          </div>
                          <h4 className={`text-base font-black uppercase truncate ${isActive ? "text-white" : "text-[#1b253c]"}`} style={{ fontFamily: "var(--font-questrial)" }}>
                            {item.asset}
                          </h4>
                          <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-zinc-100/10">
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${isActive ? "text-zinc-350" : "text-zinc-400"}`}>{item.module}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                              isCritical ? "bg-red-500 text-white" : "bg-zinc-100 text-zinc-700"
                            }`}>
                              Anomaly: {item.anomalyRate}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right detail dashboard panels */}
              <div className="flex-1 h-full bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col relative overflow-hidden">
                <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>
                <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>

                {activeItem && (
                  <div className="flex flex-col h-full justify-between overflow-y-auto scrollbar-none">
                    <div>
                      {/* Header block */}
                      <div className="flex justify-between items-start border-b pb-4 mb-6 shrink-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-orange-500" />
                            <span className="font-mono text-sm font-black text-orange-500 tracking-wider">{activeItem.code}</span>
                          </div>
                          <h3 className="text-2xl font-black text-[#1b253c] uppercase mt-1 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                            {activeItem.asset}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-[#f97316] font-bold uppercase">
                          <Calendar className="w-3.5 h-3.5" />
                          {activeItem.date}
                        </div>
                      </div>

                      {/* Brief details description */}
                      <div className="mb-6">
                        <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Diagnostic Log Summary</span>
                        <p className="text-xs text-zinc-600 leading-relaxed font-sans bg-[#FAF9F5] p-4 rounded-xl border border-zinc-150">
                          {activeItem.description}
                        </p>
                      </div>

                      {/* Graphics container */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Vibration Spectral plot */}
                        <div className="bg-[#FAF9F5] border border-zinc-200/80 rounded-2xl p-4 flex flex-col justify-between">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
                              FFT Vibration Spectrum
                            </span>
                            <span className="text-[8px] font-mono text-zinc-400 bg-white border border-zinc-200 px-1.5 py-0.5 rounded">
                              Tolerance: {activeItem.thresholdVal}
                            </span>
                          </div>
                          <div className="w-full h-32 flex items-end justify-between relative bg-white border border-zinc-150/70 p-2.5 rounded-xl">
                            {/* Draw SVG spectrum bars/lines */}
                            <svg className="absolute inset-0 w-full h-full p-2.5" viewBox="0 0 160 80" preserveAspectRatio="none">
                              {/* Grid lines */}
                              <line x1="0" y1="20" x2="160" y2="20" stroke="#f1f1f1" strokeWidth="0.5" strokeDasharray="2,2" />
                              <line x1="0" y1="40" x2="160" y2="40" stroke="#f1f1f1" strokeWidth="0.5" strokeDasharray="2,2" />
                              <line x1="0" y1="60" x2="160" y2="60" stroke="#f1f1f1" strokeWidth="0.5" strokeDasharray="2,2" />
                              <line x1="0" y1="78" x2="160" y2="78" stroke="#ccc" strokeWidth="0.5" />
                              
                              {/* Spectrum path */}
                              <path
                                d={`M 0 78 ` + activeItem.vibrationData.map((val, idx) => `L ${idx * (160 / (activeItem.vibrationData.length - 1))} ${78 - (val / 100) * 70}`).join(" ") + ` L 160 78`}
                                fill="rgba(59, 130, 246, 0.08)"
                                stroke="#3b82f6"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>

                        {/* RUL Degradation curve */}
                        <div className="bg-[#FAF9F5] border border-zinc-200/80 rounded-2xl p-4 flex flex-col justify-between">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
                              RUL Index Degradation Trend
                            </span>
                            <span className="text-[8px] font-mono text-rose-500 font-bold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                              Anomaly: {activeItem.anomalyRate}
                            </span>
                          </div>
                          <div className="w-full h-32 flex items-end justify-between relative bg-white border border-zinc-150/70 p-2.5 rounded-xl">
                            {/* Draw SVG line chart */}
                            <svg className="absolute inset-0 w-full h-full p-2.5" viewBox="0 0 160 80" preserveAspectRatio="none">
                              {/* Grid lines */}
                              <line x1="0" y1="20" x2="160" y2="20" stroke="#f1f1f1" strokeWidth="0.5" strokeDasharray="2,2" />
                              <line x1="0" y1="40" x2="160" y2="40" stroke="#f1f1f1" strokeWidth="0.5" strokeDasharray="2,2" />
                              <line x1="0" y1="60" x2="160" y2="60" stroke="#f1f1f1" strokeWidth="0.5" strokeDasharray="2,2" />
                              
                              {/* Threshold warning line */}
                              <line x1="0" y1="65" x2="160" y2="65" stroke="#f43f5e" strokeWidth="0.75" strokeDasharray="4,2" />
                              
                              {/* RUL Degradation Line */}
                              <path
                                d={activeItem.rulCurveData.map((val, idx) => `${idx === 0 ? "M" : "L"} ${idx * (160 / (activeItem.rulCurveData.length - 1))} ${80 - (val / 100) * 70}`).join(" ")}
                                fill="none"
                                stroke={activeItem.rulDays < 15 ? "#f43f5e" : "#75864C"}
                                strokeWidth="2"
                                strokeLinecap="round"
                              />

                              {/* Points */}
                              {activeItem.rulCurveData.map((val, idx) => (
                                <circle
                                  key={idx}
                                  cx={idx * (160 / (activeItem.rulCurveData.length - 1))}
                                  cy={80 - (val / 100) * 70}
                                  r="2"
                                  fill={activeItem.rulDays < 15 ? "#f43f5e" : "#75864C"}
                                />
                              ))}
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Meta diagnostic metrics summary */}
                    <div className="grid grid-cols-3 gap-4 border-t border-zinc-150 pt-5 mt-6 shrink-0">
                      <div>
                        <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Asset Health Index</span>
                        <span className={`block text-base font-black ${activeItem.rulDays < 15 ? "text-rose-600 animate-pulse" : "text-zinc-800"}`}>
                          {activeItem.rulDays < 15 ? "CRITICAL WEAR (14%)" : "NOMINAL OPERATIONAL"}
                        </span>
                      </div>
                      <div>
                        <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Diagnosing module</span>
                        <span className="block text-sm font-bold text-zinc-700 font-mono">{activeItem.module}</span>
                      </div>
                      <div>
                        <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Anomaly Evaluation</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <ShieldAlert className={`w-4 h-4 ${activeItem.rulDays < 15 ? "text-rose-500" : "text-[#75864C]"}`} />
                          <span className="text-xs font-bold text-zinc-800 uppercase tracking-tight">{activeItem.anomalyRate} Risk Factor</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
