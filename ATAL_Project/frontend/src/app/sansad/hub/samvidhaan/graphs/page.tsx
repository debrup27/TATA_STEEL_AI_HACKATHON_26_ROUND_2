"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";
import {
  fetchSamvidhaanGraphs,
  SAMVIDHAAN_GRAPH_REFRESH_MS,
  type FactoryMaintenanceSnapshot,
} from "@/services/samvidhaanGraphs";
import AnomalyTripControl from "../../components/AnomalyTripControl";
import SamvidhaanTickerStrip from "../../components/SamvidhaanTickerStrip";
import CostAnalysisPanel from "../../components/CostAnalysisPanel";
import { deferEffect } from "@/lib/defer-effect";
import { maintenanceGraphTickers } from "@/lib/samvidhaan-tickers";

export default function GraphsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [factories, setFactories] = useState<FactoryMaintenanceSnapshot[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGraphs = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    void fetchSamvidhaanGraphs()
      .then((data) => {
        const ordered = [...(data.factories ?? [])].sort((a, b) =>
          a.factory_code.localeCompare(b.factory_code),
        );
        setFactories(ordered);
        setLastUpdated(data.updated_at);
      })
      .catch(() => setError("Unable to load maintenance snapshots."))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    deferEffect(() => {
      loadGraphs();
    });
    const timer = setInterval(() => loadGraphs(true), SAMVIDHAAN_GRAPH_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadGraphs]);

  const nextRefresh = lastUpdated
    ? new Date(new Date(lastUpdated).getTime() + SAMVIDHAAN_GRAPH_REFRESH_MS)
    : null;

  const graphTickers = useMemo(
    () => maintenanceGraphTickers(factories, loading),
    [factories, loading],
  );

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
        <div className="flex flex-col gap-6 w-full px-6 pt-24 pb-12 max-w-lg mx-auto z-10">
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-xs">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter uppercase leading-none" style={{ fontFamily: "var(--font-pixeloid)" }}>
              SANSAD<br />SAMVIDHAAN
            </h1>
            <p className="text-[9px] text-[#f97316] mt-3 font-bold uppercase tracking-[0.2em]">
              Maintenance Snapshots
            </p>
          </div>
          <p className="text-sm text-zinc-600 bg-white border border-zinc-200 rounded-2xl p-5">
            Open on desktop to view Factory 1 &amp; Factory 2 maintenance priority boards.
          </p>
          <Link href="/sansad/hub/samvidhaan" className="block text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase">
            Back to Command Center
          </Link>
        </div>
      ) : (
        <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex">
          <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none border-r border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-up flex flex-col items-center w-full">
              {Array(6).fill("HEALTH").concat(Array(6).fill("HEALTH")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12">
                  <span className="atal-text-filled text-4xl lg:text-5xl tracking-wider">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none border-l border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-down flex flex-col items-center w-full">
              {Array(6).fill("ACTION").concat(Array(6).fill("ACTION")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12">
                  <span className="atal-text-filled text-4xl lg:text-5xl tracking-wider">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5] min-h-0">
            <div className="shrink-0 border-b border-zinc-200">
              <div className="w-full flex items-center justify-between px-8 py-3">
                <Link href="/sansad/hub/samvidhaan" className="flex items-center select-none">
                  <div
                    className="h-10 px-4 bg-[#1b253c] hover:bg-[#f97316] text-white rounded-xl flex items-center justify-center gap-0 hover:gap-2 transition-all overflow-hidden group/btn cursor-pointer font-bold"
                    style={{ fontFamily: "var(--font-pixeloid)" }}
                  >
                    <ArrowLeft className="w-0 h-5 opacity-0 group-hover/btn:w-5 group-hover/btn:opacity-100 transition-all" />
                    <span className="text-xs uppercase tracking-wider">Back</span>
                  </div>
                </Link>

                <div className="flex-1 text-center px-4">
                  <h1 className="text-3xl font-black uppercase text-zinc-950" style={{ fontFamily: "var(--font-questrial)" }}>
                    PREDICTIVE MAINTENANCE
                  </h1>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
                    Predicted loss if no action vs Predictive Maintenance (PdM) savings · per factory · ₹ lakh
                    {nextRefresh ? ` · next ${nextRefresh.toLocaleTimeString()}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <AnomalyTripControl />
                  <button
                    type="button"
                    onClick={() => loadGraphs()}
                    className="h-10 px-4 bg-white border border-zinc-200 hover:border-orange-400 rounded-xl flex items-center gap-2 text-xs font-bold uppercase cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            <SamvidhaanTickerStrip logos={graphTickers} className="px-8" />

            <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
              {error ? (
                <p className="text-center text-rose-600 text-sm py-24">{error}</p>
              ) : loading && !factories.length ? (
                <p className="text-center text-zinc-400 text-sm py-24 animate-pulse font-mono">
                  Loading maintenance snapshots…
                </p>
              ) : (
                <div className="max-w-6xl mx-auto flex flex-col gap-8">
                  {/* Predictive maintenance graphs — loss-if-no-action vs PdM savings per factory */}
                  <CostAnalysisPanel />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
