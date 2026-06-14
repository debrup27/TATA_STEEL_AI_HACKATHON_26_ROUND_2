"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import type { Citation } from "@/services/types";

const CITE_SPLIT = /(\[\d+\])/g;

function normalizeCitations(citations: Citation[]): Citation[] {
  return citations.map((c, i) => ({
    ...c,
    index: c.index ?? i + 1,
  }));
}

function CitationMarker({
  n,
  active,
  onClick,
}: {
  n: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center min-w-[1.15rem] h-[1.15rem] px-0.5 mx-0.5 align-super text-[10px] font-bold rounded-md border transition-colors cursor-pointer ${
        active
          ? "bg-orange-500 text-white border-orange-500 shadow-sm"
          : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300"
      }`}
      title={`View source ${n}`}
    >
      {n}
    </button>
  );
}

function TextWithCitationMarkers({
  children,
  activeIndex,
  onCiteClick,
}: {
  children: React.ReactNode;
  activeIndex: number | null;
  onCiteClick: (n: number) => void;
}) {
  const text = String(children);
  if (!text.includes("[")) return <>{children}</>;

  const parts = text.split(CITE_SPLIT);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const n = parseInt(match[1], 10);
          return (
            <CitationMarker
              key={i}
              n={n}
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

function SourceCard({
  citation,
  active,
  onMount,
}: {
  citation: Citation;
  active: boolean;
  onMount?: (el: HTMLDivElement | null) => void;
}) {
  const n = citation.index ?? 0;
  const isUpload = citation.source === "upload";

  return (
    <div
      ref={onMount}
      className={`rounded-xl border p-3 transition-all ${
        active
          ? "border-orange-300 bg-orange-50/60 shadow-sm"
          : "border-zinc-200 bg-zinc-50/80"
      }`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <span
          className={`shrink-0 flex items-center justify-center size-5 rounded-md text-[10px] font-bold ${
            active ? "bg-orange-500 text-white" : "bg-white text-orange-700 border border-orange-200"
          }`}
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold text-zinc-800 truncate">{citation.doc}</p>
            {isUpload && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                Upload
              </span>
            )}
          </div>
          {citation.section ? (
            <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">{citation.section}</p>
          ) : null}
          {citation.excerpt ? (
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-600 bg-white/80 border border-zinc-200/80 rounded-lg px-2.5 py-2 line-clamp-4">
              {citation.excerpt}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface CitedMarkdownProps {
  content: string;
  citations?: Citation[];
  className?: string;
}

export function CitedMarkdown({ content, citations = [], className = "" }: CitedMarkdownProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const sourceRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const normalized = useMemo(() => normalizeCitations(citations), [citations]);
  const sorted = useMemo(
    () => [...normalized].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
    [normalized],
  );

  const handleCiteClick = useCallback((n: number) => {
    setActiveIndex((prev) => (prev === n ? null : n));
    const el = sourceRefs.current[n];
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const markdownComponents = useMemo<Partial<Components>>(
    () => ({
      code: ({ children, ...props }) => {
        const isInline = (props as { inline?: boolean }).inline;
        if (isInline) {
          return (
            <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">
              {children}
            </code>
          );
        }
        return (
          <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed my-2">
            <code>{children}</code>
          </pre>
        );
      },
      text: ({ children }) => (
        <TextWithCitationMarkers activeIndex={activeIndex} onCiteClick={handleCiteClick}>
          {children}
        </TextWithCitationMarkers>
      ),
      h1: ({ children }) => <h1 className="text-xl font-bold mt-5 mb-2">{children}</h1>,
      h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-1">{children}</h2>,
      h3: ({ children }) => <h3 className="text-base font-bold mt-4 mb-1">{children}</h3>,
      strong: ({ children }) => <strong>{children}</strong>,
      em: ({ children }) => <em>{children}</em>,
      ul: ({ children }) => <ul className="list-disc ml-5 my-2 space-y-1">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal ml-5 my-2 space-y-1">{children}</ol>,
      li: ({ children }) => <li className="my-0.5">{children}</li>,
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-orange-300 pl-3 my-2 text-zinc-600 italic">{children}</blockquote>
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
      p: ({ children }) => <p className="my-1.5">{children}</p>,
    }),
    [activeIndex, handleCiteClick],
  );

  return (
    <div className={className}>
      <div className="leading-relaxed manas-markdown prose prose-zinc max-w-none prose-headings:font-bold prose-p:my-1.5 prose-li:my-0.5 prose-strong:font-bold">
        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
      </div>

      {sorted.length > 0 && (
        <div className="mt-4 pt-3 border-t border-zinc-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
            Sources
          </p>
          <div className="space-y-2">
            {sorted.map((c) => {
              const n = c.index ?? 0;
              return (
                <SourceCard
                  key={`${n}-${c.doc}`}
                  citation={c}
                  active={activeIndex === n}
                  onMount={(el) => {
                    sourceRefs.current[n] = el;
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
