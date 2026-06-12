"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Brain } from "lucide-react";

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
      <div className="rounded-2xl border border-[#1b253c]/10 bg-white/65 backdrop-blur-md overflow-hidden shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.75),0_4px_16px_-4px_rgba(27,37,60,0.06)] transition-all duration-300">
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
      className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-bold text-[#1b253c]/85 hover:bg-[#F7F4EC]/65 hover:text-[#1b253c] transition-all duration-200 cursor-pointer text-left"
    >
      <span className="flex items-center justify-center size-5 rounded-full bg-[#1b253c]/5 text-[#1b253c]/60 shrink-0">
        <Brain size={12} />
      </span>
      <span className="flex-1 tracking-tight">{children}</span>
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="shrink-0 text-[#1b253c]/40"
      >
        <ChevronDown size={16} strokeWidth={2.5} />
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
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-2 px-4 pb-3.5 pt-0.5 border-l-[1.5px] border-[#1b253c]/15 ml-[26px]">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChainOfThoughtItem({ children }: ChainOfThoughtItemProps) {
  return (
    <div className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-650 leading-relaxed transition-colors duration-300">
      <span className="relative flex size-3.5 items-center justify-center shrink-0 mt-0.5">
        <span className="inline-flex rounded-full size-1.5 bg-[#1b253c]/30"></span>
      </span>
      <span className="flex-1">{children}</span>
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

