"use client";

import React from "react";
import { X, Trash2 } from "lucide-react";
import { getPreloadedDocs } from "@/services/chat";
import type { RagDoc } from "@/services/types";

interface RagDocumentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPreloaded: string[];
  onTogglePreloaded: (name: string) => void;
  customDocs: RagDoc[];
  onUploadCustom: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveCustom: (name: string) => void;
  onConfirm: (selected: RagDoc[]) => void;
}

const PRELOADED_DOCS = getPreloadedDocs();

export default function RagDocumentSelectorModal({
  isOpen,
  onClose,
  selectedPreloaded,
  onTogglePreloaded,
  customDocs,
  onUploadCustom,
  onRemoveCustom,
  onConfirm,
}: RagDocumentSelectorModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    const selected: RagDoc[] = [];
    PRELOADED_DOCS.forEach((doc) => {
      if (selectedPreloaded.includes(doc.name)) {
        selected.push(doc);
      }
    });
    selected.push(...customDocs);
    onConfirm(selected);
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-[#FAF9F5] border border-zinc-200/85 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 text-[#1b253c]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner Accents */}
        <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/20 select-none">+</div>
        <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/20 select-none">+</div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-250/80 shrink-0">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight" style={{ fontFamily: "var(--font-questrial)" }}>
              Select Documents for RAG Context
            </h3>
            <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider font-bold">
              Choose preloaded guides or upload custom files to contextually answer queries
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center hover:bg-zinc-150 transition-colors cursor-pointer text-zinc-500 hover:text-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {/* Preloaded Section */}
          <div>
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#f97316] mb-3">Preloaded System Docs</h4>
            <div className="space-y-2.5">
              {PRELOADED_DOCS.map((doc) => {
                const isChecked = selectedPreloaded.includes(doc.name);
                return (
                  <div
                    key={doc.name}
                    onClick={() => onTogglePreloaded(doc.name)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                      isChecked
                        ? "bg-[#4A582E]/5 border-[#4A582E] text-[#1b253c]"
                        : "bg-white border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isChecked ? "bg-[#4A582E] text-white" : "bg-zinc-100 text-zinc-400"
                      }`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate pr-2" style={{ fontFamily: "var(--font-questrial)" }}>{doc.name}</p>
                        <span className="text-[10px] text-zinc-400 font-mono">{doc.size}</span>
                      </div>
                    </div>
                    
                    {/* Check indicator */}
                    <div className={`size-5 rounded-md border flex items-center justify-center transition-all ${
                      isChecked ? "bg-[#4A582E] border-[#4A582E]" : "border-zinc-350 bg-white"
                    }`}>
                      {isChecked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Upload Section */}
          <div className="border-t border-zinc-200 pt-6">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#f97316] mb-3">Custom Context Documents</h4>
            
            {/* Custom files list */}
            {customDocs.length > 0 && (
              <div className="space-y-2.5 mb-4">
                {customDocs.map((doc) => (
                  <div
                    key={doc.name}
                    className="flex items-center justify-between p-3.5 bg-white border border-zinc-200 rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 text-[#f97316]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate pr-2" style={{ fontFamily: "var(--font-questrial)" }}>{doc.name}</p>
                        <span className="text-[10px] text-zinc-455 font-semibold uppercase tracking-wider font-mono">Custom Upload • {doc.size}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveCustom(doc.name)}
                      className="p-1.5 rounded-lg border border-zinc-200 hover:border-red-200 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Box */}
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-300 rounded-2xl bg-white hover:bg-zinc-50 cursor-pointer transition-all duration-200 group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                <svg className="w-8 h-8 text-zinc-400 group-hover:text-[#f97316] transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-xs font-bold text-zinc-700" style={{ fontFamily: "var(--font-questrial)" }}>
                  Click or drag files here to upload custom documents
                </p>
                <p className="text-[9px] text-zinc-455 font-bold uppercase tracking-wider mt-1 font-mono">
                  Supports PDF, PNG, TXT, DOCX
                </p>
              </div>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={onUploadCustom}
                accept=".pdf,.png,.jpg,.jpeg,.txt,.docx"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 shrink-0 select-none bg-white">
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-650 hover:text-zinc-900 transition-colors font-bold text-xs uppercase cursor-pointer"
            style={{ fontFamily: "var(--font-pixeloid)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="h-10 px-6 bg-zinc-900 hover:bg-[#f97316] text-white rounded-xl transition-all duration-300 font-bold text-xs uppercase cursor-pointer"
            style={{ fontFamily: "var(--font-pixeloid)" }}
          >
            Load Context & Start
          </button>
        </div>
      </div>
    </div>
  );
}
