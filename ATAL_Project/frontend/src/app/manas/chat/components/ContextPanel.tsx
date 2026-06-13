"use client";

import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { SPRING_NAV } from "@/lib/constants";
import type { MessageFile, RagDoc } from "@/services/types";

interface ContextPanelProps {
  ragDocs: RagDoc[];
  onClose: () => void;
  onManageDocs: () => void;
  onRemoveDoc: (name: string) => void;
  onExpandFile: (file: MessageFile) => void;
}

export default function ContextPanel({
  ragDocs,
  onClose,
  onManageDocs,
  onRemoveDoc,
  onExpandFile,
}: ContextPanelProps) {
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 340, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", ...SPRING_NAV }}
      className="hidden xl:flex flex-col h-full bg-[#F7F4EC] border-l border-zinc-200/80 z-35 shrink-0 overflow-hidden"
    >
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 shrink-0 select-none">
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
              Context Panel
            </h3>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black font-mono">
              {ragDocs.length} Active Document{ragDocs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="size-7 rounded-full border border-zinc-200 hover:border-zinc-350 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer text-zinc-500 hover:text-zinc-800"
              title="Close panel"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        
        {/* Document list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full pr-1">
          {ragDocs.map((doc, idx) => (
            <div key={idx} className="bg-white border border-zinc-250/70 rounded-2xl p-4 shadow-3xs flex flex-col gap-2 transition-all hover:border-[#4A582E]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 text-[#f97316]">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate text-[#1b253c] leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                    {doc.name}
                  </p>
                  <span className="text-[10px] text-zinc-400 font-mono font-medium">{doc.size}</span>
                </div>
              </div>
              {doc.pages && doc.pages.length > 0 && doc.pages[0] && (doc.type?.startsWith("image/") || doc.name.match(/\.(png|jpg|jpeg|webp|gif|bmp)$/i)) && (
                <div 
                  className="mt-2 w-full h-24 rounded-lg overflow-hidden border border-zinc-150 relative bg-zinc-50 flex items-center justify-center cursor-pointer group/thumb" 
                  onClick={() => onExpandFile({ name: doc.name, type: doc.type || "image/png", pages: doc.pages || [] })}
                >
                  <img src={doc.pages[0]} alt={doc.name} className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105" />
                </div>
              )}
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-155/65">
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider font-mono">
                  {doc.isCustom ? "Custom File" : "Preloaded Guide"}
                </span>
                <button
                  onClick={() => onRemoveDoc(doc.name)}
                  className="text-[9px] font-bold text-red-500 hover:text-red-755 transition-colors uppercase flex items-center gap-1 cursor-pointer"
                  title="Remove from conversation context"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-zinc-200/60 shrink-0 select-none">
          <button 
            onClick={onManageDocs}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-[#f97316] text-white rounded-xl py-2.5 text-xs font-bold transition-all duration-300 shadow-sm cursor-pointer"
            style={{ fontFamily: "var(--font-pixeloid)" }}
          >
            <span>Manage Documents</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
