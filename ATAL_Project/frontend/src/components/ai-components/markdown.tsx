"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import { normalizeTechnicalMarkdown, repairCollapsedMarkdownTables } from "@/lib/markdown-stream";

interface MarkdownProps {
  children: string;
  className?: string;
  components?: Partial<Components>;
}

const defaultComponents: Partial<Components> = {
  // react-markdown v10 no longer passes an `inline` prop; emitting <pre> here put
  // block code inside <p> (hydration error) and rendered inline values as big boxes.
  // Never emit <pre> from code — block <pre> is handled by the `pre` override below.
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className || "") || String(children).includes("\n");
    if (isBlock) {
      return <code className={`${className || ""} font-mono`} {...props}>{children}</code>;
    }
    return (
      <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed my-2">
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
  li: ({ children }) => <li className="my-0.5">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-orange-300 pl-3 my-2 text-zinc-600 italic">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-orange-600 underline underline-offset-2 hover:text-orange-700" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-sm border border-zinc-200 rounded-lg">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-zinc-200 px-2 py-1">{children}</td>,
  p: ({ children }) => <p className="my-1.5">{children}</p>,
};

function Markdown({ children, className = "", components }: MarkdownProps) {
  const merged = components
    ? { ...defaultComponents, ...components }
    : defaultComponents;

  return (
    <div className={`leading-relaxed [&_.katex]:text-[1.05em] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: "ignore", throwOnError: false }]]}
        components={merged}
      >
        {repairCollapsedMarkdownTables(normalizeTechnicalMarkdown(children))}
      </ReactMarkdown>
    </div>
  );
}

export { Markdown };
