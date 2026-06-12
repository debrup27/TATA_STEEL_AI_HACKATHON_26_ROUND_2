"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";

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
        inline-flex items-center gap-1.5 text-xs font-bold tracking-tight select-none cursor-pointer transition-all duration-200
        underline decoration-dashed decoration-[#1b253c]/35 underline-offset-[3px]
        ${open
          ? "text-orange-600 decoration-orange-500"
          : "text-[#1b253c]/85 hover:text-orange-600 hover:decoration-orange-500"
        }
      `}
    >
      {showFavicon && (
        <FileText size={12} className="shrink-0 text-current opacity-70 transition-opacity duration-200" />
      )}
      {label}
    </span>
  );
}

function SourceContent({ title, description }: SourceContentProps) {
  const { open } = React.useContext(SourceContext);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white/95 backdrop-blur-md border border-[#1b253c]/10 rounded-xl shadow-[0_8px_30px_rgba(27,37,60,0.08),inset_0_0_0_1px_rgba(255,255,255,0.8)] p-3.5 z-[100] pointer-events-none origin-bottom"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="size-3.5 rounded bg-[#1b253c]/5 flex items-center justify-center text-[8px] font-bold text-[#1b253c]/60 border border-[#1b253c]/10 shrink-0">
                doc
              </span>
              <p className="text-xs font-bold text-[#1b253c] truncate leading-tight flex-1">{title}</p>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-500 font-medium mt-1 line-clamp-3">{description}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
        className="relative inline-flex items-center"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </Tag>
    </SourceContext.Provider>
  );
}

export { Source, SourceTrigger, SourceContent };

