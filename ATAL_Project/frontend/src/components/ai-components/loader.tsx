"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";

interface LoaderProps {
  variant?:
    | "circular"
    | "classic"
    | "pulse"
    | "pulse-dot"
    | "dots"
    | "typing"
    | "wave"
    | "bars"
    | "terminal"
    | "text-blink"
    | "text-shimmer"
    | "loading-dots";
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const sizeMap = {
  sm: { dot: "size-1.5", icon: "size-3", text: "text-xs", bar: "w-1 h-3" },
  md: { dot: "size-2", icon: "size-4", text: "text-sm", bar: "w-1.5 h-4" },
  lg: { dot: "size-2.5", icon: "size-5", text: "text-base", bar: "w-2 h-5" },
};

function Circular({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = sizeMap[size];
  return (
    <span
      className={`${s.icon} border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin`}
    />
  );
}

function Classic({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = sizeMap[size];
  return (
    <span
      className={`${s.icon} border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin`}
    />
  );
}

function Pulse({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = sizeMap[size];
  return (
    <span
      className={`${s.dot} rounded-full bg-zinc-500 animate-ping`}
    />
  );
}

function PulseDot({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = sizeMap[size];
  return (
    <span
      className={`${s.dot} rounded-full bg-zinc-500 animate-pulse`}
    />
  );
}

function Dots({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = sizeMap[size];
  return (
    <span className="flex items-center gap-1">
      <span className={`${s.dot} rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]`} />
      <span className={`${s.dot} rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]`} />
      <span className={`${s.dot} rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]`} />
    </span>
  );
}

function Typing({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = sizeMap[size];
  return (
    <span className="flex items-center gap-1">
      <span className={`${s.dot} rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]`} />
      <span className={`${s.dot} rounded-full bg-zinc-400 animate-bounce [animation-delay:200ms]`} />
      <span className={`${s.dot} rounded-full bg-zinc-400 animate-bounce [animation-delay:400ms]`} />
    </span>
  );
}

function Wave({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const heights = { sm: 12, md: 16, lg: 20 };
  const h = heights[size];
  return (
    <span className="flex items-center gap-[2px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="rounded-full bg-zinc-400"
          style={{ width: size === "sm" ? 4 : size === "md" ? 6 : 8, height: h }}
          animate={{ height: [h, h * 2.5, h] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
        />
      ))}
    </span>
  );
}

function Bars({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const h = { sm: 12, md: 16, lg: 20 }[size];
  const w = { sm: 4, md: 6, lg: 8 }[size];
  return (
    <span className="flex items-center gap-[3px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="bg-zinc-400 rounded-sm"
          style={{ width: w, height: h }}
          animate={{ scaleY: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
        />
      ))}
    </span>
  );
}

function Terminal({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = sizeMap[size];
  return (
    <span className={`font-mono ${s.text} text-zinc-500 animate-pulse`}>
      &gt;_
    </span>
  );
}

function TextBlink({ text = "Loading", size = "md" }: { text?: string; size?: "sm" | "md" | "lg" }) {
  const s = sizeMap[size];
  return (
    <span className={`${s.text} font-semibold text-zinc-600 animate-pulse`}>
      {text}
    </span>
  );
}

function TextShimmerLoader({ text = "Loading", size = "md" }: { text?: string; size?: "sm" | "md" | "lg" }) {
  const id = useId();
  const s = sizeMap[size];
  return (
    <>
      <style>{`@keyframes shimmer-loader-${id} { 0%,100% { background-position: 200% center } 50% { background-position: -200% center } }`}</style>
      <span
        className={`inline-block bg-clip-text text-transparent font-medium ${s.text}`}
        style={{
          backgroundImage: "linear-gradient(90deg, #a1a1aa 0%, #18181b 40%, #a1a1aa 80%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          animation: `shimmer-loader-${id} 4s ease-in-out infinite`,
        }}
      >
        {text}
      </span>
    </>
  );
}

function LoadingDots({ text = "Loading", size = "md" }: { text?: string; size?: "sm" | "md" | "lg" }) {
  const s = sizeMap[size];
  return (
    <span className={`${s.text} font-semibold text-zinc-600`}>
      {text}
      <span className="animate-pulse">.</span>
      <span className="animate-pulse [animation-delay:200ms]">.</span>
      <span className="animate-pulse [animation-delay:400ms]">.</span>
    </span>
  );
}

function Loader({
  variant = "circular",
  size = "md",
  text = "Loading",
  className = "",
}: LoaderProps) {
  const renderer = () => {
    switch (variant) {
      case "circular": return <Circular size={size} />;
      case "classic": return <Classic size={size} />;
      case "pulse": return <Pulse size={size} />;
      case "pulse-dot": return <PulseDot size={size} />;
      case "dots": return <Dots size={size} />;
      case "typing": return <Typing size={size} />;
      case "wave": return <Wave size={size} />;
      case "bars": return <Bars size={size} />;
      case "terminal": return <Terminal size={size} />;
      case "text-blink": return <TextBlink text={text} size={size} />;
      case "text-shimmer": return <TextShimmerLoader text={text} size={size} />;
      case "loading-dots": return <LoadingDots text={text} size={size} />;
      default: return <Circular size={size} />;
    }
  };

  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {renderer()}
    </span>
  );
}

export { Loader, TextShimmerLoader };
