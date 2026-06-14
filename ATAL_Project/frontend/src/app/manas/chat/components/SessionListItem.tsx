"use client";

import React from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { getSessionPreviewText } from "@/lib/chat-preview";
import type { ChatSession } from "@/services/types";

interface SessionListItemProps {
  session: ChatSession;
  isActive: boolean;
  sidebarOpen: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SessionListItem = React.memo(function SessionListItem({
  session,
  isActive,
  sidebarOpen,
  onSelect,
  onDelete,
}: SessionListItemProps) {
  const previewText = getSessionPreviewText(session);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelect(session.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(session.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-center rounded-xl cursor-pointer border transition-all duration-200 select-none ${
        sidebarOpen ? "px-3 py-2.5 gap-3" : "p-2 justify-center"
      } ${
        isActive
          ? "bg-orange-50/70 border-orange-100/50 text-orange-950 shadow-xs"
          : "hover:bg-zinc-50 border-transparent text-zinc-600 hover:text-zinc-900"
      }`}
      title={!sidebarOpen ? session.title : undefined}
    >
      <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-orange-500" : "text-zinc-400"}`} />
      {sidebarOpen && (
        <div className="flex-1 min-w-0 pr-6">
          <div className="text-xs font-bold truncate">
            {session.title || "Empty Chat"}
          </div>
          <div className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium">
            {previewText || "No messages yet"}
          </div>
        </div>
      )}
      
      {/* Delete Button (Only when sidebar open) */}
      {sidebarOpen && (
        <button
          onClick={handleDelete}
          className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-all duration-200 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});
