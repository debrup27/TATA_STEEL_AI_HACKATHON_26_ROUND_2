"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import LogoLoop from "../../../../animations/LogoLoop";

import { TickerItem } from "@/services/types";

interface FactoryCardProps {
  href: string;
  title: React.ReactNode;
  description: string;
  logos: TickerItem[];
  speed: number;
  heightClass: string;
  borderClass?: string;
  isSamvidhaan?: boolean;
}

export default function FactoryCard({
  href,
  title,
  description,
  logos,
  speed,
  heightClass,
  borderClass = "",
  isSamvidhaan = false,
}: FactoryCardProps) {
  const [hovered, setHovered] = useState(false);

  // Layout styles
  const baseCardClass = `group p-8 flex flex-col relative transition-all duration-300 ease-in-out cursor-pointer ${heightClass} ${borderClass}`;
  
  const hoverClass = isSamvidhaan
    ? hovered 
      ? "bg-[#FAF6EE] text-[#1b253c] border-transparent scale-[1.01] z-20 shadow-2xl origin-bottom-left" 
      : "bg-transparent text-[#1b253c] border-zinc-200"
    : "hover:bg-[#FAF6EE] hover:scale-[1.01] hover:z-10 hover:shadow-2xl text-[#1b253c]";

  const descColorClass = isSamvidhaan
    ? hovered ? "text-zinc-500" : "text-zinc-400"
    : "text-zinc-400 group-hover:text-zinc-500";

  const indicatorColorClass = isSamvidhaan
    ? hovered ? "text-[#1b253c]/60" : "text-[#1b253c]/35"
    : "text-[#1b253c]/35 group-hover:text-[#1b253c]/60";

  return (
    <Link 
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${baseCardClass} ${hoverClass}`}
    >
      <div className={`absolute top-2.5 left-2.5 font-mono text-[9px] transition-colors duration-300 select-none ${indicatorColorClass}`}>+</div>
      <div className={`absolute bottom-2.5 right-2.5 font-mono text-[9px] transition-colors duration-300 select-none ${indicatorColorClass}`}>+</div>

      <div className="flex-[0.4]" />

      <h2 
        className="text-5xl font-black uppercase leading-none transition-colors duration-300" 
        style={{ fontFamily: "var(--font-questrial)", color: "#1b253c" }}
      >
        {title}
      </h2>

      <p 
        className={`mt-5 text-sm italic leading-snug transition-colors duration-300 ${descColorClass}`} 
        style={{ fontFamily: "var(--font-questrial)" }}
      >
        {description}
      </p>

      <div className="flex-[2]" />

      <div className="flex flex-col gap-2">
        <div className="overflow-hidden border-t border-[#1b253c]/8 transition-colors duration-300 pt-2">
          <LogoLoop
            logos={logos}
            speed={speed}
            direction="left"
            logoHeight={16}
            gap={20}
            pauseOnHover
            renderItem={(item) => {
              let textStyle = "text-[#1b253c]/50 group-hover:text-[#1b253c]/85";
              if (item.isSeparator) {
                textStyle = isSamvidhaan
                  ? hovered ? "text-[#1b253c]/30" : "text-[#1b253c]/20"
                  : "text-[#1b253c]/20 group-hover:text-[#1b253c]/30";
              } else if (item.text?.includes("CRITICAL") || item.text?.includes("WARN")) {
                textStyle = "text-rose-500 group-hover:text-rose-600 font-bold";
              } else if (item.text?.includes("ACTIVE") || item.text?.includes("LIVE")) {
                textStyle = "text-emerald-600 font-bold";
              } else if (isSamvidhaan) {
                textStyle = hovered ? "text-[#1b253c]/80" : "text-[#1b253c]/50";
              }

              return (
                <span
                  style={{ fontFamily: "var(--font-questrial)" }}
                  className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-sm ${textStyle}`}
                >
                  {item.text}
                </span>
              );
            }}
          />
        </div>
        <div className="flex justify-end">
          <ArrowUpRight 
            className={`w-7 h-7 transition-all duration-300 ${
              isSamvidhaan
                ? hovered ? "text-[#f97316] rotate-45" : "text-[#1b253c]"
                : "text-[#1b253c] group-hover:text-[#f97316] group-hover:rotate-45"
            }`} 
          />
        </div>
      </div>
    </Link>
  );
}
