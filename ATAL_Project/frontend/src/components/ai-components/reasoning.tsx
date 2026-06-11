"use client";

import React, { useState } from "react";
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

  return (
    <ReasoningContext.Provider value={{ open, toggle, isStreaming }}>
      <div className="w-full">{children}</div>
    </ReasoningContext.Provider>
  );
}

function ReasoningTrigger({ children }: ReasoningTriggerProps) {
  const { open, toggle, isStreaming } = React.useContext(ReasoningContext);

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer py-1"
    >
      {isStreaming && (
        <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
      )}
      <Brain size={16} className="shrink-0 text-zinc-400" />
      <span>{children}</span>
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="shrink-0 text-zinc-400"
      >
        <ChevronDown size={14} />
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
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className={`pt-1 pb-2 text-sm text-zinc-600 leading-relaxed ${className}`}>
            {markdown ? (
              <Markdown>{String(children)}</Markdown>
            ) : (
              children
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { Reasoning, ReasoningTrigger, ReasoningContent };
