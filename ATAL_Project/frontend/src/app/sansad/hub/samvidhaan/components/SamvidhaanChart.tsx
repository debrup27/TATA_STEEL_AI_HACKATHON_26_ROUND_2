"use client";

import React from "react";

interface SamvidhaanChartProps {
  title: string;
  subtitle?: string;
  values: number[];
  variant?: "line" | "bar";
  stroke?: string;
  fill?: string;
  heightClass?: string;
  valueSuffix?: string;
}

export function SamvidhaanChart({
  title,
  subtitle,
  values,
  variant = "line",
  stroke = "#3b82f6",
  fill = "rgba(59, 130, 246, 0.1)",
  heightClass = "h-32",
  valueSuffix = "",
}: SamvidhaanChartProps) {
  const width = 160;
  const height = 80;
  const safe = values.length ? values : [50];
  const max = Math.max(...safe, 1);

  const points = safe.map((val, idx) => {
    const x = idx * (width / Math.max(safe.length - 1, 1));
    const y = height - (val / max) * (height - 8);
    return { x, y, val };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    `M 0 ${height} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${width} ${height} Z`;

  return (
    <div className="bg-[#FAF9F5] border border-zinc-200/80 rounded-2xl p-4 flex flex-col">
      <div className="flex justify-between items-center mb-3 gap-2">
        <span
          className="text-[10px] font-bold uppercase tracking-widest text-[#1b253c]"
          style={{ fontFamily: "var(--font-questrial)" }}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="text-[8px] font-mono text-zinc-400 bg-white border border-zinc-200 px-1.5 py-0.5 rounded text-right">
            {subtitle}
          </span>
        ) : null}
      </div>
      <div className={`w-full ${heightClass} relative bg-white border border-zinc-150/70 p-2.5 rounded-xl`}>
        <svg className="absolute inset-0 w-full h-full p-2.5" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {[20, 40, 60].map((y) => (
            <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="#f1f1f1" strokeWidth="0.5" strokeDasharray="2,2" />
          ))}
          <line x1="0" y1={height - 2} x2={width} y2={height - 2} stroke="#ccc" strokeWidth="0.5" />
          {variant === "bar"
            ? points.map((p, idx) => (
                <rect
                  key={idx}
                  x={p.x - 4}
                  y={p.y}
                  width={8}
                  height={height - p.y}
                  fill={stroke}
                  opacity={0.85}
                  rx={1}
                />
              ))
            : (
              <>
                <path d={areaPath} fill={fill} />
                <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
                {points.map((p, idx) => (
                  <circle key={idx} cx={p.x} cy={p.y} r="2" fill={stroke} />
                ))}
              </>
            )}
        </svg>
      </div>
      {valueSuffix ? (
        <span className="text-[9px] font-mono text-zinc-400 mt-2 uppercase tracking-wider">{valueSuffix}</span>
      ) : null}
    </div>
  );
}

interface SamvidhaanLabeledBarsProps {
  title: string;
  items: { label: string; value: number }[];
  barColor?: string;
}

export function SamvidhaanLabeledBars({
  title,
  items,
  barColor = "#75864C",
}: SamvidhaanLabeledBarsProps) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="bg-[#FAF9F5] border border-zinc-200/80 rounded-2xl p-4">
      <span
        className="text-[10px] font-bold uppercase tracking-widest text-[#1b253c] block mb-3"
        style={{ fontFamily: "var(--font-questrial)" }}
      >
        {title}
      </span>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-2 bg-white border border-zinc-150 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(item.value / max) * 100}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
