"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface ChainOfThoughtProps {
  children: React.ReactNode;
  className?: string;
}

interface ChainOfThoughtStepProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

interface ChainOfThoughtTriggerProps {
  children: React.ReactNode;
}

interface ChainOfThoughtContentProps {
  children: React.ReactNode;
}

interface ChainOfThoughtItemProps {
  children: React.ReactNode;
}

const StepContext = React.createContext<{ open: boolean; toggle: () => void }>({
  open: false,
  toggle: () => {},
});

function ChainOfThought({ children, className = "" }: ChainOfThoughtProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {children}
    </div>
  );
}

function ChainOfThoughtStep({
  children,
  defaultOpen = false,
}: ChainOfThoughtStepProps) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => setOpen((v) => !v);

  return (
    <StepContext.Provider value={{ open, toggle }}>
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {children}
      </div>
    </StepContext.Provider>
  );
}

function ChainOfThoughtTrigger({ children }: ChainOfThoughtTriggerProps) {
  const { open, toggle } = React.useContext(StepContext);

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer text-left"
    >
      <span className="flex items-center justify-center size-5 rounded-full bg-zinc-100 text-zinc-500 shrink-0">
        <ChevronDown size={14} />
      </span>
      <span className="flex-1">{children}</span>
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="shrink-0 text-zinc-400"
      >
        <ChevronDown size={16} />
      </motion.span>
    </button>
  );
}

function ChainOfThoughtContent({ children }: ChainOfThoughtContentProps) {
  const { open } = React.useContext(StepContext);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="chain-of-thought-content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-1.5 px-3.5 pb-3 pt-0.5">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChainOfThoughtItem({ children }: ChainOfThoughtItemProps) {
  return (
    <div className="flex items-start gap-2 text-sm text-zinc-600 leading-relaxed pl-7">
      <span className="size-1.5 rounded-full bg-zinc-300 mt-2 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
};
