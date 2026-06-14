"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import LogoLoop from "@/animations/LogoLoop";
import type { TickerItem } from "@/services/types";

interface OutputPillarCardProps {
  href: string;
  section: string;
  title: string;
  subtitle: string;
  description: string;
  deliverables: string[];
  logos: TickerItem[];
  accentClass?: string;
  borderClass?: string;
  compact?: boolean;
}

export default function OutputPillarCard({
  href,
  section,
  title,
  subtitle,
  description,
  deliverables,
  logos,
  accentClass = "from-zinc-500/5 to-zinc-500/0",
  borderClass = "hover:border-[#4A582E]",
  compact = false,
}: OutputPillarCardProps) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br ${accentClass} transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:z-10 ${borderClass} ${compact ? "p-5 min-h-[200px]" : "p-6 min-h-[240px]"}`}
    >
      <div className="absolute top-2 left-2 font-mono text-[8px] text-zinc-400 group-hover:text-zinc-600">+</div>
      <div className="absolute bottom-2 right-2 font-mono text-[8px] text-zinc-400 group-hover:text-zinc-600">+</div>

      <span className="text-[9px] font-mono font-bold text-[#f97316] uppercase tracking-widest">{section}</span>
      <h3 className={`font-black text-[#1b253c] uppercase leading-tight mt-1 group-hover:text-[#4A582E] transition-colors ${compact ? "text-xl" : "text-2xl"}`} style={{ fontFamily: "var(--font-questrial)" }}>
        {title}
      </h3>
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mt-0.5">{subtitle}</p>
      <p className="text-xs text-zinc-500 mt-2 leading-relaxed line-clamp-2" style={{ fontFamily: "var(--font-questrial)" }}>
        {description}
      </p>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {deliverables.map((d) => (
          <li key={d} className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/80 border border-zinc-200 text-zinc-600">
            {d}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-3 border-t border-zinc-200/80 flex items-center justify-between gap-2">
        <div className="overflow-hidden flex-1 min-w-0">
          <LogoLoop
            logos={logos}
            speed={20}
            direction="left"
            logoHeight={12}
            gap={16}
            pauseOnHover
            renderItem={(item) => (
              <span className={`text-[10px] uppercase tracking-wide whitespace-nowrap ${item.isSeparator ? "text-zinc-300" : "text-zinc-500 group-hover:text-zinc-700"}`}>
                {item.text}
              </span>
            )}
          />
        </div>
        <ArrowUpRight className="w-5 h-5 text-zinc-400 group-hover:text-[#f97316] group-hover:rotate-45 transition-all shrink-0" />
      </div>
    </Link>
  );
}
