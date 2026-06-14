"use client";

import React from "react";
import Link from "next/link";
import AnomalyTripControl from "./AnomalyTripControl";

interface MobileMonitoringViewProps {
  exhausterVibration: number;
  exhausterHealth: number;
  sinterFeO: number;
  strandSpeed: number;
}

export default function MobileMonitoringView({
  exhausterVibration,
  exhausterHealth,
  sinterFeO,
  strandSpeed,
}: MobileMonitoringViewProps) {
  return (
    <div className="flex flex-col gap-4 w-full px-4 pt-20 pb-12 select-none max-w-lg mx-auto z-10">
      <div className="flex items-center justify-end gap-2">
        <AnomalyTripControl />
      </div>
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
          Open Pipeline Viewer
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
          Open Pipeline Viewer
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
  );
}
