"use client";

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, X } from "lucide-react";

interface FeedbackBarProps {
  title?: string;
  icon?: React.ReactNode;
  onHelpful?: () => void;
  onNotHelpful?: () => void;
  onClose?: () => void;
}

function FeedbackBar({
  title = "Was this response helpful?",
  icon,
  onHelpful,
  onNotHelpful,
  onClose,
}: FeedbackBarProps) {
  const [dismissed, setDismissed] = useState(false);
  const [feedback, setFeedback] = useState<"helpful" | "not-helpful" | null>(null);

  if (dismissed) return null;

  const handleHelpful = () => {
    setFeedback("helpful");
    onHelpful?.();
  };

  const handleNotHelpful = () => {
    setFeedback("not-helpful");
    onNotHelpful?.();
  };

  const handleClose = () => {
    setDismissed(true);
    onClose?.();
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm shadow-xs">
      {icon && <span className="shrink-0 text-zinc-500">{icon}</span>}
      <span className="text-zinc-600 font-medium">{title}</span>
      {feedback === "helpful" ? (
        <span className="text-emerald-600 text-xs font-semibold">Thanks!</span>
      ) : feedback === "not-helpful" ? (
        <span className="text-zinc-500 text-xs font-semibold">Noted</span>
      ) : (
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleHelpful}
            className="flex items-center justify-center size-7 rounded-full hover:bg-emerald-50 text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <ThumbsUp size={14} />
          </button>
          <button
            type="button"
            onClick={handleNotHelpful}
            className="flex items-center justify-center size-7 rounded-full hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <ThumbsDown size={14} />
          </button>
        </span>
      )}
      {onClose && (
        <button
          type="button"
          onClick={handleClose}
          className="ml-auto flex items-center justify-center size-6 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export { FeedbackBar };
