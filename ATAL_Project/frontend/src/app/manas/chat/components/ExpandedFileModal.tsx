"use client";

import React from "react";
import { X } from "lucide-react";
import type { MessageFile } from "@/services/types";

interface ExpandedFileModalProps {
  file: MessageFile | null;
  onClose: () => void;
}

export default function ExpandedFileModal({
  file,
  onClose,
}: ExpandedFileModalProps) {
  if (!file || !file.pages || file.pages.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-w-7xl max-h-[92vh] w-max h-max animate-in fade-in zoom-in duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-zinc-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <p className="text-sm font-semibold text-zinc-700 truncate">{file.name}</p>
            {file.type === "application/pdf" && (
              <span className="text-xs text-zinc-400 shrink-0">
                {file.pages.length} page{file.pages.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors cursor-pointer shrink-0 text-zinc-500 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto bg-zinc-100 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400">
          {file.pages.length === 1 && file.type !== "application/pdf" ? (
            <div className="flex items-center justify-center p-4 min-h-[300px] max-h-[82vh]">
              <img
                src={file.pages[0]}
                alt={file.name ?? "Image"}
                className="max-w-full max-h-full rounded-lg shadow-md object-contain"
                draggable={false}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6 px-4">
              {file.pages.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${file.name} - page ${i + 1}`}
                  className="w-full max-w-3xl rounded-lg shadow-md"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
