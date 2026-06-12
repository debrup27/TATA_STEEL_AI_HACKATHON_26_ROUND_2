"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";

interface AssetHealth {
  id: string;
  name: string;
  section: string;
  rulDays: number;
  health: number;
  status: "nominal" | "warning" | "critical";
  lastMaintenance: string;
  vibration: string;
  temp: string;
  comments: string;
}

interface FactoryData {
  id: string;
  name: string;
  code: string;
  description: string;
  parts: AssetHealth[];
}

export default function RulMonitorPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>("factory-1");
  const [activePartForModal, setActivePartForModal] = useState<AssetHealth | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const factories: FactoryData[] = [
    {
      id: "factory-1",
      name: "Factory 01",
      code: "COBPP",
      description: "Coke Oven By-Product Plant",
      parts: [
        {
          id: "asset-1",
          name: "F1-EQ09 Centrifugal Exhauster",
          section: "Coke Oven By-Product",
          rulDays: 14,
          health: 24,
          status: "critical",
          lastMaintenance: "2026-03-12",
          vibration: "6.42 mm/s",
          temp: "1085°C",
          comments: "Immediate replacement needed. Centrifugal exhauster F1-EQ09 bearing frequency exceeds vibration threshold. Schedule downtime immediately."
        },
        {
          id: "asset-4",
          name: "F1-EQ11 Electrostatic Precipitator",
          section: "Coke Gas De-tarring Unit",
          rulDays: 95,
          health: 96,
          status: "nominal",
          lastMaintenance: "2026-04-20",
          vibration: "0.22 mm/s",
          temp: "68°C",
          comments: "Telemetry matches nominal reference index curves. No immediate action required. Telemetry loop is stable."
        },
        {
          id: "asset-5",
          name: "F1-EQ01 Gas Collector Main Valve",
          section: "COG Collector Loop",
          rulDays: 120,
          health: 88,
          status: "nominal",
          lastMaintenance: "2026-05-01",
          vibration: "0.45 mm/s",
          temp: "85°C",
          comments: "Collector grid valve seal showing minor leakage but within spec boundaries. Next inspection in 30 days."
        },
        {
          id: "asset-6",
          name: "F1-EQ04 Ammonia Washer Pump",
          section: "By-Product Washer Unit",
          rulDays: 8,
          health: 12,
          status: "critical",
          lastMaintenance: "2026-01-15",
          vibration: "8.91 mm/s",
          temp: "92°C",
          comments: "CRITICAL: Impeller cavitation detected. Seal failure imminent. Swap with standby pump immediately to prevent wash bottleneck."
        }
      ]
    },
    {
      id: "factory-2",
      name: "Factory 02",
      code: "SINTER",
      description: "Sintering Plant",
      parts: [
        {
          id: "asset-2",
          name: "F2-EQ04 Drive Sprocket",
          section: "Sintering Strand A",
          rulDays: 18,
          health: 38,
          status: "warning",
          lastMaintenance: "2026-02-28",
          vibration: "3.12 mm/s",
          temp: "82°C",
          comments: "Tooth root fatigue detected. Plan belt re-alignment and sprocket swap on next scheduled turnaround cycle."
        },
        {
          id: "asset-3",
          name: "F2-EQ09 Waste Gas Fan Impeller",
          section: "Sintering Emission Control",
          rulDays: 42,
          health: 84,
          status: "nominal",
          lastMaintenance: "2026-05-15",
          vibration: "1.45 mm/s",
          temp: "115°C",
          comments: "Impeller surface showing moderate pitting. Structural reinforcement and dynamic balancing stable. Regular telemetry loop check."
        },
        {
          id: "asset-7",
          name: "F2-EQ02 Sinter Belt Feeder",
          section: "Strand Feed Conveyor",
          rulDays: 5,
          health: 10,
          status: "critical",
          lastMaintenance: "2026-03-01",
          vibration: "9.15 mm/s",
          temp: "98°C",
          comments: "Belt alignment drift exceeded critical threshold. Gearbox output shaft bearing heating up. Immediate lubrication flush and replacement scheduled."
        },
        {
          id: "asset-8",
          name: "F2-EQ15 Ignition Furnace Burner",
          section: "Sinter Ignition Hearth",
          rulDays: 210,
          health: 92,
          status: "nominal",
          lastMaintenance: "2026-05-20",
          vibration: "0.11 mm/s",
          temp: "1250°C",
          comments: "Burner nozzle pressure profile is nominal. Combustion efficiency high. No dynamic adjustments required."
        }
      ]
    }
  ];

  const activeFactory = factories.find(f => f.id === selectedFactoryId) || factories[0];

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
        `
      }} />

      {isMobile ? (
        <div className="flex flex-col gap-6 w-full px-6 pt-24 pb-12 select-none max-w-lg mx-auto z-10">
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-xs">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter uppercase leading-none" style={{ fontFamily: "var(--font-pixeloid)" }}>
              SANSAD<br />HUB
            </h1>
            <p className="text-[9px] text-[#f97316] mt-3 font-bold uppercase tracking-[0.2em]">
              RUL Telemetry Monitor
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
            <p className="text-sm text-zinc-600">Please open this page on a desktop viewport to inspect remaining useful life telemetry.</p>
            <Link href="/sansad/hub" className="mt-4 block text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider">
              Back to Console
            </Link>
          </div>
        </div>
      ) : (
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
          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5] p-12 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar-track]:hidden [&::-webkit-scrollbar-thumb]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="w-full flex items-center justify-between mb-4 border-b border-zinc-200 pb-4 select-none">
              {/* Left Side: Back Button */}
              <div className="w-1/4 flex justify-start">
                <Link href="/sansad/hub" className="flex items-center select-none">
                  <div 
                    className="h-10 px-4 bg-[#1b253c] hover:bg-[#f97316] text-white rounded-xl flex items-center justify-center gap-0 hover:gap-2 transition-all duration-300 ease-out overflow-hidden group/btn cursor-pointer shadow-xs font-bold" 
                    style={{ fontFamily: "var(--font-pixeloid)" }}
                  >
                    <ArrowLeft className="w-0 h-5 text-white opacity-0 transition-all duration-300 ease-out group-hover/btn:w-5 group-hover/btn:opacity-100 shrink-0" />
                    <span className="text-xs uppercase tracking-wider">Back</span>
                  </div>
                </Link>
              </div>

              {/* Center: Title and Subtitle */}
              <div className="flex-1 text-center">
                <h1 className="text-4xl font-black uppercase text-zinc-950 tracking-tight" style={{ fontFamily: "var(--font-questrial)" }}>
                  RUL MONITOR
                </h1>
                <span className="text-[10px] font-mono text-zinc-450 uppercase tracking-widest block mt-1">
                  Remaining Useful Life Projection Index
                </span>
              </div>

              {/* Right Side: Spacer */}
              <div className="w-1/4" />
            </div>

            {/* Split layout in subpage */}
            <div className="flex-1 flex gap-8 min-h-0">
              
              {/* Left Column: Factory Selection List (Stacked grid layout like main hub) */}
              <div className="w-[35%] h-full flex flex-col gap-6">
                {factories.map((factory) => {
                  const isActive = factory.id === selectedFactoryId;
                  const criticalCount = factory.parts.filter(p => p.status === "critical").length;
                  const warningCount = factory.parts.filter(p => p.status === "warning").length;

                  return (
                    <div
                      key={factory.id}
                      onClick={() => setSelectedFactoryId(factory.id)}
                      className={`group flex-1 p-8 rounded-3xl border flex flex-col justify-between relative transition-all duration-300 ease-in-out cursor-pointer select-none overflow-hidden ${
                        isActive 
                          ? "bg-[#4A582E] border-[#4A582E] scale-[1.01] shadow-2xl text-white" 
                          : "bg-white border-zinc-200 hover:border-[#4A582E] hover:bg-[#FAF6EE] hover:scale-[1.01] hover:shadow-2xl text-[#1b253c]"
                      }`}
                    >
                      <div className={`absolute top-2.5 left-2.5 font-mono text-[9px] transition-colors duration-300 select-none ${isActive ? "text-white/60" : "text-[#1b253c]/35 group-hover:text-[#4A582E]"}`}>+</div>
                      <div className={`absolute bottom-2.5 right-2.5 font-mono text-[9px] transition-colors duration-300 select-none ${isActive ? "text-white/60" : "text-[#1b253c]/35 group-hover:text-[#4A582E]"}`}>+</div>

                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`font-mono text-xs font-extrabold uppercase tracking-widest ${isActive ? "text-zinc-300" : "text-zinc-400"}`}>
                            {factory.code}
                          </span>
                          <div className="flex gap-1.5">
                            {criticalCount > 0 && (
                              <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${
                                isActive ? "text-rose-200 bg-rose-950/40 border-rose-800" : "text-rose-600 bg-rose-50 border-rose-200/50"
                              }`}>
                                {criticalCount} Critical
                              </div>
                            )}
                            {warningCount > 0 && (
                              <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${
                                isActive ? "text-amber-200 bg-amber-950/40 border-amber-800" : "text-amber-600 bg-amber-50 border-amber-200/50"
                              }`}>
                                {warningCount} Warning
                              </div>
                            )}
                          </div>
                        </div>

                        <h2 className={`text-6xl font-black uppercase leading-none mt-4 ${isActive ? "text-white" : "text-[#1b253c]"}`} style={{ fontFamily: "var(--font-questrial)" }}>
                          FACTORY<br />{factory.id === "factory-1" ? "01" : "02"}
                        </h2>
                        
                        <p className={`text-xs italic mt-3 leading-snug transition-colors duration-300 ${isActive ? "text-zinc-200/80" : "text-zinc-450"}`} style={{ fontFamily: "var(--font-questrial)" }}>
                          {factory.description}
                        </p>
                      </div>

                      <div>
                        <div className={`grid grid-cols-2 gap-4 mt-6 border-t pt-4 ${isActive ? "border-white/10" : "border-zinc-150"}`}>
                          <div>
                            <span className={`block text-[11px] font-mono font-bold uppercase tracking-wider ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>Total Equipment</span>
                            <span className="text-lg font-bold" style={{ fontFamily: "var(--font-questrial)" }}>{factory.parts.length} Units</span>
                          </div>
                          <div>
                            <span className={`block text-[11px] font-mono font-bold uppercase tracking-wider ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>Overall RUL Status</span>
                            <span className={`text-lg font-bold uppercase ${
                              criticalCount > 0 ? "text-rose-500 font-extrabold" : warningCount > 0 ? "text-amber-500 font-extrabold" : "text-emerald-600 font-extrabold"
                            }`} style={{ fontFamily: "var(--font-questrial)" }}>
                              {criticalCount > 0 ? "Critical" : warningCount > 0 ? "Warning" : "Nominal"}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-end mt-4">
                          <ArrowUpRight className={`w-7 h-7 transition-all duration-300 ${isActive ? "text-white rotate-45" : "text-[#1b253c] group-hover:text-[#4A582E] group-hover:rotate-45"}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Complete Factory Parts breakdown index */}
              <div className="w-[65%] h-full flex flex-col gap-4 overflow-y-auto pr-2 scrollbar-none [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar-track]:hidden [&::-webkit-scrollbar-thumb]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {activeFactory.parts.map((part) => {
                  const isCritical = part.status === "critical";
                  const isWarning = part.status === "warning";
                  
                  let statusBadgeColor = "text-emerald-600 bg-emerald-50 border-emerald-200/50";
                  if (isCritical) statusBadgeColor = "text-rose-600 bg-rose-50 border-rose-200/50 animate-pulse";
                  else if (isWarning) statusBadgeColor = "text-amber-600 bg-amber-50 border-amber-200/50";

                  return (
                    <div 
                      key={part.id} 
                      onClick={() => setActivePartForModal(part)}
                      className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center justify-between relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-[#4A582E] cursor-pointer group/part animate-in fade-in-50 duration-300"
                    >
                      <div className="absolute top-2 left-2 font-mono text-[9px] text-[#1b253c]/20 select-none">+</div>
                      
                      <div className="flex-1 min-w-0 pr-4">
                        <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-widest">{part.section}</span>
                        <h3 className="text-2xl font-black text-[#1b253c] uppercase truncate mt-0.5" style={{ fontFamily: "var(--font-questrial)" }}>
                          {part.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-wider ${statusBadgeColor}`}>
                            {part.status}
                          </span>
                          <span className="text-xs font-mono text-zinc-455">Last Maintenance: {part.lastMaintenance}</span>
                        </div>
                      </div>

                      {/* Overview Telemetry Indicators in big fonts */}
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <span className="block font-mono text-xs text-zinc-400 font-bold uppercase tracking-wider">RUL</span>
                          <span className={`block text-xl font-extrabold leading-none ${
                            isCritical ? "text-rose-600" : isWarning ? "text-amber-600" : "text-emerald-600"
                          }`} style={{ fontFamily: "var(--font-questrial)" }}>
                            {part.rulDays} Days
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block font-mono text-xs text-zinc-400 font-bold uppercase tracking-wider">Health</span>
                          <span className={`block text-xl font-extrabold leading-none ${
                            isCritical ? "text-rose-600" : isWarning ? "text-amber-600" : "text-emerald-600"
                          }`} style={{ fontFamily: "var(--font-questrial)" }}>
                            {part.health}%
                          </span>
                        </div>
                        
                        {/* Overview Arrow morph action */}
                        <div className="flex items-center justify-center p-2 rounded-full border border-zinc-200 bg-[#FAF9F5] group-hover/part:bg-[#FAF6EE] transition-all duration-300 shrink-0">
                          <ArrowUpRight className="w-6 h-6 text-[#1b253c] transition-transform duration-300 group-hover/part:rotate-45 shrink-0" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Modal Dialog for detailed view */}
      {activePartForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-10 max-w-3xl w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Corner Indicators */}
            <div className="absolute top-3.5 left-3.5 font-mono text-[10px] text-[#1b253c]/20 select-none">+</div>
            <div className="absolute bottom-3.5 right-3.5 font-mono text-[10px] text-[#1b253c]/20 select-none">+</div>

            <div className="flex justify-between items-start border-b border-zinc-150 pb-5 mb-6">
              <div>
                <span className="font-mono text-[11px] font-bold text-[#f97316] uppercase tracking-[0.2em]">{activePartForModal.section}</span>
                <h3 className="text-5xl lg:text-6xl font-black text-[#1b253c] uppercase mt-1 leading-tight" style={{ fontFamily: "var(--font-questrial)" }}>
                  {activePartForModal.name}
                </h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider shrink-0 ${
                activePartForModal.status === "critical"
                  ? "text-rose-600 bg-rose-50 border-rose-200/55 animate-pulse"
                  : activePartForModal.status === "warning"
                    ? "text-amber-600 bg-amber-50 border-amber-200/55"
                    : "text-emerald-600 bg-emerald-50 border-emerald-200/55"
              }`}>
                {activePartForModal.status}
              </div>
            </div>

            {/* Detailed Telemetry Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-[#FAF9F5] p-6 rounded-2xl border border-zinc-150 text-center flex flex-col justify-between">
                <span className="block font-mono text-[11px] text-zinc-500 font-extrabold uppercase tracking-wider leading-snug">Remaining Useful Life</span>
                <span className={`block text-3xl lg:text-4xl font-black mt-3 ${
                  activePartForModal.status === "critical" ? "text-rose-600" : activePartForModal.status === "warning" ? "text-amber-600" : "text-emerald-600"
                }`} style={{ fontFamily: "var(--font-questrial)" }}>
                  {activePartForModal.rulDays} Days
                </span>
              </div>
              <div className="bg-[#FAF9F5] p-6 rounded-2xl border border-zinc-150 text-center flex flex-col justify-between">
                <span className="block font-mono text-[11px] text-zinc-500 font-extrabold uppercase tracking-wider leading-snug">Health Index</span>
                <span className={`block text-3xl lg:text-4xl font-black mt-3 ${
                  activePartForModal.status === "critical" ? "text-rose-600" : activePartForModal.status === "warning" ? "text-amber-600" : "text-emerald-600"
                }`} style={{ fontFamily: "var(--font-questrial)" }}>
                  {activePartForModal.health}%
                </span>
              </div>
              <div className="bg-[#FAF9F5] p-6 rounded-2xl border border-zinc-150 text-center flex flex-col justify-between items-center">
                <span className="block font-mono text-[11px] text-zinc-500 font-extrabold uppercase tracking-wider mb-2">Sensor Telemetry</span>
                <span className="block text-sm font-mono font-semibold text-zinc-800 leading-relaxed">
                  VIB: {activePartForModal.vibration}<br />TEMP: {activePartForModal.temp}
                </span>
              </div>
            </div>

            {/* Health Progress Bar */}
            <div className="w-full mb-6">
              <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    activePartForModal.status === "critical" ? "bg-rose-500" : activePartForModal.status === "warning" ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${activePartForModal.health}%` }}
                />
              </div>
            </div>

            {/* Comments & SOP verdict */}
            <div className={`p-6 rounded-2xl border flex items-start gap-4 select-none mb-8 ${
              activePartForModal.status === "critical" 
                ? "bg-rose-50 border-rose-100 text-rose-950" 
                : activePartForModal.status === "warning" 
                  ? "bg-amber-50 border-amber-100 text-amber-950" 
                  : "bg-emerald-50 border-emerald-100 text-emerald-950"
            }`}>
              {activePartForModal.status === "critical" ? (
                <ShieldAlert className="w-6 h-6 shrink-0 text-rose-500 mt-0.5" />
              ) : activePartForModal.status === "warning" ? (
                <AlertTriangle className="w-6 h-6 shrink-0 text-amber-500 mt-0.5" />
              ) : (
                <CheckCircle className="w-6 h-6 shrink-0 text-emerald-500 mt-0.5" />
              )}
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider block text-zinc-500">Significant Comments & SOP Recommendation</span>
                <p className="text-sm mt-1.5 leading-relaxed font-sans font-medium">{activePartForModal.comments}</p>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-mono text-zinc-400 border-t border-zinc-150 pt-5">
              <span>Last Maintenance: {activePartForModal.lastMaintenance}</span>
              <button 
                onClick={() => setActivePartForModal(null)}
                className="h-11 px-8 bg-[#1b253c] hover:bg-[#f97316] hover:scale-105 active:scale-95 text-white rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer transition-all duration-300 shadow-md"
                style={{ fontFamily: "var(--font-pixeloid)" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
