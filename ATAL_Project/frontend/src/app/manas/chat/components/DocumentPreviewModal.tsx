"use client";

import React from "react";
import { X } from "lucide-react";
import { looksLikeMarkdown } from "@/lib/document-format";
import { Markdown } from "@/components/ai-components/markdown";

interface DocumentPreviewModalProps {
  title: string;
  body?: string;
  pages?: string[];
  fileType?: string;
  loading?: boolean;
  truncated?: boolean;
  onClose: () => void;
}

export default function DocumentPreviewModal({
  title,
  body = "",
  pages = [],
  loading = false,
  truncated = false,
  onClose,
}: DocumentPreviewModalProps) {
  const displayBody = body.slice(0, 24_000);
  const useMarkdown = looksLikeMarkdown(displayBody);

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF9F5] rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-w-4xl w-full max-h-[92vh] border border-zinc-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-zinc-200 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
              Document preview
            </p>
            <p className="text-sm font-bold text-[#1b253c] truncate">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center hover:bg-red-50 text-zinc-500 hover:text-red-600 transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white/80 min-h-[280px] max-h-[calc(92vh-5rem)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="size-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
              <p className="text-sm text-zinc-500">Loading document…</p>
            </div>
          )}
          {!loading && pages.length > 0 && (
            <div className="flex flex-col items-center gap-4">
              {pages.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${title} — page ${i + 1}`}
                  className="w-full max-w-3xl rounded-lg border border-zinc-200 shadow-sm"
                />
              ))}
            </div>
          )}
          {!loading && !pages.length && displayBody && (
            useMarkdown ? (
              <Markdown className="text-sm prose prose-zinc max-w-none prose-p:leading-relaxed">
                {displayBody}
              </Markdown>
            ) : (
              <div className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap font-sans">
                {displayBody}
              </div>
            )
          )}
          {!loading && !pages.length && !displayBody && (
            <p className="text-sm text-zinc-500 italic text-center py-12">
              No preview available for this document.
            </p>
          )}
        </div>

        {!loading && truncated && (
          <div className="shrink-0 px-4 py-2 border-t border-zinc-200 bg-zinc-50 text-[10px] text-zinc-500 text-center">
            Showing the first {displayBody.length.toLocaleString()} characters — full document is in the library.
          </div>
        )}
      </div>
    </div>
  );
}
