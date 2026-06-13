"use client";

import React from "react";

interface VerticalMarqueeProps {
  direction: "up" | "down";
  side: "left" | "right";
  text: string;
}

export default function VerticalMarquee({
  direction,
  side,
  text,
}: VerticalMarqueeProps) {
  const sideClass = side === "left" ? "left-0 border-r" : "right-0 border-l";
  const animClass = direction === "up" ? "animate-marquee-up" : "animate-marquee-down";

  // Create duplicate arrays to ensure continuous scrolling
  const marqueeItems = Array(6).fill(text).concat(Array(6).fill(text));

  return (
    <div className={`absolute top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start border-zinc-200 bg-[#FAF9F5] ${sideClass}`}>
      <div className={`${animClass} flex flex-col items-center w-full`}>
        {marqueeItems.map((item, idx) => (
          <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200/60 py-12 pointer-events-auto">
            <span className="atal-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider select-none">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
