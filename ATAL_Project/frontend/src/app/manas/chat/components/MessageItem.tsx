"use client";

import React from "react";
import { motion } from "framer-motion";
import { DURATION_VERY_SLOW } from "@/lib/constants";
import type { Message, MessageFile, Citation } from "@/services/types";

interface MessageItemProps {
  message: Message;
  index: number;
  onExpandFile: (file: MessageFile) => void;
}

function CitationBadge({ citation }: { citation: Citation }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-md px-2 py-0.5">
      <svg className="w-3 h-3 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {citation.doc}
      {citation.section ? ` §${citation.section}` : ""}
    </span>
  );
}

const MessageItem = React.memo(function MessageItem({
  message,
  index,
  onExpandFile,
}: MessageItemProps) {
  // System / compaction messages — centred pill
  if (message.role === "system") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex justify-center my-1"
      >
        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-100 border border-zinc-200/80 rounded-full px-3 py-1.5 max-w-sm text-center">
          {message.isCompacting ? (
            <>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
              <span>Running context compaction…</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>{message.content}</span>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  const isUser = message.role === "user";

  return (
    <motion.div
      layout
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: DURATION_VERY_SLOW, ease: [0.22, 1, 0.36, 1], delay: index === 0 ? 0.15 : 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`leading-relaxed flex flex-col gap-2 ${
          isUser
            ? "max-w-[80%] text-sm font-semibold bg-zinc-900 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-3xs"
            : "max-w-full text-base md:text-[17px] font-semibold text-zinc-900 w-full py-2"
        }`}
      >
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
                      ? "flex items-center gap-2 px-3 py-2 bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-750 max-w-[200px]"
                      : "w-24 h-24 relative hover:opacity-90 border-zinc-200"
                  }`}
                >
                  {isPdf ? (
                    <>
                      <svg
                        className="w-5 h-5 text-orange-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-xs truncate font-semibold">{file.name}</span>
                    </>
                  ) : (
                    <img
                      src={file.pages[0]}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div>{message.content}</div>

        {/* Citations — only on assistant messages with sources */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-1 pt-2 border-t border-zinc-100 flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <CitationBadge key={i} citation={c} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default MessageItem;
