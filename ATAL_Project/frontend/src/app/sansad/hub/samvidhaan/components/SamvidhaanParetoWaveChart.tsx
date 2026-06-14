"use client";

import React, { useMemo } from "react";

export interface ParetoWavePoint {
  id: string;
  label: string;
  defer_fraction: number;
  pdm_savings_lakhs: number;
  predicted_loss_lakhs: number;
  failure_probability?: number;
  avg_rul_days?: number;
}

export interface FactoryParetoWavePayload {
  factory_id: string;
  factory_name: string;
  factory_code: string;
  factory_label: string;
  unit: string;
  x_label: string;
  y_label: string;
  wave_points: ParetoWavePoint[];
  frontier_ids: string[];
  recommended_id?: string;
  recommended_label?: string;
  region_safe_ids?: string[];
  region_risk_ids?: string[];
  avg_plant_rul_days?: number;
  layman_summary?: string;
  summary?: string;
}

const PAD = { left: 58, right: 20, top: 22, bottom: 48 };
const W = 520;
const H = 280;

function smoothPath(pts: { cx: number; cy: number }[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M ${pts[0].cx} ${pts[0].cy} L ${pts[1].cx} ${pts[1].cy}`;
  let d = `M ${pts[0].cx} ${pts[0].cy}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.cx + curr.cx) / 2;
    d += ` Q ${cpx} ${prev.cy} ${curr.cx} ${curr.cy}`;
  }
  return d;
}

export function SamvidhaanParetoWaveChart({ data }: { data: FactoryParetoWavePayload }) {
  const layout = useMemo(() => {
    const pts = data.wave_points ?? [];
    if (!pts.length) return null;

    const xs = pts.map((p) => p.pdm_savings_lakhs);
    const ys = pts.map((p) => p.predicted_loss_lakhs);
    const xMax = Math.max(...xs, 1) * 1.15;
    const yMax = Math.max(...ys, 1) * 1.15;
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    const toX = (v: number) => PAD.left + (v / xMax) * plotW;
    const toY = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

    const mapped = pts.map((p) => ({
      ...p,
      cx: toX(p.pdm_savings_lakhs),
      cy: toY(p.predicted_loss_lakhs),
      isFrontier: data.frontier_ids.includes(p.id),
      isRecommended: p.id === data.recommended_id,
      isSafe: data.region_safe_ids?.includes(p.id),
      isRisk: data.region_risk_ids?.includes(p.id),
    }));

    const wavePath = smoothPath(mapped);
    const frontierPts = mapped.filter((p) => p.isFrontier).sort((a, b) => a.cx - b.cx);
    const frontierPath = smoothPath(frontierPts);

    const rec = mapped.find((p) => p.isRecommended);
    const recX = rec?.cx ?? PAD.left + plotW * 0.4;

    const safeFill =
      `M ${PAD.left} ${PAD.top + plotH} ` +
      mapped
        .filter((p) => (p.defer_fraction ?? 0) <= (rec?.defer_fraction ?? 0.5))
        .map((p) => `L ${p.cx} ${p.cy}`)
        .join(" ") +
      ` L ${recX} ${PAD.top + plotH} Z`;

    const riskFill =
      `M ${recX} ${PAD.top + plotH} ` +
      mapped
        .filter((p) => (p.defer_fraction ?? 0) >= (rec?.defer_fraction ?? 0.5))
        .map((p) => `L ${p.cx} ${p.cy}`)
        .join(" ") +
      ` L ${PAD.left + plotW} ${PAD.top} L ${PAD.left + plotW} ${PAD.top + plotH} Z`;

    return {
      mapped,
      wavePath,
      frontierPath,
      safeFill,
      riskFill,
      recX,
      xMax,
      yMax,
      toX,
      toY,
      plotH,
    };
  }, [data]);

  if (!layout) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-[#FAF9F5] p-6 text-sm text-zinc-400">
        Pareto wave unavailable.
      </div>
    );
  }

  const keyLabels = layout.mapped.filter(
    (_, i) => i % 8 === 0 || layout.mapped[i].isRecommended,
  );

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 flex flex-col gap-4">
      <div className="flex flex-wrap justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <p className="text-[10px] font-mono text-orange-500 uppercase tracking-widest">{data.factory_label}</p>
          <h3 className="text-xl font-black text-[#1b253c] uppercase" style={{ fontFamily: "var(--font-questrial)" }}>
            {data.factory_name}
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1 font-mono">
            Avg remaining life · {data.avg_plant_rul_days ?? "—"} days across line
          </p>
        </div>
        {data.recommended_label ? (
          <span className="self-start text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            Sweet spot: {data.recommended_label}
          </span>
        ) : null}
      </div>

      <div className="bg-[#FAF9F5] border border-zinc-200 rounded-2xl p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Pareto wave for ${data.factory_name}`}>
          {/* covered regions */}
          <path d={layout.safeFill} fill="rgba(34, 197, 94, 0.18)" stroke="none" />
          <path d={layout.riskFill} fill="rgba(239, 68, 68, 0.12)" stroke="none" />

          {/* grid */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={`yg-${f}`}
              x1={PAD.left}
              y1={PAD.top + layout.plotH * (1 - f)}
              x2={W - PAD.right}
              y2={PAD.top + layout.plotH * (1 - f)}
              stroke="#e4e4e7"
              strokeDasharray="4,4"
            />
          ))}

          {/* axes */}
          <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#a1a1aa" />
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#a1a1aa" />

          {/* full wave */}
          <path d={layout.wavePath} fill="none" stroke="#fdba74" strokeWidth="2" opacity={0.5} />

          {/* pareto frontier wave */}
          {layout.frontierPath ? (
            <path d={layout.frontierPath} fill="none" stroke="#f97316" strokeWidth="2.5" />
          ) : null}

          {/* knee divider */}
          <line
            x1={layout.recX}
            y1={PAD.top}
            x2={layout.recX}
            y2={H - PAD.bottom}
            stroke="#22c55e"
            strokeWidth="1"
            strokeDasharray="5,4"
            opacity={0.6}
          />

          {/* points */}
          {layout.mapped.map((p) => (
            <g key={p.id}>
              <circle
                cx={p.cx}
                cy={p.cy}
                r={p.isRecommended ? 7 : 4}
                fill={p.isRecommended ? "#22c55e" : p.isFrontier ? "#f97316" : "#94a3b8"}
                stroke={p.isRecommended ? "#15803d" : "#fff"}
                strokeWidth={p.isRecommended ? 2 : 1}
              />
            </g>
          ))}

          <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#52525b" fontFamily="monospace">
            {data.x_label} (₹ lakhs) →
          </text>
          <text
            x={14}
            y={H / 2}
            textAnchor="middle"
            fontSize="10"
            fill="#52525b"
            fontFamily="monospace"
            transform={`rotate(-90 14 ${H / 2})`}
          >
            {data.y_label} (₹ lakhs) →
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 text-[9px] font-mono uppercase text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-400/40 border border-emerald-300" /> Green = fix early (safe)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-400/25 border border-red-200" /> Red = wait too long (costly)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-orange-500 inline-block" /> Best balance line
        </span>
      </div>

      <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4 text-sm text-zinc-700 leading-relaxed space-y-2">
        <p>
          <strong className="text-[#1b253c]">In plain English:</strong> Each dot is a “when should we fix it?” choice.
          The orange wave is the best trade-off line — you cannot get more savings without accepting more loss.
        </p>
        <p>
          <strong className="text-emerald-700">Green area</strong> — maintain on time: you save money and avoid big breakdown bills.
          {" "}
          <strong className="text-red-600">Red area</strong> — delay too long: breakdown risk and lost production dominate.
        </p>
        <p className="text-zinc-500 text-xs font-mono">{data.layman_summary ?? data.summary}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {keyLabels.map((p) => (
          <div
            key={p.id}
            className={`rounded-lg border px-2 py-1.5 text-[10px] ${
              p.isRecommended ? "border-emerald-200 bg-emerald-50" : "border-zinc-100 bg-white"
            }`}
          >
            <span className="font-bold text-[#1b253c]">{p.label}</span>
            <span className="block font-mono text-zinc-500 mt-0.5">
              Save ₹{p.pdm_savings_lakhs}L · Risk ₹{p.predicted_loss_lakhs}L
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
