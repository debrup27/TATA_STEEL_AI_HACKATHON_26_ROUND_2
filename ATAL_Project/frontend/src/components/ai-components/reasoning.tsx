"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Brain } from "lucide-react";
import { Markdown } from "@/components/ai-components/markdown";

interface ReasoningProps {
  children: React.ReactNode;
  isStreaming?: boolean;
}

interface ReasoningTriggerProps {
  children: React.ReactNode;
}

interface ReasoningContentProps {
  children: React.ReactNode;
  markdown?: boolean;
  className?: string;
}

const ReasoningContext = React.createContext<{
  open: boolean;
  toggle: () => void;
  isStreaming: boolean;
}>({ open: false, toggle: () => {}, isStreaming: false });

function Reasoning({ children, isStreaming = false }: ReasoningProps) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);

  useEffect(() => {
    if (isStreaming) setOpen(true);
  }, [isStreaming]);

  return (
    <ReasoningContext.Provider value={{ open, toggle, isStreaming }}>
      <div className="w-full py-1.5">{children}</div>
    </ReasoningContext.Provider>
  );
}

function ReasoningTrigger({ children }: ReasoningTriggerProps) {
  const { open, toggle, isStreaming } = React.useContext(ReasoningContext);

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#1b253c]/12 bg-white/80 hover:bg-[#F7F4EC]/60 text-xs font-bold text-[#1b253c]/75 hover:text-[#1b253c] transition-all duration-200 cursor-pointer shadow-3xs hover:shadow-2xs"
    >
      {isStreaming ? (
        <span className="relative flex size-2 items-center justify-center shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full size-1.5 bg-orange-500"></span>
        </span>
      ) : (
        <Brain size={13.5} className="shrink-0 text-[#1b253c]/60" />
      )}
      <span className="tracking-tight">{children}</span>
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
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
}: ReasoningContentProps) {
  const { open } = React.useContext(ReasoningContext);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="reasoning-content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="border-l-[1.5px] border-[#1b253c]/15 ml-[18px] pl-4 my-2.5">
            <div className={`bg-[#F7F4EC]/35 backdrop-blur-3xs rounded-r-2xl rounded-bl-2xl p-4 text-xs sm:text-sm text-zinc-650 leading-relaxed border border-t-0 border-l-0 border-[#1b253c]/5 shadow-[inset_0_1px_2px_rgba(27,37,60,0.02)] ${className}`}>
              {markdown ? (
                <Markdown>{String(children)}</Markdown>
              ) : (
                children
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { Reasoning, ReasoningTrigger, ReasoningContent };

