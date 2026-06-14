"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Brain } from "lucide-react";
import { Markdown } from "@/components/ai-components/markdown";

interface ReasoningProps {
  children: React.ReactNode;
  isStreaming?: boolean;
  defaultOpen?: boolean;
}

interface ReasoningTriggerProps {
  children: React.ReactNode;
}

interface ReasoningContentProps {
  children: React.ReactNode;
  markdown?: boolean;
  className?: string;
  isStreaming?: boolean;
}

const ReasoningContext = React.createContext<{
  open: boolean;
  toggle: () => void;
  isStreaming: boolean;
}>({ open: false, toggle: () => {}, isStreaming: false });

function Reasoning({ children, isStreaming = false, defaultOpen = false }: ReasoningProps) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? (isStreaming || defaultOpen);
  const toggle = () => setManualOpen(!(manualOpen ?? open));

  return (
    <ReasoningContext.Provider value={{ open, toggle, isStreaming }}>
      <div className="w-full py-1">{children}</div>
    </ReasoningContext.Provider>
  );
}

function ReasoningTrigger({ children }: ReasoningTriggerProps) {
  const { open, toggle, isStreaming } = React.useContext(ReasoningContext);

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#1b253c]/12 bg-white/80 hover:bg-[#F7F4EC]/60 text-xs font-bold text-[#1b253c]/75 hover:text-[#1b253c] transition-all duration-200 cursor-pointer shadow-3xs"
    >
      {isStreaming ? (
        <span className="relative flex size-2 items-center justify-center shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full size-1.5 bg-orange-500" />
        </span>
      ) : (
        <Brain size={13.5} className="shrink-0 text-[#1b253c]/60" />
      )}
      <span className="tracking-tight">{children}</span>
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="shrink-0 text-[#1b253c]/40"
      >
        <ChevronDown size={13} strokeWidth={2.5} />
      </motion.span>
    </button>
  );
}

function ReasoningContent({
  children,
  markdown = false,
  className = "",
  isStreaming = false,
}: ReasoningContentProps) {
  const { open } = React.useContext(ReasoningContext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const text = String(children);

  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, isStreaming]);

  if (!open) return null;

  return (
    <div className="border-l-[1.5px] border-[#1b253c]/15 ml-[18px] pl-4 my-2">
      <div
        ref={scrollRef}
        className={`h-36 overflow-y-auto overflow-x-hidden bg-[#F7F4EC]/40 rounded-r-2xl rounded-bl-2xl p-3 text-xs sm:text-sm text-zinc-600 leading-relaxed border border-[#1b253c]/5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-300/80 ${className}`}
      >
        {isStreaming ? (
          <pre className="whitespace-pre-wrap font-sans m-0">{text || "…"}</pre>
        ) : markdown && text ? (
          <Markdown>{text}</Markdown>
        ) : (
          text || <span className="text-zinc-400 italic">No reasoning captured.</span>
        )}
      </div>
    </div>
  );
}

export { Reasoning, ReasoningTrigger, ReasoningContent };
