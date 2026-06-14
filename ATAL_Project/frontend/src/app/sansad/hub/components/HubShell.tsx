"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";
import UserPill from "@/components/UserPill";
import VerticalMarquee from "./VerticalMarquee";

interface HubShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  backHref?: string;
  headerRight?: React.ReactNode;
}

function BackButton({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center select-none">
      <div
        className="h-10 px-4 bg-[#1b253c] hover:bg-[#f97316] text-white rounded-xl flex items-center justify-center gap-0 hover:gap-2 transition-all duration-300 ease-out overflow-hidden group/btn cursor-pointer shadow-xs font-bold"
        style={{ fontFamily: "var(--font-pixeloid)" }}
      >
        <ArrowLeft className="w-0 h-5 text-white opacity-0 transition-all duration-300 ease-out group-hover/btn:w-5 group-hover/btn:opacity-100 shrink-0" />
        <span className="text-xs uppercase tracking-wider">Back</span>
      </div>
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
        className="min-h-screen bg-[#FAF9F5] px-6 pt-24 pb-12">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3">
            <BackButton href={backHref} />
            <UserPill
              containerClassName="rounded-full p-1.5 bg-white inline-flex items-center justify-center shadow-sm w-[40px] h-[40px] group cursor-pointer relative"
              className="w-full h-full"
            />
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <h1 className="text-2xl font-black uppercase text-zinc-950" style={{ fontFamily: "var(--font-pixeloid)" }}>{title}</h1>
            <p className="text-xs text-zinc-500 mt-2 font-mono uppercase tracking-wide">{subtitle}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 text-sm text-zinc-600">
            Open on desktop (≥1024px) for the full SANSAD output console.
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
          <div className="h-16 border-b border-zinc-200 flex items-center justify-between px-8 shrink-0">
            <div className="w-1/4 flex justify-start">
              <BackButton href={backHref} />
            </div>

            <div className="flex-1 text-center min-w-0 px-4">
              <h1 className="text-xl font-black uppercase text-zinc-950 truncate" style={{ fontFamily: "var(--font-pixeloid)" }}>{title}</h1>
              <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest mt-0.5">{subtitle}</p>
            </div>

            <div className="w-1/4 flex justify-end items-center gap-4">
              {headerRight}
              <Link href="/manas/chat" className="group/link text-[10px] font-mono font-bold uppercase text-[#1b253c] hover:text-[#f97316] tracking-widest flex items-center gap-1 select-none">
                Manas Chat <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:rotate-45" />
              </Link>
              <UserPill
                containerClassName="rounded-full p-1.5 bg-white inline-flex items-center justify-center shadow-sm w-[40px] h-[40px] group cursor-pointer relative"
                className="w-full h-full"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="h-full min-h-0 flex flex-col">
              {children}
            </div>
          </div>
        </div>
      </div>
    </ClickSpark>
  );
}
