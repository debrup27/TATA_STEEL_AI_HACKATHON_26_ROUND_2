"use client";

import React from "react";

export interface MaintenanceAssetRow {
  asset_id: string;
  asset_name: string;
  asset_type: string;
  criticality_level: string;
  health_score: number;
  rul_hours: number;
  rul_days: number;
  rul_max_hours: number;
  rul_band: "urgent" | "soon" | "ok";
  risk_level: string;
  urgency_score: number;
  anomaly_score?: number;
  spares_availability?: number;
  action_label: string;
  plain_explanation: string;
}

export interface FactoryMaintenanceSnapshot {
  factory_id: string;
  factory_name: string;
  factory_code: string;
  factory_label: string;
  plant_health_score: number;
  avg_rul_hours: number;
  assets_needing_attention: number;
  assets: MaintenanceAssetRow[];
  layman_summary?: string;
}

function healthColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function rulColor(band: string): string {
  if (band === "urgent") return "bg-rose-500";
  if (band === "soon") return "bg-amber-500";
  return "bg-emerald-500";
}

function riskBadgeClass(risk: string): string {
  switch (risk) {
    case "critical":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium":
      return "bg-amber-50 text-amber-800 border-amber-200";
    default:
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
}

function Bar({
  value,
  max,
  colorClass,
  label,
}: {
  value: number;
  max: number;
  colorClass: string;
  label: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex justify-between text-[9px] font-mono uppercase text-zinc-500">
        <span>{label}</span>
        <span>{Math.round(value)}{label === "Health" ? "%" : " h"}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SamvidhaanMaintenanceSnapshot({ data }: { data: FactoryMaintenanceSnapshot }) {
  const maxRul = data.assets[0]?.rul_max_hours ?? 300;

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 flex flex-col gap-5">
      <div className="flex flex-wrap justify-between gap-4 border-b border-zinc-100 pb-4">
        <div>
          <p className="text-[10px] font-mono text-orange-500 uppercase tracking-widest">{data.factory_label}</p>
          <h3 className="text-xl font-black text-[#1b253c] uppercase" style={{ fontFamily: "var(--font-questrial)" }}>
            {data.factory_name}
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1 font-mono">
            Plant health {data.plant_health_score}% · avg {data.avg_rul_hours} h remaining
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl border ${
              data.assets_needing_attention > 0
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}
          >
            {data.assets_needing_attention > 0
              ? `${data.assets_needing_attention} need attention`
              : "All clear"}
          </span>
          <span className="text-[9px] font-mono text-zinc-400">worst assets listed first</span>
        </div>
      </div>

      <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3 text-sm text-zinc-700">
        <strong className="text-[#1b253c]">In plain English:</strong> {data.layman_summary}
      </div>

      <div className="space-y-4">
        {data.assets.map((asset) => (
          <div
            key={asset.asset_id}
            className="rounded-2xl border border-zinc-100 bg-[#FAF9F5] p-4 grid gap-3 lg:grid-cols-[1fr_200px_200px_auto]"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-[#1b253c] text-sm truncate">{asset.asset_name}</h4>
                <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border border-zinc-200 text-zinc-500">
                  {asset.criticality_level}
                </span>
                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${riskBadgeClass(asset.risk_level)}`}>
                  {asset.risk_level} risk
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{asset.plain_explanation}</p>
              <p className="text-[10px] font-mono text-orange-600 mt-1 uppercase font-bold">
                → {asset.action_label}
              </p>
            </div>

            <Bar value={asset.health_score} max={100} colorClass={healthColor(asset.health_score)} label="Health" />
            <Bar value={asset.rul_hours} max={maxRul} colorClass={rulColor(asset.rul_band)} label="Life left" />

            <div className="flex flex-col justify-center text-[9px] font-mono text-zinc-500 gap-1 lg:text-right">
              <span>{Math.round(asset.rul_hours)} h left</span>
              {asset.spares_availability != null ? (
                <span>Spares {Math.round(asset.spares_availability * 100)}%</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-[9px] font-mono uppercase text-zinc-500 border-t border-zinc-100 pt-3">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Healthy / plenty of time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500" /> Plan maintenance soon
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-rose-500" /> Urgent — act now
        </span>
      </div>
    </div>
  );
}
