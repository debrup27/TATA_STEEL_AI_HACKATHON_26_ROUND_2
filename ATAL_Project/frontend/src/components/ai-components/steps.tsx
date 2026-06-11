"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface StepsProps {
  defaultOpen?: boolean;
  children: React.ReactNode;
}

interface StepsTriggerProps {
  leftIcon?: React.ReactNode;
  children: React.ReactNode;
}

interface StepsContentProps {
  bar?: React.ReactNode;
  children: React.ReactNode;
}

interface StepsItemProps {
  children: React.ReactNode;
  status?: "pending" | "active" | "complete";
}

interface StepsBarProps {
  className?: string;
}

const StepsContext = React.createContext<{ open: boolean; toggle: () => void }>({
  open: false,
  toggle: () => {},
});

function Steps({ defaultOpen = false, children }: StepsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => setOpen((v) => !v);

  return (
    <StepsContext.Provider value={{ open, toggle }}>
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {children}
      </div>
    </StepsContext.Provider>
  );
}

function StepsTrigger({ leftIcon, children }: StepsTriggerProps) {
  const { open, toggle } = React.useContext(StepsContext);

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer text-left"
    >
      {leftIcon && (
        <span className="shrink-0 text-zinc-400">{leftIcon}</span>
      )}
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

function StepsBar({ className = "" }: StepsBarProps) {
  return (
    <div
      className={`w-0.5 rounded-full bg-zinc-200 self-stretch ${className}`}
    />
  );
}

function StepsContent({ bar, children }: StepsContentProps) {
  const { open } = React.useContext(StepsContext);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="steps-content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="flex gap-2 px-3.5 pb-3">
            {bar}
            <div className="flex flex-col gap-1.5 pt-0.5 min-w-0 flex-1">
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StepsItem({ children, status = "pending" }: StepsItemProps) {
  const dotClass = status === "active"
    ? "bg-orange-500 animate-pulse"
    : status === "complete"
      ? "bg-emerald-500"
      : "bg-zinc-300"

  const textClass = status === "active"
    ? "text-zinc-900 font-medium"
    : status === "complete"
      ? "text-emerald-700"
      : "text-zinc-500"

  return (
    <div className={`flex items-start gap-2 text-sm transition-colors duration-300 ${textClass}`}>
      <span className={`size-1.5 rounded-full mt-2 shrink-0 transition-colors duration-300 ${dotClass}`} />
      <span>{children}</span>
    </div>
  );
}

export { Steps, StepsTrigger, StepsBar, StepsContent, StepsItem };
