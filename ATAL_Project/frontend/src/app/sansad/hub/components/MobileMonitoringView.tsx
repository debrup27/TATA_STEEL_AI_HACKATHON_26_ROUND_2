"use client";

import React from "react";
import Link from "next/link";
import AnomalyTripControl from "./AnomalyTripControl";
import { FACTORY_DESCRIPTIONS, horizonKpis, zephyrKpis } from "@/lib/factory-display";
import type { DiagnosticAsset } from "@/services/sansadOutputs";

interface MobileMonitoringViewProps {
  assets: DiagnosticAsset[];
}

export default function MobileMonitoringView({ assets }: MobileMonitoringViewProps) {
  const f1 = horizonKpis(assets);
  const f2 = zephyrKpis(assets);

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
          Live plant telemetry — Horizon &amp; Zephyr
        </p>
      </div>

      <div className="bg-[#FAF6EE] border border-zinc-200 p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">Horizon Foundry</span>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-zinc-800 uppercase mb-1">Hot Rolling Line</h3>
        <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">{FACTORY_DESCRIPTIONS.horizon}</p>
        <div className="space-y-1.5 text-xs font-mono text-zinc-700">
          {f1.map((k) => (
            <div key={k.label}>
              {k.label}: {k.value}
              {k.unit ? ` ${k.unit}` : ""}
            </div>
          ))}
        </div>
        <Link href="/sansad/hub/horizon-foundry" className="block mt-4 text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase">
          Open Horizon Pipeline
        </Link>
      </div>

      <div className="bg-[#FAF6EE] border border-zinc-200 p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">Zephyr Sinter</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-zinc-800 uppercase mb-1">Cold Rolling &amp; Coating</h3>
        <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">{FACTORY_DESCRIPTIONS.zephyr}</p>
        <div className="space-y-1.5 text-xs font-mono text-zinc-700">
          {f2.map((k) => (
            <div key={k.label}>
              {k.label}: {k.value}
              {k.unit ? ` ${k.unit}` : ""}
            </div>
          ))}
        </div>
        <Link href="/sansad/hub/zephyr-sinter" className="block mt-4 text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase">
          Open Zephyr Pipeline
        </Link>
      </div>
    </div>
  );
}
