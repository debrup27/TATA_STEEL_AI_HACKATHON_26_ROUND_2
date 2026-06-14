"use client";

import { Pause, Play, RefreshCw } from "lucide-react";

interface SystemLogControlsProps {
  isLive: boolean;
  onToggleLive: () => void;
  onClear: () => void;
  compact?: boolean;
}

export function SystemLogControls({
  isLive,
  onToggleLive,
  onClear,
  compact = false,
}: SystemLogControlsProps) {
  const btnClass = compact
    ? "h-7 px-2.5 rounded-lg text-[9px] gap-1"
    : "h-10 px-4 rounded-xl text-xs gap-2";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggleLive}
        title={isLive ? "Pause frontend stream" : "Resume frontend stream"}
        className={`${btnClass} flex items-center justify-center transition-all duration-300 font-bold border uppercase cursor-pointer select-none ${
          isLive
            ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
        }`}
        style={{ fontFamily: "var(--font-pixeloid)" }}
      >
        {isLive ? <Pause className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} /> : <Play className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />}
        {isLive ? "Pause" : "Resume"}
      </button>
      <button
        type="button"
        onClick={onClear}
        title="Clear view (frontend only)"
        className={`${btnClass} bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200 flex items-center justify-center transition-all duration-300 font-bold uppercase cursor-pointer select-none`}
        style={{ fontFamily: "var(--font-pixeloid)" }}
      >
        <RefreshCw className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        Clear
      </button>
    </div>
  );
}
