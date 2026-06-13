"use client";

import React from "react";
import { Plus, RotateCcw } from "lucide-react";

interface WorkflowZoomControlsProps {
  onZoom: (type: "in" | "out" | "reset") => void;
}

export default function WorkflowZoomControls({
  onZoom,
}: WorkflowZoomControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-20 flex bg-white border border-zinc-200/80 shadow-md rounded-xl p-1 gap-0.5 select-none pointer-events-auto">
      <button 
        onClick={() => onZoom("in")} 
        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
        title="Zoom In"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button 
        onClick={() => onZoom("out")} 
        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
        title="Zoom Out"
      >
        <span className="font-extrabold text-sm select-none leading-none">-</span>
      </button>
      <button 
        onClick={() => onZoom("reset")} 
        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
        title="Reset View"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
