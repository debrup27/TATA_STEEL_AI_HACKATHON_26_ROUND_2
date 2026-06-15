"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { Eye } from "lucide-react";
import type { Citation, MessageFile, RagDoc } from "@/services/types";
import { prepareStreamingMarkdown, normalizeTechnicalMarkdown, repairCollapsedMarkdownTables } from "@/lib/markdown-stream";
import { loadCitationPreview, citationToMessageFile, citationPreviewToMessageFile } from "@/lib/citation-preview";
import DocumentPreviewModal from "@/app/manas/chat/components/DocumentPreviewModal";
import "katex/dist/katex.min.css";

const CITE_SPLIT = /(\[\d+\])/g;
const ORPHAN_CITE = /\s*\[(\d+)\]/g;
const INLINE_CITE = /\[(\d+)\]/g;

/** Citation indices actually referenced in assistant text. */
function citedIndicesInContent(content: string, citeMap: Map<number, Citation>): Set<number> {
  const used = new Set<number>();
  if (!content || citeMap.size === 0) return used;
  for (const m of content.matchAll(INLINE_CITE)) {
    const n = Number(m[1]);
    if (citeMap.has(n)) used.add(n);
  }
  return used;
}

/** Remove [n] markers that have no matching retrieved source. */
function stripOrphanCitationMarkers(content: string, citeMap: Map<number, Citation>): string {
  if (!content) return content;
  if (citeMap.size === 0) {
    return content.replace(ORPHAN_CITE, "");
  }
  return content.replace(ORPHAN_CITE, (full, num) => (citeMap.has(Number(num)) ? full : ""));
}

function normalizeCitations(citations: Citation[]): Citation[] {
  return citations.map((c, i) => ({
    ...c,
    index: c.index ?? i + 1,
    documentId: c.documentId ?? (c as Citation & { document_id?: string }).document_id,
  }));
}

function shortDocLabel(doc: string, max = 32): string {
  const trimmed = doc.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function CitationMarker({
  n,
  citation,
  active,
  onClick,
}: {
  n: number;
  citation?: Citation;
  active: boolean;
  onClick: () => void;
}) {
  const title = citation
    ? [citation.doc, citation.section].filter(Boolean).join(" · ")
    : `Source ${n}`;

  return (
    <span className="relative inline-flex items-baseline group/cite mx-0.5">
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={`View source ${n}: ${title}`}
        className={`inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 align-super text-[9px] font-bold rounded-full border transition-all cursor-pointer ${
          active
            ? "bg-[#1b253c] text-white border-[#1b253c] shadow-md scale-110"
            : "bg-orange-100/90 text-orange-800 border-orange-300/80 hover:bg-orange-200 hover:border-orange-400"
        }`}
      >
        {n}
      </button>
      {citation?.doc ? (
        <span
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-20 whitespace-nowrap max-w-[220px] truncate rounded-lg px-2 py-1 text-[10px] font-semibold shadow-lg border transition-opacity opacity-0 group-hover/cite:opacity-100 ${
            active
              ? "bg-[#1b253c] text-white border-[#1b253c]"
              : "bg-white text-zinc-700 border-orange-200"
          }`}
        >
          {shortDocLabel(citation.doc)}
        </span>
      ) : null}
    </span>
  );
}

function TextWithCitationMarkers({
  children,
  activeIndex,
  onCiteClick,
  citeMap,
}: {
  children: React.ReactNode;
  activeIndex: number | null;
  onCiteClick: (n: number) => void;
  citeMap: Map<number, Citation>;
}) {
  if (typeof children !== "string" && typeof children !== "number") {
    return <>{children}</>;
  }
  const text = String(children);
  if (!text.includes("[")) return <>{children}</>;

  const parts = text.split(CITE_SPLIT);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!citeMap.has(n)) {
            return null;
          }
          return (
            <CitationMarker
              key={i}
              n={n}
              citation={citeMap.get(n)}
              active={activeIndex === n}
              onClick={() => onCiteClick(n)}
            />
          );
        }
        return part ? <React.Fragment key={i}>{part}</React.Fragment> : null;
      })}
    </>
  );
}

function injectCitations(
  children: React.ReactNode,
  ctx: {
    activeIndex: number | null;
    onCiteClick: (n: number) => void;
    citeMap: Map<number, Citation>;
  },
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      if (typeof child === "number") return child;
      return (
        <TextWithCitationMarkers
          activeIndex={ctx.activeIndex}
          onCiteClick={ctx.onCiteClick}
          citeMap={ctx.citeMap}
        >
          {child}
        </TextWithCitationMarkers>
      );
    }
    if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
      if (child.type === TextWithCitationMarkers || child.type === CitationMarker) {
        return child;
      }
      const inner = child.props.children;
      if (inner !== undefined && inner !== null) {
        return React.cloneElement(child, {}, injectCitations(inner, ctx));
      }
    }
    return null;
  });
}

function wrapCitations(
  children: React.ReactNode,
  ctx: {
    activeIndex: number | null;
    onCiteClick: (n: number) => void;
    citeMap: Map<number, Citation>;
  },
) {
  return injectCitations(children, ctx);
}

function HighlightedExcerpt({ text, active }: { text: string; active: boolean }) {
  const rendered = useMemo(
    () => repairCollapsedMarkdownTables(normalizeTechnicalMarkdown(text)),
    [text],
  );
  return (
    <div
      className={`mt-2.5 text-[12px] leading-relaxed rounded-lg px-3 py-2.5 border transition-all ${
        active
          ? "bg-amber-50 border-amber-300 text-zinc-800 shadow-inner ring-2 ring-amber-200/60"
          : "bg-stone-50/80 border-stone-200/90 text-zinc-600"
      }`}
    >
      <span className="text-[9px] font-bold uppercase tracking-widest text-amber-700/80 block mb-1">
        Referenced passage
      </span>
      <div className="overflow-x-auto [&_.katex]:text-[1em] [&_.katex]:leading-normal [&_.katex-display]:inline [&_.katex-display]:m-0 [&_table]:min-w-full [&_table]:text-[11px] [&_th]:border [&_th]:border-stone-200 [&_th]:bg-stone-100 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-stone-200 [&_td]:px-2 [&_td]:py-1">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[[rehypeKatex, { strict: "ignore", throwOnError: false }]]}
          components={{
            p: ({ children }) => <p className="my-1">{children}</p>,
            ul: ({ children }) => <ul className="list-disc ml-4 my-1 space-y-0.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal ml-4 my-1 space-y-0.5">{children}</ol>,
            table: ({ children }) => (
              <table className="my-2 border-collapse w-full">{children}</table>
            ),
          }}
        >
          {rendered}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function SourceCard({
  citation,
  active,
  onSelect,
  onPreview,
  onMount,
}: {
  citation: Citation;
  active: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onMount?: (el: HTMLButtonElement | null) => void;
}) {
  const n = citation.index ?? 0;
  const isUpload = citation.source === "upload";

  return (
    <div
      className={`w-full text-left rounded-xl border p-3.5 transition-all duration-200 ${
        active
          ? "border-orange-400 bg-gradient-to-br from-orange-50 via-amber-50/80 to-stone-50 shadow-md ring-2 ring-orange-200/50"
          : "border-stone-200/90 bg-gradient-to-br from-white to-stone-50/60 hover:border-orange-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <button
          type="button"
          ref={onMount}
          onClick={onSelect}
          className="shrink-0 flex items-center justify-center size-6 rounded-lg text-[11px] font-bold cursor-pointer"
          style={{
            background: active ? "#1b253c" : "#f97316",
            color: "white",
          }}
        >
          {n}
        </button>
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left cursor-pointer">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-[#1b253c] leading-snug">{citation.doc}</p>
            {isUpload ? (
              <span className="text-[9px] font-bold uppercase tracking-wide text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-md">
                Upload
              </span>
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-wide text-orange-700 bg-orange-100/80 px-1.5 py-0.5 rounded-md">
                Library
              </span>
            )}
          </div>
          {citation.section ? (
            <p className="text-[11px] text-orange-800/80 mt-1 font-semibold flex items-center gap-1">
              <span className="inline-block size-1 rounded-full bg-orange-400" />
              {citation.section}
            </p>
          ) : null}
          {citation.excerpt ? (
            <HighlightedExcerpt text={citation.excerpt} active={active} />
          ) : null}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="shrink-0 p-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer"
          title="Preview document"
          aria-label={`Preview ${citation.doc}`}
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface CitedMarkdownProps {
  content: string;
  citations?: Citation[];
  className?: string;
  streaming?: boolean;
  ragDocs?: RagDoc[];
  onExpandFile?: (file: MessageFile) => void;
}

export function CitedMarkdown({
  content,
  citations = [],
  className = "",
  streaming = false,
  ragDocs = [],
  onExpandFile,
}: CitedMarkdownProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewBody, setPreviewBody] = useState("");
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [previewFileType, setPreviewFileType] = useState<string | undefined>();
  const [previewTruncated, setPreviewTruncated] = useState(false);
  const sourceRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const normalized = useMemo(() => normalizeCitations(citations), [citations]);
  const sorted = useMemo(
    () => [...normalized].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
    [normalized],
  );

  const citeMap = useMemo(() => {
    const map = new Map<number, Citation>();
    for (const c of sorted) {
      if (c.index != null) map.set(c.index, c);
    }
    return map;
  }, [sorted]);

  const handleCiteClick = useCallback((n: number) => {
    setActiveIndex((prev) => (prev === n ? null : n));
    requestAnimationFrame(() => {
      const el = sourceRefs.current[n];
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const handlePreviewCitation = useCallback(
    async (citation: Citation) => {
      const file = citationToMessageFile(citation, ragDocs);
      if (file && onExpandFile) {
        onExpandFile(file);
        return;
      }
      setPreviewOpen(true);
      setPreviewLoading(true);
      setPreviewTitle(citation.doc);
      setPreviewBody("");
      setPreviewPages([]);
      setPreviewTruncated(false);
      try {
        const data = await loadCitationPreview(citation, ragDocs);
        if (onExpandFile && (data.sourceFormat === "pdf" || data.sourceFormat === "markdown" || data.sourceFormat === "image" || data.pages.length > 0)) {
          setPreviewOpen(false);
          onExpandFile(citationPreviewToMessageFile(data));
          return;
        }
        setPreviewTitle(data.title);
        setPreviewBody(data.body);
        setPreviewPages(data.pages);
        setPreviewFileType(data.fileType);
        setPreviewTruncated(Boolean(data.truncated));
      } finally {
        setPreviewLoading(false);
      }
    },
    [ragDocs, onExpandFile],
  );

  const renderedContent = useMemo(() => {
    const base = streaming ? prepareStreamingMarkdown(content) : content;
    const stripped = stripOrphanCitationMarkers(base, citeMap);
    return repairCollapsedMarkdownTables(normalizeTechnicalMarkdown(stripped));
  }, [content, streaming, citeMap]);

  const referencedIndices = useMemo(
    () => citedIndicesInContent(renderedContent, citeMap),
    [renderedContent, citeMap],
  );

  const displayedCitations = useMemo(
    () => sorted.filter((c) => referencedIndices.has(c.index ?? 0)),
    [sorted, referencedIndices],
  );

  const citeCtx = useMemo(
    () => ({
      activeIndex,
      onCiteClick: handleCiteClick,
      citeMap,
    }),
    [activeIndex, handleCiteClick, citeMap],
  );

  const markdownComponents = useMemo<Partial<Components>>(
    () => ({
      // react-markdown v10 drops the `inline` prop; emitting <pre> from code put
      // block code inside <p> (hydration error) and turned inline values into big
      // boxes. Never emit <pre> from code — handled by the `pre` override below.
      code: ({ className, children, ...props }) => {
        const isBlock = /language-/.test(className || "") || String(children).includes("\n");
        if (isBlock) {
          return <code className={`${className || ""} font-mono`} {...props}>{children}</code>;
        }
        return (
          <code className="bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded text-xs font-mono">
            {children}
          </code>
        );
      },
      pre: ({ children }) => (
        <pre className="bg-[#1b253c] text-stone-100 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed my-2">
          {children}
        </pre>
      ),
      h1: ({ children }) => (
        <h1 className="text-xl font-bold mt-5 mb-2">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-lg font-bold mt-5 mb-1">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-base font-bold mt-4 mb-1">{children}</h3>
      ),
      strong: ({ children }) => <strong>{children}</strong>,
      em: ({ children }) => <em>{children}</em>,
      ul: ({ children }) => <ul className="list-disc ml-5 my-2 space-y-1">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal ml-5 my-2 space-y-1">{children}</ol>,
      li: ({ children }) => <li className="my-0.5">{wrapCitations(children, citeCtx)}</li>,
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-orange-400 pl-3 my-2 text-zinc-600 italic">
          {children}
        </blockquote>
      ),
      a: ({ href, children }) => (
        <a
          href={href}
          className="text-orange-600 underline underline-offset-2 hover:text-orange-700"
          target="_blank"
          rel="noreferrer"
        >
          {children}
        </a>
      ),
      p: ({ children }) => <p className="my-1.5">{wrapCitations(children, citeCtx)}</p>,
      table: ({ children }) => (
        <div className="overflow-x-auto my-2">
          <table className="min-w-full text-sm border border-stone-200 rounded-lg border-collapse">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-stone-50">{children}</thead>,
      tbody: ({ children }) => <tbody>{children}</tbody>,
      tr: ({ children }) => <tr className="border-b border-stone-200">{children}</tr>,
      td: ({ children }) => <td className="border border-stone-200 px-2 py-1">{children}</td>,
      th: ({ children }) => (
        <th className="border border-stone-200 bg-stone-50 px-2 py-1 text-left font-semibold">
          {children}
        </th>
      ),
    }),
    [citeCtx],
  );

  const showSources =
    displayedCitations.length > 0 && (!streaming || referencedIndices.size > 0);

  return (
    <div className={className}>
      <div className="leading-relaxed manas-markdown prose prose-zinc max-w-none prose-headings:font-bold prose-p:my-1.5 prose-li:my-0.5 prose-strong:font-bold [&_.katex]:text-[1.05em] [&_.katex]:leading-normal [&_.katex-display]:inline [&_.katex-display]:m-0 [&_p:has(.katex)]:leading-[1.65]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[[rehypeKatex, { strict: "ignore", throwOnError: false }]]}
          components={markdownComponents}
        >
          {renderedContent || ""}
        </ReactMarkdown>
      </div>

      {showSources && (
        <div className="mt-5 rounded-2xl border border-orange-200/60 bg-gradient-to-b from-orange-50/40 to-stone-50/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#1b253c] text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Sources</p>
            <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
              {displayedCitations.length}
            </span>
          </div>
          <div className="p-3 space-y-2">
            {displayedCitations.map((c) => {
              const n = c.index ?? 0;
              return (
                <SourceCard
                  key={`${n}-${c.doc}`}
                  citation={c}
                  active={activeIndex === n}
                  onSelect={() => handleCiteClick(n)}
                  onPreview={() => handlePreviewCitation(c)}
                  onMount={(el) => {
                    sourceRefs.current[n] = el;
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
      {previewOpen && (
        <DocumentPreviewModal
          title={previewTitle}
          body={previewBody}
          pages={previewPages}
          fileType={previewFileType}
          loading={previewLoading}
          truncated={previewTruncated}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
