"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { TEXTAREA_MAX_ROWS, TEXTAREA_MAX_LENGTH } from "@/lib/constants";

interface PromptInputContextValue {
  value: string;
  onValueChange: (value: string) => void;
  isLoading: boolean;
  onSubmit: () => void;
}

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

function usePromptInput() {
  const ctx = useContext(PromptInputContext);
  if (!ctx) throw new Error("PromptInput sub-components must be used within PromptInput");
  return ctx;
}

interface PromptInputProps {
  value: string;
  onValueChange: (value: string) => void;
  isLoading?: boolean;
  onSubmit?: () => void;
  className?: string;
  children: React.ReactNode;
}

function PromptInput({
  value,
  onValueChange,
  isLoading = false,
  onSubmit,
  className = "",
  children,
}: PromptInputProps) {
  const handleSubmit = useCallback(() => {
    if (isLoading) return;
    onSubmit?.();
  }, [isLoading, onSubmit]);

  return (
    <PromptInputContext.Provider
      value={{ value, onValueChange, isLoading, onSubmit: handleSubmit }}
    >
      <div className={className}>{children}</div>
    </PromptInputContext.Provider>
  );
}

interface PromptInputTextareaProps {
  placeholder?: string;
  className?: string;
  maxRows?: number;
  maxLength?: number;
}

function PromptInputTextarea({
  placeholder = "",
  className = "",
  maxRows = TEXTAREA_MAX_ROWS,
  maxLength = TEXTAREA_MAX_LENGTH,
}: PromptInputTextareaProps) {
  const { value, onValueChange, onSubmit, isLoading } = usePromptInput();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight || "20");
    const maxHeight = lineHeight * maxRows;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, [value, maxRows]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) onSubmit();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={1}
      className={`w-full resize-none focus:outline-none focus:ring-0 bg-transparent ${className}`}
    />
  );
}

interface PromptInputActionsProps {
  className?: string;
  children: React.ReactNode;
}

function PromptInputActions({ className = "", children }: PromptInputActionsProps) {
  return <div className={className}>{children}</div>;
}

interface PromptInputActionProps {
  tooltip?: string;
  children: React.ReactNode;
}

function PromptInputAction({ tooltip, children }: PromptInputActionProps) {
  return (
    <div className="relative inline-flex group">
      {children}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[11px] font-semibold text-white bg-zinc-800 rounded-md whitespace-nowrap z-50 pointer-events-none shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {tooltip}
        </div>
      )}
    </div>
  );
}

export { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction, usePromptInput };
