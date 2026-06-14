"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Trash2, ChevronDown, Eye, Check } from "lucide-react";
import { Markdown } from "@/components/ai-components/markdown";
import { getLibraryDocuments, fetchLibraryDocumentPreview, fetchLibraryDocumentFileUrl } from "@/services/chat";
import { groupLibraryDocuments, previewTextForDoc } from "@/lib/rag-doc-groups";
import { inferDocumentFormat, ragDocFormat } from "@/lib/document-format";
import { BrowserPdfViewer } from "@/components/BrowserPdfViewer";
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

function DocRow({
  doc,
  checked,
  onToggle,
  onPreview,
}: {
  doc: RagDoc;
  checked: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
        checked ? "bg-[#4A582E]/5 border-[#4A582E]" : "bg-white border-zinc-200 hover:bg-zinc-50"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`size-5 shrink-0 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
          checked ? "bg-[#4A582E] border-[#4A582E]" : "border-zinc-300 bg-white"
        }`}
      >
        {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="flex-1 min-w-0 text-left cursor-pointer"
      >
        <p className="text-xs font-bold truncate text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
          {doc.name}
        </p>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPreview(); }}
        className="shrink-0 p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-[#f97316] hover:border-orange-200 hover:bg-orange-50 transition-colors cursor-pointer"
        title="Preview"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

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
  const [libraryDocs, setLibraryDocs] = useState<RagDoc[]>([]);
  const [fetched, setFetched] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ maintenance_log: true });
  const [previewDoc, setPreviewDoc] = useState<RagDoc | null>(null);
  const [previewBody, setPreviewBody] = useState("");
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | undefined>();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<ReturnType<typeof ragDocFormat>>("text");
  const previewPdfRevokeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (previewPdfRevokeRef.current) {
        URL.revokeObjectURL(previewPdfRevokeRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    setFetched(false);
    setLibraryDocs([]);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getLibraryDocuments()
      .then((docs) => { if (!cancelled) setLibraryDocs(docs); })
      .finally(() => { if (!cancelled) setFetched(true); });
    return () => { cancelled = true; };
  }, [isOpen]);

  const groups = useMemo(() => groupLibraryDocuments(libraryDocs), [libraryDocs]);

  const selectedCount =
    selectedPreloaded.length + customDocs.length;

  const loadPreview = useCallback(async (doc: RagDoc) => {
    if (previewPdfRevokeRef.current) {
      URL.revokeObjectURL(previewPdfRevokeRef.current);
      previewPdfRevokeRef.current = undefined;
    }

    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewBody("");
    setPreviewPdfUrl(undefined);
    setPreviewFormat(ragDocFormat(doc));

    try {
      if (doc.isCustom) {
        const format = ragDocFormat(doc);
        setPreviewFormat(format);
        if (format === "pdf" && doc.pdfUrl) {
          setPreviewPdfUrl(doc.pdfUrl);
          return;
        }
        if (format === "markdown" || format === "text") {
          setPreviewBody(previewTextForDoc(doc));
        } else {
          setPreviewBody("No preview available.");
        }
        return;
      }

      if (doc.id) {
        const res = await fetchLibraryDocumentPreview(doc.id);
        const format = inferDocumentFormat(doc.name, doc.type, res.source_format);
        setPreviewFormat(format);
        if (format === "pdf") {
          const url = await fetchLibraryDocumentFileUrl(doc.id);
          previewPdfRevokeRef.current = url;
          setPreviewPdfUrl(url);
        } else {
          setPreviewBody(res.excerpt);
        }
      } else {
        setPreviewBody("No preview available.");
      }
    } catch {
      setPreviewBody("Could not load preview.");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const toggleGroupAll = (docNames: string[], selectAll: boolean) => {
    for (const name of docNames) {
      const isSelected = selectedPreloaded.includes(name);
      if (selectAll && !isSelected) onTogglePreloaded(name);
      if (!selectAll && isSelected) onTogglePreloaded(name);
    }
  };

  const handleConfirm = () => {
    const selected: RagDoc[] = [];
    libraryDocs.forEach((doc) => {
      if (selectedPreloaded.includes(doc.name)) selected.push(doc);
    });
    selected.push(...customDocs);
    onConfirm(selected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-[#FAF9F5] border border-zinc-200/85 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[88vh] flex flex-col overflow-hidden text-[#1b253c]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight" style={{ fontFamily: "var(--font-questrial)" }}>
              Concierge Context
            </h3>
            <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider font-bold">
              Select library documents or upload files — preview before loading
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="size-8 rounded-full flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer text-zinc-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
          {/* Selection list */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-zinc-200 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            {fetched && libraryDocs.length === 0 && (
              <p className="text-xs text-zinc-500">No library documents ingested yet.</p>
            )}
            {!fetched && <p className="text-xs text-zinc-500">Loading library…</p>}

            {groups.map((group) => {
              const isCollapsed = collapsed[group.key] ?? false;
              const names = group.docs.map((d) => d.name);
              const selectedInGroup = names.filter((n) => selectedPreloaded.includes(n)).length;
              const allSelected = names.length > 0 && selectedInGroup === names.length;

              return (
                <div key={group.key} className="rounded-2xl border border-zinc-200 bg-white/80 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-50/90 border-b border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !isCollapsed }))}
                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-left"
                    >
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                      />
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#f97316] truncate">
                        {group.label}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                        {selectedInGroup}/{group.docs.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleGroupAll(names, !allSelected)}
                      className="text-[9px] font-bold uppercase tracking-wide text-zinc-500 hover:text-[#4A582E] px-2 py-1 rounded-md hover:bg-zinc-100 cursor-pointer shrink-0"
                    >
                      {allSelected ? "Clear" : "All"}
                    </button>
                  </div>
                  {!isCollapsed && (
                    <div className="p-2 space-y-1.5 max-h-56 overflow-y-auto">
                      {group.docs.map((doc) => (
                        <DocRow
                          key={doc.id ?? doc.name}
                          doc={doc}
                          checked={selectedPreloaded.includes(doc.name)}
                          onToggle={() => onTogglePreloaded(doc.name)}
                          onPreview={() => loadPreview(doc)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-3">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#f97316] mb-2 px-1">
                Your Uploads
              </h4>
              {customDocs.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {customDocs.map((doc) => (
                    <div key={doc.name} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <DocRow
                          doc={doc}
                          checked
                          onToggle={() => {}}
                          onPreview={() => loadPreview(doc)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveCustom(doc.name)}
                        className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-red-500 hover:bg-red-50 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 cursor-pointer transition-colors">
                <p className="text-xs font-bold text-zinc-600">Upload PDF, TXT, or MD</p>
                <p className="text-[9px] text-zinc-400 mt-1 font-mono uppercase">via concierge only</p>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={onUploadCustom}
                  accept=".pdf,.txt,.md,.markdown,.csv"
                />
              </label>
            </div>
          </div>

          {/* Preview panel */}
          <div className="w-full lg:w-[42%] shrink-0 flex flex-col bg-[#F7F4EC]/60 min-h-[200px] lg:min-h-0">
            <div className="px-4 py-3 border-b border-zinc-200/80 shrink-0">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Preview</p>
              <p className="text-xs font-bold truncate mt-0.5" style={{ fontFamily: "var(--font-questrial)" }}>
                {previewDoc?.name ?? "Select a document"}
              </p>
            </div>
            <div className="flex-1 overflow-hidden p-3 text-sm text-zinc-700 flex flex-col min-h-0">
              {!previewDoc && (
                <p className="text-xs text-zinc-400 italic p-1">Click the eye icon on any document to preview it here.</p>
              )}
              {previewDoc && previewLoading && (
                <p className="text-xs text-zinc-500 p-1">Loading preview…</p>
              )}
              {previewDoc && !previewLoading && previewFormat === "pdf" && previewPdfUrl && (
                <BrowserPdfViewer
                  src={previewPdfUrl}
                  title={previewDoc.name}
                  className="flex-1 min-h-[320px] h-full"
                />
              )}
              {previewDoc && !previewLoading && previewFormat !== "pdf" && previewBody && (
                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-black/10">
                  <Markdown className="text-sm prose prose-zinc prose-sm max-w-none">
                    {previewBody.slice(0, 12000)}
                  </Markdown>
                </div>
              )}
            </div>
            {selectedCount > 0 && (
              <div className="px-4 py-2 border-t border-zinc-200/80 text-[10px] text-zinc-500 font-mono shrink-0">
                {selectedCount} document{selectedCount !== 1 ? "s" : ""} selected
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 shrink-0 bg-white">
          <button
            type="button"
            onClick={handleClose}
            className="h-10 px-5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-bold uppercase cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="h-10 px-6 bg-zinc-900 hover:bg-[#f97316] disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase cursor-pointer transition-colors"
          >
            Load {selectedCount > 0 ? `${selectedCount} ` : ""}into Context
          </button>
        </div>
      </div>
    </div>
  );
}
