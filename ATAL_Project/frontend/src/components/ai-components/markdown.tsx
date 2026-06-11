"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

interface MarkdownProps {
  children: string;
  className?: string;
  components?: Partial<Components>;
}

const defaultComponents: Partial<Components> = {
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
  li: ({ children }) => <li className="list-disc ml-4">{children}</li>,
  p: ({ children }) => <p className="my-1.5">{children}</p>,
};

function Markdown({ children, className = "", components }: MarkdownProps) {
  const merged = components
    ? { ...defaultComponents, ...components }
    : defaultComponents;

  return (
    <div className={`leading-relaxed ${className}`}>
      <ReactMarkdown components={merged}>{children}</ReactMarkdown>
    </div>
  );
}

export { Markdown };
