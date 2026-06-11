"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { Briefcase, Globe } from "lucide-react";
import ClickSpark from "../../animations/ClickSpark";

interface TelemetryCell {
  label: string;
  value: string;
  status: "nominal" | "warning" | "critical";
}

export default function SansadScrollGridCrossPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [cells, setCells] = useState<TelemetryCell[]>([
    { label: "BF1_TMP", value: "98°C", status: "warning" },
    { label: "BF1_PRS", value: "3.1b", status: "nominal" },
    { label: "VLV_04", value: "OPEN", status: "critical" },
    { label: "ANOM_ST", value: "WARN", status: "warning" },
    { label: "FLW_RT", value: "240L", status: "nominal" },
    { label: "SYS_CK", value: "NOM", status: "nominal" }
  ]);

  // Live updates for telemetry cells
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const interval = setInterval(() => {
      setCells((prev) =>
        prev.map((cell) => {
          if (Math.random() > 0.85) {
            const statuses: ("nominal" | "warning" | "critical")[] = ["nominal", "warning", "critical"];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            let val = cell.value;
            if (cell.label === "BF1_TMP") {
              val = randomStatus === "critical" ? "106°C" : randomStatus === "warning" ? "98°C" : "89°C";
            } else if (cell.label === "ANOM_ST") {
              val = randomStatus === "critical" ? "CRIT" : randomStatus === "warning" ? "WARN" : "NOM";
            } else if (cell.label === "SYS_CK") {
              val = randomStatus === "critical" ? "FAIL" : "NOM";
            }

            return {
              ...cell,
              status: randomStatus,
              value: val
            };
          }
          return cell;
        })
      );
    }, 2000);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearInterval(interval);
    };
  }, []);

  const getCellValue = (label: string) => {
    return cells.find((c) => c.label === label)?.value || "";
  };

  const getCellDotColor = (label: string) => {
    const cell = cells.find((c) => c.label === label);
    if (!cell) return "bg-emerald-500";
    if (cell.status === "critical") return "bg-red-500 animate-pulse";
    if (cell.status === "warning") return "bg-amber-400";
    return "bg-emerald-500";
  };

  // Scroll Progress Hooks (Desktop)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Keep track of scroll expansion threshold to toggle line breaks
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    setIsExpanded(scrollYProgress.get() > 0.35);
  }, [scrollYProgress]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setIsExpanded(latest > 0.35);
  });

  // Sidebar components translation and opacity (left column slides left, bottom-right slides left as well)
  const leftX = useTransform(scrollYProgress, [0, 0.35], ["0%", "-100%"]);
  const leftOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const bottomRightX = useTransform(scrollYProgress, [0, 0.35], ["0%", "-250%"]);
  const bottomRightOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  // Morphing Box Dimensions (expands past original grid line for double line layout)
  const boxLeft = useTransform(scrollYProgress, [0, 0.45], ["70%", "-3.5%"]);
  const boxWidth = useTransform(scrollYProgress, [0, 0.45], ["30%", "105%"]);
  const boxHeight = useTransform(scrollYProgress, [0, 0.45], ["45vh", "100vh"]);

  // Text container constraints expansion (repositions onto one line)
  const textMaxWidth = useTransform(scrollYProgress, [0, 0.45], ["280px", "950px"]);
  const textSize = useTransform(scrollYProgress, [0, 0.45], ["1.8vw", "3.6vw"]);

  // Scroll-controlled icons scale, Y, and opacity (parallax slide up from middle of text to above it with a fade-in)
  const iconsScale = useTransform(scrollYProgress, (v) => {
    if (v <= 0.32) return 0.3;
    if (v >= 0.45) return 1;
    return 0.3 + 0.7 * ((v - 0.32) / 0.13);
  });
  const iconsY = useTransform(scrollYProgress, (v) => {
    if (v <= 0.32) return 0;
    if (v >= 0.45) return -145;
    return -145 * ((v - 0.32) / 0.13);
  });
  const iconsOpacity = useTransform(scrollYProgress, (v) => {
    if (v <= 0.32) return 0;
    if (v >= 0.45) return 1;
    return (v - 0.32) / 0.13;
  });

  const renderTelemetryCell = (label: string) => (
    <div className="border-r border-b border-zinc-200/80 aspect-square p-4 flex flex-col justify-between bg-white hover:bg-zinc-50/50 transition-colors select-none">
      <span className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest leading-none">{label}</span>
      <span className="font-mono text-base md:text-lg font-black text-zinc-800 leading-none">{getCellValue(label)}</span>
      <div className="flex justify-end">
        <span className={`w-2 h-2 rounded-full ${getCellDotColor(label)}`} />
      </div>
    </div>
  );

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={8}
      sparkRadius={18}
      sparkCount={6}
      duration={350}
      className="relative min-h-screen w-full bg-[#FAF9F5] flex flex-col justify-start"
    >
      {isMobile ? (
        // MOBILE VIEW (Clean static layout fallback)
        <div className="flex flex-col gap-6 w-full max-w-md md:hidden px-6 pt-24 pb-12">
          <div className="bg-white border border-zinc-200 p-8 rounded-2xl shadow-sm">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter leading-none uppercase">
              Agentic<br />Concierge.<br />In your hands.
            </h1>
            <p className="text-[9px] text-zinc-400 mt-3 font-bold uppercase tracking-[0.2em]">
              ATAL Pipeline Operations
            </p>
          </div>

          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm">
            <p className="text-[12px] text-zinc-500 font-medium leading-relaxed">
              The frontier is now yours.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-zinc-100 p-2 rounded-2xl border border-zinc-200/60 shadow-sm">
            {cells.map((cell) => (
              <div 
                key={cell.label}
                className="bg-white border border-zinc-150 rounded-xl p-3 flex flex-col justify-between h-[85px]"
              >
                <span className="font-mono text-[7px] font-bold text-zinc-400 uppercase tracking-wider">{cell.label}</span>
                <span className="font-mono text-sm font-black text-zinc-800 leading-none my-1">{cell.value}</span>
                <div className="flex justify-end">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    cell.status === "critical" 
                      ? "bg-red-500 animate-pulse" 
                      : cell.status === "warning" 
                      ? "bg-amber-400" 
                      : "bg-emerald-500"
                  }`} />
                </div>
              </div>
            ))}
          </div>

          <Link 
            href="/sansad/monitoring"
            className="bg-zinc-950 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between border border-zinc-950 hover:bg-zinc-800 transition-colors"
          >
            <div>
              <h3 className="text-xs font-bold">Launch Control</h3>
              <p className="text-[9px] text-zinc-400 mt-0.5">Enter workflow monitoring room.</p>
            </div>
            <span className="font-extrabold text-sm">→</span>
          </Link>
        </div>
      ) : (
        // DESKTOP VIEW WITH SCROLL-DRIVEN GRID EXPANSION
        <div ref={containerRef} className="w-full h-[200vh] relative">
          
          {/* Vertical Layout Borders running all the way from top (0px) to bottom */}
          <div className="absolute left-[15vw] top-0 bottom-0 w-[1px] bg-zinc-200 z-30 pointer-events-none hidden md:block" />
          <div className="absolute right-[15vw] top-0 bottom-0 w-[1px] bg-zinc-200 z-30 pointer-events-none hidden md:block" />

          {/* Sticky viewport content box */}
          <div className="sticky top-0 left-0 right-0 h-screen w-full overflow-hidden flex bg-[#FAF9F5]">
            
            {/* Centered grid wrapper spanning exactly 70% width */}
            <div className="w-[70vw] min-w-[70vw] max-w-[70vw] mx-auto flex flex-row h-full bg-[#FAF9F5] relative overflow-x-visible overflow-y-hidden">
              
              {/* Left Column contents (shifts left off-screen and is clipped on scroll) */}
              <motion.div 
                style={{ x: leftX, opacity: leftOpacity }}
                className="absolute left-0 w-[70%] h-full flex flex-col overflow-hidden z-10 pointer-events-none"
              >
                {/* Top-Left Heading */}
                <div className="h-[45vh] border-b border-zinc-200 flex flex-col justify-end p-16 pb-12 select-none bg-[#FAF9F5] overflow-hidden pt-28 flex-shrink-0">
                  <h1 className="text-5xl lg:text-[4vw] font-black text-zinc-950 tracking-tighter leading-[0.88] uppercase">
                    Agentic<br />Concierge.<br />In your hands.
                  </h1>
                  <p className="text-[10px] text-zinc-400 mt-4 font-black uppercase tracking-[0.25em] leading-none">
                    ATAL Autonomous Pipeline Operations
                  </p>
                </div>

                {/* Bottom-Left Telemetry squares */}
                <div className="flex-grow flex items-center justify-center bg-white border-t border-zinc-200/80 p-1">
                  <div className="grid grid-cols-6 w-full h-fit bg-white">
                    {renderTelemetryCell("BF1_TMP")}
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#ff5e00] hover:opacity-90 transition-opacity duration-300" />
                    {renderTelemetryCell("BF1_PRS")}
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#e60026] hover:opacity-90 transition-opacity duration-300" />
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#1e293b] hover:opacity-90 transition-opacity duration-300" />
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#ff5e00] hover:opacity-90 transition-opacity duration-300" />

                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#e60026] hover:opacity-90 transition-opacity duration-300" />
                    {renderTelemetryCell("VLV_04")}
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#ff5e00] hover:opacity-90 transition-opacity duration-300" />
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#facc15] hover:opacity-90 transition-opacity duration-300" />
                    {renderTelemetryCell("ANOM_ST")}
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#800016] hover:opacity-90 transition-opacity duration-300" />

                    {renderTelemetryCell("FLW_RT")}
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#1e293b] hover:opacity-90 transition-opacity duration-300" />
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#e60026] hover:opacity-90 transition-opacity duration-300" />
                    {renderTelemetryCell("SYS_CK")}
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#ff5e00] hover:opacity-90 transition-opacity duration-300" />
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#facc15] hover:opacity-90 transition-opacity duration-300" />
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#ff7a00] hover:opacity-90 transition-opacity duration-300" />

                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#ff7a00] hover:opacity-90 transition-opacity duration-300" />
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#e60026] hover:opacity-90 transition-opacity duration-300" />
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#1e293b] hover:opacity-90 transition-opacity duration-300" />
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#facc15] hover:opacity-90 transition-opacity duration-300" />
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#ff5e00] hover:opacity-90 transition-opacity duration-300" />
                    <div className="border-r border-b border-zinc-200/80 aspect-square bg-[#800016] hover:opacity-90 transition-opacity duration-300" />
                  </div>
                </div>
              </motion.div>

              {/* Bottom-Right contents (shifts left off-screen and is clipped on scroll) */}
              <motion.div 
                style={{ x: bottomRightX, opacity: bottomRightOpacity }}
                className="absolute left-[70%] w-[30%] top-[45vh] bottom-0 flex flex-col justify-between p-8 bg-[#FAF9F5] z-10 pointer-events-none border-l border-zinc-200 overflow-hidden"
              >
                {/* Down arrows */}
                <div className="flex flex-col items-center justify-center gap-1.5 mt-8">
                  <div className="flex flex-col gap-0.5 animate-bounce">
                    <span className="text-zinc-400 font-extrabold text-sm leading-none">↓</span>
                    <span className="text-zinc-300 font-extrabold text-sm leading-none -mt-1.5">↓</span>
                    <span className="text-zinc-200 font-extrabold text-sm leading-none -mt-1.5">↓</span>
                  </div>
                </div>

                {/* News Card Action Link */}
                <Link 
                  href="/sansad/monitoring"
                  className="flex items-center cursor-pointer group hover:bg-zinc-100/10 transition-colors w-full border border-zinc-200 bg-white rounded-2xl overflow-hidden shadow-xs pointer-events-auto"
                >
                  <div className="border-r border-zinc-200/80 flex items-center justify-center p-3">
                    <div className="w-[50px] h-[50px] bg-[#ff5e00] rounded-xl flex flex-col justify-between p-1.5 shadow-xs">
                      <div className="flex flex-col text-[4px] font-black uppercase tracking-wider leading-none text-white/95">
                        <span>Studio</span>
                        <span>Vibe</span>
                        <span>Forge</span>
                        <span>Compute</span>
                      </div>
                      <span className="text-[4px] font-bold text-white/70 tracking-tight self-start">ATAL AI</span>
                    </div>
                  </div>
                  <div className="border-r border-zinc-200/80 flex-grow flex flex-col justify-center px-3 py-2">
                    <span className="text-[7px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-0.5 block">
                      Featured News
                    </span>
                    <h3 className="text-[10px] font-bold text-zinc-800 leading-tight">
                      Launch Control Room
                    </h3>
                  </div>
                  <div className="w-10 h-full flex flex-col items-center justify-center">
                    <div className="w-5 h-5 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-700 bg-white group-hover:bg-[#ff5e00] group-hover:border-[#ff5e00] group-hover:text-white transition-all shadow-2xs">
                      <span className="font-extrabold text-[10px]">→</span>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* MORPHING DESCRIPTION BOX (Expands left and down to cover 100% width and height) */}
              <motion.div 
                style={{ left: boxLeft, width: boxWidth, height: boxHeight }}
                className="absolute top-0 border-l border-b border-zinc-200 bg-[#FAF6EE] z-40 overflow-hidden"
              >
                {/* Gliding Bolder Description Text container containing both Text and Icons below it */}
                <div className="absolute inset-0 p-8 select-none flex flex-col items-center justify-center">
                  <motion.div 
                    style={{ maxWidth: textMaxWidth }}
                    className="relative flex flex-col items-center justify-center w-full"
                  >
                    {/* Icons container positioned absolutely, slide up scroll-controlled (parallax) */}
                    <motion.div 
                      style={{ 
                        opacity: iconsOpacity, 
                        y: iconsY, 
                        scale: iconsScale 
                      }}
                      className="absolute flex gap-12 items-center text-zinc-800 stroke-[1.5] pointer-events-none"
                    >
                      <Briefcase className="w-10 h-10" />
                      <img src="/short_form_logo.png" alt="Tree" className="w-10 h-10 object-contain select-none pointer-events-none" />
                      <Globe className="w-10 h-10" />
                    </motion.div>
 
                    <motion.div 
                      layout
                      transition={{ type: "spring", stiffness: 140, damping: 22 }}
                      style={{ fontSize: textSize }}
                      className={`font-bold text-zinc-950 leading-tight tracking-tight flex ${
                        isExpanded 
                          ? "flex-row gap-x-[0.35em] justify-center text-center" 
                          : "flex-col items-start text-left"
                      }`}
                    >
                      <motion.span layout transition={{ type: "spring", stiffness: 140, damping: 22 }} className="whitespace-nowrap">The frontier</motion.span>
                      <motion.span layout transition={{ type: "spring", stiffness: 140, damping: 22 }} className="whitespace-nowrap">is now yours.</motion.span>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
