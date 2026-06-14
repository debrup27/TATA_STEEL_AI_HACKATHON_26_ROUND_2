"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Sparkles, X, XCircle } from "lucide-react";
import { SystemMessage } from "@/components/ai-components/system-message";

export type HubManasNotifyKind = "pending" | "success" | "error";

export interface HubManasNotification {
  id: string;
  kind: HubManasNotifyKind;
  title: string;
  detail?: string;
}

interface HubManasNotifyContextValue {
  notifyManasPending: (title: string, detail?: string) => string;
  notifyManasSuccess: (title: string, detail?: string) => void;
  notifyManasError: (title: string, detail?: string) => void;
  dismissManas: (id: string) => void;
  runManasCall: <T>(
    title: string,
    fn: () => Promise<T>,
    opts?: {
      pendingDetail?: string;
      validate?: (result: T) => boolean;
      emptyDetail?: string;
      successDetail?: string;
    },
  ) => Promise<T | null>;
}

const HubManasNotifyContext = createContext<HubManasNotifyContextValue | null>(null);

const SUCCESS_MS = 6500;
const ERROR_MS = 8500;

function genId() {
  return `manas-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function variantFor(kind: HubManasNotifyKind): "action" | "warning" | "error" {
  if (kind === "error") return "error";
  if (kind === "pending") return "warning";
  return "action";
}

function iconFor(kind: HubManasNotifyKind) {
  if (kind === "error") return <XCircle className="w-4 h-4" />;
  if (kind === "pending") return <Loader2 className="w-4 h-4 animate-spin" />;
  return <CheckCircle2 className="w-4 h-4" />;
}

export function HubManasNotifyProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<HubManasNotification[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissManas = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const current = timers.current;
    return () => {
      Object.values(current).forEach(clearTimeout);
    };
  }, []);

  const push = useCallback(
    (item: HubManasNotification, autoMs?: number) => {
      setItems((prev) => [...prev.slice(-4), item]);
      if (autoMs) {
        timers.current[item.id] = setTimeout(() => dismissManas(item.id), autoMs);
      }
    },
    [dismissManas],
  );

  const notifyManasPending = useCallback(
    (title: string, detail?: string) => {
      const id = genId();
      push({ id, kind: "pending", title, detail });
      return id;
    },
    [push],
  );

  const notifyManasSuccess = useCallback(
    (title: string, detail?: string) => {
      push({ id: genId(), kind: "success", title, detail }, SUCCESS_MS);
    },
    [push],
  );

  const notifyManasError = useCallback(
    (title: string, detail?: string) => {
      push({ id: genId(), kind: "error", title, detail }, ERROR_MS);
    },
    [push],
  );

  const runManasCall = useCallback(
    async <T,>(
      title: string,
      fn: () => Promise<T>,
      opts?: {
        pendingDetail?: string;
        validate?: (result: T) => boolean;
        emptyDetail?: string;
        successDetail?: string;
      },
    ): Promise<T | null> => {
      const pendingId = notifyManasPending(title, opts?.pendingDetail ?? "Calling MANAS…");
      try {
        const result = await fn();
        dismissManas(pendingId);
        const valid = opts?.validate ? opts.validate(result) : true;
        if (!valid) {
          notifyManasError(title, opts?.emptyDetail ?? "MANAS returned an empty response");
          return null;
        }
        notifyManasSuccess(title, opts?.successDetail ?? "MANAS call completed successfully");
        return result;
      } catch (e) {
        dismissManas(pendingId);
        const msg = e instanceof Error ? e.message : "Request failed";
        notifyManasError(title, msg);
        return null;
      }
    },
    [notifyManasPending, notifyManasSuccess, notifyManasError, dismissManas],
  );

  const value: HubManasNotifyContextValue = {
    notifyManasPending,
    notifyManasSuccess,
    notifyManasError,
    dismissManas,
    runManasCall,
  };

  return (
    <HubManasNotifyContext.Provider value={value}>
      {children}
      <div
        className="fixed top-4 right-4 z-[1002] flex flex-col gap-2 pointer-events-none w-[min(380px,calc(100vw-2rem))]"
        aria-live="polite"
        aria-label="MANAS system notifications"
      >
        <AnimatePresence initial={false}>
          {items.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto shadow-lg rounded-xl"
            >
              <SystemMessage variant={variantFor(n.kind)} fill icon={iconFor(n.kind)}>
                <div className="relative pr-5">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider opacity-80">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>MANAS</span>
                  </div>
                  <p className="font-semibold text-sm mt-0.5 leading-snug">{n.title}</p>
                  {n.detail ? (
                    <p className="text-xs mt-1 font-normal opacity-90 leading-relaxed">{n.detail}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => dismissManas(n.id)}
                    className="absolute top-0 right-0 p-0.5 rounded-full text-current opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label="Dismiss notification"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </SystemMessage>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </HubManasNotifyContext.Provider>
  );
}

export function useHubManasNotify(): HubManasNotifyContextValue {
  const ctx = useContext(HubManasNotifyContext);
  if (!ctx) {
    throw new Error("useHubManasNotify must be used within HubManasNotifyProvider");
  }
  return ctx;
}
