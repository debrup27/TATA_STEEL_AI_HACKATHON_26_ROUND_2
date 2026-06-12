"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Terminal, FileText, Calendar } from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";

interface MaintenanceLog {
  id: string;
  code: string;
  date: string;
  asset: string;
  module: string;
  description: string;
  verdict: string;
  operator: string;
}

export default function HistoricalLogsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [activeLogId, setActiveLogId] = useState<string | null>("log-1");

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const logs: MaintenanceLog[] = [
    {
      id: "log-1",
      code: "MR-2024-441",
      date: "2024-11-05",
      asset: "F1-EQ09 Centrifugal Exhauster",
      module: "CokeOven-Agent",
      description: "Complete replacement of the inboard spherical roller bearing after high-frequency vibration alarms. Exchanged and aligned. Lubrication system flushed.",
      verdict: "RESOLVED - RUL reset to 365 Days",
      operator: "M. Chatterjee",
    },
    {
      id: "log-2",
      code: "MR-2024-388",
      date: "2024-09-18",
      asset: "F2-EQ04 Drive Sprocket",
      module: "Sinter-Agent",
      description: "Tooth root wear check. Manual calibration offset applied on the Sinter belt feeder speed controller. Re-greased drive coupling.",
      verdict: "MONITORING - RUL at 120 Days",
      operator: "A. Sengupta",
    },
    {
      id: "log-3",
      code: "MR-2024-301",
      date: "2024-07-22",
      asset: "F2-EQ09 Waste Gas Fan Impeller",
      module: "Sinter-Agent",
      description: "Blade wear survey. Impeller surface showing moderate pitting. Performed structural reinforcement and dynamic balancing.",
      verdict: "RESOLVED - RUL reset to 180 Days",
      operator: "R. Sharma",
    },
    {
      id: "log-4",
      code: "MR-2024-270",
      date: "2024-06-11",
      asset: "F1-EQ11 Electrostatic Precipitator",
      module: "CokeOven-Agent",
      description: "Electrode alignment inspection and high-voltage grid cleaning. Removed carbon build-up on exhaust plates. Refitted insulator bushings.",
      verdict: "RESOLVED - RUL reset to 240 Days",
      operator: "M. Chatterjee",
    },
    {
      id: "log-5",
      code: "MR-2024-192",
      date: "2024-04-03",
      asset: "F1-EQ09 Exhauster Motor",
      module: "CokeOven-Agent",
      description: "FFT baseline spectral run on stator windings. Found minor phase balance variation. Thermal imaging matches nominal reference index.",
      verdict: "NOMINAL",
      operator: "S. K. Patel",
    },
  ];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = selectedModule === "all" || log.module === selectedModule;
    return matchesSearch && matchesModule;
  });

  const activeLog = logs.find(l => l.id === activeLogId) || logs[0];

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
              Historical Logs
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
            <p className="text-sm text-zinc-600">Please open this page on a desktop viewport to inspect maintenance history records.</p>
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
          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5] p-12 overflow-y-auto">
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
                <h2 className="text-xl font-black uppercase text-zinc-950" style={{ fontFamily: "var(--font-pixeloid)" }}>
                  SANSAD HUB // HISTORICAL LOGS
                </h2>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mt-1">
                  Active Sandbox // SOP records & repair history index
                </span>
              </div>

              {/* Right Side: Spacer */}
              <div className="w-1/4" />
            </div>

            {/* Subpage Contents */}
            <div className="flex-1 flex gap-8 min-h-0">
              
              {/* Left Column: Filter and List of logs */}
              <div className="w-[50%] h-full flex flex-col gap-4">
                
                {/* Search and Module filters */}
                <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search log code, asset, or repair info..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-zinc-200 text-[#1b253c] placeholder:text-[#1b253c]/40 focus:bg-white focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] rounded-xl pl-10 pr-3 py-2 text-xs focus:outline-none transition-all duration-200 font-semibold"
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

                {/* Filtered logs lists */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1b253c]/15 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-12 text-sm font-mono text-zinc-400">
                      No logs match the query search parameters.
                    </div>
                  ) : (
                    filteredLogs.map((log) => {
                      const isActive = log.id === activeLogId;
                      return (
                        <div
                          key={log.id}
                          onClick={() => setActiveLogId(log.id)}
                          className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer select-none relative ${
                            isActive 
                              ? "bg-[#4A582E] border-[#4A582E] scale-[1.01] shadow-md text-white" 
                              : "bg-white border-zinc-200 hover:border-[#4A582E] hover:scale-[1.005]"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className={`font-mono text-[9px] font-bold uppercase tracking-widest ${isActive ? "text-zinc-200" : "text-zinc-400 group-hover:text-zinc-500"}`}>{log.code}</span>
                            <span className={`font-mono text-[9px] ${isActive ? "text-zinc-200" : "text-zinc-400"}`}>{log.date}</span>
                          </div>
                          <h4 className={`text-md font-black uppercase ${isActive ? "text-white" : "text-[#1b253c]"}`} style={{ fontFamily: "var(--font-questrial)" }}>
                            {log.asset}
                          </h4>
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-widest block mt-1 ${isActive ? "text-zinc-200" : "text-zinc-400"}`}>Module: {log.module}</span>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

              {/* Right Column: Log detailed view */}
              <div className="flex-1 h-full bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col relative overflow-hidden">
                <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>
                <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>

                {activeLog && (
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start border-b pb-4 mb-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-orange-500" />
                          <span className="font-mono text-xs font-black text-orange-500 tracking-wider">{activeLog.code}</span>
                        </div>
                        <h3 className="text-2xl font-black text-[#1b253c] uppercase mt-1" style={{ fontFamily: "var(--font-questrial)" }}>
                          {activeLog.asset}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 uppercase">
                        <Calendar className="w-3.5 h-3.5" />
                        {activeLog.date}
                      </div>
                    </div>

                    <div className="space-y-4 flex-1">
                      <div>
                        <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Diagnosing Agent Module</span>
                        <span className="inline-block px-2.5 py-1 bg-zinc-100 rounded-lg text-xs font-mono text-[#1b253c] font-bold">
                          {activeLog.module}
                        </span>
                      </div>

                      <div>
                        <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Maintenance & Action Details</span>
                        <p className="text-sm text-zinc-700 leading-relaxed font-sans bg-[#FAF9F5] p-5 rounded-2xl border border-zinc-150">
                          {activeLog.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Repair Operator</span>
                          <span className="block text-xs font-bold text-zinc-800">{activeLog.operator}</span>
                        </div>
                        <div>
                          <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Post-Action Verdict</span>
                          <span className="block text-xs font-bold text-[#75864C]">{activeLog.verdict}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 flex gap-2 justify-end">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5" />
                        Signed by concierges
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
