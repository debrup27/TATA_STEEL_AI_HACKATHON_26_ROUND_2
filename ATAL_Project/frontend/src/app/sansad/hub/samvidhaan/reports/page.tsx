"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, FileText, Calendar, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import ClickSpark from "@/animations/ClickSpark";
import { fetchReports, type ReportItem } from "@/services/reports";

export default function ReportsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [activeItemId, setActiveItemId] = useState<string>("");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  void loading;
  void error;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchReports()
      .then((rows) => {
        if (!cancelled) {
          setItems(rows);
          if (rows[0]) setActiveItemId(rows[0].id);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load reports");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const activeItem = items.find((i) => i.id === activeItemId) || items[0];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.verdict.toLowerCase().includes(searchQuery.toLowerCase());
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
              Reports & Logs
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
            <p className="text-sm text-zinc-600">Please open this page on a desktop viewport to inspect generated reports.</p>
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
              {Array(6).fill("REPORTS").concat(Array(6).fill("REPORTS")).map((text, idx) => (
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
              {Array(6).fill("LOGS").concat(Array(6).fill("LOGS")).map((text, idx) => (
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
                  STRUCTURED REPORTS
                </h1>
                <span className="text-[10px] font-mono text-zinc-450 uppercase tracking-widest block mt-1">
                  Supervisor sign-offs & digital logs entries
                </span>
              </div>
              <div className="w-1/4" />
            </div>

            <div className="flex-1 flex gap-8 min-h-0">
              {/* Left sidebar listing reports */}
              <div className="w-[42%] h-full flex flex-col gap-4">
                <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search reports by keyword..."
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
                      No reports match the filter.
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const isActive = item.id === activeItemId;
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
                            <span className={`font-mono text-[10px] ${isActive ? "text-zinc-200" : "text-[#f97316]"}`}>{item.date}</span>
                          </div>
                          <h4 className={`text-base font-black uppercase truncate ${isActive ? "text-white" : "text-[#1b253c]"}`} style={{ fontFamily: "var(--font-questrial)" }}>
                            {item.asset}
                          </h4>
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-widest block mt-1.5 ${isActive ? "text-zinc-350" : "text-zinc-400"}`}>Module: {item.module}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right detail dashboard panels */}
              <div className="flex-grow h-full bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col relative overflow-hidden">
                <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>
                <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 select-none">+</div>

                {activeItem && (
                  <div className="flex flex-col h-full justify-between overflow-y-auto scrollbar-none">
                    <div className="space-y-5">
                      {/* Header block */}
                      <div className="flex justify-between items-start border-b pb-4 mb-4 shrink-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-orange-500" />
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

                      {/* Diagnostic verdict */}
                      <div>
                        <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Diagnosing Verdict</span>
                        <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${
                          activeItem.verdict.includes("CRITICAL") 
                            ? "bg-rose-50 text-rose-600 border border-rose-100" 
                            : activeItem.verdict.includes("WARNING")
                            ? "bg-amber-50 text-amber-600 border border-amber-100"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}>
                          {activeItem.verdict}
                        </span>
                      </div>

                      {/* Structured Markdown Report */}
                      <div className="bg-[#FAF9F5] rounded-2xl border border-zinc-150 p-5">
                        <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-3">Diagnostic Analysis Report</span>
                        <div className="p-5 bg-white rounded-xl border border-zinc-200 max-h-[350px] overflow-y-auto scrollbar-none">
                          <div className="text-xs text-zinc-700 leading-relaxed prose prose-sm max-w-none [&_h1]:text-base [&_h1]:font-black [&_h2]:text-sm [&_h2]:font-black [&_h3]:text-xs [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-0.5 [&_strong]:font-bold">
                            <ReactMarkdown>{activeItem.reportMarkdown}</ReactMarkdown>
                          </div>
                        </div>
                      </div>

                      {/* Operator & digital signatures */}
                      <div className="grid grid-cols-2 gap-4 border-t border-zinc-150 pt-4 mt-2">
                        <div>
                          <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Report Author</span>
                          <span className="block text-xs font-bold text-zinc-800">{activeItem.author}</span>
                        </div>
                        <div>
                          <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Digital Log Synchronization</span>
                          <span className="block text-xs font-mono font-bold text-emerald-600">SYNCED (ATAL CLOUD DATABASE)</span>
                        </div>
                      </div>
                    </div>

                    {/* Supervisor Sign-Off Footer */}
                    <div className="border-t border-zinc-150 pt-5 mt-6 shrink-0 flex justify-between items-center bg-white z-10 no-drag">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="text-[11px] font-bold text-zinc-650">Sign-off as supervisor to lock the maintenance action items in the cloud index.</span>
                      </div>
                      <button 
                        onClick={() => alert("Report successfully signed and archived to plant server.")}
                        className="bg-[#1b253c] hover:bg-[#f97316] text-white text-[10px] font-bold px-4 py-2.5 rounded-xl transition-all duration-300 cursor-pointer shadow-md select-none"
                        style={{ fontFamily: "var(--font-pixeloid)" }}
                      >
                        Sign-Off Report
                      </button>
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
