"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";
import UserPill from "@/components/UserPill";
import VerticalMarquee from "./VerticalMarquee";
import AnomalyTripControl from "./AnomalyTripControl";
import SansadBackButton from "./SansadBackButton";

interface HubShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  backHref?: string;
  headerRight?: React.ReactNode;
}

function ManasLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/manas/chat"
      className={`group/link text-[10px] font-mono font-bold uppercase text-[#1b253c] hover:text-[#f97316] tracking-widest flex items-center gap-1 select-none whitespace-nowrap ${className}`}
    >
      Manas <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:rotate-45" />
    </Link>
  );
}

export default function HubShell({
  title,
  subtitle,
  children,
  backHref = "/sansad/hub",
  headerRight,
}: HubShellProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (isMobile) {
    return (
      <ClickSpark sparkColor="#f97316" sparkSize={8} sparkRadius={18} sparkCount={6} duration={350}
        className="min-h-screen bg-[#FAF9F5] px-4 pt-20 pb-12">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SansadBackButton href={backHref} />
            <div className="flex items-center gap-2 shrink-0">
              <AnomalyTripControl compact />
              <UserPill
                containerClassName="rounded-full p-1.5 bg-white inline-flex items-center justify-center shadow-sm w-[40px] h-[40px] group cursor-pointer relative"
                className="w-full h-full"
              />
            </div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-5">
            <h1 className="text-xl font-black uppercase text-zinc-950" style={{ fontFamily: "var(--font-pixeloid)" }}>{title}</h1>
            <p className="text-xs text-zinc-500 mt-2 font-mono uppercase tracking-wide">{subtitle}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 min-h-[200px]">
            {children}
          </div>
        </div>
      </ClickSpark>
    );
  }

  return (
    <ClickSpark sparkColor="#f97316" sparkSize={8} sparkRadius={18} sparkCount={6} duration={350}
      className="relative min-h-screen w-full bg-[#FAF9F5] overflow-hidden select-none">
      <div className="w-screen h-screen relative flex">
        <VerticalMarquee direction="up" side="left" text="SANSAD" />
        <VerticalMarquee direction="down" side="right" text="ATAL" />

        <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5]">
          <div className="shrink-0 border-b border-zinc-200 bg-[#FAF9F5] z-30">
            {/* Wide desktop — single header row */}
            <div className="hidden min-[1360px]:flex w-full items-center gap-4 px-8 py-3">
              <div className="shrink-0">
                <SansadBackButton href={backHref} />
              </div>

              <div className="flex-1 min-w-0 text-center pointer-events-none px-2">
                <h1 className="text-lg font-black uppercase text-zinc-950 truncate" style={{ fontFamily: "var(--font-pixeloid)" }}>{title}</h1>
                <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest mt-0.5 truncate">{subtitle}</p>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2">
                {headerRight}
                <AnomalyTripControl />
                <ManasLink />
                <UserPill
                  containerClassName="rounded-full p-1.5 bg-white inline-flex items-center justify-center shadow-sm w-[40px] h-[40px] group cursor-pointer relative"
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Compact desktop — title row + anomaly controls row */}
            <div className="min-[1360px]:hidden px-4 lg:px-6 py-3 space-y-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <SansadBackButton href={backHref} />
                <div className="flex-1 min-w-0 text-center pointer-events-none px-1">
                  <h1 className="text-base font-black uppercase text-zinc-950 truncate" style={{ fontFamily: "var(--font-pixeloid)" }}>{title}</h1>
                  <p className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest mt-0.5 truncate">{subtitle}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ManasLink />
                  <UserPill
                    containerClassName="rounded-full p-1.5 bg-white inline-flex items-center justify-center shadow-sm w-[40px] h-[40px] group cursor-pointer relative"
                    className="w-full h-full"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-2.5">
                {headerRight}
                <AnomalyTripControl compact />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="h-full min-h-0 flex flex-col">
              {children}
            </div>
          </div>
        </div>
      </div>
    </ClickSpark>
  );
}
