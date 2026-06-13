"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClickSpark from "@/animations/ClickSpark";
import LogoLoop from "@/animations/LogoLoop";
import NodeWorkflow from "@/components/NodeWorkflow";

// ─── CSS Animations ──────────────────────────────────────────────────────────

const CSS_ANIMATIONS = `
  @keyframes marqueeDown {
    0% { transform: translateY(-50%); }
    100% { transform: translateY(0%); }
  }
  @keyframes marqueeUp {
    0% { transform: translateY(0%); }
    100% { transform: translateY(-50%); }
  }
  @keyframes statusBlinkAnim {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes strokeFlow {
    from { stroke-dashoffset: 24; }
    to { stroke-dashoffset: 0; }
  }
  .animate-marquee-up { animation: marqueeUp 35s linear infinite; }
  .animate-marquee-down { animation: marqueeDown 35s linear infinite; }
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
  .stroke-dasharray-anim {
    stroke-dasharray: 8, 4;
    animation: strokeFlow 1.2s linear infinite;
  }
`;



const manasTickerLogos = [
  { text: "RAG DATABASE: SYNCED", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "LATENCY: 12ms", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "COG_REASONING: ACTIVE", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "ANOMALY ALERTS DISPATCHED", isSeparator: false },
  { text: "✦", isSeparator: true },
];

const samvidhaanTickerLogos = [
  { text: "SYSTEM: ACTIVE", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "RUL_AVG: 1,162h", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "SAFETY COMPLIANCE: 100%", isSeparator: false },
  { text: "✦", isSeparator: true },
  { text: "POLICIES ENFORCED: ACTIVE", isSeparator: false },
  { text: "✦", isSeparator: true },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SamvidhaanPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [activeFactoryModal, setActiveFactoryModal] = useState<"f1" | "f2" | null>(null);



  // Drag coordinates for the 4 nodes
  const [nodes, setNodes] = useState({
    f1: { x: 60, y: 345 },
    f2: { x: 960, y: 345 },
    samvidhaan: { x: 540, y: 120 },
    manas: { x: 540, y: 480 },
  });

  const [activeDragNode, setActiveDragNode] = useState<"f1" | "f2" | "samvidhaan" | "manas" | null>(null);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Use a ref to access latest node positions inside handleMouseDown without recreating functions
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [initializedFromContainer, setInitializedFromContainer] = useState(false);

  // Set initial coordinates responsively on mount once we can measure the parent canvas
  useEffect(() => {
    const saved = localStorage.getItem("samvidhaan_node_positions_v3");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.f1 && parsed.f2 && parsed.samvidhaan && parsed.manas) {
          setTimeout(() => {
            setNodes(parsed);
            setHasLoaded(true);
            setInitializedFromContainer(true);
          }, 0);
          return;
        }
      } catch {}
    }
    setTimeout(() => {
      setHasLoaded(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (initializedFromContainer || !hasLoaded || !containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const centerY = height / 2;
          const samvidhaanY = Math.max(20, Math.round(centerY - 340));
          const manasY = samvidhaanY + 380;
          const f1Y = samvidhaanY + 160;
          const f2Y = samvidhaanY + 160;

          setNodes({
            f1: { x: Math.round(width * 0.03), y: f1Y },
            f2: { x: Math.round(width * 0.97 - 320), y: f2Y },
            samvidhaan: { x: Math.round(width * 0.5 - 160), y: samvidhaanY },
            manas: { x: Math.round(width * 0.5 - 160), y: manasY },
          });
          setInitializedFromContainer(true);
          resizeObserver.disconnect();
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [hasLoaded, initializedFromContainer]);

  useEffect(() => {
    if (hasLoaded && initializedFromContainer) {
      localStorage.setItem("samvidhaan_node_positions_v3", JSON.stringify(nodes));
    }
  }, [nodes, hasLoaded, initializedFromContainer]);

  const handleMouseDown = (nodeId: "f1" | "f2" | "samvidhaan" | "manas", e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Do not trigger drag on links or interactive button controls
    if (target.closest("a") || target.closest("button") || target.closest(".no-drag")) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setActiveDragNode(nodeId);
    dragStartOffset.current = {
      x: (e.clientX - rect.left) - nodesRef.current[nodeId].x,
      y: (e.clientY - rect.top) - nodesRef.current[nodeId].y,
    };
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeDragNode || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      const newX = e.clientX - rect.left - dragStartOffset.current.x;
      const newY = e.clientY - rect.top - dragStartOffset.current.y;
      
      // Node dimension bounds for clamping (factory cards 320×420, others 320×320)
      const nodeWidth = 320;
      let nodeHeight = 320;
      if (activeDragNode === "f1" || activeDragNode === "f2") {
        nodeHeight = 420;
      }

      const clampedX = Math.max(10, Math.min(rect.width - nodeWidth - 10, newX));
      const clampedY = Math.max(10, Math.min(rect.height - nodeHeight - 10, newY));

      setNodes((prev) => ({
        ...prev,
        [activeDragNode]: { x: clampedX, y: clampedY },
      }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (activeDragNode) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 4) {
          if (activeDragNode === "f1") {
            setActiveFactoryModal("f1");
          } else if (activeDragNode === "f2") {
            setActiveFactoryModal("f2");
          }
        }
      }
      setActiveDragNode(null);
    };

    if (activeDragNode) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeDragNode]);

  // Re-calculate dynamic Bezier curves — factory cards 320×420 (center +210), others 320×320 (center +160)
  const f1CenterY = nodes.f1.y + 210;
  const f2CenterY = nodes.f2.y + 210;
  const samvidhaanCenterY = nodes.samvidhaan.y + 160;

  // Bezier curve path constructor (horizontal)
  const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = (x2 - x1) / 2;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  // Bezier curve path constructor (vertical)
  const getVerticalBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dy = (y2 - y1) / 2;
    return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
  };

  // Factory 1 to Samvidhaan (Right edge center of Factory 1 to Left edge center of Samvidhaan)
  const pathF1ToSamvidhaan = getBezierPath(nodes.f1.x + 320, f1CenterY, nodes.samvidhaan.x, samvidhaanCenterY);

  // Factory 2 to Samvidhaan (Left edge center of Factory 2 to Right edge center of Samvidhaan)
  const pathF2ToSamvidhaan = getBezierPath(nodes.f2.x, f2CenterY, nodes.samvidhaan.x + 320, samvidhaanCenterY);

  // Manas to Samvidhaan (Top center of Manas to Bottom center of Samvidhaan)
  const pathManasToSamvidhaan = getVerticalBezierPath(nodes.manas.x + 160, nodes.manas.y, nodes.samvidhaan.x + 160, nodes.samvidhaan.y + 320);



  // ── Mobile Fallback ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <ClickSpark sparkColor="#f97316" sparkSize={8} sparkRadius={18} sparkCount={6} duration={350}
        className="relative min-h-screen w-full bg-[#FAF9F5] flex flex-col justify-start overflow-hidden select-none">
        <style dangerouslySetInnerHTML={{ __html: CSS_ANIMATIONS }} />
        <div className="flex flex-col gap-6 w-full px-6 pt-24 pb-12 max-w-lg mx-auto z-10">
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-xs">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter uppercase leading-none" style={{ fontFamily: "var(--font-pixeloid)" }}>
              SANSAD<br />SAMVIDHAAN
            </h1>
            <p className="text-[9px] text-[#f97316] mt-3 font-bold uppercase tracking-[0.2em]">Factory Command Centre</p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl">
            <p className="text-sm text-zinc-600">Please open this page on a desktop viewport for the full command centre experience.</p>
            <Link href="/sansad/hub" className="mt-4 block text-center py-2 bg-[#1b253c] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider">
              Back to Console
            </Link>
          </div>
        </div>
      </ClickSpark>
    );
  }

  // ── Desktop ──────────────────────────────────────────────────────────────────
  return (
    <ClickSpark sparkColor="#f97316" sparkSize={8} sparkRadius={18} sparkCount={6} duration={350}
      className="relative w-full h-screen bg-[#FAF9F5] overflow-hidden select-none">
      <style dangerouslySetInnerHTML={{ __html: CSS_ANIMATIONS }} />

      <div className="w-screen h-screen overflow-hidden bg-[#FAF9F5] relative flex">

        {/* Left Marquee */}
        <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col border-r border-zinc-200/80 bg-[#FAF9F5]">
          <div className="animate-marquee-up flex flex-col items-center w-full">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12">
                <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider">SANSAD</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Marquee */}
        <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col border-l border-zinc-200/80 bg-[#FAF9F5]">
          <div className="animate-marquee-down flex flex-col items-center w-full">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12">
                <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider">ATAL</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Central Area ── */}
        <div className="absolute left-[8vw] w-[84vw] h-full flex flex-col bg-[#FAF9F5]">

          {/* Header */}
          <div className="relative shrink-0 flex items-center px-8 py-4 border-b border-zinc-200/80 bg-[#FAF9F5] z-30">
            <Link href="/sansad/hub">
              <div className="h-10 px-4 bg-[#1b253c] hover:bg-[#f97316] text-white rounded-xl flex items-center gap-0 hover:gap-2 transition-all duration-300 overflow-hidden group/btn cursor-pointer font-bold animate-pulse-slow"
                style={{ fontFamily: "var(--font-pixeloid)" }}>
                <ArrowLeft className="w-0 h-5 opacity-0 transition-all duration-300 group-hover/btn:w-5 group-hover/btn:opacity-100 shrink-0" />
                <span className="text-xs uppercase tracking-wider">Back</span>
              </div>
            </Link>

            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <h1 className="text-2xl font-black uppercase text-zinc-950 tracking-tight" style={{ fontFamily: "var(--font-questrial)" }}>
                SANSAD SAMVIDHAAN
              </h1>
              <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest block mt-0.5">
                Operations Oversight
              </span>
            </div>
          </div>

          {/* ── Node Graph Canvas ── */}
          <div ref={containerRef} className="flex-1 w-full bg-[#FAF9F5] relative overflow-hidden select-none">
            {/* Grid background pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.45] pointer-events-none" />

            {/* SVG Connectors (NodeWorkflow style) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none select-none" style={{ zIndex: 1 }}>
              {/* No glow filter */}

              {/* Factory 1 → Samvidhaan */}
              <g className="connector-glow">
                <path
                  d={pathF1ToSamvidhaan}
                  stroke="#e4e4e7"
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  className="transition-[stroke,opacity] duration-300"
                />
                <path
                  d={pathF1ToSamvidhaan}
                  stroke="#0d9488"
                  strokeWidth={1.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="8, 4"
                  className="stroke-dasharray-anim"
                />
              </g>

              {/* Factory 2 → Samvidhaan */}
              <g className="connector-glow">
                <path
                  d={pathF2ToSamvidhaan}
                  stroke="#e4e4e7"
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  className="transition-[stroke,opacity] duration-300"
                />
                <path
                  d={pathF2ToSamvidhaan}
                  stroke="#ea580c"
                  strokeWidth={1.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="8, 4"
                  className="stroke-dasharray-anim"
                />
              </g>

              {/* Manas → Samvidhaan */}
              <g className="connector-glow">
                <path
                  d={pathManasToSamvidhaan}
                  stroke="#e4e4e7"
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  className="transition-[stroke,opacity] duration-300"
                />
                <path
                  d={pathManasToSamvidhaan}
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="8, 4"
                  className="stroke-dasharray-anim"
                />
              </g>
            </svg>

            {/* HTML Nodes */}
            
            {/* Left Node: Factory 1 */}
            <div
              onMouseDown={(e) => handleMouseDown("f1", e)}
              onDragStart={(e) => e.preventDefault()}
              className="absolute select-none"
              style={{
                left: nodes.f1.x,
                top: nodes.f1.y,
                zIndex: 10,
                cursor: activeDragNode === "f1" ? "grabbing" : "grab"
              }}
            >
              <div
                className="w-[320px] h-[420px] bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-2xl p-5 shadow-lg shadow-zinc-200/35 hover:scale-[1.02] hover:border-teal-500 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300 flex flex-col group relative overflow-hidden"
                style={{ fontFamily: "var(--font-questrial)" }}
              >
                {/* Corner marks */}
                <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-teal-500/30 group-hover:text-teal-500 select-none font-bold transition-colors duration-300">+</div>
                <div className="absolute top-2.5 right-2.5 font-mono text-[9px] text-teal-500/30 group-hover:text-teal-500 select-none font-bold transition-colors duration-300">+</div>
                <div className="absolute bottom-2.5 left-2.5 font-mono text-[9px] text-teal-500/30 group-hover:text-teal-500 select-none font-bold transition-colors duration-300">+</div>
                <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-teal-500/30 group-hover:text-teal-500 select-none font-bold transition-colors duration-300">+</div>

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-[18px] font-black text-zinc-950 uppercase tracking-tight leading-none">
                      HORIZON FOUNDRY
                    </h2>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">LIVE</span>
                </div>

                {/* Stats — full-height stacked rows */}
                <div className="flex flex-col gap-2.5 flex-1 justify-center">
                  <div className="flex flex-col bg-zinc-50 rounded-xl px-4 py-2.5 border border-zinc-100">
                    <span className="text-[9px] font-mono font-semibold text-zinc-400 uppercase tracking-widest mb-1">Exhauster Vibration</span>
                    <div className="flex items-end gap-2">
                      <span className="text-[32px] font-mono font-extrabold text-[#1b253c] leading-none">6.42</span>
                      <span className="text-[13px] font-mono font-bold text-zinc-400 mb-0.5">mm/s</span>
                    </div>
                  </div>
                  <div className="flex flex-col bg-rose-50 rounded-xl px-4 py-2.5 border border-rose-100">
                    <span className="text-[9px] font-mono font-semibold text-rose-400 uppercase tracking-widest mb-1">Bearing RUL ⚠</span>
                    <div className="flex items-end gap-2">
                      <span className="text-[32px] font-mono font-extrabold text-rose-600 leading-none">14</span>
                      <span className="text-[13px] font-mono font-bold text-rose-400 mb-0.5">days</span>
                    </div>
                  </div>
                  <div className="flex flex-col bg-emerald-50 rounded-xl px-4 py-2.5 border border-emerald-100">
                    <span className="text-[9px] font-mono font-semibold text-emerald-500 uppercase tracking-widest mb-1">Cog Pressure</span>
                    <div className="flex items-end gap-2">
                      <span className="text-[24px] font-mono font-extrabold text-emerald-700 leading-none">NOMINAL</span>
                    </div>
                  </div>
                  <div className="flex flex-col bg-zinc-50 rounded-xl px-4 py-2.5 border border-zinc-100">
                    <span className="text-[9px] font-mono font-semibold text-zinc-400 uppercase tracking-widest mb-1">Sinter Temperature</span>
                    <div className="flex items-end gap-2">
                      <span className="text-[32px] font-mono font-extrabold text-[#1b253c] leading-none">1240</span>
                      <span className="text-[13px] font-mono font-bold text-zinc-400 mb-0.5">°C</span>
                    </div>
                  </div>
                </div>

                {/* Hover image overlay — factory.png */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 bg-white/95 rounded-2xl">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <div className="absolute inset-0 bg-teal-500/10 blur-2xl rounded-full" />
                    <img src="/factory.png" alt="Factory" className="w-32 h-32 object-contain relative z-10" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Node: Factory 2 */}
            <div
              onMouseDown={(e) => handleMouseDown("f2", e)}
              onDragStart={(e) => e.preventDefault()}
              className="absolute select-none"
              style={{
                left: nodes.f2.x,
                top: nodes.f2.y,
                zIndex: 10,
                cursor: activeDragNode === "f2" ? "grabbing" : "grab"
              }}
            >
              <div
                className="w-[320px] h-[420px] bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-2xl p-5 shadow-lg shadow-zinc-200/35 hover:scale-[1.02] hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col group relative overflow-hidden"
                style={{ fontFamily: "var(--font-questrial)" }}
              >
                {/* Corner marks */}
                <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-amber-500/30 group-hover:text-amber-500 select-none font-bold transition-colors duration-300">+</div>
                <div className="absolute top-2.5 right-2.5 font-mono text-[9px] text-amber-500/30 group-hover:text-amber-500 select-none font-bold transition-colors duration-300">+</div>
                <div className="absolute bottom-2.5 left-2.5 font-mono text-[9px] text-amber-500/30 group-hover:text-amber-500 select-none font-bold transition-colors duration-300">+</div>
                <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-amber-500/30 group-hover:text-amber-500 select-none font-bold transition-colors duration-300">+</div>

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-[18px] font-black text-zinc-950 uppercase tracking-tight leading-none">
                      ZEPHYR SINTER
                    </h2>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">LIVE</span>
                </div>

                {/* Stats — full-height stacked rows */}
                <div className="flex flex-col gap-2.5 flex-1 justify-center">
                  <div className="flex flex-col bg-zinc-50 rounded-xl px-4 py-2.5 border border-zinc-100">
                    <span className="text-[9px] font-mono font-semibold text-zinc-400 uppercase tracking-widest mb-1">FeO Content</span>
                    <div className="flex items-end gap-2">
                      <span className="text-[32px] font-mono font-extrabold text-[#1b253c] leading-none">8.3</span>
                      <span className="text-[13px] font-mono font-bold text-zinc-400 mb-0.5">%</span>
                    </div>
                  </div>
                  <div className="flex flex-col bg-zinc-50 rounded-xl px-4 py-2.5 border border-zinc-100">
                    <span className="text-[9px] font-mono font-semibold text-zinc-400 uppercase tracking-widest mb-1">Strand Speed</span>
                    <div className="flex items-end gap-2">
                      <span className="text-[32px] font-mono font-extrabold text-[#1b253c] leading-none">3.1</span>
                      <span className="text-[13px] font-mono font-bold text-zinc-400 mb-0.5">m/min</span>
                    </div>
                  </div>
                  <div className="flex flex-col bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-100">
                    <span className="text-[9px] font-mono font-semibold text-amber-500 uppercase tracking-widest mb-1">Waste Fan RUL</span>
                    <div className="flex items-end gap-2">
                      <span className="text-[32px] font-mono font-extrabold text-amber-600 leading-none">18</span>
                      <span className="text-[13px] font-mono font-bold text-amber-400 mb-0.5">days</span>
                    </div>
                  </div>
                  <div className="flex flex-col bg-zinc-50 rounded-xl px-4 py-2.5 border border-zinc-100">
                    <span className="text-[9px] font-mono font-semibold text-zinc-400 uppercase tracking-widest mb-1">Coke Rate</span>
                    <div className="flex items-end gap-2">
                      <span className="text-[32px] font-mono font-extrabold text-[#1b253c] leading-none">482</span>
                      <span className="text-[13px] font-mono font-bold text-zinc-400 mb-0.5">kg/thm</span>
                    </div>
                  </div>
                </div>

                {/* Hover image overlay — factory.png */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 bg-white/95 rounded-2xl">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <div className="absolute inset-0 bg-amber-500/10 blur-2xl rounded-full" />
                    <img src="/factory.png" alt="Factory" className="w-32 h-32 object-contain relative z-10" />
                  </div>
                </div>
              </div>
            </div>

            {/* Middle-Bottom Node: Samvidhaan Layer */}
            <div
              onMouseDown={(e) => handleMouseDown("samvidhaan", e)}
              onDragStart={(e) => e.preventDefault()}
              className="absolute select-none"
              style={{
                left: nodes.samvidhaan.x,
                top: nodes.samvidhaan.y,
                zIndex: 10,
                cursor: activeDragNode === "samvidhaan" ? "grabbing" : "grab"
              }}
            >
              <div
                className="w-[320px] h-[320px] bg-white/95 backdrop-blur-sm border-2 border-zinc-950 rounded-2xl p-6 shadow-lg shadow-zinc-200/30 hover:shadow-xl hover:border-black hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
                style={{ fontFamily: "var(--font-questrial)" }}
              >
                {/* Default Card UI (fades out on hover) */}
                <div className="flex flex-col justify-between h-full w-full group-hover:opacity-0 transition-opacity duration-300">
                  <div className="flex-1 flex flex-col justify-start mt-2">
                    <div className="flex items-center justify-between w-full mb-3">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                        SYSTEM STATUS
                      </span>
                    </div>
                    <h2 className="text-[26px] font-black text-[#1b253c] uppercase leading-none tracking-tighter">
                      SANSAD<br />SAMVIDHAAN
                    </h2>
                    <p className="mt-3 text-[11.5px] italic text-zinc-400 leading-snug">
                      System compliance layer, policy enforcement engine, and process RUL optimizer.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 mt-auto w-full no-drag">
                    <div className="overflow-hidden border-t border-[#1b253c]/8 pt-2">
                      <LogoLoop
                        logos={samvidhaanTickerLogos}
                        speed={22}
                        direction="left"
                        logoHeight={13}
                        gap={16}
                        pauseOnHover
                        renderItem={(item) => (
                          <span
                            style={{ fontFamily: "var(--font-questrial)" }}
                            className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-[10.5px] ${
                              item.isSeparator ? "text-[#1b253c]/20" : "text-[#1b253c]/55 font-bold"
                            }`}
                          >
                            {item.text}
                          </span>
                        )}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-zinc-100">
                      <div className="text-[9px] text-zinc-400 uppercase tracking-widest">
                        SYSTEM LAYER
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Graphic Overlay (fades in on hover) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 bg-white/95 rounded-2xl">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full" />
                    <img src="/samvidhaan.png" alt="Samvidhaan" className="w-32 h-32 object-contain relative z-10" />
                  </div>
                </div>
              </div>
            </div>

            {/* Top-Middle Node: Manas AI (Convergence Node) */}
            <div
              onMouseDown={(e) => handleMouseDown("manas", e)}
              onDragStart={(e) => e.preventDefault()}
              className="absolute select-none"
              style={{
                left: nodes.manas.x,
                top: nodes.manas.y,
                zIndex: 10,
                cursor: activeDragNode === "manas" ? "grabbing" : "grab"
              }}
            >
              <div
                className="w-[320px] h-[320px] bg-white/95 backdrop-blur-sm border-2 border-zinc-950 rounded-2xl p-6 shadow-lg shadow-zinc-200/30 hover:shadow-xl hover:border-black hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
                style={{ fontFamily: "var(--font-questrial)" }}
              >
                {/* Default Card UI (fades out on hover) */}
                <div className="flex flex-col justify-between h-full w-full group-hover:opacity-0 transition-opacity duration-300">
                  <div className="flex-1 flex flex-col justify-start mt-2">
                    <div className="flex items-center justify-between w-full mb-3">
                      <span className="text-[9px] font-bold text-purple-600 uppercase tracking-widest">
                        COGNITIVE BRAIN
                      </span>
                    </div>
                    <h2 className="text-[26px] font-black text-[#1b253c] uppercase leading-none tracking-tighter">
                      MANAS AI
                    </h2>
                    <p className="mt-3 text-[11.5px] italic text-zinc-400 leading-snug">
                      Cognitive brain orchestrating structural reasoning, vector context retrieval (RAG), and anomaly analysis.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 mt-auto w-full no-drag">
                    <div className="overflow-hidden border-t border-[#1b253c]/8 pt-2">
                      <LogoLoop
                        logos={manasTickerLogos}
                        speed={22}
                        direction="left"
                        logoHeight={13}
                        gap={16}
                        pauseOnHover
                        renderItem={(item) => (
                          <span
                            style={{ fontFamily: "var(--font-questrial)" }}
                            className={`uppercase tracking-wide select-none whitespace-nowrap transition-colors duration-300 text-[10.5px] ${
                              item.isSeparator ? "text-[#1b253c]/20" : "text-[#1b253c]/55 font-bold"
                            }`}
                          >
                            {item.text}
                          </span>
                        )}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-zinc-100">
                      <div className="text-[9px] text-zinc-400 uppercase tracking-widest">
                        COGNITIVE BRAIN
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Graphic Overlay (fades in on hover) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 bg-white/95 rounded-2xl">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-full" />
                    <img src="/brain.png" alt="Brain" className="w-32 h-32 object-contain relative z-10" />
                  </div>
                </div>
              </div>

              {/* Chat with Manas link — floats below the card */}
              <Link
                href="/manas/chat"
                className="no-drag mt-2.5 flex items-center justify-center gap-1 text-[10px] font-bold text-purple-600/60 hover:text-purple-600 uppercase tracking-widest transition-colors duration-200 font-mono select-none group/chat"
                onClick={(e) => e.stopPropagation()}
              >
                <span>Chat with Manas</span>
              </Link>
            </div>

            {/* Factory 1 Modal Overlay */}
            {activeFactoryModal === "f1" && (
              <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setActiveFactoryModal(null)}>
                <div className="bg-[#FAF9F5] border border-zinc-200 rounded-3xl w-[1200px] h-[800px] max-w-[95vw] max-h-[90vh] p-6 shadow-2xl relative flex flex-col no-drag" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "var(--font-questrial)" }}>
                  
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-4 shrink-0">
                    <div>
                      <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">
                        FACTORY 01 — SMELTING PIPELINE
                      </span>
                      <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mt-1">
                        PRIMARY OPERATIONS FLOW CENTRE
                      </h2>
                    </div>
                    <button onClick={() => setActiveFactoryModal(null)} className="h-8 w-8 rounded-full border border-zinc-200 hover:border-zinc-400 bg-white flex items-center justify-center transition-colors">
                      ✕
                    </button>
                  </div>

                  {/* Node Workflow Graph Container */}
                  <div className="flex-grow w-full overflow-hidden relative">
                    <NodeWorkflow initialFactory="horizon" hidePills={true} />
                  </div>

                </div>
              </div>
            )}

            {/* Factory 2 Modal Overlay */}
            {activeFactoryModal === "f2" && (
              <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setActiveFactoryModal(null)}>
                <div className="bg-[#FAF9F5] border border-zinc-200 rounded-3xl w-[1200px] h-[800px] max-w-[95vw] max-h-[90vh] p-6 shadow-2xl relative flex flex-col no-drag" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "var(--font-questrial)" }}>
                  
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-4 shrink-0">
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                        FACTORY 02 — FINISHING PIPELINE
                      </span>
                      <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mt-1">
                        EXHAUST & CASING FLOW CENTRE
                      </h2>
                    </div>
                    <button onClick={() => setActiveFactoryModal(null)} className="h-8 w-8 rounded-full border border-zinc-200 hover:border-zinc-400 bg-white flex items-center justify-center transition-colors">
                      ✕
                    </button>
                  </div>

                  {/* Node Workflow Graph Container */}
                  <div className="flex-grow w-full overflow-hidden relative">
                    <NodeWorkflow initialFactory="zephyr" hidePills={true} />
                  </div>

                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </ClickSpark>
  );
}
