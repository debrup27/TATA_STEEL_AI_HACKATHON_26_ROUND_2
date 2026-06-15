"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, X } from "lucide-react";
import { DURATION_VERY_SLOW } from "@/lib/constants";
import { CitedMarkdown } from "@/components/ai-components/CitedMarkdown";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-components/reasoning";
import type { Message, MessageFile, RagDoc } from "@/services/types";
import { MessageFeedback } from "./MessageFeedback";

interface MessageItemProps {
  message: Message;
  index: number;
  onExpandFile: (file: MessageFile) => void;
  ragDocs?: RagDoc[];
  reasoningStreaming?: boolean;
  contentStreaming?: boolean;
  showReasoningSlot?: boolean;
  onFeedback?: (messageId: string, rating: "up" | "down") => void | Promise<void>;
}

function resolveSystemKind(message: Message): "compaction" | "sansad" {
  if (message.systemKind) return message.systemKind;
  if (message.isSansadSyncing || /sansad/i.test(message.content)) return "sansad";
  return "compaction";
}

const MessageItem = React.memo(function MessageItem({
  message,
  index,
  onExpandFile,
  ragDocs = [],
  reasoningStreaming = false,
  contentStreaming = false,
  showReasoningSlot = false,
  onFeedback,
}: MessageItemProps) {
  const [systemExpanded, setSystemExpanded] = useState(false);

  if (message.role === "system") {
    const systemKind = resolveSystemKind(message);
    const systemLabel = systemKind === "sansad" ? "SANSAD context" : "Context compaction";
    const isBusy = message.isCompacting || message.isSansadSyncing;
    const canExpand = !isBusy && message.content.trim().length > 120;

    return (
      <>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex justify-center my-3 px-2"
        >
          <div
            className={`text-xs text-zinc-500 bg-zinc-50 border border-zinc-200/90 rounded-2xl px-5 py-4 max-w-4xl w-full text-left leading-relaxed shadow-sm ${
              isBusy ? "text-center" : ""
            }`}
          >
            {isBusy ? (
              <div className="flex items-center justify-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                <span>{message.content || (message.isSansadSyncing ? "Linking SANSAD context…" : "Running context compaction…")}</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>{systemLabel}</span>
                  </div>
                  {canExpand && (
                    <button
                      type="button"
                      onClick={() => setSystemExpanded(true)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-600 hover:text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      <Maximize2 className="w-3 h-3" />
                      Expand
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto pr-1 text-sm text-zinc-600 whitespace-pre-wrap [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-300/80 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {message.content}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {systemExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1200] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-sm"
              onClick={() => setSystemExpanded(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2 }}
                className="bg-[#FAF9F5] border border-zinc-200 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[min(85vh,720px)] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-200/80 shrink-0">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{systemLabel}</p>
                    <p className="text-sm font-semibold text-zinc-800 mt-0.5">Command result</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSystemExpanded(false)}
                    className="p-2 rounded-xl text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-zinc-300/80 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {message.content}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  const isUser = message.role === "user";
  const showReasoning = showReasoningSlot || !!message.reasoning || reasoningStreaming;

  if (!isUser && !message.content && !(message.citations?.length) && !showReasoning && !contentStreaming) {
    return (
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: DURATION_VERY_SLOW, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-start w-full"
      >
        <div className="max-w-full text-sm text-zinc-500 italic py-2">
          No answer text was returned — try again or turn on Deep Thinking.
        </div>
      </motion.div>
    );
  }

  const bubbleClass = isUser
    ? "max-w-[80%] text-sm font-semibold bg-zinc-900 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-3xs"
    : "max-w-full text-base md:text-[17px] font-normal text-zinc-900 w-full py-2 min-h-[1.5rem]";

  const inner = (
    <div className={`leading-relaxed flex flex-col gap-2 ${bubbleClass}`}>
      {message.files && message.files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-1">
          {message.files.map((file, idx) => {
            const isPdf = file.type === "application/pdf";
            return (
              <div
                key={idx}
                onClick={() => onExpandFile(file)}
                className={`relative group cursor-pointer rounded-xl overflow-hidden border ${
                  isPdf
                    ? "flex items-center gap-2 px-3 py-2 bg-zinc-800 text-white border-zinc-700 max-w-[200px]"
                    : "w-24 h-24 relative hover:opacity-90 border-zinc-200"
                }`}
              >
                {isPdf ? (
                  <>
                    <svg className="w-5 h-5 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs truncate font-semibold">{file.name}</span>
                  </>
                ) : (
                  <img src={file.pages?.[0]} alt={file.name} className="w-full h-full object-cover" draggable={false} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {isUser ? (
        <div className="whitespace-pre-wrap">{message.content}</div>
      ) : (
        <>
          {showReasoning && (
            <Reasoning isStreaming={reasoningStreaming} defaultOpen={reasoningStreaming}>
              <ReasoningTrigger>View reasoning</ReasoningTrigger>
              <ReasoningContent isStreaming={reasoningStreaming} markdown>
                {message.reasoning || ""}
              </ReasoningContent>
            </Reasoning>
          )}
          {(message.content || contentStreaming || !reasoningStreaming) &&
            (message.content || contentStreaming ? (
              <CitedMarkdown
                content={message.content}
                citations={message.citations}
                streaming={contentStreaming}
                ragDocs={ragDocs}
                onExpandFile={onExpandFile}
                className="text-base md:text-[17px]"
              />
            ) : !reasoningStreaming && showReasoning ? (
              <p className="text-sm text-zinc-500 italic">
                No answer text was returned — try again or turn off Deep Thinking.
              </p>
            ) : null)}
          {message.id && onFeedback && message.content.trim() && !contentStreaming ? (
            <MessageFeedback
              rating={message.feedbackRating}
              onRate={(rating) => onFeedback(message.id!, rating)}
            />
          ) : null}
        </>
      )}
    </div>
  );

  if (isUser) {
    return (
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: DURATION_VERY_SLOW, ease: [0.22, 1, 0.36, 1], delay: index === 0 ? 0.1 : 0 }}
        className="flex justify-end"
      >
        {inner}
      </motion.div>
    );
  }

  return <div className="flex justify-start">{inner}</div>;
});

export default MessageItem;
