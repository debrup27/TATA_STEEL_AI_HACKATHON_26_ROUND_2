"use client";

import React, { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Eye, X } from "lucide-react";
import { groupLibraryDocuments, previewTextForDoc } from "@/lib/rag-doc-groups";
import { inferDocumentFormat, ragDocFormat } from "@/lib/document-format";
import { fetchLibraryDocumentPreview } from "@/services/chat";
import { buildExpandedPreviewFile } from "./ExpandedFileModal";
import { SPRING_NAV } from "@/lib/constants";
import type { DocumentSourceFormat, MessageFile, RagDoc } from "@/services/types";
import DocumentPreviewModal from "./DocumentPreviewModal";

interface ContextPanelProps {
  ragDocs: RagDoc[];
  onClose: () => void;
  onManageDocs: () => void;
  onRemoveDoc: (name: string) => void;
  onExpandFile: (file: MessageFile) => void;
}

function DocCard({
  doc,
  onRemove,
  onExpandFile,
  onPreview,
}: {
  doc: RagDoc;
  onRemove: () => void;
  onExpandFile: (file: MessageFile) => void;
  onPreview: () => void;
}) {
  const groupLabel = doc.isCustom
    ? "Upload"
    : (doc.docType || doc.type || "library");

  return (
    <div className="bg-white border border-zinc-250/70 rounded-2xl p-4 shadow-3xs flex flex-col gap-2 transition-all hover:border-[#4A582E]">
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
        <button
          type="button"
          onClick={onPreview}
          className="shrink-0 p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-[#f97316] hover:border-orange-200 hover:bg-orange-50 transition-colors cursor-pointer"
          title="Preview"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
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
          {groupLabel}
        </span>
        <button
          onClick={onRemove}
          className="text-[9px] font-bold text-red-500 hover:text-red-755 transition-colors uppercase flex items-center gap-1 cursor-pointer"
          title="Remove from conversation context"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function ContextPanel({
  ragDocs,
  onClose,
  onManageDocs,
  onRemoveDoc,
  onExpandFile,
}: ContextPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ maintenance_log: true });
  const [previewDoc, setPreviewDoc] = useState<RagDoc | null>(null);
  const [previewBody, setPreviewBody] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTruncated, setPreviewTruncated] = useState(false);

  const libraryDocs = useMemo(() => ragDocs.filter((d) => !d.isCustom), [ragDocs]);
  const customDocs = useMemo(() => ragDocs.filter((d) => d.isCustom), [ragDocs]);
  const groups = useMemo(() => groupLibraryDocuments(libraryDocs), [libraryDocs]);

  const loadPreview = useCallback(async (doc: RagDoc) => {
    if (ragDocFormat(doc) === "image" && doc.pages?.length) {
      onExpandFile(buildExpandedPreviewFile(doc.name, { type: doc.type, pages: doc.pages, sourceFormat: "image" }));
      return;
    }

    let format: DocumentSourceFormat = ragDocFormat(doc);
    let body = doc.textContent?.trim() || "";

    if (doc.id && !doc.isCustom) {
      try {
        const res = await fetchLibraryDocumentPreview(doc.id);
        format = inferDocumentFormat(doc.name, doc.type, res.source_format);
        if (!body && format !== "pdf") {
          body = res.excerpt;
        }
      } catch {
        if (!body) body = "Could not load preview.";
      }
    }

    if (format === "pdf") {
      onExpandFile(
        buildExpandedPreviewFile(doc.name, {
          type: doc.type || "application/pdf",
          pages: doc.pages,
          pdfUrl: doc.pdfUrl,
          documentId: doc.isCustom ? undefined : doc.id,
          sourceFormat: "pdf",
        }),
      );
      return;
    }

    if (format === "markdown" || format === "html" || format === "text") {
      onExpandFile(
        buildExpandedPreviewFile(doc.name, {
          type: doc.type,
          body: body || previewTextForDoc(doc),
          documentId: doc.isCustom ? undefined : doc.id,
          sourceFormat: format,
        }),
      );
      return;
    }

    setPreviewDoc(doc);
    setPreviewModalOpen(true);
    setPreviewLoading(true);
    setPreviewBody("");
    setPreviewTruncated(false);
    try {
      if (doc.isCustom) {
        setPreviewBody(previewTextForDoc(doc));
      } else if (doc.id) {
        const res = await fetchLibraryDocumentPreview(doc.id);
        setPreviewBody(res.excerpt);
        setPreviewTruncated(Boolean(res.truncated));
      } else {
        setPreviewBody("No preview available.");
      }
    } catch {
      setPreviewBody("Could not load preview.");
    } finally {
      setPreviewLoading(false);
    }
  }, [onExpandFile]);

  const closePreview = () => {
    setPreviewModalOpen(false);
    setPreviewDoc(null);
    setPreviewBody("");
  };

  const panelBody = (
    <div className="p-6 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 shrink-0 select-none">
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
            Context Panel
          </h3>
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black font-mono">
            {ragDocs.length} Active Document{ragDocs.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={onClose}
          className="size-7 rounded-full border border-zinc-200 hover:border-zinc-350 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer text-zinc-500 hover:text-zinc-800"
          title="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full pr-1 min-h-0">
        {groups.map((group) => {
          const isCollapsed = collapsed[group.key] ?? false;
          return (
            <div key={group.key} className="rounded-2xl border border-zinc-200/80 bg-white/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !isCollapsed }))}
                className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-50/90 border-b border-zinc-100 cursor-pointer text-left"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f97316] truncate flex-1">
                  {group.label}
                </span>
                <span className="text-[9px] text-zinc-400 font-mono">{group.docs.length}</span>
              </button>
              {!isCollapsed && (
                <div className="p-2 space-y-2">
                  {group.docs.map((doc) => (
                    <DocCard
                      key={doc.id ?? doc.name}
                      doc={doc}
                      onRemove={() => onRemoveDoc(doc.name)}
                      onExpandFile={onExpandFile}
                      onPreview={() => loadPreview(doc)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {customDocs.length > 0 && (
          <div className="rounded-2xl border border-zinc-200/80 bg-white/50 overflow-hidden">
            <div className="px-3 py-2 bg-zinc-50/90 border-b border-zinc-100">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f97316]">
                Your Uploads
              </span>
              <span className="text-[9px] text-zinc-400 font-mono ml-2">{customDocs.length}</span>
            </div>
            <div className="p-2 space-y-2">
              {customDocs.map((doc) => (
                <DocCard
                  key={doc.name}
                  doc={doc}
                  onRemove={() => onRemoveDoc(doc.name)}
                  onExpandFile={onExpandFile}
                  onPreview={() => loadPreview(doc)}
                />
              ))}
            </div>
          </div>
        )}
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
  );

  return (
    <>
      {/* Mobile / tablet: floating bottom sheet */}
      <motion.div
        key="context-mobile"
        className="xl:hidden fixed inset-0 z-50 flex flex-col justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          onClick={onClose}
          aria-label="Close context panel"
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", ...SPRING_NAV }}
          className="relative flex flex-col max-h-[min(88dvh,720px)] w-full rounded-t-2xl border-t border-zinc-200/80 bg-[#F7F4EC] shadow-[0_-12px_48px_rgba(0,0,0,0.18)] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Context panel"
        >
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-zinc-300" aria-hidden />
          </div>
          {panelBody}
        </motion.div>
      </motion.div>

      {/* Desktop: right rail */}
      <motion.div
        key="context-desktop"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 340, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ type: "spring", ...SPRING_NAV }}
        className="hidden xl:flex flex-col h-full bg-[#F7F4EC] border-l border-zinc-200/80 z-35 shrink-0 overflow-hidden"
      >
        {panelBody}
      </motion.div>

      {previewModalOpen && previewDoc && (
        <DocumentPreviewModal
          title={previewDoc.name}
          body={previewBody}
          pages={
            previewDoc.pages?.[0]?.startsWith("data:image") ? previewDoc.pages : []
          }
          fileType={previewDoc.type}
          loading={previewLoading}
          truncated={previewTruncated}
          onClose={closePreview}
        />
      )}
    </>
  );
}
