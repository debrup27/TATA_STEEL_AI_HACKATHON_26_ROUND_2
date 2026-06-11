"use client";

import React from "react";

interface ThinkingBarProps {
  text?: string;
  stopLabel?: string;
  onStop?: () => void;
  onClick?: () => void;
}

function ThinkingBar({
  text = "Thinking...",
  stopLabel = "Stop",
  onStop,
  onClick,
}: ThinkingBarProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 bg-orange-50 border border-orange-200/60 rounded-xl cursor-pointer hover:bg-orange-100/70 transition-colors group"
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
        <span className="size-2 rounded-full bg-orange-400 animate-pulse [animation-delay:0.15s]" />
        <span className="size-2 rounded-full bg-orange-500 animate-pulse [animation-delay:0.3s]" />
      </div>
      <span className="text-sm font-semibold text-orange-700 flex-1">{text}</span>
      {onStop && (
        <button
          onClick={(e) => { e.stopPropagation(); onStop() }}
          className="text-xs font-bold text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-3 py-1 rounded-full transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
        >
          {stopLabel}
        </button>
      )}
    </div>
  );
}

export { ThinkingBar };
