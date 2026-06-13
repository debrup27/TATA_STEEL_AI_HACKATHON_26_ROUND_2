"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import LogoLoop from "../../../../animations/LogoLoop";

import { TickerItem } from "@/services/types";

interface SubPanelCardProps {
  href: string;
  title: string;
  description: string;
  logos: TickerItem[];
  borderClass?: string;
  speed?: number;
}

export default function SubPanelCard({
  href,
  title,
  description,
  logos,
  borderClass = "",
  speed = 22,
}: SubPanelCardProps) {
  return (
    <Link 
      href={href} 
      className={`group flex-1 py-6 px-8 flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out hover:bg-[#4A582E] hover:scale-[1.01] hover:z-10 hover:shadow-2xl cursor-pointer ${borderClass}`}
    >
      <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white/40 transition-colors duration-300 select-none">+</div>
      <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white/40 transition-colors duration-300 select-none">+</div>

      <div className="flex-[0.2]" />
      
      <h3 
        className="text-3xl font-black text-[#1b253c] group-hover:text-white uppercase leading-none transition-colors duration-300" 
        style={{ fontFamily: "var(--font-questrial)" }}
      >
        {title}
      </h3>
      
      <p 
        className="mt-2 text-sm italic text-zinc-400 group-hover:text-white/80 transition-colors duration-300 leading-snug" 
        style={{ fontFamily: "var(--font-questrial)" }}
      >
        {description}
      </p>
      
      <div className="flex-[1.5]" />
      
      <div className="flex items-center justify-between gap-4 border-t border-[#1b253c]/8 group-hover:border-transparent transition-colors duration-300 pt-2">
        <div className="overflow-hidden flex-1">
          <LogoLoop
            logos={logos}
            speed={speed}
            direction="left"
            logoHeight={14}
            gap={18}
            pauseOnHover
            renderItem={(item) => {
              let textStyle = "text-[#1b253c]/55 group-hover:text-white";
              if (item.isSeparator) {
                textStyle = "text-[#1b253c]/20 group-hover:text-white/30";
              } else if (item.text?.includes("CRITICAL")) {
                // If it is RUL / Abpred critical
                textStyle = "text-rose-500 group-hover:text-rose-450 font-bold";
              } else if (item.text?.includes("HIGH")) {
                textStyle = "text-orange-500 group-hover:text-orange-400 font-semibold";
              } else if (item.text?.includes("WARN")) {
                textStyle = "text-amber-500 group-hover:text-amber-455 font-semibold";
              } else if (item.text?.includes("MEDIUM")) {
                textStyle = "text-amber-500 group-hover:text-amber-300";
              } else if (item.text?.includes("OK") || item.text?.includes("LOW") || item.text?.includes("DAYS")) {
                // RUL/Abpred OK statuses or remaining days
                textStyle = "text-emerald-600 group-hover:text-emerald-300 font-bold";
              }

              return (
                <span
                  style={{ fontFamily: "var(--font-questrial)" }}
                  className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-xs ${textStyle}`}
                >
                  {item.text}
                </span>
              );
            }}
          />
        </div>
        <ArrowUpRight className="w-6 h-6 text-[#1b253c] group-hover:text-[#f97316] transition-transform duration-300 group-hover:rotate-45 shrink-0" />
      </div>
    </Link>
  );
}
