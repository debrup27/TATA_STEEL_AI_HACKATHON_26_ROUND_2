"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, BookOpen, Loader2 } from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";
import { fetchGlossary, type GlossaryEntry } from "@/services/glossary";
import { manasAskPath } from "@/lib/manas-deep-link";
import { MessageCircle } from "lucide-react";
import AnomalyTripControl from "../../components/AnomalyTripControl";
import SamvidhaanTickerStrip from "../../components/SamvidhaanTickerStrip";
import { glossaryLegendTickers } from "@/lib/samvidhaan-tickers";

export default function LegendPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
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
    fetchGlossary(category === "all" ? undefined : category, search || undefined)
      .then((res) => {
        if (cancelled) return;
        setEntries(res.entries);
        setCategories(res.categories ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load glossary");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [category, search]);

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      e.term.toLowerCase().includes(q) ||
      e.shortForm.toLowerCase().includes(q) ||
      e.definition.toLowerCase().includes(q)
    );
  });

  const legendTickers = useMemo(
    () => glossaryLegendTickers(entries, loading),
    [entries, loading],
  );

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={8}
      sparkRadius={18}
      sparkCount={6}
      duration={350}
      className="relative min-h-screen w-full bg-[#FAF9F5] flex flex-col overflow-hidden select-none"
    >
      {isMobile ? (
        <div className="px-6 pt-24 pb-12 max-w-lg mx-auto">
          <p className="text-sm text-zinc-600">Open on desktop for the full Samvidhaan legend glossary.</p>
          <Link href="/sansad/hub/samvidhaan" className="mt-4 block text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase">
            Back
          </Link>
        </div>
      ) : (
        <div className="w-screen h-screen flex flex-col bg-[#FAF9F5]">
          <div className="shrink-0 border-b border-zinc-200 bg-[#FAF9F5]">
          <div className="h-14 flex items-center px-10 gap-4">
            <Link href="/sansad/hub/samvidhaan" className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500 hover:text-orange-500 shrink-0">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <div className="flex-1 text-center min-w-0">
              <h1 className="text-xl font-black uppercase text-[#1b253c] truncate" style={{ fontFamily: "var(--font-questrial)" }}>
                Samvidhaan Legend
              </h1>
              <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest truncate">Abbreviations · ISO terms · role meanings</p>
            </div>
            <div className="ml-auto shrink-0 min-w-0 overflow-visible">
              <AnomalyTripControl />
            </div>
          </div>
          <SamvidhaanTickerStrip logos={legendTickers} className="px-10 pb-2" />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col px-10 py-6 gap-4 max-w-6xl mx-auto w-full">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search terms…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:border-orange-300"
                />
              </div>
              {["all", ...categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border cursor-pointer ${
                    category === c ? "bg-[#1b253c] text-white border-[#1b253c]" : "bg-white border-zinc-200 text-zinc-500"
                  }`}
                >
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center gap-2 text-zinc-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-mono uppercase">Loading glossary</span>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">{error}</div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-white border border-zinc-200 rounded-2xl">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-50 border-b border-zinc-100">
                    <tr className="text-[10px] uppercase text-zinc-400">
                      <th className="text-left py-3 px-4">Term</th>
                      <th className="text-left py-3 px-4">Short</th>
                      <th className="text-left py-3 px-4">Category</th>
                      <th className="text-left py-3 px-4">Definition</th>
                      <th className="text-right py-3 px-4">MANAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => (
                      <tr key={e.term} className="border-b border-zinc-50 hover:bg-zinc-50/80">
                        <td className="py-3 px-4 font-bold text-zinc-800">{e.term}</td>
                        <td className="py-3 px-4 font-mono text-xs text-orange-600">{e.shortForm}</td>
                        <td className="py-3 px-4 text-[10px] uppercase text-zinc-400">{e.category}</td>
                        <td className="py-3 px-4 text-zinc-600 leading-snug">
                          {e.definition}
                          {e.isoRef && <span className="block text-[10px] text-sky-600 mt-1 font-mono">{e.isoRef}</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={manasAskPath({ assetId: "plant", prompt: `Explain ${e.term} in our steel plant context`, source: "legend" })}
                            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-zinc-400 hover:text-orange-500"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Ask
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="p-12 text-center text-zinc-400 flex flex-col items-center gap-2">
                    <BookOpen className="w-8 h-8" />
                    <p>No glossary entries match your search.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
