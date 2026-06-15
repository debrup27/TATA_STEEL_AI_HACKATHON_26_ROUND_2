"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@/hooks";

// Custom Flower SVG Component with configured coordinate paths
const FlowerSVG: React.FC<{ color: "pink" | "red" | "yellow"; className?: string }> = ({ color, className }) => {
  const colorMap = {
    pink: "text-[#FF91DC]",
    red: "text-[#FA5111]",
    yellow: "text-[#F9D749]"
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="65"
      height="67"
      viewBox="0 0 65 67"
      fill="none"
      className={`${colorMap[color]} ${className}`}
    >
      {/* Petals */}
      <path
        fill="currentColor"
        d="M44.722 23.925V4.781h-4.969v9.572h-4.97V9.568h-4.969v4.785h-4.968V4.781h-4.971v19.144h-4.969v4.785h14.908v-4.785h-4.968v-4.787h4.968v4.787h4.969v-4.787h4.97v4.787h-4.97v4.785H49.69v-4.785h-4.969Z"
      />
      {/* Outer black outlines */}
      <path
        fill="#000"
        d="M9.941 52.642H4.973v4.784H9.94v-4.784ZM24.846 0h-4.971v4.781h4.971V0ZM44.722 0h-4.969v4.781h4.969V0ZM34.783 4.781h-4.969v4.787h4.969V4.781ZM29.814 9.568h-4.968v4.785h4.968V9.568ZM39.753 9.568h-4.97v4.785h4.97V9.568Z"
      />
      <path
        fill="#000"
        d="M14.91 23.93H9.941v4.785h4.969V23.93ZM54.66 23.93H49.69v4.785h4.969V23.93ZM19.875 4.781h-4.969v19.144h4.969V4.781ZM44.722 23.925h4.968V4.781h-4.968v19.144ZM29.816 19.142h-4.968v4.785h4.968v-4.785ZM39.754 19.142h-4.969v4.785h4.969v-4.785Z"
      />
      <path
        fill="#000"
        d="M24.846 52.644v4.785h-4.968v-23.93h4.969v23.93h4.97v-4.785h4.97v-4.787h-4.97V33.5h9.938v-4.785H34.783V23.93h-4.969v4.785H14.906V33.5h9.94v14.357h-4.971v4.787h4.97Z"
      />
      <path
        fill="#000"
        d="M19.879 47.858v-4.786H9.94v4.785h9.938ZM4.969 43.07h4.97v-4.785H0v14.357h4.969V43.07ZM9.941 57.426v4.786h9.938v-4.785H9.94ZM54.662 43.072h-9.94v4.785h9.94v-4.785ZM54.664 38.285v4.785h4.969v9.572H64.6V38.285h-9.937ZM59.633 52.642h-4.969v4.784h4.969v-4.784ZM19.879 62.212v4.787h24.847v-4.787H19.879ZM54.662 57.427h-9.94v4.785h9.94v-4.785Z"
      />
      {/* Stem & Leaves */}
      <path
        fill="#00A514"
        d="M54.667 43.075v4.785h-9.94v4.787H39.76v4.785h-4.97v-23.93h-4.97v23.93h-4.968v-4.785h-4.97V47.86H9.943v-4.785h-4.97v9.572h4.97v4.785h9.938v4.785h24.847v-4.785h9.94v-4.785h4.968v-9.572h-4.969Z"
      />
    </svg>
  );
};
interface Star {
  x: number;
  y: number;
  baseOpacity: number;
  currentOpacity: number;
  pulseSpeed: number;
  pulsePhase: number;
  lifetime: number;
  maxLifetime: number;
  sizeMultiplier: number;
}

const LightGradient = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={56}
    height={983}
    viewBox="0 0 56 983"
    preserveAspectRatio="none"
    fill="none"
    {...props}
  >
    <path fill="#F9E092" d="M0 240h56v743H0z" />
    <g fill="#FA5111" opacity={0.4}>
      <path d="M0 384.004h56v48H0z" opacity={0.5} />
      <path d="M0 576.006h56v48H0z" opacity={0.1} />
      <path d="M0 336.004h56v48H0z" opacity={0.6} />
      <path d="M0 528.006h56v48H0z" opacity={0.2} />
      <path d="M0 288.003h56v48H0z" opacity={0.7} />
      <path d="M0 480.005h56v48H0z" opacity={0.3} />
      <path d="M0 240.003h56v48H0z" opacity={0.8} />
      <path d="M0 432.005h56v48H0z" opacity={0.4} />
    </g>
    <path fill="#FF9549" d="M56 48H0V0h56z" opacity={0.1} />
    <path fill="#FF9549" d="M56 96H0V48h56z" opacity={0.2} />
    <path fill="#FF9549" d="M56 144.001H0v-48h56z" opacity={0.3} />
    <path fill="#FF9549" d="M56 192.002H0v-48h56z" opacity={0.6} />
    <path fill="#FF9549" d="M56 240.002H0v-48h56z" opacity={0.8} />
  </svg>
);

const DarkGradient = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={56}
    height={983}
    viewBox="0 0 56 983"
    preserveAspectRatio="none"
    fill="none"
    {...props}
  >
    <path fill="#000" d="M0 240h56v743H0z" />
    <g fill="#303990" opacity={0.4}>
      <path d="M56 839.003H0v-48h56z" opacity={0.6} />
      <path d="M56 647H0v-48h56z" opacity={0.2} />
      <path d="M56 599H0v-48h56z" opacity={0.1} />
      <path d="M56 887.003H0v-48h56z" opacity={0.7} />
      <path d="M56 695.001H0v-48h56z" opacity={0.3} />
      <path d="M56 935.004H0v-48h56z" opacity={0.75} />
      <path d="M56 743.001H0v-48h56z" opacity={0.4} />
      <path d="M56 983.004H0v-48h56z" opacity={0.8} />
      <path d="M56 791.002H0v-48h56z" opacity={0.5} />
    </g>
    <path fill="#000" d="M56 48H0V0h56z" opacity={0.1} />
    <path fill="#000" d="m56 96-56 .001v-48h56z" opacity={0.2} />
    <path fill="#000" d="M56 144.001H0v-48h56z" opacity={0.3} />
    <path fill="#000" d="M56 192.002H0v-48h56z" opacity={0.6} />
    <path fill="#000" d="M56 240.002H0v-48h56z" opacity={0.8} />
  </svg>
);

const AnimatedStars: React.FC<{ isNight: boolean }> = ({ isNight }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationRef = React.useRef<number | null>(null);
  const starsRef = React.useRef<Star[]>([]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    starsRef.current = [];

    if (!isNight) {
      return;
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      const footerElement = canvas.closest("footer");
      canvas.height = footerElement ? footerElement.offsetHeight : 800;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const generateStar = (): Star => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const minOpacity = 0.05;
      const maxOpacity = 1.0;
      const baseOpacity = minOpacity + (y / canvas.height) * (maxOpacity - minOpacity);

      return {
        x,
        y,
        baseOpacity,
        currentOpacity: baseOpacity,
        pulseSpeed: 0.008 + Math.random() * 0.012,
        pulsePhase: Math.random() * Math.PI * 2,
        lifetime: 0,
        maxLifetime: 18000 + Math.random() * 11000,
        sizeMultiplier: 0.5 + Math.random() * 1.0,
      };
    };

    const density = 2000;
    const spawnRate = 0.03;
    const numberOfStars = Math.floor((canvas.width * canvas.height) / density);

    const animate = () => {
      if (!isNight) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      starsRef.current = starsRef.current.filter((star) => {
        star.lifetime += 32;
        star.pulsePhase += star.pulseSpeed;

        const lifetimeProgress = star.lifetime / star.maxLifetime;
        let fadeMultiplier = 1;

        if (lifetimeProgress > 0.8) {
          fadeMultiplier = 1 - (lifetimeProgress - 0.8) / 0.2;
        } else if (lifetimeProgress < 0.4) {
          fadeMultiplier = lifetimeProgress / 0.4;
        }

        star.currentOpacity = star.baseOpacity * fadeMultiplier;

        const baseSize = 4;
        const size = Math.max(1, Math.round(baseSize * star.sizeMultiplier));
        const x = Math.floor(star.x);
        const y = Math.floor(star.y);

        const auraIntensity = 0.3 + 0.7 * (Math.sin(star.pulsePhase) * 0.5 + 0.5);

        const auraSize = size + 2;
        const auraOpacity = star.currentOpacity * auraIntensity * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${auraOpacity})`;
        ctx.fillRect(x - 1, y - 1, auraSize, auraSize);

        const glowSize = size + 1;
        const glowOpacity = star.currentOpacity * auraIntensity * 0.6;
        ctx.fillStyle = `rgba(255, 255, 255, ${glowOpacity})`;
        ctx.fillRect(x - 0.5, y - 0.5, glowSize, glowSize);

        ctx.fillStyle = `rgba(255, 255, 255, ${star.currentOpacity})`;
        ctx.fillRect(x, y, size, size);

        return star.lifetime < star.maxLifetime;
      });

      const currentStarCount = starsRef.current.length;
      const targetStars = numberOfStars;
      const spawnChance =
        currentStarCount < targetStars * 0.3
          ? spawnRate * 8
          : currentStarCount < targetStars * 0.7
            ? spawnRate * 3
            : spawnRate;

      if (Math.random() < spawnChance && currentStarCount < targetStars * 1.5) {
        starsRef.current.push(generateStar());
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isNight]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ imageRendering: "pixelated" }}
    />
  );
};

export default function AtalFooter() {
  const { user } = useUser();
  const [isNight, setIsNight] = React.useState(false);
  const [showDiscordModal, setShowDiscordModal] = React.useState(false);

  return (
    <footer className="w-full relative flex flex-col items-center select-none overflow-hidden pt-12 transition-colors duration-500">
      {/* 1. Horizontal Sunset Stripe Background or Starry Night */}
      <LightGradient
        className={`absolute w-full h-full bottom-0 z-0 pointer-events-none transition-opacity duration-500 ${isNight ? "opacity-0" : "opacity-100"}`}
      />
      <DarkGradient
        className={`absolute w-full h-full bottom-0 z-0 pointer-events-none transition-opacity duration-500 ${isNight ? "opacity-100" : "opacity-0"}`}
      />
      <AnimatedStars isNight={isNight} />

      {/* CSS Animation for Dog walking and twinkling stars */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes dogWalkInPlace {
          0%, 100% {
            transform: translateX(-50%) scale(1);
          }
          50% {
            transform: translateX(-50%) scale(1.02);
          }
        }

        @keyframes groundDrift {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: -100% 0;
          }
        }

        @keyframes loopScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100vw);
          }
        }
      `}} />

      {/* 2. Footer Content Wrapper */}
      <div className="relative z-10 w-full max-w-6xl px-6 pt-16 pb-36 flex flex-col items-center">
        {/* Link Columns Grid: Three columns with Logo + ATAL in the center */}
        <div className="w-full flex flex-col md:flex-row items-center md:items-start justify-between gap-12 mb-16 z-10">
          {/* OUR CONCIERGE (Left) */}
          <div className="flex flex-col gap-3 text-center md:text-left w-full md:w-1/3 md:mt-[220px]">
            <h4 style={{ fontFamily: "var(--font-questrial), monospace" }} className={`font-mono text-xs uppercase tracking-widest font-semibold transition-colors duration-500 ${isNight ? "text-zinc-400" : "text-zinc-500"}`}>
              Our Concierge
            </h4>
            <a href="/sansad" className={`text-sm hover:underline transition-all duration-300 ${isNight ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"}`}>ATAL Sansad</a>
            <a href="/manas" className={`text-sm hover:underline transition-all duration-300 ${isNight ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"}`}>ATAL Manas</a>
          </div>

          {/* ATAL LOGO AND HEADER (Middle) */}
          <div className="flex flex-col items-center justify-center text-center w-full md:w-1/3 md:mt-[50px] z-10">
            <Image
              src="/long_form_logo.webp"
              alt="ATAL Long Form Logo"
              width={400}
              height={133}
              style={{ height: "auto" }}
              className={`w-48 md:w-80 h-auto object-contain opacity-90 select-none pointer-events-none transition-all duration-500 ${isNight ? "invert brightness-200" : ""}`}
            />
          </div>

          {/* OTHERS (Right) */}
          <div className="flex flex-col gap-3 text-center md:text-right md:items-end w-full md:w-1/3 md:mt-[220px]">
            <h4 style={{ fontFamily: "var(--font-questrial), monospace" }} className={`font-mono text-xs uppercase tracking-widest font-semibold transition-colors duration-500 ${isNight ? "text-zinc-400" : "text-zinc-500"}`}>
              Others
            </h4>
            <Link href={user ? "/sansad/hub" : "/login"} className={`text-sm hover:underline transition-all duration-300 ${isNight ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"}`}>
              {user ? "Open Hub" : "Sign In"}
            </Link>
            <a href="mailto:debrupsengupta289@gmail.com" className={`text-sm hover:underline transition-all duration-300 ${isNight ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"}`}>Contact Us</a>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSdpCbbXMgn0AwNZxZ76nidZGWMJfemvEQD1EBgS518Ewefz9A/viewform?usp=header" target="_blank" rel="noopener noreferrer" className={`text-sm hover:underline transition-all duration-300 ${isNight ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"}`}>Feedback</a>
            <button 
              onClick={() => setShowDiscordModal(true)} 
              className={`text-sm hover:underline transition-all duration-300 cursor-pointer ${isNight ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"}`}
            >
              Discord ↗
            </button>
            <a href="https://github.com/debrup27/TATA_STEEL_AI_HACKATHON_26_ROUND_2" target="_blank" rel="noopener noreferrer" className={`text-sm hover:underline transition-all duration-300 ${isNight ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"}`}>GitHub ↗</a>
            <a href="https://www.linkedin.com/in/debrup-sengupta/" target="_blank" rel="noopener noreferrer" className={`text-sm hover:underline transition-all duration-300 ${isNight ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"}`}>LinkedIn ↗</a>
          </div>
        </div>

        {/* Bottom copyright and interactive theme control block */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between pt-8 z-10 gap-4">
          <div className="flex flex-col items-center md:items-start gap-2">
            {/* Light/Dark theme interactive selection buttons */}
            <div className={`flex items-center gap-1 p-1 border shadow-sm rounded-lg transition-all duration-500 select-none ${isNight ? "bg-zinc-900/60 border-zinc-800" : "bg-white/60 border-zinc-200"}`}>
              <button
                onClick={() => setIsNight(false)}
                className={`p-1 rounded transition-all duration-300 cursor-pointer ${!isNight ? "bg-white border border-zinc-200/50 shadow-sm text-zinc-800" : "text-zinc-400 hover:text-zinc-200"}`}
                aria-label="Light theme"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
              </button>
              <button
                onClick={() => setIsNight(true)}
                className={`p-1 rounded transition-all duration-300 cursor-pointer ${isNight ? "bg-zinc-800 border border-zinc-700 shadow-sm text-white" : "text-zinc-400 hover:text-zinc-600"}`}
                aria-label="Dark theme"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
              </button>
            </div>

            <p style={{ fontFamily: "var(--font-questrial), sans-serif" }} className={`text-sm font-bold tracking-[0.3em] uppercase transition-colors duration-500 ${isNight ? "text-zinc-400" : "text-zinc-500"}`}>
              ATAL
            </p>
          </div>
        </div>
      </div>

      {/* 3. Pixel Art Garden Environment at the very bottom */}
      <div className="absolute left-0 right-0 bottom-0 h-32 pointer-events-none z-10 flex flex-col justify-end">
        {/* Sun GIF setting/rising behind the grass tiles with full opacity for proper masking (lines vanish near sun) */}
        <div className={`absolute w-60 h-60 md:w-120 md:h-120 left-1/2 -translate-x-1/2 bottom-6 z-0 select-none overflow-hidden transition-opacity duration-500 ${isNight ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <Image
            src="/sun.gif"
            alt="Sun"
            width={480}
            height={480}
            unoptimized
            style={{ imageRendering: "pixelated" }}
            className="w-full h-auto object-contain translate-y-[10%] opacity-100"
          />
        </div>

        {/* Moon GIF setting/rising behind the grass tiles in dark mode */}
        <div className={`absolute w-60 h-60 md:w-120 md:h-120 left-1/2 -translate-x-1/2 bottom-6 z-0 select-none overflow-hidden transition-opacity duration-500 ${isNight ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <Image
            src="/moon.gif"
            alt="Moon"
            width={480}
            height={480}
            unoptimized
            style={{ imageRendering: "pixelated" }}
            className="w-full h-auto object-contain translate-y-[10%] opacity-100"
          />
        </div>

        {/* Grass Patches Container looping seamlessly */}
        <div
          className="absolute left-0 top-0 h-full w-[200vw] z-25 flex items-end pointer-events-none overflow-hidden"
          style={{
            animation: "loopScroll 44s linear infinite"
          }}
        >
          {/* Patch 1 */}
          <div
            className="absolute bottom-14 left-[20vw] w-[52px] h-5 bg-no-repeat"
            style={{
              backgroundImage: "url(/grass.webp?v=2)",
              backgroundSize: "52px 20px"
            }}
          />
          {/* Patch 2 */}
          <div
            className="absolute bottom-14 left-[70vw] w-[52px] h-5 bg-no-repeat"
            style={{
              backgroundImage: "url(/grass.webp?v=2)",
              backgroundSize: "52px 20px"
            }}
          />
          {/* Patch 3 (Duplicate of 1 shifted by 100vw) */}
          <div
            className="absolute bottom-14 left-[120vw] w-[52px] h-5 bg-no-repeat"
            style={{
              backgroundImage: "url(/grass.webp?v=2)",
              backgroundSize: "52px 20px"
            }}
          />
          {/* Patch 4 (Duplicate of 2 shifted by 100vw) */}
          <div
            className="absolute bottom-14 left-[170vw] w-[52px] h-5 bg-no-repeat"
            style={{
              backgroundImage: "url(/grass.webp?v=2)",
              backgroundSize: "52px 20px"
            }}
          />
        </div>

        {/* Static Pixel Flowers & Tree positioned nicely on the grass line */}
        <div className="absolute inset-x-0 bottom-14 h-48 z-30 max-w-6xl mx-auto select-none">
          <div className="absolute bottom-0" style={{ left: "10%" }}>
            <FlowerSVG color="pink" className="w-10 h-10 md:w-14 md:h-14 pixelated translate-y-1" />
          </div>
          <div className="absolute bottom-0" style={{ left: "28%" }}>
            <FlowerSVG color="red" className="w-10 h-10 md:w-14 md:h-14 pixelated -translate-x-8 translate-y-1" />
          </div>
          <div className="absolute bottom-0" style={{ right: "8%" }}>
            <Image
              src="/tree.webp"
              alt="Tree"
              width={208}
              height={320}
              unoptimized
              style={{ imageRendering: "pixelated" }}
              className="h-32 w-auto md:h-48 object-contain translate-y-1 select-none pointer-events-none"
            />
          </div>
          <div className="absolute bottom-0" style={{ right: "-7%" }}>
            <FlowerSVG color="yellow" className="w-10 h-10 md:w-14 md:h-14 pixelated translate-y-1" />
          </div>
        </div>

        {/* Walking Dog sprite walking in place across the screen */}
        <div
          style={{
            animation: "dogWalkInPlace 44s linear infinite",
            left: "50%"
          }}
          className="absolute z-35 select-none bottom-14 w-26 h-26 md:w-36 md:h-36 flex items-end justify-center"
        >
          <Image
            src="/dog_walk.webp"
            alt="Walking Dog"
            width={208}
            height={208}
            unoptimized
            className="w-full h-auto object-contain pixelated translate-y-[2px]"
          />
        </div>

        {/* Dirt Tiles Ground Block (repeated-x footer boundary) */}
        <div
          className="w-full h-14 bg-repeat-x z-20 relative -mt-0.5"
          style={{
            animation: "groundDrift 44s linear infinite",
            backgroundImage: "url(/ground_sprite.webp?v=2)",
            backgroundSize: "59px 56px"
          }}
        />
      </div>

      {/* Discord Username Info Modal */}
      {showDiscordModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FAF9F5] border border-black/20 p-6 rounded-2xl shadow-2xl max-w-xs w-full flex flex-col items-center gap-4 text-zinc-800 text-center relative select-text">
            {/* Close Button */}
            <button 
              onClick={() => setShowDiscordModal(false)}
              className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Discord Icon on top */}
            <div className="w-14 h-14 bg-[#5865F2] rounded-full flex items-center justify-center text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 127.14 96.36">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.33,2.53-2a75.76,75.76,0,0,0,73,0c.81.71,1.65,1.39,2.53,2a68.61,68.61,0,0,1-10.5,5,78.29,78.29,0,0,0,6.63,10.85,105.47,105.47,0,0,0,31.05-18.83C129.87,48.24,123.63,25.43,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
              </svg>
            </div>

            {/* Content info */}
            <div>
              <h4 className="text-zinc-400 uppercase tracking-widest text-[10px] font-bold">Discord Handle</h4>
              <p style={{ fontFamily: "var(--font-pixeloid)" }} className="text-zinc-800 text-lg font-black mt-1">debisamood</p>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
