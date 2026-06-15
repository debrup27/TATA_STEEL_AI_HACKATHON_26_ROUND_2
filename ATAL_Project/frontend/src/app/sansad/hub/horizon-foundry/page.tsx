"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SansadBackButton from "../components/SansadBackButton";
import ClickSpark from "@/animations/ClickSpark";
import NodeWorkflow from "@/components/NodeWorkflow";
import AnomalyTripControl from "../components/AnomalyTripControl";

export default function HorizonFoundryPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={8}
      sparkRadius={18}
      sparkCount={6}
      duration={350}
      className="relative min-h-screen w-full bg-[#FAF9F5] flex flex-col justify-start overflow-hidden select-none"
    >


      {isMobile ? (
        <div className="flex flex-col gap-4 w-full px-4 pt-20 pb-12 select-none max-w-lg mx-auto z-10">
          <div className="flex justify-end">
            <AnomalyTripControl />
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-xs">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter uppercase leading-none" style={{ fontFamily: "var(--font-pixeloid)" }}>
              SANSAD<br />MONITORING
            </h1>
            <p className="text-[9px] text-[#f97316] mt-3 font-bold uppercase tracking-[0.2em]">
              Horizon Foundry // Pipeline Viewer
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
            <p className="text-sm text-zinc-600">Please open this page on a desktop viewport to view the pipeline.</p>
            <Link href="/sansad/hub" className="mt-4 block text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider">
              Back to Console
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex select-none">
          {/* Left Gutter Vertical Marquee (8vw width) */}
          <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-r border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-up flex flex-col items-center w-full">
              {Array(6).fill("SANSAD").concat(Array(6).fill("SANSAD")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Gutter Vertical Marquee (8vw width) */}
          <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-l border-zinc-200 bg-[#FAF9F5]">
            <div className="animate-marquee-down flex flex-col items-center w-full">
              {Array(6).fill("ATAL").concat(Array(6).fill("ATAL")).map((text, idx) => (
                <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
                  <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Centered partitioned area spanning exactly 84vw */}
          <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5] min-h-0">
            <div className="w-full shrink-0 border-b border-zinc-200 select-none">
              <div className="w-full flex items-center justify-between px-8 py-3">
              {/* Left Side: Back Button */}
              <div className="w-1/4 flex justify-start">
                <SansadBackButton href="/sansad/hub" />
              </div>

              {/* Center: Title and Subtitle */}
              <div className="flex-1 text-center">
                <h2 className="text-xl font-black uppercase text-zinc-950" style={{ fontFamily: "var(--font-pixeloid)" }}>
                  Asset Troubleshooting Pipeline — Horizon Foundry
                </h2>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mt-1">
                  Active Sandbox // Viewing Factory Pipeline Node Path
                </span>
              </div>

              {/* Right Side: abnormality controls */}
              <div className="w-1/4 flex justify-end overflow-visible">
                <AnomalyTripControl />
              </div>
              </div>
            </div>
            
            <div className="w-full flex-1 flex flex-col min-h-0 px-8 py-4">
              <NodeWorkflow initialFactory="horizon" hidePills={true} />
            </div>
          </div>
        </div>
      )}
    </ClickSpark>
  );
}

