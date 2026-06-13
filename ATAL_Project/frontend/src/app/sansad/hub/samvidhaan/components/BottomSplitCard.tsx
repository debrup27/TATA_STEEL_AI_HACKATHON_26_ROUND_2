"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import LogoLoop from "@/animations/LogoLoop";
import type { TickerItem } from "@/services/types";

interface BottomSplitCardProps {
  href: string;
  title: string;
  description: string;
  logos: TickerItem[];
  speed?: number;
  borderClass?: string;
}

export default function BottomSplitCard({
  href,
  title,
  description,
  logos,
  speed = 18,
  borderClass = "",
}: BottomSplitCardProps) {
  return (
    <Link
      href={href}
      className={`group flex-grow flex-1 py-3 px-5 flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out bg-[#FAF9F5] hover:bg-[#75864C] hover:shadow-lg cursor-pointer min-w-0 select-none ${borderClass}`}
    >
      {/* Corner indicator details */}
      <div className="absolute top-2 left-2 font-mono text-[9px] text-[#1b253c]/20 group-hover:text-white/40 transition-colors duration-300 select-none font-black">+</div>
      <div className="absolute bottom-2 right-2 font-mono text-[9px] text-[#1b253c]/20 group-hover:text-white/40 transition-colors duration-300 select-none font-black">+</div>

      <div className="flex items-start justify-between min-w-0 leading-none">
        <h3
          className="text-2xl md:text-3xl font-black text-[#1b253c] group-hover:text-white uppercase leading-none transition-colors duration-300 tracking-tighter"
          style={{ fontFamily: "var(--font-questrial)" }}
        >
          {title}
        </h3>
      </div>

      <p
        className="text-[10px] text-zinc-400 group-hover:text-[#FAF9F5]/85 leading-snug line-clamp-1 pr-4 transition-colors duration-300 mt-1"
        style={{ fontFamily: "var(--font-questrial)" }}
      >
        {description}
      </p>

      <div className="flex-grow min-h-[12px]" />

      <div className="flex items-center justify-between gap-3 border-t border-[#1b253c]/8 group-hover:border-white/10 pt-2 shrink-0">
        <div className="overflow-hidden flex-grow min-w-0">
          <LogoLoop
            logos={logos}
            speed={speed}
            direction="left"
            logoHeight={11}
            gap={14}
            pauseOnHover
            renderItem={(item) => {
              let textStyle = "text-[#1b253c]/50 group-hover:text-white/85";
              if (item.isSeparator) {
                textStyle = "text-[#1b253c]/20 group-hover:text-white/30";
              } else if (item.text?.includes("HIGH") || item.text?.includes("ALERT") || item.text?.includes("CRITICAL") || item.text?.includes("⚠")) {
                textStyle = "text-rose-500 font-bold group-hover:text-red-200";
              } else if (item.text?.includes("ACTIVE") || item.text?.includes("NOMINAL") || item.text?.includes("SYNCED")) {
                textStyle = "text-emerald-600 font-bold group-hover:text-emerald-200";
              }
              return (
                <span
                  style={{ fontFamily: "var(--font-questrial)" }}
                  className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-[9.5px] ${textStyle}`}
                >
                  {item.text}
                </span>
              );
            }}
          />
        </div>
        <ArrowUpRight className="w-5 h-5 text-[#1b253c] group-hover:text-white transition-transform duration-300 group-hover:rotate-45 shrink-0" />
      </div>
    </Link>
  );
}
