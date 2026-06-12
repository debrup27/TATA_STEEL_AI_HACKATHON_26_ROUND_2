"use client";
import React, { useCallback, useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ClickSpark from "../../../animations/ClickSpark";
import { PromptInputWithActions } from "../../../components/PromptInputWithActions";
import {
  Plus,
  Trash2,
  MessageSquare,
  Settings,
  Home,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from "lucide-react";

import {
  Steps,
  StepsContent,
  StepsItem,
  StepsTrigger,
} from "@/components/ai-components/steps";
import { TextShimmerLoader } from "@/components/ai-components/loader";
import { ScrollButton } from "@/components/ai-components/scroll-button";
import {
  Source,
  SourceContent,
  SourceTrigger,
} from "@/components/ai-components/source";

interface MessageFile {
  name: string;
  type: string;
  pages: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  files?: MessageFile[];
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

const MOCK_SESSIONS: ChatSession[] = [
  {
    id: "session-1",
    title: "Turbine Wear Check",
    createdAt: "10:24 AM",
    messages: [
      { role: "user", content: "Analyze predictive wear patterns for Turbine #3" },
      { role: "assistant", content: "Analysis complete. Asset integrity levels are nominal. Predictive wear models estimate 1,200 run hours before replacement. Let me know if you would like me to schedule a diagnostic run." }
    ]
  },
  {
    id: "session-2",
    title: "Furnace 3 Telemetry",
    createdAt: "Yesterday",
    messages: [
      { role: "user", content: "Generate telemetry report for furnace 3" },
      { role: "assistant", content: "Furnace 3 telemetry check: Temperature gradient is within normal bounds. Core sensor report is nominal." }
    ]
  },
  {
    id: "session-3",
    title: "Hydraulic Valve Status",
    createdAt: "2 days ago",
    messages: [
      { role: "user", content: "Is the hydraulic valve leaking?" },
      { role: "assistant", content: "No leakage detected. Pressure stability index is at 98.4%, indicating normal seal integrity." }
    ]
  }
];

export default function ManasChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("manas_chat_sessions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error("Failed to parse chat sessions", e);
        }
      }
    }
    return MOCK_SESSIONS;
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("manas_chat_sessions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0].id;
          }
        } catch {}
      }
    }
    return MOCK_SESSIONS[0].id;
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deepThinking, setDeepThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFile, setExpandedFile] = useState<MessageFile | null>(null);

  const isLoaded = useRef(true);
  const thinkingSessionIdRef = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Save sessions to local storage
  useEffect(() => {
    if (!isLoaded.current) return;
    localStorage.setItem("manas_chat_sessions", JSON.stringify(sessions));
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const handleSendMessage = useCallback((messageText: string, attachedFiles?: MessageFile[]) => {
    if (!activeSessionId) return;
    thinkingSessionIdRef.current = activeSessionId;

    setSessions((prevSessions) => {
      return prevSessions.map((session) => {
        if (session.id !== activeSessionId) return session;

        const updatedMessages = [...session.messages, { role: "user" as const, content: messageText, files: attachedFiles }];
        
        // Auto rename title if it was default "New Session"
        const isNew = session.title === "New Session" || session.messages.length === 0;
        const newTitle = isNew
          ? messageText.length > 25
            ? messageText.slice(0, 25) + "..."
            : messageText
          : session.title;

        return {
          ...session,
          title: newTitle,
          messages: updatedMessages,
        };
      });
    });

    setIsLoading(true);
    setCurrentStep(0);
  }, [activeSessionId]);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setShowProcessing(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!showProcessing) return;
    const stepCount = 3;
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= stepCount - 1) {
          clearInterval(stepTimer);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    const doneTimer = setTimeout(() => {
      const targetId = thinkingSessionIdRef.current || activeSessionId;
      const assistantReply = "Analysis complete. Asset integrity levels are nominal. Predictive wear models estimate 1,200 run hours before replacement. Let me know if you would like me to schedule a diagnostic run.";

      setSessions((prevSessions) => {
        return prevSessions.map((session) => {
          if (session.id !== targetId) return session;
          return {
            ...session,
            messages: [...session.messages, { role: "assistant" as const, content: assistantReply }],
          };
        });
      });
      setShowProcessing(false);
      setIsLoading(false);
      setCurrentStep(0);
      thinkingSessionIdRef.current = null;
    }, 1500 * stepCount + 500);

    return () => {
      clearInterval(stepTimer);
      clearTimeout(doneTimer);
    };
  }, [showProcessing, deepThinking, activeSessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, showProcessing]);

  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Session",
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  const handleDeleteSession = (idToDelete: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== idToDelete);
      if (activeSessionId === idToDelete) {
        if (updated.length > 0) {
          setActiveSessionId(updated[0].id);
        } else {
          // If no sessions remain, auto-create a new empty one
          const newId = `session-${Date.now()}`;
          const newSession: ChatSession = {
            id: newId,
            title: "New Session",
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: [],
          };
          setActiveSessionId(newId);
          return [newSession];
        }
      }
      return updated;
    });
  };

  // Filter sessions based on search query
  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={10}
      sparkRadius={20}
      sparkCount={8}
      duration={400}
      className="relative w-full h-screen bg-[#FAF7F2] flex overflow-hidden pt-0"
    >
      {/* History Sidebar */}
      <motion.div
        animate={{ width: sidebarOpen ? 280 : 64 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
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
              onClick={handleNewSession}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white hover:bg-orange-600 rounded-xl py-2 text-xs font-bold transition-all duration-300 shadow-sm cursor-pointer active:scale-98 select-none group"
            >
              <span>New Session</span>
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
            </button>
          ) : (
            <button
              onClick={handleNewSession}
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
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const lastMsg = session.messages[session.messages.length - 1];
              return (
                <div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
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
                        {lastMsg ? lastMsg.content : "No messages yet"}
                      </div>
                    </div>
                  )}
                  
                  {/* Delete Button (Only when sidebar open) */}
                  {sidebarOpen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-all duration-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: Home, Settings & Logout */}
        <div className={`p-4 border-t border-zinc-200/60 bg-black/[0.02] shrink-0 flex flex-col gap-2.5 w-full`}>
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
                onClick={() => alert("Settings panel under construction")}
                className="w-full relative flex items-center justify-center py-2.5 px-4 border border-[#1b253c]/20 hover:border-orange-300 bg-white hover:bg-orange-50/40 rounded-xl text-sm font-bold text-[#1b253c] hover:text-orange-750 transition-all duration-200 select-none cursor-pointer shadow-3xs group"
              >
                <Settings className="w-4 h-4 absolute left-4 shrink-0 text-[#1b253c]/80 group-hover:text-orange-500 transition-colors duration-200" />
                <span>Settings</span>
              </button>
              <button
                onClick={() => window.location.href = "/login"}
                className="w-full relative flex items-center justify-center py-2.5 px-4 border border-red-200 hover:border-red-300 bg-red-50/20 hover:bg-red-50/50 rounded-xl text-sm font-bold text-red-500 hover:text-red-700 transition-all duration-200 select-none cursor-pointer shadow-3xs group"
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
              <button onClick={() => alert("Settings panel under construction")} title="Settings" className="text-[#1b253c]/80 hover:text-orange-500 transition-colors duration-200 cursor-pointer">
                <Settings className="w-4.5 h-4.5" />
              </button>
              <button onClick={() => window.location.href = "/login"} title="Logout" className="text-red-400 hover:text-red-600 transition-colors duration-200 cursor-pointer">
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Mobile Drawer Navigation (Slide-out Overlay) */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(true)}
            className="fixed inset-0 bg-black/15 backdrop-blur-xs z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
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
                onClick={handleNewSession}
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
              {filteredSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const lastMsg = session.messages[session.messages.length - 1];
                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setSidebarOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                      isActive ? "bg-orange-50/70 border-orange-100/50 text-orange-950" : "border-transparent text-zinc-600"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-zinc-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{session.title}</div>
                      <div className="text-[10px] text-zinc-400 truncate mt-0.5">{lastMsg?.content || "No messages yet"}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Sidebar Footer Controls */}
            <div className="p-4 border-t border-zinc-200/60 bg-black/[0.02] shrink-0 flex flex-col gap-2.5 w-full">
              <Link
                href="/"
                className="w-full relative flex items-center justify-center py-2.5 px-4 border border-[#1b253c]/20 hover:border-orange-300 bg-white rounded-xl text-sm font-bold text-[#1b253c] hover:text-orange-700 transition-all duration-200 select-none cursor-pointer shadow-3xs group"
              >
                <Home className="w-4 h-4 absolute left-4 shrink-0 text-[#1b253c]/80 group-hover:text-orange-500 transition-colors duration-200" />
                <span>Back to Home</span>
              </Link>
              <button
                onClick={() => alert("Settings panel under construction")}
                className="w-full relative flex items-center justify-center py-2.5 px-4 border border-[#1b253c]/20 hover:border-orange-300 bg-white rounded-xl text-sm font-bold text-[#1b253c] hover:text-orange-700 transition-all duration-200 select-none cursor-pointer shadow-3xs group"
              >
                <Settings className="w-4 h-4 absolute left-4 shrink-0 text-[#1b253c]/80 group-hover:text-orange-500 transition-colors duration-200" />
                <span>Settings</span>
              </button>
              <button
                onClick={() => window.location.href = "/login"}
                className="w-full relative flex items-center justify-center py-2.5 px-4 border border-red-200 hover:border-red-300 bg-red-50/20 hover:bg-red-50/50 rounded-xl text-sm font-bold text-red-500 hover:text-red-700 transition-all duration-200 select-none cursor-pointer shadow-3xs group"
              >
                <LogOut className="w-4 h-4 absolute left-4 shrink-0 text-red-400 group-hover:text-red-600 transition-colors duration-200" />
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Floating Mobile Sidebar Toggle Button (when drawer is closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-5 left-6 p-2.5 rounded-xl border border-zinc-200/80 bg-white hover:bg-zinc-50 text-zinc-600 transition-all duration-200 cursor-pointer shadow-sm z-30 flex items-center justify-center active:scale-95 md:hidden"
          >
            <PanelLeftOpen className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Content Stream */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-[#FAF7F2]">
          <AnimatePresence mode="popLayout">
            {!activeSession || activeSession.messages.length === 0 ? (
              <motion.div
                key="hero"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex-1 flex flex-col items-center justify-center px-6"
              >
                <div className="flex flex-col items-center gap-2 -mt-16 text-center">
                  <Image
                    src="/long_form_logo.png"
                    alt="Project ATAL Logo"
                    width={320}
                    height={213}
                    className="w-auto h-auto max-w-[240px] object-contain select-none pointer-events-none drop-shadow-sm"
                    priority
                  />
                  <div className="text-center mt-2">
                    <h1 className="text-2xl md:text-4xl font-extrabold italic text-zinc-900 tracking-tight font-sans">Manas</h1>
                    <p className="mt-1 text-sm md:text-base font-semibold text-zinc-500 font-sans">
                      Asset Intelligence & Lifecycle Diagnostics
                    </p>
                  </div>
                </div>
                <motion.div layoutId="chatbox" className="w-full max-w-3xl mx-auto mt-8 shrink-0">
                  <PromptInputWithActions
                    deepThinking={deepThinking}
                    onDeepThinkingChange={setDeepThinking}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    className="w-full px-3 pb-3 md:px-5 md:pb-5"
                  />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                ref={scrollContainerRef}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex-1 flex flex-col px-6 pt-20 pb-4 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1b253c]/15 hover:[&::-webkit-scrollbar-thumb]:bg-[#1b253c]/35 [&::-webkit-scrollbar-thumb]:rounded-full scroll-smooth"
              >
                <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 mt-0">
                  {activeSession.messages.map((msg, i) => (
                    <motion.div
                      key={msg.role + i}
                      layout
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i === 0 ? 0.15 : 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`leading-relaxed flex flex-col gap-2 ${
                          msg.role === "user"
                            ? "max-w-[80%] text-sm font-semibold bg-zinc-900 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-3xs"
                            : "max-w-full text-base md:text-[17px] font-semibold text-zinc-900 w-full py-2"
                        }`}
                      >
                        {msg.files && msg.files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-1">
                            {msg.files.map((file, idx) => {
                              const isPdf = file.type === "application/pdf";
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setExpandedFile(file)}
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
                        <div>{msg.content}</div>
                      </div>
                    </motion.div>
                  ))}

                  {showProcessing && (
                    <motion.div
                      layout
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      className="max-w-[80%]"
                    >
                      <Steps defaultOpen>
                        <StepsTrigger>
                          <TextShimmerLoader
                            text={deepThinking ? "Deep Thinking..." : "Processing your request"}
                            size="md"
                          />
                        </StepsTrigger>
                        <StepsContent>
                          <div className="space-y-1">
                            {deepThinking ? (
                              <>
                                <StepsItem status={currentStep > 0 ? "complete" : currentStep === 0 ? "active" : "pending"}>Reasoning through asset data</StepsItem>
                                <StepsItem status={currentStep > 1 ? "complete" : currentStep === 1 ? "active" : "pending"}>Evaluating equipment history logs</StepsItem>
                                <StepsItem status={currentStep > 2 ? "complete" : currentStep === 2 ? "active" : "pending"}>Compiling wear projections</StepsItem>
                              </>
                            ) : (
                              <>
                                <StepsItem status={currentStep > 0 ? "complete" : currentStep === 0 ? "active" : "pending"}>Parsing telemetry feeds</StepsItem>
                                <StepsItem status={currentStep > 1 ? "complete" : currentStep === 1 ? "active" : "pending"}>
                                  <Source href="https://example.com">
                                    <SourceTrigger label="datalake.atal" showFavicon />
                                    <SourceContent
                                      title="ATAL Diagnostic Lake"
                                      description="Primary index for asset sensor feeds."
                                    />
                                  </Source>{" "}
                                  referenced
                                </StepsItem>
                                <StepsItem status={currentStep > 2 ? "complete" : currentStep === 2 ? "active" : "pending"}>Formulating diagnosis</StepsItem>
                              </>
                            )}
                          </div>
                        </StepsContent>
                      </Steps>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeSession && activeSession.messages.length > 0 && (
            <motion.div
              layoutId="chatbox"
              className="shrink-0 pb-4 pt-2 px-3 relative"
              initial={false}
            >
              <ScrollButton containerRef={scrollContainerRef} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-40" />
              <PromptInputWithActions
                deepThinking={deepThinking}
                onDeepThinkingChange={setDeepThinking}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                className="w-full max-w-3xl mx-auto px-3 pb-3 md:px-5 md:pb-5"
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Expanded View Modal */}
      {expandedFile && expandedFile.pages && expandedFile.pages.length > 0 && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-6"
          onClick={() => setExpandedFile(null)}
        >
          <div
            className="bg-white rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-w-7xl max-h-[92vh] w-max h-max animate-in fade-in zoom-in duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-zinc-200 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <p className="text-sm font-semibold text-zinc-700 truncate">{expandedFile.name}</p>
                {expandedFile.type === "application/pdf" && (
                  <span className="text-xs text-zinc-400 shrink-0">{expandedFile.pages.length} page{expandedFile.pages.length !== 1 ? "s" : ""}</span>
                )}
              </div>
              <button
                onClick={() => setExpandedFile(null)}
                className="size-8 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors cursor-pointer shrink-0 text-zinc-500 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto bg-zinc-100 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400">
              {expandedFile.pages.length === 1 && expandedFile.type !== "application/pdf" ? (
                <div className="flex items-center justify-center p-4 min-h-[300px] max-h-[82vh]">
                  <img
                    src={expandedFile.pages[0]}
                    alt={expandedFile.name ?? "Image"}
                    className="max-w-full max-h-full rounded-lg shadow-md object-contain"
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-6 px-4">
                  {expandedFile.pages.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`${expandedFile.name} - page ${i + 1}`}
                      className="w-full max-w-3xl rounded-lg shadow-md"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
