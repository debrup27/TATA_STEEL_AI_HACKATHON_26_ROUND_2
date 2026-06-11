"use client";

import React from "react";

interface PromptSuggestionProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

function PromptSuggestion({ children, onClick, className = "" }: PromptSuggestionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 transition-colors cursor-pointer select-none ${className}`}
    >
      {children}
    </button>
  );
}

export { PromptSuggestion };
