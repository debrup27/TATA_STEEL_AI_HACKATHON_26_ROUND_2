"use client";

import React, { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

export function MessageFeedback({
  rating,
  disabled,
  onRate,
}: {
  rating?: "up" | "down";
  disabled?: boolean;
  onRate: (rating: "up" | "down") => void;
}) {
  const [local, setLocal] = useState<"up" | "down" | undefined>(rating);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLocal(rating);
  }, [rating]);

  const handle = async (value: "up" | "down") => {
    if (disabled || busy || local === value) return;
    setBusy(true);
    setLocal(value);
    try {
      await onRate(value);
    } catch {
      setLocal(rating);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-stone-200/60">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => handle("up")}
        aria-label="Helpful response"
        className={`inline-flex items-center justify-center size-7 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
          local === "up"
            ? "bg-emerald-100 text-emerald-700"
            : "text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600"
        }`}
      >
        <ThumbsUp size={14} />
      </button>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => handle("down")}
        aria-label="Not helpful"
        className={`inline-flex items-center justify-center size-7 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
          local === "down"
            ? "bg-red-100 text-red-600"
            : "text-zinc-400 hover:bg-red-50 hover:text-red-500"
        }`}
      >
        <ThumbsDown size={14} />
      </button>
      {local ? (
        <span className="text-[10px] text-zinc-400 ml-1 font-medium">
          {local === "up" ? "Thanks — MANAS will match this style" : "Noted — adjusting tone"}
        </span>
      ) : null}
    </div>
  );
}
