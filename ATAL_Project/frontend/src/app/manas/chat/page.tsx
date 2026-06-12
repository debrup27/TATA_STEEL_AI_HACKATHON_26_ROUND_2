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
  ragDocs?: { name: string; size: string; type?: string; pages?: string[]; isCustom?: boolean }[];
}

const PRELOADED_DOCS = [
  { name: "Standard Operating Procedure - Blast Furnace F3.pdf", size: "2.4 MB" },
  { name: "Ladle Transfer Optimization Manual v2.pdf", size: "1.8 MB" },
  { name: "Exhauster Bearing Repair Guide - F1-EQ09.pdf", size: "4.1 MB" },
  { name: "Coke Oven Precipitator Calibration Logs.pdf", size: "920 KB" },
  { name: "Sinter Plant Maintenance Records - Q1 2026.pdf", size: "3.5 MB" }
];

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

  // RAG States
  const [showRagSelector, setShowRagSelector] = useState(false);
  const [selectedPreloadedDocs, setSelectedPreloadedDocs] = useState<string[]>([]);
  const [customDocs, setCustomDocs] = useState<{ name: string; size: string; isCustom: boolean }[]>([]);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [contextEnabled, setContextEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("manas_context_enabled");
      return saved !== "false";
    }
    return true;
  });
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("manas_alerts_enabled");
      return saved !== "false";
    }
    return true;
  });

  // Refs
  const isLoaded = useRef(true);
  const thinkingSessionIdRef = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const promptedSessionsRef = useRef<Record<string, boolean>>({});

  // Derived state (declared safely after all state hooks)
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const hasContext = !!(activeSession && activeSession.ragDocs && activeSession.ragDocs.length > 0);
  const contextCount = activeSession && activeSession.ragDocs ? activeSession.ragDocs.length : 0;

  const handleToggleContext = (val: boolean) => {
    setContextEnabled(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("manas_context_enabled", String(val));
    }
    if (!val) {
      setSessions((prev) =>
        prev.map((s) => ({ ...s, ragDocs: undefined }))
      );
      setShowRightPanel(false);
    }
  };

  const handleToggleAlerts = (val: boolean) => {
    setAlertsEnabled(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("manas_alerts_enabled", String(val));
    }
  };

  // Automatically prompt document context selection on a new chat
  useEffect(() => {
    if (isMounted && activeSessionId) {
      const active = sessions.find((s) => s.id === activeSessionId);
      if (active && active.messages.length === 0 && (!active.ragDocs || active.ragDocs.length === 0)) {
        if (!promptedSessionsRef.current[activeSessionId]) {
          promptedSessionsRef.current[activeSessionId] = true;
          setSelectedPreloadedDocs([
            PRELOADED_DOCS[0].name,
            PRELOADED_DOCS[2].name
          ]);
          setCustomDocs([]);
          setShowRagSelector(true);
        }
      }
    }
  }, [isMounted, activeSessionId, sessions]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  


  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleCustomFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: { name: string; size: string; type: string; pages: string[]; isCustom: boolean }[] = [];
      for (const file of Array.from(e.target.files)) {
        try {
          let pages: string[] = [];
          if (file.type === "application/pdf") {
            try {
              const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
              GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`;
              const data = await file.arrayBuffer();
              const pdf = await getDocument({ data }).promise;
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvas, viewport }).promise;
                pages.push(canvas.toDataURL("image/webp", 0.92));
              }
            } catch (err) {
              console.error("Failed to render PDF page, using fallback", err);
              pages = [];
            }
          } else {
            pages = [await fileToBase64(file)];
          }

          newFiles.push({
            name: file.name,
            size: formatBytes(file.size),
            type: file.type,
            pages: pages,
            isCustom: true,
          });
        } catch (err) {
          console.error("Failed to process file", err);
        }
      }
      setCustomDocs((prev) => [...prev, ...newFiles]);
    }
  };
  const handleConfirmRagDocs = (selectedDocs: { name: string; size: string; isCustom?: boolean }[]) => {
    if (activeSession && activeSession.messages.length > 0) {
      // Update active session (managing documents of an ongoing chat)
      setSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id !== activeSessionId) return session;
          return {
            ...session,
            ragDocs: selectedDocs
          };
        })
      );
      setShowRagSelector(false);
    } else {
      // Update the active empty session with confirmed docs and start welcome message
      setSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id !== activeSessionId) return session;
          return {
            ...session,
            title: `RAG Session: ${selectedDocs.length} Doc${selectedDocs.length !== 1 ? "s" : ""} Loaded`,
            messages: [
              {
                role: "assistant" as const,
                content: `Hi! I have loaded the selected ${selectedDocs.length} document(s) into my context. Ask me anything referencing their content.`
              }
            ],
            ragDocs: selectedDocs,
          };
        })
      );
      setShowRagSelector(false);
    }
  };

  const handleOpenConciergeContext = () => {
    setSelectedPreloadedDocs(
      activeSession?.ragDocs
        ? activeSession.ragDocs.filter(d => !d.isCustom).map(d => d.name)
        : []
    );
    setCustomDocs(
      activeSession?.ragDocs
        ? (activeSession.ragDocs.filter(d => d.isCustom) as { name: string; size: string; isCustom: boolean }[])
        : []
    );
    setShowRagSelector(true);
  };

  // Save sessions to local storage
  useEffect(() => {
    if (!isLoaded.current) return;
    localStorage.setItem("manas_chat_sessions", JSON.stringify(sessions));
  }, [sessions]);


  // Auto close Right Panel if context documents are cleared
  useEffect(() => {
    if (!activeSession?.ragDocs || activeSession.ragDocs.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowRightPanel(false);
    }
  }, [activeSession?.ragDocs]);

  const handleUploadContextDoc = useCallback((file: { name: string; size: string; type: string; pages: string[]; isCustom: boolean }) => {
    let targetSessionId = activeSessionId;
    if (!activeSessionId) {
      const newId = `session-${Date.now()}`;
      const newSession: ChatSession = {
        id: newId,
        title: "New Session",
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        messages: [
          {
            role: "assistant",
            content: "Hi! I have initialized this conversation with context documents. Ask me anything about them."
          }
        ],
        ragDocs: []
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newId);
      targetSessionId = newId;
    }

    setSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id !== targetSessionId) return session;
        const currentDocs = session.ragDocs || [];
        if (currentDocs.some(d => d.name === file.name)) return session;
        return {
          ...session,
          ragDocs: [...currentDocs, file]
        };
      })
    );
    setShowRightPanel(true);
  }, [activeSessionId]);

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
    // Create new empty session first
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Session",
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [],
      ragDocs: []
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
            ragDocs: []
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
  if (!isMounted) {
    return <div className="w-full h-screen bg-[#FAF7F2]" />;
  }

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
                onClick={() => setShowSettings(true)}
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
              <button onClick={() => setShowSettings(true)} title="Settings" className="text-[#1b253c]/80 hover:text-orange-500 transition-colors duration-200 cursor-pointer">
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
        {hasContext && (
          <button
            onClick={() => setShowRightPanel((prev) => !prev)}
            className="absolute top-5 right-6 z-40 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-orange-600 text-white font-bold transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center active:scale-95 select-none text-xs"
            style={{ fontFamily: "var(--font-pixeloid)" }}
            title={showRightPanel ? "Collapse Context Panel" : "Expand Context Panel"}
          >
            {showRightPanel ? "->" : "<-"}
          </button>
        )}
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
                    hasContext={hasContext}
                    contextCount={contextCount}
                    onContextClick={() => setShowRightPanel((prev) => !prev)}
                    onClearContext={() => {
                      setSessions((prev) =>
                        prev.map((s) => (s.id === activeSessionId ? { ...s, ragDocs: undefined } : s))
                      );
                      setShowRightPanel(false);
                    }}
                    onUploadContextDoc={handleUploadContextDoc}
                    onConciergeClick={handleOpenConciergeContext}
                    contextEnabled={contextEnabled}
                    alertsEnabled={alertsEnabled}
                    onDisableAlerts={() => handleToggleAlerts(false)}
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
                hasContext={hasContext}
                contextCount={contextCount}
                onContextClick={() => setShowRightPanel((prev) => !prev)}
                onClearContext={() => {
                  setSessions((prev) =>
                    prev.map((s) => (s.id === activeSessionId ? { ...s, ragDocs: undefined } : s))
                  );
                  setShowRightPanel(false);
                }}
                onUploadContextDoc={handleUploadContextDoc}
                onConciergeClick={handleOpenConciergeContext}
                contextEnabled={contextEnabled}
                alertsEnabled={alertsEnabled}
                onDisableAlerts={() => handleToggleAlerts(false)}
                className="w-full max-w-3xl mx-auto px-3 pb-3 md:px-5 md:pb-5"
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Right Sidebar for RAG Documents (Claude-style Right Pane) */}
      <AnimatePresence>
        {activeSession && activeSession.ragDocs && activeSession.ragDocs.length > 0 && showRightPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="hidden xl:flex flex-col h-full bg-[#F7F4EC] border-l border-zinc-200/80 z-35 shrink-0 overflow-hidden"
          >
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 shrink-0 select-none">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
                    Context Panel
                  </h3>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black font-mono">
                    {activeSession.ragDocs.length} Active Document{activeSession.ragDocs.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRightPanel(false)}
                    className="size-7 rounded-full border border-zinc-200 hover:border-zinc-350 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer text-zinc-500 hover:text-zinc-800"
                    title="Close panel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              
              {/* Document list */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full pr-1">
                {activeSession.ragDocs.map((doc, idx) => (
                  <div key={idx} className="bg-white border border-zinc-250/70 rounded-2xl p-4 shadow-3xs flex flex-col gap-2 transition-all hover:border-[#4A582E]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 text-[#f97316]">
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate text-[#1b253c] leading-snug" style={{ fontFamily: "var(--font-questrial)" }}>
                          {doc.name}
                        </p>
                        <span className="text-[10px] text-zinc-400 font-mono font-medium">{doc.size}</span>
                      </div>
                    </div>
                    {doc.pages && doc.pages.length > 0 && doc.pages[0] && (doc.type?.startsWith("image/") || doc.name.match(/\.(png|jpg|jpeg|webp|gif|bmp)$/i)) && (
                      <div 
                        className="mt-2 w-full h-24 rounded-lg overflow-hidden border border-zinc-150 relative bg-zinc-50 flex items-center justify-center cursor-pointer group/thumb" 
                        onClick={() => setExpandedFile({ name: doc.name, type: doc.type || "image/png", pages: doc.pages || [] })}
                      >
                        <img src={doc.pages[0]} alt={doc.name} className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105" />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-155/65">
                      <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider font-mono">
                        {doc.isCustom ? "Custom File" : "Preloaded Guide"}
                      </span>
                      <button
                        onClick={() => {
                          setSessions(prev =>
                            prev.map(s => {
                              if (s.id !== activeSessionId) return s;
                              const updated = s.ragDocs ? s.ragDocs.filter(d => d.name !== doc.name) : [];
                              return {
                                ...s,
                                ragDocs: updated.length > 0 ? updated : undefined
                              };
                            })
                          );
                        }}
                        className="text-[9px] font-bold text-red-500 hover:text-red-750 transition-colors uppercase flex items-center gap-1 cursor-pointer"
                        title="Remove from conversation context"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-200/60 shrink-0 select-none">
                <button 
                  onClick={() => {
                    setSelectedPreloadedDocs(
                      activeSession.ragDocs
                        ? activeSession.ragDocs.filter(d => !d.isCustom).map(d => d.name)
                        : []
                    );
                    setCustomDocs(
                      activeSession.ragDocs
                        ? (activeSession.ragDocs.filter(d => d.isCustom) as { name: string; size: string; isCustom: boolean }[])
                        : []
                    );
                    setShowRagSelector(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-[#f97316] text-white rounded-xl py-2.5 text-xs font-bold transition-all duration-300 shadow-sm cursor-pointer"
                  style={{ fontFamily: "var(--font-pixeloid)" }}
                >
                  <span>Manage Documents</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Rag Document Selector Modal */}
      <RagDocumentSelectorModal
        isOpen={showRagSelector}
        onClose={() => setShowRagSelector(false)}
        selectedPreloaded={selectedPreloadedDocs}
        onTogglePreloaded={(name) => {
          setSelectedPreloadedDocs((prev) =>
            prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
          );
        }}
        customDocs={customDocs}
        onUploadCustom={handleCustomFileUpload}
        onRemoveCustom={(name) => {
          setCustomDocs((prev) => prev.filter((d) => d.name !== name));
        }}
        onConfirm={handleConfirmRagDocs}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        contextEnabled={contextEnabled}
        onToggleContext={handleToggleContext}
        alertsEnabled={alertsEnabled}
        onToggleAlerts={handleToggleAlerts}
      />
    </ClickSpark>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextEnabled: boolean;
  onToggleContext: (val: boolean) => void;
  alertsEnabled: boolean;
  onToggleAlerts: (val: boolean) => void;
}

function SettingsModal({
  isOpen,
  onClose,
  contextEnabled,
  onToggleContext,
  alertsEnabled,
  onToggleAlerts,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-[#FAF9F5] border border-zinc-200/85 rounded-3xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 text-[#1b253c]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner Accents */}
        <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/20 select-none">+</div>
        <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/20 select-none">+</div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-250/80 shrink-0">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight" style={{ fontFamily: "var(--font-questrial)" }}>
              Settings
            </h3>
            <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider font-bold">
              Configure your diagnostic environment preferences
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center hover:bg-zinc-150 transition-colors cursor-pointer text-zinc-500 hover:text-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 flex-1">
          {/* Toggle for Concierge Context */}
          <div className="flex items-center justify-between p-3.5 bg-white border border-zinc-200 rounded-xl">
            <div className="flex-1 min-w-0 pr-4">
              <h4 className="text-xs font-bold text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
                Concierge Context Actions
              </h4>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                Enable contextual document selection menu options inside the prompt input.
              </p>
            </div>
            <button
              onClick={() => onToggleContext(!contextEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                contextEnabled ? "bg-[#4A582E]" : "bg-zinc-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  contextEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle for System Alerts */}
          <div className="flex items-center justify-between p-3.5 bg-white border border-zinc-200 rounded-xl">
            <div className="flex-1 min-w-0 pr-4">
              <h4 className="text-xs font-bold text-[#1b253c]" style={{ fontFamily: "var(--font-questrial)" }}>
                System Alerts & Toasts
              </h4>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                Show real-time visual alerts and upload status notifications on the top-right of the screen.
              </p>
            </div>
            <button
              onClick={() => onToggleAlerts(!alertsEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                alertsEnabled ? "bg-[#4A582E]" : "bg-zinc-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  alertsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 shrink-0 bg-white">
          <button
            onClick={onClose}
            className="h-10 px-6 bg-zinc-900 hover:bg-[#f97316] text-white rounded-xl transition-all duration-300 font-bold text-xs uppercase cursor-pointer"
            style={{ fontFamily: "var(--font-pixeloid)" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface DocumentItem {
  name: string;
  size: string;
  isCustom?: boolean;
}

interface RagDocumentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPreloaded: string[];
  onTogglePreloaded: (name: string) => void;
  customDocs: DocumentItem[];
  onUploadCustom: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveCustom: (name: string) => void;
  onConfirm: (selected: DocumentItem[]) => void;
}

function RagDocumentSelectorModal({
  isOpen,
  onClose,
  selectedPreloaded,
  onTogglePreloaded,
  customDocs,
  onUploadCustom,
  onRemoveCustom,
  onConfirm,
}: RagDocumentSelectorModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    const selected: DocumentItem[] = [];
    PRELOADED_DOCS.forEach((doc) => {
      if (selectedPreloaded.includes(doc.name)) {
        selected.push(doc);
      }
    });
    selected.push(...customDocs);
    onConfirm(selected);
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-[#FAF9F5] border border-zinc-200/85 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 text-[#1b253c]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner Accents */}
        <div className="absolute top-2.5 left-2.5 font-mono text-[9px] text-[#1b253c]/20 select-none">+</div>
        <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-[#1b253c]/20 select-none">+</div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-250/80 shrink-0">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight" style={{ fontFamily: "var(--font-questrial)" }}>
              Select Documents for RAG Context
            </h3>
            <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider font-bold">
              Choose preloaded guides or upload custom files to contextually answer queries
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center hover:bg-zinc-150 transition-colors cursor-pointer text-zinc-500 hover:text-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {/* Preloaded Section */}
          <div>
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#f97316] mb-3">Preloaded System Docs</h4>
            <div className="space-y-2.5">
              {PRELOADED_DOCS.map((doc) => {
                const isChecked = selectedPreloaded.includes(doc.name);
                return (
                  <div
                    key={doc.name}
                    onClick={() => onTogglePreloaded(doc.name)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                      isChecked
                        ? "bg-[#4A582E]/5 border-[#4A582E] text-[#1b253c]"
                        : "bg-white border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isChecked ? "bg-[#4A582E] text-white" : "bg-zinc-100 text-zinc-400"
                      }`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate pr-2" style={{ fontFamily: "var(--font-questrial)" }}>{doc.name}</p>
                        <span className="text-[10px] text-zinc-400 font-mono">{doc.size}</span>
                      </div>
                    </div>
                    
                    {/* Check indicator */}
                    <div className={`size-5 rounded-md border flex items-center justify-center transition-all ${
                      isChecked ? "bg-[#4A582E] border-[#4A582E]" : "border-zinc-350 bg-white"
                    }`}>
                      {isChecked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Upload Section */}
          <div className="border-t border-zinc-200 pt-6">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#f97316] mb-3">Custom Context Documents</h4>
            
            {/* Custom files list */}
            {customDocs.length > 0 && (
              <div className="space-y-2.5 mb-4">
                {customDocs.map((doc) => (
                  <div
                    key={doc.name}
                    className="flex items-center justify-between p-3.5 bg-white border border-zinc-200 rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 text-[#f97316]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate pr-2" style={{ fontFamily: "var(--font-questrial)" }}>{doc.name}</p>
                        <span className="text-[10px] text-zinc-450 font-semibold uppercase tracking-wider font-mono">Custom Upload • {doc.size}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveCustom(doc.name)}
                      className="p-1.5 rounded-lg border border-zinc-200 hover:border-red-200 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Box */}
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-300 rounded-2xl bg-white hover:bg-zinc-50 cursor-pointer transition-all duration-200 group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                <svg className="w-8 h-8 text-zinc-400 group-hover:text-[#f97316] transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-xs font-bold text-zinc-700" style={{ fontFamily: "var(--font-questrial)" }}>
                  Click or drag files here to upload custom documents
                </p>
                <p className="text-[9px] text-zinc-450 font-bold uppercase tracking-wider mt-1 font-mono">
                  Supports PDF, PNG, TXT, DOCX
                </p>
              </div>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={onUploadCustom}
                accept=".pdf,.png,.jpg,.jpeg,.txt,.docx"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 shrink-0 select-none bg-white">
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-650 hover:text-zinc-900 transition-colors font-bold text-xs uppercase cursor-pointer"
            style={{ fontFamily: "var(--font-pixeloid)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="h-10 px-6 bg-zinc-900 hover:bg-[#f97316] text-white rounded-xl transition-all duration-300 font-bold text-xs uppercase cursor-pointer"
            style={{ fontFamily: "var(--font-pixeloid)" }}
          >
            Load Context & Start
          </button>
        </div>
      </div>
    </div>
  );
}
