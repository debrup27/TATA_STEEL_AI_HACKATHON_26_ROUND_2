"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  Settings,
  LogOut
} from "lucide-react";
import { SPRING_NAV } from "@/lib/constants";
import type { ChatSession } from "@/services/types";
import { SessionListItem } from "./SessionListItem";

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  sidebarOpen,
  setSidebarOpen,
  searchQuery,
  setSearchQuery,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onOpenSettings,
}: ChatSidebarProps) {
  
  // Filter sessions based on search query, newest on top
  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  ).reverse();

  return (
    <>
      {/* History Sidebar for Desktop */}
      <motion.div
        animate={{ width: sidebarOpen ? 280 : 64 }}
        transition={{ type: "spring", ...SPRING_NAV }}
        className="hidden md:flex flex-col h-full shrink-0 overflow-hidden bg-[#F7F4EC] border-r border-zinc-200/80 z-50 pt-4 relative"
      >
        {/* Centered Brand Header & Collapse Toggle */}
        <div className="relative px-4 pb-4 flex items-center justify-center shrink-0 w-full text-center">
          {sidebarOpen ? (
            <>
              <span 
                className="text-3xl md:text-4xl font-black text-zinc-950 tracking-widest select-none"
                style={{ fontFamily: "var(--font-pixeloid)" }}
              >
                ATAL
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute right-4 p-2.5 rounded-xl border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors duration-200 cursor-pointer flex items-center justify-center active:scale-95"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4.5 h-4.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 rounded-xl border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors duration-200 cursor-pointer flex items-center justify-center active:scale-95"
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        {/* Search History Bar */}
        {sidebarOpen && (
          <div className="px-4 pb-3 shrink-0 border-b border-zinc-100">
            <div className="relative">
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/60 border border-[#1b253c]/15 text-[#1b253c] placeholder:text-[#1b253c]/40 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none transition-all duration-200 font-semibold"
              />
              <svg
                className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}

        {/* New Session Action (Always above Chat History) */}
        <div className="px-4 pt-3 pb-2 shrink-0 flex justify-center">
          {sidebarOpen ? (
            <button
              onClick={onNewSession}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white hover:bg-orange-600 rounded-xl py-2 text-xs font-bold transition-all duration-300 shadow-sm cursor-pointer active:scale-98 select-none group"
            >
              <span>New Session</span>
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
            </button>
          ) : (
            <button
              onClick={onNewSession}
              className="p-2 rounded-xl border border-zinc-200 bg-zinc-900 text-white hover:bg-orange-600 transition-colors duration-200 cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
              title="New Session"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1b253c]/12 hover:[&::-webkit-scrollbar-thumb]:bg-[#1b253c]/25 [&::-webkit-scrollbar-thumb]:rounded-full">
          {sidebarOpen && (
            <div className="px-2 py-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-widest select-none">
              Chat History
            </div>
          )}

          {filteredSessions.length === 0 && sidebarOpen ? (
            <div className="text-center py-8 text-[11px] font-semibold text-zinc-400 select-none">
              No history found
            </div>
          ) : (
            filteredSessions.map((session) => (
              <SessionListItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                sidebarOpen={sidebarOpen}
                onSelect={onSelectSession}
                onDelete={onDeleteSession}
              />
            ))
          )}
        </div>

        {/* Sidebar Footer: Home, Settings & Logout */}
        <div className="p-4 border-t border-zinc-200/60 bg-black/[0.02] shrink-0 flex flex-col gap-2.5 w-full">
          {sidebarOpen ? (
            <div className="flex flex-col gap-2.5 w-full">
              <Link
                href="/"
                className="w-full relative flex items-center justify-center py-2.5 px-4 border border-[#1b253c]/20 hover:border-orange-300 bg-white hover:bg-orange-50/40 rounded-xl text-sm font-bold text-[#1b253c] hover:text-orange-750 transition-all duration-200 select-none cursor-pointer shadow-3xs group"
              >
                <Home className="w-4 h-4 absolute left-4 shrink-0 text-[#1b253c]/80 group-hover:text-orange-500 transition-colors duration-200" />
                <span>Back to Home</span>
              </Link>
              <button
                onClick={onOpenSettings}
                className="w-full relative flex items-center justify-center py-2.5 px-4 border border-[#1b253c]/20 hover:border-orange-300 bg-white hover:bg-orange-50/40 rounded-xl text-sm font-bold text-[#1b253c] hover:text-orange-750 transition-all duration-200 select-none cursor-pointer shadow-3xs group"
              >
                <Settings className="w-4 h-4 absolute left-4 shrink-0 text-[#1b253c]/80 group-hover:text-orange-500 transition-colors duration-200" />
                <span>Settings</span>
              </button>
              <button
                onClick={() => window.location.href = "/login"}
                className="w-full relative flex items-center justify-center py-2.5 px-4 border border-red-200 hover:border-red-300 bg-red-50/20 hover:bg-red-50/50 rounded-xl text-sm font-bold text-red-500 hover:text-red-750 transition-all duration-200 select-none cursor-pointer shadow-3xs group"
              >
                <LogOut className="w-4 h-4 absolute left-4 shrink-0 text-red-400 group-hover:text-red-600 transition-colors duration-200" />
                <span>Logout</span>
              </button>
              <div className="w-full text-center mt-2.5 select-none shrink-0">
                <span
                  className="text-lg font-black text-zinc-400 tracking-widest"
                  style={{ fontFamily: "var(--font-pixeloid)" }}
                >
                  ATAL
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <Link href="/" title="Back to Home" className="text-[#1b253c]/80 hover:text-orange-500 transition-colors duration-200">
                <Home className="w-4.5 h-4.5" />
              </Link>
              <button onClick={onOpenSettings} title="Settings" className="text-[#1b253c]/80 hover:text-orange-500 transition-colors duration-200 cursor-pointer">
                <Settings className="w-4.5 h-4.5" />
              </button>
              <button onClick={() => window.location.href = "/login"} title="Logout" className="text-red-400 hover:text-red-600 transition-colors duration-200 cursor-pointer">
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Mobile Drawer Navigation (Slide-out Overlay Backdrop) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/15 backdrop-blur-xs z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer Navigation (Slide-out Panel) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", ...SPRING_NAV }}
            className="fixed inset-y-0 left-0 bg-[#F7F4EC] border-r border-zinc-200/80 z-50 flex flex-col h-full w-[280px] shrink-0 overflow-hidden shadow-xl md:hidden pt-4"
          >
            {/* Mobile Sidebar Header */}
            <div className="px-4 pb-4 flex items-center justify-between shrink-0 w-full relative">
              <span 
                className="text-3xl font-black text-zinc-950 tracking-widest select-none mx-auto"
                style={{ fontFamily: "var(--font-pixeloid)" }}
              >
                ATAL
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute right-4 p-2 rounded-xl border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors duration-200 cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Search Bar */}
            <div className="px-4 pb-3 shrink-0 border-b border-zinc-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/60 border border-[#1b253c]/15 text-[#1b253c] placeholder:text-[#1b253c]/40 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none font-semibold transition-all duration-200"
                />
              </div>
            </div>

            {/* Mobile New Session */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <button
                onClick={() => {
                  onNewSession();
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white hover:bg-orange-600 rounded-xl py-2 text-xs font-bold transition-all duration-300 active:scale-98"
              >
                <span>New Session</span>
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile list */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              <div className="px-2 py-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-widest select-none">
                Chat History
              </div>
              {filteredSessions.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                  sidebarOpen={true}
                  onSelect={(id) => {
                    onSelectSession(id);
                    setSidebarOpen(false);
                  }}
                  onDelete={onDeleteSession}
                />
              ))}
            </div>

            {/* Mobile Sidebar Footer Controls */}
            <div className="p-4 border-t border-zinc-200/60 bg-black/[0.02] shrink-0 flex flex-col gap-2.5 w-full">
              <Link
                href="/"
                className="w-full relative flex items-center justify-center py-2.5 px-4 border border-[#1b253c]/20 hover:border-orange-300 bg-white rounded-xl text-sm font-bold text-[#1b253c] hover:text-orange-750 transition-all duration-200 select-none cursor-pointer shadow-3xs group"
              >
                <Home className="w-4 h-4 absolute left-4 shrink-0 text-[#1b253c]/80 group-hover:text-orange-500 transition-colors duration-200" />
                <span>Back to Home</span>
              </Link>
              <button
                onClick={() => {
                  onOpenSettings();
                  setSidebarOpen(false);
                }}
                className="w-full relative flex items-center justify-center py-2.5 px-4 border border-[#1b253c]/20 hover:border-orange-300 bg-white rounded-xl text-sm font-bold text-[#1b253c] hover:text-orange-750 transition-all duration-200 select-none cursor-pointer shadow-3xs group"
              >
                <Settings className="w-4 h-4 absolute left-4 shrink-0 text-[#1b253c]/80 group-hover:text-orange-500 transition-colors duration-200" />
                <span>Settings</span>
              </button>
              <button
                onClick={() => window.location.href = "/login"}
                className="w-full relative flex items-center justify-center py-2.5 px-4 border border-red-200 hover:border-red-300 bg-red-50/20 hover:bg-red-50/50 rounded-xl text-sm font-bold text-red-500 hover:text-red-750 transition-all duration-200 select-none cursor-pointer shadow-3xs group"
              >
                <LogOut className="w-4 h-4 absolute left-4 shrink-0 text-red-400 group-hover:text-red-600 transition-colors duration-200" />
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
