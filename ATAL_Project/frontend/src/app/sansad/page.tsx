"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import ClickSpark from "../../animations/ClickSpark";
import AtalFooter from "../../components/AtalFooter";

interface TelemetryCell {
  label: string;
  value: string;
  status: "nominal" | "warning" | "critical";
}

export default function SansadScrollGridCrossPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 9x9 Grid layout for drawing letter 'A'
  const gridA = [
    [0, 0, 0, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0]
  ];

  const gridCells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      gridCells.push({ row: r, col: c, isActive: gridA[r][c] === 1 });
    }
  }

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


  // Scroll Progress Hooks (Desktop)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Keep track of scroll expansion threshold to toggle line breaks
  const [isExpanded, setIsExpanded] = useState(() => scrollYProgress.get() > 0.7);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setIsExpanded(latest > 0.7);
  });

  // Sidebar components translation and opacity (left column slides left, bottom-right slides left as well)
  const leftX = useTransform(scrollYProgress, [0, 1], ["0%", "-100%"]);
  const leftOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const bottomRightX = useTransform(scrollYProgress, [0, 1], ["0%", "-250%"]);
  const bottomRightOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  // Morphing Box Dimensions
  const boxWidth = useTransform(scrollYProgress, [0, 1], ["30%", "100%"]);
  const boxHeight = useTransform(scrollYProgress, [0, 1], ["45vh", "100vh"]);

  // Text container constraints expansion (repositions onto one line)
  const textMaxWidth = useTransform(scrollYProgress, [0, 1], ["280px", "950px"]);
  const textSize = useTransform(scrollYProgress, [0, 1], ["1.8vw", "3.6vw"]);

  // Scroll-controlled icons scale, Y, and opacity (parallax slide up from middle of text to above it with a fade-in)
  const iconsScale = useTransform(scrollYProgress, (v) => {
    if (v <= 0.7) return 0.3;
    if (v >= 1) return 1;
    return 0.3 + 0.7 * ((v - 0.7) / 0.3);
  });
  const iconsY = useTransform(scrollYProgress, (v) => {
    if (v <= 0.7) return 0;
    if (v >= 1) return -15;
    return -15 * ((v - 0.7) / 0.3);
  });
  const iconsOpacity = useTransform(scrollYProgress, (v) => {
    if (v <= 0.7) return 0;
    if (v >= 1) return 1;
    return (v - 0.7) / 0.3;
  });

  // Button section opacity — fades in after icons are fully visible
  const buttonOpacity = useTransform(scrollYProgress, [0.9, 1], [0, 1]);

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
              Agentic<br />Concierge<br />In your hands.
            </h1>
            <p className="text-[9px] text-zinc-400 mt-3 font-bold uppercase tracking-[0.25em]">
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
            href="/login"
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
        <div ref={containerRef} className="w-screen h-[200vh] relative bg-[#FAF9F5]">
          
          {/* Sticky viewport content box */}
          <div className="sticky top-0 left-0 right-0 h-screen w-screen overflow-hidden bg-[#FAF9F5] relative">
            
            {/* Custom styles for vertical marquee and rotated text elements */}
            <style dangerouslySetInnerHTML={{
              __html: `
                @keyframes marqueeDown {
                  0% {
                    transform: translateY(-50%);
                  }
                  100% {
                    transform: translateY(0%);
                  }
                }
                @keyframes marqueeUp {
                  0% {
                    transform: translateY(0%);
                  }
                  100% {
                    transform: translateY(-50%);
                  }
                }
                .animate-marquee-down {
                  animation: marqueeDown 35s linear infinite;
                }
                .animate-marquee-up {
                  animation: marqueeUp 35s linear infinite;
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
                  transform: scale(1.15) rotate(90deg);
                }
              `
            }} />

            {/* Left Gutter Vertical Carousel (scrolling up, text rotated 90 degrees) */}
            <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden hidden md:block z-20 pointer-events-none flex flex-col justify-start">
              <div className="animate-marquee-up flex flex-col items-center w-full">
                {Array(6).fill("SANSAD").concat(Array(6).fill("SANSAD")).map((text, idx) => {
                  return (
                    <div 
                      key={idx} 
                      className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200 py-12 pointer-events-auto"
                    >
                      <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider">
                        {text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Gutter Vertical Carousel (scrolling down, text rotated 90 degrees) */}
            <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden hidden md:block z-20 pointer-events-none flex flex-col justify-start">
              <div className="animate-marquee-down flex flex-col items-center w-full">
                {Array(6).fill("ATAL").concat(Array(6).fill("ATAL")).map((text, idx) => {
                  return (
                    <div 
                      key={idx} 
                      className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200 py-12 pointer-events-auto"
                    >
                      <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider">
                        {text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vertical Layout Borders running all the way from top (0px) to bottom */}
            <div className="absolute left-[8vw] top-0 bottom-0 w-[1px] bg-zinc-200 z-30 pointer-events-none hidden md:block" />
            <div className="absolute right-[8vw] top-0 bottom-0 w-[1px] bg-zinc-200 z-30 pointer-events-none hidden md:block" />

            {/* Centered grid wrapper spanning exactly 84% width */}
            <div className="absolute left-[8vw] w-[84vw] h-full bg-[#FAF9F5] relative overflow-hidden">
              
              {/* Left Column contents (shifts left off-screen and is clipped on scroll) */}
              <motion.div 
                style={{ x: leftX, opacity: leftOpacity }}
                className="absolute left-0 w-[70%] h-full flex flex-col overflow-hidden z-10 pointer-events-none bg-[#FAF9F5]"
              >
                {/* Top-Left Heading */}
                <div className="h-[45vh] border-b border-zinc-200 flex flex-col justify-end select-none bg-[#FAF9F5] overflow-hidden pt-28 flex-shrink-0">
                  <div className="px-16 pb-12">
                    <h1 className="text-5xl lg:text-[4vw] font-black text-zinc-950 tracking-tighter leading-[0.88] uppercase">
                      Agentic<br />Concierge<br />In your hands.
                    </h1>
                    <p className="text-[10px] text-zinc-400 mt-4 font-black uppercase tracking-[0.25em] leading-none">
                      ATAL Autonomous Pipeline Operations
                    </p>
                  </div>
                </div>

                {/* Bottom-Left — Orange Grid Shape 'A' widget */}
                <div className="flex-1 min-h-0 flex flex-col items-center justify-between p-6 md:p-10 pointer-events-auto select-none overflow-hidden">
                  
                  {/* Grid container with flexible centering */}
                  <div className="flex-1 flex items-center justify-center w-full">
                    <div className="relative p-12 bg-[#FAF6EE]/40 border border-black/20 rounded-3xl flex items-center justify-center">
                      
                      {/* Top Ruler */}
                      <div className="absolute top-3 left-12 right-12 flex justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
                        <span>0.0</span>
                        <span className="opacity-40 tracking-[0.25em] font-black uppercase">X-AXIS</span>
                        <span>9.0</span>
                      </div>

                      {/* Bottom Ruler */}
                      <div className="absolute bottom-3 left-12 right-12 flex justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
                        <span>0.0</span>
                        <span className="text-orange-500 font-bold tracking-[0.25em] uppercase">SYS_OK</span>
                        <span>9.0</span>
                      </div>

                      {/* Left Ruler */}
                      <div className="absolute left-3 top-12 bottom-12 flex flex-col justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
                        <span>9.0</span>
                        <span className="origin-center rotate-90 opacity-40 tracking-[0.25em] font-black uppercase my-4">SANSAD</span>
                        <span>0.0</span>
                      </div>

                      {/* Right Ruler */}
                      <div className="absolute right-3 top-12 bottom-12 flex flex-col justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
                        <span>9.0</span>
                        <span className="origin-center rotate-90 opacity-40 tracking-[0.25em] font-black uppercase my-4">ATAL</span>
                        <span>0.0</span>
                      </div>

                      {/* Grid of Squares */}
                      <div className="grid grid-cols-9 gap-1.5 p-2 bg-[#FAF9F5] border border-black/20 rounded-xl relative">
                        {/* Corner crop marks / ticks */}
                        <div className="absolute -top-1.5 -left-1.5 font-mono text-[9px] text-zinc-400 font-bold select-none leading-none">+</div>
                        <div className="absolute -top-1.5 -right-1.5 font-mono text-[9px] text-zinc-400 font-bold select-none leading-none">+</div>
                        <div className="absolute -bottom-1.5 -left-1.5 font-mono text-[9px] text-zinc-400 font-bold select-none leading-none">+</div>
                        <div className="absolute -bottom-1.5 -right-1.5 font-mono text-[9px] text-zinc-400 font-bold select-none leading-none">+</div>

                        {/* Animated Squares */}
                        {gridCells.map((cell, idx) => {
                          return (
                            <motion.div
                              key={idx}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 20,
                                delay: idx * 0.006
                              }}
                              whileHover={
                                cell.isActive
                                  ? { scale: 1.25, rotate: 90, backgroundColor: "#ea580c" }
                                  : { scale: 1.2, backgroundColor: "rgba(249, 115, 22, 0.2)" }
                              }
                              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 rounded-[4px] cursor-pointer transition-shadow ${
                                cell.isActive
                                  ? "bg-[#f97316] shadow-md shadow-orange-500/20 border border-black/15"
                                  : "border border-black/15 bg-[#FAF9F5]/60 hover:border-orange-300"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <span 
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-zinc-950 uppercase tracking-[0.25em] mt-8 pb-4"
                    style={{ fontFamily: "var(--font-pixeloid)" }}
                  >
                    Take control now
                  </span>
                </div>
              </motion.div>

              {/* Bottom-Right contents (shifts left off-screen and is clipped on scroll) */}
              <motion.div 
                style={{ x: bottomRightX, opacity: bottomRightOpacity }}
                className="absolute left-[70%] w-[30%] top-[45vh] bottom-0 flex flex-col items-center justify-center gap-12 p-8 bg-[#FAF9F5] z-10 pointer-events-none border-l border-zinc-200 overflow-hidden"
              >
                {/* Down arrows - bigger */}
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="flex flex-col gap-1 animate-bounce">
                    <span className="text-zinc-400 font-extrabold text-4xl leading-none">↓</span>
                    <span className="text-zinc-300 font-extrabold text-4xl leading-none -mt-3">↓</span>
                    <span className="text-zinc-200 font-extrabold text-4xl leading-none -mt-3">↓</span>
                  </div>
                </div>

                {/* Scroll down text with Pixeloid font */}
                <div className="flex flex-col items-center" style={{ fontFamily: "var(--font-pixeloid)" }}>
                  <span className="text-zinc-800 text-7xl leading-none tracking-tighter">Scroll</span>
                  <span className="text-zinc-800 text-7xl leading-none tracking-tighter mt-1">Down</span>
                </div>
              </motion.div>

              {/* MORPHING DESCRIPTION BOX (Expands left and down to cover 100% width and height) */}
              <motion.div 
                style={{ right: 0, width: boxWidth, height: boxHeight }}
                className="absolute top-0 z-40 overflow-hidden"
              >
                <div className="absolute inset-0 border-l border-r border-b border-zinc-200 bg-[#FAF6EE]" />
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
                      className="absolute flex gap-20 items-center text-zinc-800 stroke-[1.5] pointer-events-none"
                    >
                      <img src="/bag.png" alt="Bag" className="w-28 h-28 object-contain select-none pointer-events-none" />
                      <img src="/factory.png" alt="Factory" className="w-28 h-28 object-contain select-none pointer-events-none" />
                      <img src="/world.png" alt="World" className="w-28 h-28 object-contain select-none pointer-events-none" />
                    </motion.div>

                    <motion.div 
                      layout
                      transition={{ type: "spring", stiffness: 140, damping: 22 }}
                      style={{ fontSize: textSize }}
                      className={`font-bold text-zinc-950 leading-tight tracking-tight flex mt-20 md:mt-24 lg:mt-28 xl:mt-32 ${
                        isExpanded 
                          ? "flex-row gap-x-[0.35em] justify-center text-center" 
                          : "flex-col items-start text-left"
                      }`}
                    >
                      <motion.span layout transition={{ type: "spring", stiffness: 140, damping: 22 }} className="whitespace-nowrap">The frontier</motion.span>
                      <motion.span layout transition={{ type: "spring", stiffness: 140, damping: 22 }} className="whitespace-nowrap">is now yours.</motion.span>
                    </motion.div>
                  </motion.div>
                  <motion.div style={{ opacity: buttonOpacity }} className="flex flex-col items-center gap-4 mt-12">
                    <Link href="/login" className="block">
                      <motion.div
                        className="flex items-center text-white text-2xl tracking-tight rounded-xl shadow-lg cursor-pointer overflow-hidden"
                        style={{ fontFamily: "var(--font-pixeloid)", backgroundColor: "#000000" }}
                        variants={{
                          rest: { backgroundColor: "#000000", scale: 1, padding: "16px 40px" },
                          hover: { backgroundColor: "#f97316", scale: 1.03, padding: "16px 48px" }
                        }}
                        initial="rest"
                        whileHover="hover"
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <motion.span>Try sansad now</motion.span>
                        <motion.div
                          className="flex items-center overflow-hidden"
                          variants={{
                            rest: { width: 0, opacity: 0 },
                            hover: { width: "auto", opacity: 1 }
                          }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <span className="ml-2">→</span>
                        </motion.div>
                      </motion.div>
                    </Link>
                  </motion.div>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      )}
      <AtalFooter />
    </ClickSpark>
  );
}
