"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Maximize2, X, Sparkles } from "lucide-react";
import HubMarkdown from "./HubMarkdown";

interface InsightPanelProps {
  title: string;
  text?: string;
  loading?: boolean;
}

/**
 * MANAS insight card with a pop-out modal. Long LLM responses get clamped in the inline card and
 * the user can expand to read the full response in a centered modal.
 */
export default function ManasInsightPanel({ title, text, loading }: InsightPanelProps) {
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3 flex items-center gap-2 text-orange-700">
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-wider">Generating MANAS insight…</p>
      </div>
    );
  }
  if (!text?.trim()) return null;

  const isLong = text.length > 320;

  return (
    <>
      <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3 relative">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase text-orange-700 tracking-wider">{title}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            className="flex items-center gap-1 text-[9px] font-bold uppercase text-orange-600 hover:text-orange-800 transition-colors cursor-pointer shrink-0"
            title="Pop out full response"
          >
            <Maximize2 className="w-3 h-3" />
            Expand
          </button>
        </div>
        <HubMarkdown
          className={`text-xs mt-1.5 ${isLong ? "line-clamp-4" : ""}`}
        >
          {text}
        </HubMarkdown>
        {isLong && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            className="mt-1.5 text-[10px] font-bold text-orange-600 hover:text-orange-800 cursor-pointer"
          >
            Read full response →
          </button>
        )}
      </div>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={() => setOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 bg-orange-50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <p className="text-xs font-black uppercase text-orange-700 tracking-wider">{title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="size-8 rounded-full bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-5">
                <HubMarkdown className="text-sm">{text}</HubMarkdown>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
