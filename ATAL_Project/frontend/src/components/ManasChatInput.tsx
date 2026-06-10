"use client";

import React, { useState, useRef, useEffect } from "react";

const suggestedPrompts = [
  "Predict RUL for Hot Strip Mill Roller Coiler",
  "Analyze degradation trend for BF Taphole Drill",
  "Compare asset health across all factories",
  "Schedule maintenance for critical equipment",
];

export default function ManasChatInput() {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 tracking-tight">ATAL Manas</h1>
        <p className="mt-3 text-sm font-semibold text-zinc-500 tracking-wide uppercase">
          Asset Health &amp; Predictive Maintenance
        </p>
      </div>

      <div
        className={`w-full rounded-3xl transition-all duration-300 ${
          isFocused
            ? "shadow-[0_0_0_2px_#1b253c,0_8px_30px_rgba(27,37,60,0.12)]"
            : "shadow-[0_2px_20px_rgba(0,0,0,0.06)]"
        }`}
      >
        <div className="bg-white rounded-3xl border border-zinc-200/80 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about asset health, predict RUL, or analyze equipment degradation..."
              rows={1}
              maxLength={2000}
              className="w-full text-sm md:text-base text-zinc-800 placeholder-zinc-400 bg-transparent border-none resize-none focus:outline-none focus:ring-0 leading-relaxed font-sans min-h-[28px]"
            />
          </div>

          <div className="flex items-center justify-between px-5 pb-4 pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="w-9 h-9 rounded-full bg-[#1b253c] hover:bg-blue-600 disabled:bg-zinc-200 text-white flex items-center justify-center transition-all duration-300 cursor-pointer disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
              >
                <svg className="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <span className="text-[11px] font-bold text-zinc-400 select-none">
                {input.length}/2000
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-zinc-400">{input.trim() ? input.trim().split(/\s+/).length : 0} words</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-xl">
        {suggestedPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => setInput(prompt)}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-200/80 hover:border-zinc-300 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer select-none"
          >
            {prompt}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-zinc-400 text-center max-w-md leading-relaxed">
        ATAL Manas can analyze equipment health, predict remaining useful life, and recommend maintenance actions based on real-time sensor data.
      </p>
    </div>
  );
}
