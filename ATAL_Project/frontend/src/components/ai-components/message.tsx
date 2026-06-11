"use client";

import React, { useState } from "react";
import { Markdown } from "@/components/ai-components/markdown";

interface MessageProps {
  children: React.ReactNode;
  className?: string;
}

function Message({ children, className = "" }: MessageProps) {
  return (
    <div className={`flex gap-3 w-full ${className}`}>
      {children}
    </div>
  );
}

interface MessageAvatarProps {
  children?: React.ReactNode;
  className?: string;
  src?: string;
  alt?: string;
  fallback?: string;
}

function MessageAvatar({ children, className = "", src, alt = "", fallback }: MessageAvatarProps) {
  return (
    <div className={`shrink-0 size-8 rounded-full overflow-hidden flex items-center justify-center bg-zinc-200 text-zinc-600 text-xs font-bold select-none ${className}`}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : children ? (
        children
      ) : fallback ? (
        <span>{fallback}</span>
      ) : null}
    </div>
  );
}

interface MessageContentProps {
  children: React.ReactNode;
  className?: string;
  markdown?: boolean;
}

function MessageContent({ children, className = "", markdown = false }: MessageContentProps) {
  return (
    <div className={`flex-1 text-sm leading-relaxed text-zinc-800 min-w-0 ${className}`}>
      {markdown ? <Markdown>{String(children)}</Markdown> : children}
    </div>
  );
}

interface MessageActionsProps {
  children: React.ReactNode;
  className?: string;
}

function MessageActions({ children, className = "" }: MessageActionsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {children}
    </div>
  );
}

interface MessageActionProps {
  children: React.ReactNode;
  tooltip?: string;
}

function MessageAction({ children, tooltip }: MessageActionProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {tooltip && show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded-md bg-zinc-800 text-white text-[10px] font-medium whitespace-nowrap pointer-events-none z-50">
          {tooltip}
        </div>
      )}
    </div>
  );
}

export { Message, MessageAvatar, MessageContent, MessageActions, MessageAction };
