"use client";

import React from "react";
import type { FactoryCostAnalysis } from "@/services/costAnalysis";

const W = 520;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 44, left: 48 };

function lakh(n: number): string {
  return `₹${n.toFixed(1)}L`;
}

export default function PredictiveCostChart({ factories }: { factories: FactoryCostAnalysis[] }) {
  if (factories.length === 0) return null;

  const maxVal = Math.max(
    1,
    ...factories.flatMap((f) => [f.predicted_loss_lakhs, f.pdm_savings_lakhs]),
  );
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const groupW = chartW / factories.length;
  const barW = Math.min(36, groupW / 3);

  const y = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-black uppercase text-[#1b253c] tracking-wide"
          style={{ fontFamily: "var(--font-questrial)" }}
        >
          F1 vs F2 — Predictive Cost Analysis
        </h3>
        <div className="flex flex-col items-end gap-1 text-[9px] font-mono uppercase text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Loss if no action
          </span>
          <span className="flex items-center gap-1.5 text-right normal-case">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
            <span>
              Predictive Maintenance <span className="uppercase">(PdM)</span> savings
            </span>
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="F1 and F2 predictive cost comparison: loss if no action versus predictive maintenance savings"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yy = PAD.top + chartH * (1 - t);
          const val = maxVal * t;
          return (
            <g key={t}>
              <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="#e4e4e7" strokeWidth={1} />
              <text x={PAD.left - 6} y={yy + 3} textAnchor="end" className="fill-zinc-400 text-[8px] font-mono">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}
        {factories.map((f, i) => {
          const cx = PAD.left + groupW * i + groupW / 2;
          const lossH = f.predicted_loss_lakhs;
          const saveH = f.pdm_savings_lakhs;
          const lossX = cx - barW - 4;
          const saveX = cx + 4;
          const lossY = y(lossH);
          const saveY = y(saveH);
          return (
            <g key={f.factory_id}>
              <rect
                x={lossX}
                y={lossY}
                width={barW}
                height={PAD.top + chartH - lossY}
                rx={4}
                className="fill-rose-500"
              />
              <rect
                x={saveX}
                y={saveY}
                width={barW}
                height={PAD.top + chartH - saveY}
                rx={4}
                className="fill-emerald-500"
              />
              <text x={cx} y={H - 22} textAnchor="middle" className="fill-zinc-800 text-[9px] font-bold">
                {f.factory_label}
              </text>
              <text x={cx} y={H - 10} textAnchor="middle" className="fill-zinc-400 text-[8px] font-mono">
                {f.factory}
              </text>
              <text x={lossX + barW / 2} y={lossY - 4} textAnchor="middle" className="fill-rose-600 text-[7px] font-mono">
                {lakh(lossH)}
              </text>
              <text x={saveX + barW / 2} y={saveY - 4} textAnchor="middle" className="fill-emerald-600 text-[7px] font-mono">
                {lakh(saveH)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
