"use client";

import React from "react";
import { motion } from "framer-motion";
import { DURATION_VERY_SLOW } from "@/lib/constants";
import type { Message, MessageFile } from "@/services/types";

interface MessageItemProps {
  message: Message;
  index: number;
  onExpandFile: (file: MessageFile) => void;
}

const MessageItem = React.memo(function MessageItem({
  message,
  index,
  onExpandFile,
}: MessageItemProps) {
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
      </div>
    </motion.div>
  );
});

export default MessageItem;
