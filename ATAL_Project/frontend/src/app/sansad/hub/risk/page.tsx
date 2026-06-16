"use client";

import React, { useState, useEffect } from "react";
import HubShell from "../components/HubShell";
import { useHubManasNotify } from "../components/HubManasNotify";
import { fetchRiskAssets, fetchRiskBottleneckInsight } from "@/services/prediction";
import { usePlantSnapshot } from "@/hooks/usePlantSnapshot";
import AssetSensorPills, { AssetLiveSummary } from "../components/AssetSensorPills";
import type { RiskAsset } from "@/services/types";
import type { RiskLevel } from "@/services/sansadOutputs";
import { riskLevelColor } from "@/services/sansadOutputs";
import { BarChart3, Clock, Package, ShieldAlert, MessageCircle, Loader2 } from "lucide-react";

function displayRiskLevel(a: RiskAsset, health?: number): RiskLevel {
  let base: RiskLevel = "low";
  if (a.riskLevel) base = a.riskLevel;
  else if (a.urgency === "CRITICAL") base = "critical";
  else if (a.urgency === "HIGH") base = "high";
  else if (a.urgency === "MEDIUM") base = "medium";

  if (health == null) return base;
  if (health <= 15) return "critical";
  if (health <= 30) return base === "critical" ? "critical" : "high";
  if (health <= 45 && (base === "low" || base === "medium")) return "medium";
  return base;
}

function sparesLabel(asset: RiskAsset): string {
  if (asset.sparesStatus === "full") return "In stock";
  if (asset.sparesStatus === "partial") return "Partial stock";
  if (asset.sparesStatus === "none") return "Not available";
  return asset.sparesAvailable ? "In stock" : "Not available";
}

// MANAS insight card with pop-out modal (shared) — handles long responses that overflow inline.
import InsightPanel from "../components/ManasInsightPanel";

export default function RiskPriorityPage() {
  const { runManasCall } = useHubManasNotify();
  const [assets, setAssets] = useState<RiskAsset[]>([]);
  const { byId: diagById } = usePlantSnapshot();
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<{ angle: string; text: string; router?: string } | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightTargetId, setInsightTargetId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRiskAssets()])
      .then(([rows]) => {
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
  const liveDiag = diagById.get(asset?.id ?? "");
  const bottleneckLive = diagById.get(plantBottleneck?.id ?? "");

  const selectAsset = (id: string) => {
    setActiveId(id);
    setInsight(null);
    setInsightTargetId(null);
    setError(null);
  };

  const askManasInsight = async (target: RiskAsset) => {
    setInsightLoading(true);
    setInsight(null);
    setInsightTargetId(target.id);
    setError(null);
    const res = await runManasCall(
      `Risk insight — ${target.name}`,
      () => fetchRiskBottleneckInsight(target.id, target.bottleneckRank ?? 1),
      {
        pendingDetail: "Ranking bottleneck and drafting insight…",
        validate: (r) => Boolean(r.insight?.trim()),
        emptyDetail: "MANAS returned an empty insight — retry in a moment",
        successDetail: "Risk insight is ready below",
      },
    );
    if (res?.insight?.trim()) {
      setInsight({ angle: res.insight_angle, text: res.insight, router: res.router });
    } else if (!res) {
      setError("MANAS returned an empty insight — retry in a moment");
    }
    setInsightLoading(false);
  };

  const assetHealth = liveDiag?.health;
  const assetLevel = asset ? displayRiskLevel(asset, assetHealth) : "low";
  const plantLevel = plantBottleneck ? displayRiskLevel(plantBottleneck, bottleneckLive?.health) : "low";

  // Single stable shell rendered in every state — never swap the HubShell, so the
  // back button, header and marquees don't flicker/jump on first load. Title and
  // subtitle stay constant (no "Loading…" variant); only the body below changes.
  return (
    <HubShell
      title="Risk & Priority"
      subtitle="Risk classification · urgency · bottleneck · spares & lead time"
    >
      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-mono uppercase">Computing plant bottleneck ranking</span>
        </div>
      ) : !asset || !plantBottleneck ? (
        <div className="text-center py-24 text-zinc-500 text-sm">{error ?? "No ranked assets available."}</div>
      ) : (
      <div className="max-w-7xl mx-auto space-y-6">
        {error ? (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </div>
        ) : null}

        <div className="bg-[#1b253c] text-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-orange-300">Plant Bottleneck #1</p>
            <h2 className="text-xl font-black uppercase mt-1" style={{ fontFamily: "var(--font-questrial)" }}>
              {plantBottleneck.name}
            </h2>
            <p className="text-sm text-white/70 mt-1">{plantBottleneck.impact}</p>
            <span className={`inline-block mt-2 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${riskLevelColor(plantLevel)}`}>
              {plantLevel} risk{bottleneckLive ? ` · ${bottleneckLive.health}% health` : ""}
            </span>
          </div>
          <div className="flex gap-6 shrink-0 items-center flex-wrap">
            <div className="text-center">
              <p className="text-3xl font-black text-[#f97316]">{plantBottleneck.urgencyScore ?? plantBottleneck.score}</p>
              <p className="text-[9px] uppercase font-mono text-white/50">Urgency</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black">{plantBottleneck.bottleneckRank ?? 1}</p>
              <p className="text-[9px] uppercase font-mono text-white/50">Rank</p>
            </div>
            <button
              type="button"
              disabled={insightLoading}
              onClick={() => void askManasInsight(plantBottleneck)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase border border-white/20 hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {insightLoading && insightTargetId === plantBottleneck.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MessageCircle className="w-3.5 h-3.5" />
              )}
              Ask MANAS
            </button>
          </div>
        </div>

        {insightLoading && insightTargetId === plantBottleneck.id ? (
          <InsightPanel title="MANAS — Risk insight" loading />
        ) : insight && insightTargetId === plantBottleneck.id ? (
          <InsightPanel title={`MANAS — ${insight.angle}`} text={insight.text} />
        ) : null}

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-5 bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
              <h2 className="text-xs font-black uppercase text-zinc-600">Priority Stack</h2>
            </div>
            <div className="divide-y divide-zinc-100">
              {assets.map((a, i) => {
                const rowHealth = diagById.get(a.id)?.health;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selectAsset(a.id)}
                    className={`w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-zinc-50 transition-colors cursor-pointer ${
                      activeId === a.id ? "bg-orange-50/50" : ""
                    }`}
                  >
                    <span className="text-lg font-black text-zinc-300 w-6">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-800 truncate">{a.name}</p>
                      <p className="text-[10px] text-zinc-400">
                        {a.factory ?? "—"}
                        {rowHealth != null ? ` · ${rowHealth}% health` : ""}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${riskLevelColor(displayRiskLevel(a, rowHealth))}`}>
                      {displayRiskLevel(a, rowHealth)}
                    </span>
                  </button>
                );
              })}
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
                  {assetHealth != null ? (
                    <p className="text-[10px] font-mono text-zinc-500 mt-1">Live health: {assetHealth}%</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="text-3xl font-black text-[#f97316]">{asset.urgencyScore ?? asset.score}</p>
                    <p className="text-[9px] uppercase font-mono text-zinc-400">Urgency score</p>
                  </div>
                  <button
                    type="button"
                    disabled={insightLoading}
                    onClick={() => void askManasInsight(asset)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase border border-orange-200 text-orange-600 bg-white hover:bg-orange-50 disabled:opacity-50 cursor-pointer"
                  >
                    {insightLoading && insightTargetId === asset.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <MessageCircle className="w-3 h-3" />
                    )}
                    Ask MANAS
                  </button>
                </div>
              </div>
              <p className="text-sm text-zinc-600 mt-4">{asset.impact}</p>
              <AssetLiveSummary asset={liveDiag} />
              <p className="text-sm font-medium text-[#4A582E] mt-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3">{asset.recommendation}</p>
              <AssetSensorPills asset={liveDiag} className="mt-3" />

              {insightLoading && insightTargetId === asset.id ? (
                <InsightPanel title="MANAS — Risk insight" loading />
              ) : insight && insightTargetId === asset.id ? (
                <InsightPanel title={`MANAS — ${insight.angle}`} text={insight.text} />
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: ShieldAlert, label: "Process criticality", value: asset.processCriticality ?? 0, unit: "%" },
                { icon: Clock, label: "Delay severity", value: asset.delaySeverity ?? 0, unit: "%" },
                { icon: Package, label: "Spares", value: sparesLabel(asset), unit: "" },
                { icon: BarChart3, label: "Procurement lead", value: asset.procurementLeadDays ?? 0, unit: " days" },
              ].map(({ icon: Icon, label, value, unit }) => (
                <div key={label} className="bg-white border border-zinc-200 rounded-xl p-4">
                  <Icon className="w-4 h-4 text-zinc-400 mb-2" />
                  <p className="text-[10px] uppercase font-bold text-zinc-400">{label}</p>
                  <p className="text-lg font-black text-zinc-800 mt-0.5">
                    {value}
                    {unit && typeof value === "number" ? unit : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
    </HubShell>
  );
}
