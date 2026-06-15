"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { BrowserPdfViewer } from "@/components/BrowserPdfViewer";
import { Markdown } from "@/components/ai-components/markdown";
import { inferDocumentFormat, looksLikeMarkdown, messageFileFormat } from "@/lib/document-format";
import { fetchLibraryDocumentFileUrl, fetchLibraryDocumentPreview } from "@/services/chat";
import type { MessageFile } from "@/services/types";

interface ExpandedFileModalProps {
  file: MessageFile | null;
  onClose: () => void;
}

function ExpandedFileModalBody({ file, onClose }: { file: MessageFile; onClose: () => void }) {
  const format = useMemo(() => messageFileFormat(file), [file]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState(() => (format === "pdf" ? "" : file.body?.trim() || ""));
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(file.pdfUrl);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revokedUrl: string | undefined;

    const run = async () => {
      if (format !== "pdf") {
        if ((format === "markdown" || format === "html" || format === "text") && !file.body?.trim() && file.documentId) {
          setLoading(true);
          try {
            const res = await fetchLibraryDocumentPreview(file.documentId);
            setBody(res.excerpt || "");
            setTruncated(Boolean(res.truncated));
          } catch {
            setError("Could not load document preview.");
          } finally {
            setLoading(false);
          }
        }
        return;
      }

      if (file.pdfUrl) {
        setPdfUrl(file.pdfUrl);
        return;
      }

      if (file.documentId) {
        setLoading(true);
        try {
          revokedUrl = await fetchLibraryDocumentFileUrl(file.documentId);
          setPdfUrl(revokedUrl);
        } catch {
          setError("Could not load PDF from library.");
        } finally {
          setLoading(false);
        }
      } else if (!file.pdfUrl) {
        setError("No PDF preview available.");
      }
    };

    void run();

    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [file, format]);

  const hasPdf = format === "pdf" && Boolean(pdfUrl);
  const hasImage = format === "image" && Boolean(file.pages?.length);
  const displayBody = body.slice(0, 24_000);
  const useMarkdown =
    format === "markdown" || (format !== "html" && looksLikeMarkdown(displayBody));

  if (!hasPdf && !hasImage && !displayBody && !loading && error) {
    return (
      <ModalShell name={file.name} onClose={onClose} pdfMode={false}>
        <p className="text-sm text-red-600 text-center py-12">{error}</p>
      </ModalShell>
    );
  }

  if (!hasPdf && !hasImage && !displayBody && !loading) return null;

  return (
    <ModalShell name={file.name} onClose={onClose} pdfMode={hasPdf} truncated={truncated} truncatedChars={displayBody.length}>
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="size-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
          <p className="text-sm text-zinc-500">Loading document…</p>
        </div>
      )}

      {!loading && hasPdf && pdfUrl && (
        <BrowserPdfViewer src={pdfUrl} title={file.name} className="h-[78vh]" />
      )}

      {!loading && hasImage && file.pages && (
        <div className="flex items-center justify-center p-4 min-h-[300px]">
          <img
            src={file.pages[0]}
            alt={file.name}
            className="max-w-full max-h-[78vh] rounded-lg shadow-md object-contain"
            draggable={false}
          />
        </div>
      )}

      {!loading && !hasPdf && !hasImage && displayBody && (
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
    </ModalShell>
  );
}

export default function ExpandedFileModal({ file, onClose }: ExpandedFileModalProps) {
  if (!file) return null;
  return (
    <ExpandedFileModalBody
      key={`${file.documentId ?? file.name}-${file.pdfUrl ?? ""}`}
      file={file}
      onClose={onClose}
    />
  );
}

function ModalShell({
  name,
  onClose,
  children,
  truncated,
  truncatedChars,
  pdfMode,
}: {
  name: string;
  onClose: () => void;
  children: React.ReactNode;
  truncated?: boolean;
  truncatedChars?: number;
  pdfMode: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-6"
      onClick={onClose}
    >
      <div
        className={`bg-[#FAF9F5] rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden w-full max-h-[92vh] border border-zinc-200/80 ${pdfMode ? "max-w-6xl" : "max-w-5xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-zinc-200 shrink-0">
          <p className="text-sm font-semibold text-zinc-700 truncate">{name}</p>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors cursor-pointer shrink-0 text-zinc-500 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
        <div
          className={
            pdfMode
              ? "flex-1 min-h-0 bg-zinc-200 p-2 md:p-3"
              : "overflow-y-auto bg-white/90 p-4 md:p-6 min-h-[280px] max-h-[calc(92vh-5rem)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full"
          }
        >
          {children}
        </div>
        {truncated && truncatedChars != null && (
          <div className="shrink-0 px-4 py-2 border-t border-zinc-200 bg-zinc-50 text-[10px] text-zinc-500 text-center">
            Showing the first {truncatedChars.toLocaleString()} characters — full document is in the library.
          </div>
        )}
      </div>
    </div>
  );
}

export function buildExpandedPreviewFile(
  name: string,
  opts: {
    type?: string;
    pages?: string[];
    body?: string;
    documentId?: string;
    pdfUrl?: string;
    sourceFormat?: string;
  } = {},
): MessageFile {
  const sourceFormat = inferDocumentFormat(name, opts.type, opts.sourceFormat);
  return {
    name,
    type: opts.type || (sourceFormat === "pdf" ? "application/pdf" : "text/plain"),
    pages: opts.pages,
    body: opts.body,
    documentId: opts.documentId,
    pdfUrl: opts.pdfUrl,
    sourceFormat,
  };
}
