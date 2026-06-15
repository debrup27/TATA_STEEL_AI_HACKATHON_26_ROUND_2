"use client";

import type { FactoryKpiRow } from "@/lib/factory-display";

function kpiAccentClass(accent?: string) {
  if (accent === "rose") return "bg-rose-50 border-rose-100";
  if (accent === "amber") return "bg-amber-50 border-amber-100";
  if (accent === "emerald") return "bg-emerald-50 border-emerald-100";
  return "bg-zinc-50 border-zinc-100";
}

export default function FactoryPreviewKpiList({
  kpis,
  kpiReady,
  loadingText,
  emptyText,
}: {
  kpis: FactoryKpiRow[];
  kpiReady: boolean;
  loadingText: string;
  emptyText: string;
}) {
  if (kpis.length === 0) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center px-2">
        <p className="text-[11px] text-zinc-400 font-mono uppercase text-center">
          {kpiReady ? emptyText : loadingText}
        </p>
      </div>
    );
  }

  const valueSize = kpis.length >= 4 ? "text-[26px]" : "text-[30px]";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`flex min-h-0 flex-1 flex-col justify-center rounded-xl border px-3.5 py-1 ${kpiAccentClass(kpi.accent)}`}
        >
          <span className="mb-0.5 line-clamp-1 text-[9px] font-mono font-semibold uppercase tracking-widest text-zinc-400">
            {kpi.label}
          </span>
          <div className="flex items-end gap-1.5">
            <span className={`font-mono font-extrabold leading-none text-[#1b253c] ${valueSize}`}>
              {kpi.value}
            </span>
            {kpi.unit ? (
              <span className="mb-0.5 text-[12px] font-mono font-bold text-zinc-400">{kpi.unit}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
