"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, FileText, Calendar, CheckCircle, Factory } from "lucide-react";
import HubMarkdown from "../../components/HubMarkdown";
import ClickSpark from "@/animations/ClickSpark";
import { fetchSamvidhaanHistoricalReports } from "@/services/samvidhaanGraphs";
import AnomalyTripControl from "../../components/AnomalyTripControl";

type ReportRow = Awaited<ReturnType<typeof fetchSamvidhaanHistoricalReports>>[number];

export default function ReportsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeItemId, setActiveItemId] = useState("");
  const [items, setItems] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSamvidhaanHistoricalReports()
      .then((rows) => {
        if (!cancelled) {
          setItems(rows);
          if (rows[0]) setActiveItemId(rows[0].id);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load historical reports");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const activeItem = items.find((i) => i.id === activeItemId) || items[0];

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.factory.toLowerCase().includes(q) ||
      item.asset.toLowerCase().includes(q)
    );
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
              Historical Plant Dossiers
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
            <p className="text-sm text-zinc-600">Open on desktop to view factory historical reports used as MANAS context.</p>
            <Link href="/sansad/hub/samvidhaan" className="mt-4 block text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider">
              Back to Command Center
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex select-none">
          <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-r border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-up flex flex-col items-center w-full">
              {Array(6).fill("HISTORY").concat(Array(6).fill("HISTORY")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-l border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-down flex flex-col items-center w-full">
              {Array(6).fill("DOSSIER").concat(Array(6).fill("DOSSIER")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5] min-h-0">
            <div className="shrink-0 border-b border-zinc-200 select-none">
              <div className="w-full flex items-center justify-between px-8 py-3">
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
                    HISTORICAL PLANT DOSSIERS
                  </h1>
                  <span className="text-[10px] font-mono text-zinc-450 uppercase tracking-widest block mt-1">
                    2 factory reports · 90-day ops context for MANAS intelligence
                  </span>
                </div>
                <div className="w-1/4 flex justify-end overflow-visible">
                  <AnomalyTripControl />
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-8 py-4 scrollbar-none [&::-webkit-scrollbar]:hidden">
              {loading ? (
                <div className="flex items-center justify-center py-24 text-sm text-zinc-400 font-mono animate-pulse">
                  Loading historical dossiers…
                </div>
              ) : error ? (
                <div className="text-center py-24 text-sm text-rose-600">{error}</div>
              ) : items.length === 0 ? (
                <div className="text-center py-24 text-sm text-zinc-500 font-mono">
                  No historical dossiers yet. Run seed_intelligence_reports on the backend.
                </div>
              ) : (
                <div className="flex-1 flex gap-8 min-h-0">
                  <div className="w-[42%] h-full flex flex-col gap-4">
                    <div className="bg-white border border-zinc-200 p-4 rounded-2xl">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search factory dossiers…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-[#FAF9F5] border border-zinc-200 text-[#1b253c] placeholder:text-[#1b253c]/40 focus:bg-white focus:border-[#f97316] rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none font-semibold"
                        />
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-none">
                      {filteredItems.map((item) => {
                        const isActive = item.id === activeItemId;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveItemId(item.id)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                              isActive ? "bg-[#1b253c] border-[#1b253c] shadow-md text-white" : "bg-white border-zinc-200 hover:border-[#1b253c]"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Factory className={`w-4 h-4 ${isActive ? "text-orange-300" : "text-orange-500"}`} />
                              <span className={`font-mono text-[10px] font-bold uppercase ${isActive ? "text-zinc-300" : "text-zinc-400"}`}>
                                {item.factory}
                              </span>
                            </div>
                            <h4 className={`text-base font-black uppercase leading-snug ${isActive ? "text-white" : "text-[#1b253c]"}`} style={{ fontFamily: "var(--font-questrial)" }}>
                              {item.title}
                            </h4>
                            <span className={`text-[9px] font-mono block mt-1.5 ${isActive ? "text-zinc-400" : "text-zinc-500"}`}>{item.date}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex-grow h-full bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col relative overflow-hidden">
                    {activeItem && (
                      <div className="flex flex-col h-full overflow-y-auto scrollbar-none">
                        <div className="flex justify-between items-start border-b pb-4 mb-4 shrink-0">
                          <div>
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-orange-500" />
                              <span className="font-mono text-sm font-black text-orange-500 tracking-wider">{activeItem.factory}</span>
                            </div>
                            <h3 className="text-2xl font-black text-[#1b253c] uppercase mt-1 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                              {activeItem.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-mono text-[#f97316] font-bold uppercase">
                            <Calendar className="w-3.5 h-3.5" />
                            {activeItem.date}
                          </div>
                        </div>

                        <div className="bg-[#FAF9F5] rounded-2xl border border-zinc-150 p-5 flex-1">
                          <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-3">
                            90-day operations dossier · MANAS context
                          </span>
                          <div className="p-5 bg-white rounded-xl border border-zinc-200 max-h-[480px] overflow-y-auto scrollbar-none">
                            <HubMarkdown className="text-xs">{activeItem.reportMarkdown}</HubMarkdown>
                          </div>
                        </div>

                        <div className="border-t border-zinc-150 pt-5 mt-4 shrink-0 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span className="text-[11px] font-bold text-zinc-650">
                              Fed to Qwen 0.8b when regenerating intelligence reports for {activeItem.factory}.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
