"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import ClickSpark from "../../../animations/ClickSpark";
import { PromptInputWithActions } from "../../../components/PromptInputWithActions";
import { getPagesFromPdf } from "@/lib/pdf-renderer";
import { extractRagTextFromFile } from "@/lib/rag-file-text";
import { fileToBase64, formatBytes } from "@/lib/utils";
import { DURATION_SLOW, DURATION_SECTION_FADE, DURATION_VERY_SLOW } from "@/lib/constants";

import {
  Steps,
  StepsContent,
  StepsItem,
  StepsTrigger,
} from "@/components/ai-components/steps";
import { TextShimmerLoader } from "@/components/ai-components/loader";
import { ScrollButton } from "@/components/ai-components/scroll-button";
import {
  fetchSessions,
  fetchSessionDetail,
  createSession,
  sendChatMessage,
  persistSessions,
} from "@/services/sessions";
import { getLibraryDocuments, ragPayloadFromDocs, warmChatStack } from "@/services/chat";
import type { MessageFile, ChatSession, RagDoc, Citation } from "@/services/types";
import { useChatStream } from "@/hooks";

// Import broken down modular components
import SettingsModal from "./components/SettingsModal";
import RagDocumentSelectorModal from "./components/RagDocumentSelectorModal";
import ChatSidebar from "./components/ChatSidebar";
import MessageItem from "./components/MessageItem";
import ContextPanel from "./components/ContextPanel";
import ExpandedFileModal from "./components/ExpandedFileModal";

export default function ManasChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deepThinking, setDeepThinking] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("manas_deep_thinking") === "true";
    }
    return false;
  });
  const [selectedRole, setSelectedRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("manas_selected_role") || null;
    }
    return null;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFile, setExpandedFile] = useState<MessageFile | null>(null);

  // RAG States
  const [showRagSelector, setShowRagSelector] = useState(false);
  const [selectedPreloadedDocs, setSelectedPreloadedDocs] = useState<string[]>([]);
  const [customDocs, setCustomDocs] = useState<{ name: string; size: string; isCustom: boolean }[]>([]);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [triggerToast, setTriggerToast] = useState<string | null>(null);
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
  const streamSessionRef = useRef<string | null>(null);
  const chatSimResetRef = useRef<() => void>(() => undefined);

  const chatSim = useChatStream({
    sessionId: activeSessionId,
    onToken: (token) => {
      const targetId = streamSessionRef.current ?? activeSessionId;
      if (!targetId) return;
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== targetId) return session;
          const msgs = [...session.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, content: last.content + token };
          } else {
            msgs.push({ role: "assistant", content: token });
          }
          return { ...session, messages: msgs };
        }),
      );
    },
    onThinkToken: (token) => {
      const targetId = streamSessionRef.current ?? activeSessionId;
      if (!targetId) return;
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== targetId) return session;
          const msgs = [...session.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = {
              ...last,
              reasoning: (last.reasoning ?? "") + token,
            };
          } else {
            msgs.push({ role: "assistant", content: "", reasoning: token });
          }
          return { ...session, messages: msgs };
        }),
      );
    },
    onDone: (payload) => {
      const p = payload as { citations?: Citation[]; error?: string };
      const citations = p?.citations;
      const error = p?.error;
      const targetId = streamSessionRef.current ?? activeSessionId;
      if (targetId) {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id !== targetId) return session;
            const msgs = [...session.messages];
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              const updated: typeof last = error && !last.content
                ? { ...last, content: "⚠️ " + error }
                : last;
              msgs[msgs.length - 1] = citations?.length
                ? { ...updated, citations }
                : updated;
            }
            return { ...session, messages: msgs };
          }),
        );
      }
      streamSessionRef.current = null;
      thinkingSessionIdRef.current = null;
      chatSimResetRef.current();
    },
    onCompacting: () => {
      const targetId = streamSessionRef.current ?? activeSessionId;
      if (!targetId) return;
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== targetId) return session;
          return {
            ...session,
            messages: [
              ...session.messages,
              { role: "system" as const, content: "Running context compaction…", isCompacting: true },
            ],
          };
        }),
      );
    },
    onCompacted: (data) => {
      const targetId = streamSessionRef.current ?? activeSessionId;
      if (!targetId) return;
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== targetId) return session;
          const msgs = session.messages.map((m) =>
            m.role === "system" && m.isCompacting
              ? { role: "system" as const, content: `Context compacted — ${data?.compacted_count ?? "older"} messages summarised` }
              : m,
          );
          return { ...session, messages: msgs };
        }),
      );
    },
  });

  useEffect(() => {
    chatSimResetRef.current = chatSim.reset;
  }, [chatSim.reset]);

  useEffect(() => {
    let cancelled = false;
    fetchSessions()
      .then((rows) => {
        if (!cancelled) setSessions(rows);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // Pre-warm Ollama + RAG models so the first message does not cold-start.
  useEffect(() => {
    warmChatStack().catch(() => undefined);
  }, []);

  // Derived state
  const activeSession = activeSessionId ? sessions.find((s) => s.id === activeSessionId) || null : null;
  const hasContext = !!(activeSession?.ragDocs && activeSession.ragDocs.length > 0);
  const contextCount = activeSession?.ragDocs ? activeSession.ragDocs.length : 0;

  const handleToggleContext = useCallback((val: boolean) => {
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
  }, []);

  const handleToggleAlerts = useCallback((val: boolean) => {
    setAlertsEnabled(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("manas_alerts_enabled", String(val));
    }
  }, []);

  const handleRoleChange = useCallback((role: string | null) => {
    setSelectedRole(role);
    if (typeof window !== "undefined") {
      if (role) localStorage.setItem("manas_selected_role", role);
      else localStorage.removeItem("manas_selected_role");
    }
  }, []);

  const handleDeepThinkingChange = useCallback((val: boolean) => {
    setDeepThinking(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("manas_deep_thinking", String(val));
    }
  }, []);

  // Mark new sessions as prompted (no auto-open of RAG selector)
  useEffect(() => {
    if (isMounted && activeSessionId) {
      const active = sessions.find((s) => s.id === activeSessionId);
      if (active && active.messages.length === 0 && (!active.ragDocs || active.ragDocs.length === 0)) {
        promptedSessionsRef.current[activeSessionId] = true;
      }
    }
  }, [isMounted, activeSessionId, sessions]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // When navigated from sansad hub RAG Logs, open a fresh chat with RAG picker
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("rag") === "1") {
        window.history.replaceState({}, "", "/manas/chat");
        const timer = setTimeout(() => {
          setActiveSessionId(null);
          setShowRagSelector(true);
          setShowRightPanel(true);
          setSelectedPreloadedDocs([]);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleCustomFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: { name: string; size: string; type: string; pages: string[]; textContent?: string; isCustom: boolean }[] = [];
      for (const file of Array.from(e.target.files)) {
        try {
          let pages: string[] = [];
          const textContent = await extractRagTextFromFile(file);
          if (file.type === "application/pdf") {
            try {
              pages = await getPagesFromPdf(file);
            } catch (err) {
              console.error("Failed to render PDF page, using fallback", err);
              pages = [];
            }
          } else if (file.type.startsWith("image/")) {
            pages = [await fileToBase64(file)];
          }

          newFiles.push({
            name: file.name,
            size: formatBytes(file.size),
            type: file.type,
            pages,
            textContent: textContent || undefined,
            isCustom: true,
          });
        } catch (err) {
          console.error("Failed to process file", err);
        }
      }
      setCustomDocs((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const handleConfirmRagDocs = useCallback((selectedDocs: RagDoc[]) => {
    if (activeSession && activeSession.messages.length > 0) {
      setSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id !== activeSessionId) return session;
          return { ...session, ragDocs: selectedDocs };
        })
      );
    } else if (activeSessionId) {
      setSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id !== activeSessionId) return session;
          return {
            ...session,
            title: `RAG Session: ${selectedDocs.length} Doc${selectedDocs.length !== 1 ? "s" : ""} Loaded`,
            messages: [],
            ragDocs: selectedDocs,
          };
        })
      );
    } else {
      const newId = `session-${Date.now()}`;
      const newSession: ChatSession = {
        id: newId,
        title: `RAG Session: ${selectedDocs.length} Doc${selectedDocs.length !== 1 ? "s" : ""} Loaded`,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: [],
        ragDocs: selectedDocs,
      };
      setSessions((prev) => [...prev, newSession]);
      setActiveSessionId(newId);
    }
    setShowRagSelector(false);
    setShowRightPanel(true);
    setTriggerToast(`Loaded ${selectedDocs.length} document(s) into context`);
    setTimeout(() => setTriggerToast(null), 100);
  }, [activeSession, activeSessionId]);

  const handleOpenConciergeContext = useCallback(() => {
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
  }, [activeSession]);

  // Save sessions to local storage (strip image data to avoid quota)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isLoaded.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistSessions(sessions);
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [sessions]);

  // Auto close Right Panel if context documents are cleared
  useEffect(() => {
    if (!activeSession?.ragDocs || activeSession.ragDocs.length === 0) {
      const timer = setTimeout(() => {
        setShowRightPanel(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeSession?.ragDocs]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    let targetId = activeSessionId;
    const session = targetId ? sessions.find((s) => s.id === targetId) : null;
    const ragNames = session?.ragDocs ?? [];
    const ragPayload = {
      ...ragPayloadFromDocs(ragNames),
      user_role: selectedRole ?? undefined,
    };

    if (!targetId) {
      const created = await createSession(undefined, messageText.slice(0, 40) || "New Chat");
      targetId = created.id;
      setSessions((prev) => [...prev, created]);
      flushSync(() => {
        setActiveSessionId(created.id);
      });
      await chatSim.waitUntilReady();
    }

    thinkingSessionIdRef.current = targetId;
    streamSessionRef.current = targetId;

    setSessions((prevSessions) =>
      prevSessions.map((s) => {
        if (s.id !== targetId) return s;
        const updatedMessages = [
          ...s.messages,
          { role: "user" as const, content: messageText },
          { role: "assistant" as const, content: "", reasoning: deepThinking ? "" : undefined },
        ];
        const isNew = s.title === "New Session" || s.messages.length === 0;
        const newTitle = isNew
          ? messageText.length > 25
            ? `${messageText.slice(0, 25)}...`
            : messageText
          : s.title;
        return { ...s, title: newTitle, messages: updatedMessages };
      }),
    );

    chatSim.start();
    try {
      await chatSim.waitUntilReady();
      await sendChatMessage(targetId, messageText, ragPayload, { deepThinking });
    } catch {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== targetId) return s;
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant" && !last.content) {
            msgs[msgs.length - 1] = {
              role: "assistant",
              content: "Sorry — could not reach the backend. Check login and try again.",
            };
          }
          return { ...s, messages: msgs };
        }),
      );
      chatSim.reset();
    }
  }, [activeSessionId, sessions, chatSim, selectedRole, deepThinking]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, chatSim.showProcessing]);

  const handleNewSession = useCallback(() => {
    setActiveSessionId(null);
  }, []);

  const handleSelectSession = useCallback(async (id: string) => {
    setActiveSessionId(id);
    // Load messages from backend if not yet fetched for this session
    setSessions((prev) => {
      const existing = prev.find((s) => s.id === id);
      if (existing && existing.messages.length > 0) return prev;  // already loaded
      // Kick off async load; update state when it resolves
      fetchSessionDetail(id)
        .then((detail) => {
          setSessions((p) =>
            p.map((s) =>
              s.id === id
                ? { ...s, messages: detail.messages, lastMessagePreview: detail.lastMessagePreview }
                : s,
            ),
          );
        })
        .catch(() => undefined);
      return prev;
    });
  }, []);

  const handleDeleteSession = useCallback((idToDelete: string) => {
    // Fire-and-forget backend delete — ignore errors (session already gone from UI)
    import("@/services/sessions").then(({ deleteSessionRemote }) => {
      deleteSessionRemote(idToDelete).catch(() => undefined);
    });
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== idToDelete);
      if (activeSessionId === idToDelete) {
        if (updated.length > 0) {
          setActiveSessionId(updated[updated.length - 1].id);
        } else {
          setActiveSessionId(null);
        }
      }
      return updated;
    });
  }, [activeSessionId]);

  const handleRemoveDoc = useCallback((name: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        const updated = s.ragDocs ? s.ragDocs.filter((d) => d.name !== name) : [];
        return {
          ...s,
          ragDocs: updated.length > 0 ? updated : undefined,
        };
      })
    );
    setTriggerToast("Successfully Removed !!");
    setTimeout(() => setTriggerToast(null), 100);
  }, [activeSessionId]);

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
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Floating Mobile Sidebar Toggle Button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-5 left-6 p-2.5 rounded-xl border border-zinc-200/80 bg-white hover:bg-zinc-50 text-zinc-600 transition-all duration-200 cursor-pointer shadow-sm z-30 flex items-center justify-center active:scale-95 md:hidden"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
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
                transition={{ duration: DURATION_SLOW, ease: "easeOut" }}
                className="flex-1 flex flex-col items-center justify-center px-6"
              >
                <div className="flex flex-col items-center gap-2 -mt-16 text-center">
                  <Image
                    src="/long_form_logo.webp"
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
                    onDeepThinkingChange={handleDeepThinkingChange}
                    onSendMessage={handleSendMessage}
                    isLoading={chatSim.isLoading}
                    hasContext={hasContext}
                    contextCount={contextCount}
                    onContextClick={() => setShowRightPanel((prev) => !prev)}
                    onClearContext={() => {
                      setSessions((prev) =>
                        prev.map((s) => (s.id === activeSessionId ? { ...s, ragDocs: undefined } : s))
                      );
                      setShowRightPanel(false);
                    }}
                    onConciergeClick={handleOpenConciergeContext}
                    selectedRole={selectedRole}
                    onRoleChange={handleRoleChange}
                    contextEnabled={contextEnabled}
                    alertsEnabled={alertsEnabled}
                    onDisableAlerts={() => handleToggleAlerts(false)}
                    triggerToast={triggerToast}
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
                transition={{ duration: DURATION_SECTION_FADE, ease: "easeOut" }}
                className="flex-1 flex flex-col px-6 pt-20 pb-4 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1b253c]/15 hover:[&::-webkit-scrollbar-thumb]:bg-[#1b253c]/35 [&::-webkit-scrollbar-thumb]:rounded-full scroll-smooth"
              >
                <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 mt-0">
                  {activeSession.messages.map((msg, i) => (
                    <MessageItem
                      key={msg.role + i}
                      message={msg}
                      index={i}
                      onExpandFile={setExpandedFile}
                      reasoningStreaming={
                        i === activeSession.messages.length - 1 &&
                        msg.role === "assistant" &&
                        chatSim.isThinking
                      }
                    />
                  ))}

                  {chatSim.showProcessing && (
                    <motion.div
                      layout
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: DURATION_VERY_SLOW, ease: [0.22, 1, 0.36, 1] }}
                      className="max-w-[80%]"
                    >
                      <Steps defaultOpen>
                        <StepsTrigger>
                          <TextShimmerLoader text="Analyzing maintenance context" size="md" />
                        </StepsTrigger>
                        <StepsContent>
                          <div className="space-y-1">
                            <StepsItem status="complete">Request received</StepsItem>
                            <StepsItem status="active">
                              {activeSession?.ragDocs && activeSession.ragDocs.length > 0
                                ? `Searching: ${activeSession.ragDocs.map((d) => d.name).join(", ")}`
                                : "Preparing response"}
                            </StepsItem>
                            <StepsItem status="pending">Streaming answer</StepsItem>
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
                onDeepThinkingChange={handleDeepThinkingChange}
                onSendMessage={handleSendMessage}
                isLoading={chatSim.isLoading}
                hasContext={hasContext}
                contextCount={contextCount}
                onContextClick={() => setShowRightPanel((prev) => !prev)}
                onClearContext={() => {
                  setSessions((prev) =>
                    prev.map((s) => (s.id === activeSessionId ? { ...s, ragDocs: undefined } : s))
                  );
                  setShowRightPanel(false);
                }}
                onConciergeClick={handleOpenConciergeContext}
                selectedRole={selectedRole}
                onRoleChange={handleRoleChange}
                contextEnabled={contextEnabled}
                alertsEnabled={alertsEnabled}
                onDisableAlerts={() => handleToggleAlerts(false)}
                triggerToast={triggerToast}
                className="w-full max-w-3xl mx-auto px-3 pb-3 md:px-5 md:pb-5"
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Right Sidebar for RAG Documents (Claude-style Right Pane) */}
      <AnimatePresence>
        {activeSession && activeSession.ragDocs && activeSession.ragDocs.length > 0 && showRightPanel && (
          <ContextPanel
            ragDocs={activeSession.ragDocs}
            onClose={() => setShowRightPanel(false)}
            onManageDocs={handleOpenConciergeContext}
            onRemoveDoc={handleRemoveDoc}
            onExpandFile={setExpandedFile}
          />
        )}
      </AnimatePresence>

      {/* Expanded View Modal */}
      <ExpandedFileModal
        file={expandedFile}
        onClose={() => setExpandedFile(null)}
      />

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
