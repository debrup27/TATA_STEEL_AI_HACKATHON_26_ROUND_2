"use client";

import React, { useMemo } from "react";

export interface ParetoMaintenancePoint {
  id: string;
  label: string;
  defer_fraction: number;
  pdm_savings_lakhs: number;
  predicted_loss_lakhs: number;
  failure_probability: number;
}

export interface ParetoMaintenancePayload {
  unit: string;
  x_label: string;
  y_label: string;
  points: ParetoMaintenancePoint[];
  frontier_ids: string[];
  recommended_id?: string;
  recommended_label?: string;
  summary?: string;
}

interface SamvidhaanParetoChartProps {
  data: ParetoMaintenancePayload;
}

const PAD = { left: 52, right: 16, top: 16, bottom: 44 };
const W = 420;
const H = 220;

export function SamvidhaanParetoChart({ data }: SamvidhaanParetoChartProps) {
  const { points, frontier_ids, recommended_id } = data;

  const layout = useMemo(() => {
    if (!points.length) return null;
    const xs = points.map((p) => p.pdm_savings_lakhs);
    const ys = points.map((p) => p.predicted_loss_lakhs);
    const xMin = 0;
    const xMax = Math.max(...xs, 1) * 1.12;
    const yMin = 0;
    const yMax = Math.max(...ys, 1) * 1.12;

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    const toX = (v: number) => PAD.left + (v / xMax) * plotW;
    const toY = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

    const mapped = points.map((p) => ({
      ...p,
      cx: toX(p.pdm_savings_lakhs),
      cy: toY(p.predicted_loss_lakhs),
      isFrontier: frontier_ids.includes(p.id),
      isRecommended: p.id === recommended_id,
    }));

    const frontierPts = mapped
      .filter((p) => p.isFrontier)
      .sort((a, b) => a.pdm_savings_lakhs - b.pdm_savings_lakhs);

    const frontierPath = frontierPts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.cx} ${p.cy}`)
      .join(" ");

    const xTicks = [0, xMax * 0.5, xMax].map((v) => ({ v, x: toX(v) }));
    const yTicks = [0, yMax * 0.5, yMax].map((v) => ({ v, y: toY(v) }));

    return { mapped, frontierPath, xTicks, yTicks, xMax, yMax, plotW, plotH };
  }, [points, frontier_ids, recommended_id]);

  if (!layout) {
    return (
      <div className="bg-[#FAF9F5] border border-zinc-200 rounded-2xl p-4 text-sm text-zinc-400">
        Pareto data unavailable for this asset.
      </div>
    );
  }

  return (
    <div className="bg-[#FAF9F5] border border-zinc-200/80 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div>
          <span
            className="text-[10px] font-bold uppercase tracking-widest text-[#1b253c] block"
            style={{ fontFamily: "var(--font-questrial)" }}
          >
            Pareto Maintenance Optimality
          </span>
          <span className="text-[9px] font-mono text-zinc-500 uppercase mt-0.5 block">
            PdM savings vs predicted loss if deferred · {data.unit}
          </span>
        </div>
        {data.recommended_label ? (
          <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            Knee: {data.recommended_label}
          </span>
        ) : null}
      </div>

      <div className="w-full bg-white border border-zinc-150 rounded-xl p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Pareto maintenance optimality chart">
          {/* grid */}
          {layout.yTicks.map((t) => (
            <line
              key={`yg-${t.v}`}
              x1={PAD.left}
              y1={t.y}
              x2={W - PAD.right}
              y2={t.y}
              stroke="#f1f1f1"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          ))}
          {layout.xTicks.map((t) => (
            <line
              key={`xg-${t.v}`}
              x1={t.x}
              y1={PAD.top}
              x2={t.x}
              y2={H - PAD.bottom}
              stroke="#f1f1f1"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          ))}

          {/* axes */}
          <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#d4d4d8" strokeWidth="1" />
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#d4d4d8" strokeWidth="1" />

          {/* Pareto front */}
          {layout.frontierPath ? (
            <path
              d={layout.frontierPath}
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              strokeDasharray="6,4"
              opacity={0.9}
            />
          ) : null}

          {/* points */}
          {layout.mapped.map((p) => (
            <g key={p.id}>
              <circle
                cx={p.cx}
                cy={p.cy}
                r={p.isRecommended ? 7 : p.isFrontier ? 5.5 : 4}
                fill={p.isRecommended ? "#22c55e" : p.isFrontier ? "#f97316" : "#94a3b8"}
                stroke={p.isRecommended ? "#15803d" : p.isFrontier ? "#c2410c" : "#64748b"}
                strokeWidth={p.isRecommended ? 2 : 1}
              />
              {p.isRecommended ? (
                <text x={p.cx + 10} y={p.cy - 6} fontSize="8" fill="#15803d" fontWeight="bold">
                  Optimal
                </text>
              ) : null}
            </g>
          ))}

          {/* axis labels */}
          <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="#71717a" fontFamily="monospace">
            {data.x_label} (₹L) →
          </text>
          <text
            x={12}
            y={H / 2}
            textAnchor="middle"
            fontSize="9"
            fill="#71717a"
            fontFamily="monospace"
            transform={`rotate(-90 12 ${H / 2})`}
          >
            {data.y_label} (₹L) →
          </text>

          {/* tick labels */}
          {layout.xTicks.map((t) => (
            <text key={`xl-${t.v}`} x={t.x} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="8" fill="#a1a1aa">
              {t.v.toFixed(0)}
            </text>
          ))}
          {layout.yTicks.map((t) => (
            <text key={`yl-${t.v}`} x={PAD.left - 6} y={t.y + 3} textAnchor="end" fontSize="8" fill="#a1a1aa">
              {t.v.toFixed(0)}
            </text>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-3 text-[9px] font-mono uppercase text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" /> Pareto front
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Recommended knee
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-400" /> Dominated policy
        </span>
      </div>

      <div className="text-xs text-zinc-600 leading-relaxed border-t border-zinc-200/80 pt-3 space-y-2">
        <p>
          <strong className="text-[#1b253c]">What this shows:</strong> Each dot is a maintenance timing policy
          (maintain now → run-to-failure). The{" "}
          <strong className="text-orange-600">Pareto front</strong> connects policies where you cannot raise PdM
          savings without also increasing predicted loss from deferring work.
        </p>
        <p>
          <strong className="text-[#1b253c]">Horizontal axis</strong> — estimated savings from predictive maintenance
          (avoided emergency repairs + production loss).{" "}
          <strong className="text-[#1b253c]">Vertical axis</strong> — expected loss if maintenance is deferred
          (failure probability × downtime + repair premium + spare risk).
        </p>
        <p className="text-zinc-500 font-mono text-[10px]">
          {data.summary ?? "Pick the knee point on the frontier for the best cost–risk trade-off."}
        </p>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-zinc-600">
        {points.map((p) => (
          <li
            key={p.id}
            className={`rounded-lg border px-2 py-1.5 ${
              p.id === recommended_id ? "border-emerald-200 bg-emerald-50/60" : "border-zinc-100 bg-white"
            }`}
          >
            <span className="font-bold text-[#1b253c]">{p.label}</span>
            <span className="block font-mono text-zinc-500 mt-0.5">
              Save ₹{p.pdm_savings_lakhs}L · Loss ₹{p.predicted_loss_lakhs}L · P(fail) {(p.failure_probability * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
