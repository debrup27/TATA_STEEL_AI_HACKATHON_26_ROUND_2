"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import HubShell from "../components/HubShell";
import { fetchRiskAssets } from "@/services/prediction";
import type { RiskAsset } from "@/services/types";
import type { RiskLevel } from "@/services/sansadOutputs";
import { riskLevelColor } from "@/services/sansadOutputs";
import { manasAskPath } from "@/lib/manas-deep-link";
import { BarChart3, Clock, Package, ShieldAlert, MessageCircle, Loader2 } from "lucide-react";

function displayRiskLevel(a: RiskAsset): RiskLevel {
  if (a.riskLevel) return a.riskLevel;
  if (a.urgency === "CRITICAL") return "critical";
  if (a.urgency === "HIGH") return "high";
  if (a.urgency === "MEDIUM") return "medium";
  return "low";
}

export default function RiskPriorityPage() {
  const [assets, setAssets] = useState<RiskAsset[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRiskAssets()
      .then((rows) => {
        if (cancelled) return;
        setAssets(rows);
        if (rows[0]) setActiveId(rows[0].id);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load risk ranking");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const asset = assets.find((a) => a.id === activeId) ?? assets[0];
  const plantBottleneck = assets[0];

  if (loading) {
    return (
      <HubShell title="Risk & Priority" subtitle="Loading bottleneck scores…">
        <div className="flex items-center justify-center py-24 text-zinc-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-mono uppercase">Computing plant bottleneck ranking</span>
        </div>
      </HubShell>
    );
  }

  if (error || !asset || !plantBottleneck) {
    return (
      <HubShell title="Risk & Priority" subtitle="Risk classification · urgency · bottleneck">
        <div className="text-center py-24 text-zinc-500 text-sm">{error ?? "No ranked assets available."}</div>
      </HubShell>
    );
  }

  const assetLevel = displayRiskLevel(asset);

  return (
    <HubShell
      title="Risk & Priority"
      subtitle="Risk classification · urgency · bottleneck · spares & lead time"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-[#1b253c] text-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-orange-300">Plant Bottleneck #1</p>
            <h2 className="text-xl font-black uppercase mt-1" style={{ fontFamily: "var(--font-questrial)" }}>
              {plantBottleneck.name}
            </h2>
            <p className="text-sm text-white/70 mt-1">{plantBottleneck.impact}</p>
          </div>
          <div className="flex gap-6 shrink-0 items-center">
            <div className="text-center">
              <p className="text-3xl font-black text-[#f97316]">{plantBottleneck.urgencyScore ?? plantBottleneck.score}</p>
              <p className="text-[9px] uppercase font-mono text-white/50">Urgency</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black">{plantBottleneck.bottleneckRank ?? 1}</p>
              <p className="text-[9px] uppercase font-mono text-white/50">Rank</p>
            </div>
            <Link
              href={manasAskPath({
                assetId: plantBottleneck.id,
                assetName: plantBottleneck.name,
                prompt: `Why is ${plantBottleneck.name} the plant bottleneck? ${plantBottleneck.recommendation}`,
                source: "risk",
              })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase border border-white/20 hover:bg-white/10 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Ask MANAS
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-5 bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
              <h2 className="text-xs font-black uppercase text-zinc-600">Priority Stack</h2>
            </div>
            <div className="divide-y divide-zinc-100">
              {assets.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActiveId(a.id)}
                  className={`w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-zinc-50 transition-colors cursor-pointer ${
                    activeId === a.id ? "bg-orange-50/50" : ""
                  }`}
                >
                  <span className="text-lg font-black text-zinc-300 w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-800 truncate">{a.name}</p>
                    <p className="text-[10px] text-zinc-400">{a.factory ?? "—"}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${riskLevelColor(displayRiskLevel(a))}`}>
                    {displayRiskLevel(a)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 space-y-4">
            <div className="bg-white border border-zinc-200 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${riskLevelColor(assetLevel)}`}>
                    {assetLevel} risk
                  </span>
                  <h2 className="text-xl font-black text-[#1b253c] mt-2" style={{ fontFamily: "var(--font-questrial)" }}>{asset.name}</h2>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-[#f97316]">{asset.urgencyScore ?? asset.score}</p>
                  <p className="text-[9px] uppercase font-mono text-zinc-400">Urgency score</p>
                </div>
              </div>
              <p className="text-sm text-zinc-600 mt-4">{asset.impact}</p>
              <p className="text-sm font-medium text-[#4A582E] mt-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3">{asset.recommendation}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: ShieldAlert, label: "Process criticality", value: asset.processCriticality ?? "—", unit: "%" },
                { icon: Clock, label: "Delay severity", value: asset.delaySeverity ?? "—", unit: "%" },
                { icon: Package, label: "Spares", value: asset.sparesAvailable ? "In stock" : "Not available", unit: "" },
                { icon: BarChart3, label: "Procurement lead", value: asset.procurementLeadDays ?? 0, unit: "days" },
              ].map(({ icon: Icon, label, value, unit }) => (
                <div key={label} className="bg-white border border-zinc-200 rounded-xl p-4">
                  <Icon className="w-4 h-4 text-zinc-400 mb-2" />
                  <p className="text-[10px] uppercase font-bold text-zinc-400">{label}</p>
                  <p className="text-lg font-black text-zinc-800 mt-0.5">
                    {value}{unit && typeof value === "number" ? unit : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HubShell>
  );
}
