"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function AtalVideoSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 mt-12 mb-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full max-w-6xl">
        
        {/* Left Column: Description & Action */}
        <div className="lg:col-span-5 flex flex-col items-start text-left select-none">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950 mb-4 leading-tight font-sans">
            Steel Can
          </h2>
          <p className="text-sm md:text-base text-zinc-500 font-medium leading-relaxed mb-6">
            From real-time sensor monitoring preventing catastrophic furnace delays to interactive agent diagnostics on the mill floor, AI built for steel manufacturing is changing what's possible.
          </p>
          <button className="bg-[#1b253c] hover:bg-blue-600 text-white font-bold text-xs md:text-sm px-6 py-3.5 rounded-full transition-all duration-300 shadow-md cursor-pointer transform hover:scale-105 active:scale-95">
            Sign Up
          </button>
        </div>

        {/* Right Column: Video Card Preview */}
        <div className="lg:col-span-7 w-full">
          <div className="relative aspect-video w-full rounded-3xl overflow-hidden border border-zinc-100 shadow-lg group bg-zinc-900">
            {/* Background Image */}
            <Image
              src="/steel_factory_operations.png"
              alt="Steel Factory Operations Video Preview"
              fill
              sizes="(max-width: 1024px) 100vw, 700px"
              className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
              priority
            />

            {/* Dark Overlay on Hover */}
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300" />

            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => setIsOpen(true)}
                className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md border border-white/40 text-white flex items-center justify-center shadow-2xl cursor-pointer transition-all duration-300 transform hover:scale-110 active:scale-95"
                aria-label="Play Demo Video"
              >
                <svg className="w-6 h-6 text-white fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Video/Demo Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 md:p-10 select-none cursor-default"
          >
            {/* Modal Backdrop Close Zone */}
            <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

            {/* Content Card */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden aspect-video z-10 flex flex-col justify-between p-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 p-2 rounded-full transition-colors duration-150 cursor-pointer z-20"
                aria-label="Close Modal"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Interactive Dashboard / Video Loop Simulation */}
              <div className="flex-grow flex flex-col items-center justify-center text-center gap-4 px-6 relative overflow-hidden h-full">
                
                {/* Glowing light effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/10 rounded-full filter blur-3xl pointer-events-none" />

                {/* Animated Scanner Radar / High Tech Mockup */}
                <div className="relative w-24 h-24 rounded-full border border-blue-500/30 flex items-center justify-center animate-pulse mb-2">
                  <div className="w-16 h-16 rounded-full border border-blue-400/50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-xl md:text-2xl font-extrabold text-white">ATAL Live Demonstration</h3>
                <p className="text-xs md:text-sm text-zinc-400 max-w-md leading-relaxed select-text">
                  Replaying simulated taphole telemetry diagnostics... <br />
                  <span className="font-mono text-[10px] text-green-500 mt-2 block">
                    [INFO] Connection established. Telemetry streams active. <br />
                    [DIAG] Friction levels stabilized. Bearing status: HEALTHY.
                  </span>
                </p>
              </div>

              {/* Simulated Player Controls Bar */}
              <div className="flex items-center justify-between border-t border-zinc-900 pt-3 select-none">
                <div className="flex items-center gap-4">
                  <button className="text-zinc-400 hover:text-white cursor-pointer">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  </button>
                  <span className="text-[10px] font-mono text-zinc-500">0:14 / 2:30</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">1080p HD</span>
                  <button className="text-zinc-400 hover:text-white cursor-pointer">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
