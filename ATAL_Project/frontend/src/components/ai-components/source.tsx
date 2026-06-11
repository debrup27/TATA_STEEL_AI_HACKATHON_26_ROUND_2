"use client";

import React, { useState } from "react";

interface SourceTriggerProps {
  label: string;
  showFavicon?: boolean;
}

interface SourceContentProps {
  title: string;
  description: string;
}

interface SourceProps {
  href?: string;
  children: React.ReactNode;
}

const SourceContext = React.createContext<{ open: boolean }>({ open: false });

function SourceTrigger({ label, showFavicon }: SourceTriggerProps) {
  const { open } = React.useContext(SourceContext);

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
        border transition-colors duration-150 cursor-default select-none
        ${open
          ? "bg-zinc-100 border-zinc-300 text-zinc-700"
          : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
        }
      `}
    >
      {showFavicon && (
        <span className="size-3.5 rounded-full bg-zinc-200 flex items-center justify-center text-[8px] font-bold text-zinc-500 shrink-0">
          S
        </span>
      )}
      {label}
    </span>
  );
}

function SourceContent({ title, description }: SourceContentProps) {
  const { open } = React.useContext(SourceContext);
  if (!open) return null;

  return (
    <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-zinc-200 rounded-xl shadow-lg p-3 z-50">
      <p className="text-sm font-semibold text-zinc-800 truncate">{title}</p>
      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{description}</p>
    </div>
  );
}

function Source({ href, children }: SourceProps) {
  const [open, setOpen] = useState(false);

  const Tag = href ? "a" : "span";

  return (
    <SourceContext.Provider value={{ open }}>
      <Tag
        href={href}
        target={href ? "_blank" : undefined}
        rel={href ? "noopener noreferrer" : undefined}
        className="relative inline-flex"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </Tag>
    </SourceContext.Provider>
  );
}

export { Source, SourceTrigger, SourceContent };
