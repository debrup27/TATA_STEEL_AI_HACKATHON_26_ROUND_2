"use client";

import React from "react";
import Grainient from "@/animations/Grainient";

export default function AtalBottomBanner() {
  return (
    <div className="w-full flex flex-col items-center justify-center p-4 mt-8 mb-20 select-none">
      {/* Outer nested border wrapper with premium glassy styling */}
      <div className="w-full max-w-6xl p-2 rounded-[36px] border border-zinc-300/60 shadow-xl bg-zinc-100/40 backdrop-blur-md">

        <div className="relative z-0 w-full h-[380px] rounded-[28px] overflow-hidden border border-zinc-300/35 flex flex-col items-center justify-center text-center px-6">

          {/* Grainient Background */}
          <Grainient
            color1="#cf754f"
            color2="#533ac1"
            color3="#fb7070"
            timeSpeed={0.25}
            colorBalance={0.0}
            warpStrength={1.0}
            warpFrequency={5.0}
            warpSpeed={2.0}
            warpAmplitude={50.0}
            blendAngle={0.0}
            blendSoftness={0.05}
            rotationAmount={500.0}
            noiseScale={2.0}
            grainAmount={0.1}
            grainScale={2.0}
            grainAnimated={false}
            contrast={1.5}
            gamma={1.0}
            saturation={1.0}
            centerX={0.0}
            centerY={0.0}
            zoom={0.9}
            className="-z-10"
          />

          {/* Dark subtle overlay for text contrast against light gradient zones */}
          <div className="absolute inset-0 bg-black/[0.04] -z-10" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight font-sans tracking-tight mb-8 drop-shadow-xs">
              The Frontier is Yours Now <br /> with ATAL
            </h2>

            {/* Glassy, frosted sign up button */}
            <button className="bg-white/20 hover:bg-white/35 text-slate-900 border border-white/50 backdrop-blur-md font-bold text-xs md:text-sm px-8 py-3.5 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer">
              Sign Up
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
