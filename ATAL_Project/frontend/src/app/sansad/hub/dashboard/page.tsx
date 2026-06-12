"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Activity, FileText, ShieldAlert } from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";

export default function SansadHubLanding() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const panels = [
    {
      href: "/sansad/hub/monitor",
      icon: Activity,
      title: "RUL Monitor",
      desc: "Equipment Remaining Useful Life predictions from live sensor telemetry.",
      color: "hover:bg-[#4A582E]",
    },
    {
      href: "/sansad/hub/historical-logs",
      icon: FileText,
      title: "Historical Logs",
      desc: "Past maintenance records, failure analyses, and SOP-driven repair history.",
      color: "hover:bg-[#4A582E]",
    },
    {
      href: "/sansad/hub/priority",
      icon: ShieldAlert,
      title: "Risk Priority",
      desc: "Criticality scoring by process impact, delay severity and spares availability.",
      color: "hover:bg-[#4A582E]",
    },
  ];

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={8}
      sparkRadius={18}
      sparkCount={6}
      duration={350}
      className="relative min-h-screen w-full bg-[#FAF9F5] flex flex-col justify-start overflow-hidden select-none"
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes marqueeDown {
            0% { transform: translateY(-50%); }
            100% { transform: translateY(0%); }
          }
          @keyframes marqueeUp {
            0% { transform: translateY(0%); }
            100% { transform: translateY(-50%); }
          }
          .animate-marquee-up {
            animation: marqueeUp 35s linear infinite;
          }
          .animate-marquee-down {
            animation: marqueeDown 35s linear infinite;
          }
          .atal-text-filled {
            font-family: var(--font-pixeloid);
            font-weight: 900;
            color: #000000;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            transform: rotate(90deg);
            display: inline-block;
          }
          .atal-text-filled:hover {
            color: #f97316;
            transform: scale(1.1) rotate(90deg);
          }
        `
      }} />

      {isMobile ? (
        <div className="flex flex-col gap-6 w-full px-6 pt-24 pb-12 select-none max-w-lg mx-auto z-10">
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-xs">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter uppercase leading-none" style={{ fontFamily: "var(--font-pixeloid)" }}>
              SANSAD<br />HUB
            </h1>
            <p className="text-[9px] text-[#f97316] mt-3 font-bold uppercase tracking-[0.2em]">
              Asset Troubleshooting Pipeline
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
            <p className="text-sm text-zinc-600">Please open this page on a desktop viewport.</p>
            <Link href="/sansad/hub" className="mt-4 block text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider">
              Back to Console
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex select-none">
          <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-r border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-up flex flex-col items-center w-full">
              {Array(6).fill("SANSAD").concat(Array(6).fill("SANSAD")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-l border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-down flex flex-col items-center w-full">
              {Array(6).fill("ATAL").concat(Array(6).fill("ATAL")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5] p-12 overflow-y-auto">
            <div className="w-full flex items-center justify-between mb-8 border-b border-zinc-200 pb-4 select-none">
              <div className="w-1/4 flex justify-start">
                <Link href="/sansad/hub" className="flex items-center select-none">
                  <div className="h-10 px-4 bg-[#1b253c] hover:bg-[#f97316] text-white rounded-xl flex items-center justify-center gap-0 hover:gap-2 transition-all duration-300 ease-out overflow-hidden group/btn cursor-pointer shadow-xs font-bold"
                    style={{ fontFamily: "var(--font-pixeloid)" }}
                  >
                    <ArrowLeft className="w-0 h-5 text-white opacity-0 transition-all duration-300 ease-out group-hover/btn:w-5 group-hover/btn:opacity-100 shrink-0" />
                    <span className="text-xs uppercase tracking-wider">Back</span>
                  </div>
                </Link>
              </div>
              <div className="flex-1 text-center">
                <h1 className="text-4xl font-black uppercase text-zinc-950 tracking-tight" style={{ fontFamily: "var(--font-questrial)" }}>
                  SANSAD HUB
                </h1>
                <span className="text-[10px] font-mono text-zinc-450 uppercase tracking-widest block mt-1">
                  Asset Troubleshooting Pipeline
                </span>
              </div>
              <div className="w-1/4" />
            </div>

            <div className="flex-1 flex gap-8 min-h-0">
              {panels.map((panel) => {
                const Icon = panel.icon;
                return (
                  <Link
                    key={panel.href}
                    href={panel.href}
                    className={`group flex-1 bg-white border border-zinc-200 rounded-3xl p-10 flex flex-col relative transition-all duration-300 ease-in-out cursor-pointer hover:scale-[1.02] hover:shadow-2xl ${panel.color}`}
                  >
                    <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white/40 transition-colors duration-300 select-none">+</div>
                    <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/35 group-hover:text-white/40 transition-colors duration-300 select-none">+</div>

                    <div className="flex-[0.6]" />
                    <Icon className="w-10 h-10 text-[#1b253c] group-hover:text-orange-400 transition-colors duration-300 mb-4" />
                    <h2 className="text-5xl font-black text-[#1b253c] group-hover:text-white uppercase leading-none transition-colors duration-300" style={{ fontFamily: "var(--font-questrial)" }}>
                      {panel.title}
                    </h2>
                    <p className="mt-4 text-sm italic text-zinc-400 group-hover:text-white/80 transition-colors duration-300 leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                      {panel.desc}
                    </p>
                    <div className="flex-[1.2]" />
                    <div className="flex justify-end">
                      <ArrowUpRight className="w-8 h-8 text-[#1b253c] group-hover:text-[#f97316] transition-all duration-300 group-hover:rotate-45" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
