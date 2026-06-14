"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import ClickSpark from "@/animations/ClickSpark";
import { PromptInputWithActions } from "@/components/PromptInputWithActions";
import { getPagesFromPdf, getPdfPageCount, isImageHeavyPdf } from "@/lib/pdf-renderer";
import { MAX_IMAGE_PDF_PAGES, MAX_TEXT_PDF_PAGES, PDF_TOO_MANY_PAGES_MESSAGE, PDF_TOO_MANY_TEXT_PAGES_MESSAGE } from "@/lib/constants";
import { extractRagTextFromFile } from "@/lib/rag-file-text";
import { buildRagSessionTitle, isGenericRagSessionTitle } from "@/lib/rag-session-title";
import { fileToBase64, formatBytes } from "@/lib/utils";

import {
  Steps,
  StepsBar,
  StepsContent,
  StepsItem,
  StepsTrigger,
} from "@/components/ai-components/steps";
import { TextShimmerLoader } from "@/components/ai-components/loader";
import { ScrollButton } from "@/components/ai-components/scroll-button";
import { ApiError, getAccessToken } from "@/lib/api";
import { fetchBackendReady } from "@/lib/backend-ready";
import { isManasRoleId, manasRoleLabel } from "@/lib/manas-roles";
import { isBackendSessionId } from "@/lib/session-id";
import {
  fetchSessions,
  fetchSessionDetail,
  createSession,
  sendChatMessage,
  compactChatSession,
  deleteSessionRemote,
} from "@/services/sessions";
import { getLibraryDocuments, ragPayloadFromDocs, warmChatStack, optimizeMaintenancePrompt, submitChatMessageFeedback } from "@/services/chat";
import { parseSlashCommandInput } from "@/lib/manas-slash-commands";
import type { MessageFile, ChatSession, RagDoc, Citation } from "@/services/types";
import { useChatStream } from "@/hooks";
import { usePathname } from "next/navigation";
import { parseManasChatSessionId, updateManasChatUrl } from "@/lib/manas-chat-path";
import { parseManasDeepLinkParams } from "@/lib/manas-deep-link";
import { resolveSessionTitle } from "@/lib/mappers";

// Import broken down modular components
import SettingsModal from "../components/SettingsModal";
import RagDocumentSelectorModal from "../components/RagDocumentSelectorModal";
import ChatSidebar from "../components/ChatSidebar";
import MessageItem from "../components/MessageItem";
import ContextPanel from "../components/ContextPanel";
import ExpandedFileModal from "../components/ExpandedFileModal";

export default function ManasChatPage() {
  const pathname = usePathname();
  const urlSessionId = parseManasChatSessionId(pathname);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(urlSessionId);
  const [hydratedSessionIds, setHydratedSessionIds] = useState<Record<string, boolean>>({});

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deepThinking, setDeepThinking] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("manas_deep_thinking") === "true";
    }
    return false;
  });
  const [selectedRole, setSelectedRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("manas_selected_role");
      return isManasRoleId(saved) ? saved : null;
    }
    return null;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFile, setExpandedFile] = useState<MessageFile | null>(null);

  // RAG States
  const [showRagSelector, setShowRagSelector] = useState(false);
  const [selectedPreloadedDocs, setSelectedPreloadedDocs] = useState<string[]>([]);
  const [customDocs, setCustomDocs] = useState<RagDoc[]>([]);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [triggerToast, setTriggerToast] = useState<string | null>(null);
  const [injectPrompt, setInjectPrompt] = useState<string | null>(null);
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
  const thinkingSessionIdRef = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const promptedSessionsRef = useRef<Record<string, boolean>>({});
  const streamSessionRef = useRef<string | null>(null);
  const deletedSessionIdsRef = useRef<Set<string>>(new Set());
  const chatSimResetRef = useRef<() => void>(() => undefined);
  const chatLoadingRef = useRef(false);
  const ensureSessionLoaded = useCallback((id: string) => {
    if (deletedSessionIdsRef.current.has(id)) return;

    setSessions((prev) => {
      const existing = prev.find((s) => s.id === id);
      if (existing && existing.messages.length > 0) {
        setHydratedSessionIds((h) => (h[id] ? h : { ...h, [id]: true }));
        return prev;
      }

      fetchSessionDetail(id)
        .then((detail) => {
          if (deletedSessionIdsRef.current.has(id)) return;
          setSessions((p) => {
            if (deletedSessionIdsRef.current.has(id)) return p;
            const found = p.some((s) => s.id === id);
            if (found) {
              return p.map((s) =>
                s.id === id
                  ? {
                      ...s,
                      ...detail,
                      title: resolveSessionTitle({
                        sessionId: id,
                        existingTitle: s.title,
                        metadataTitle: detail.title,
                        messages: detail.messages,
                      }),
                      messages: detail.messages,
                      lastMessagePreview: detail.lastMessagePreview ?? s.lastMessagePreview,
                      ragDocs: s.ragDocs ?? detail.ragDocs,
                    }
                  : s,
              );
            }
            return [...p, detail];
          });
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 404) {
            deletedSessionIdsRef.current.add(id);
            setSessions((p) => p.filter((s) => s.id !== id));
            setActiveSessionId((current) => {
              if (current === id) {
                updateManasChatUrl(null, "replace");
                return null;
              }
              return current;
            });
          }
        })
        .finally(() => {
          if (!deletedSessionIdsRef.current.has(id)) {
            setHydratedSessionIds((h) => ({ ...h, [id]: true }));
          }
        });
      return prev;
    });
  }, []);

  const navigateToChat = useCallback(
    (sessionId: string | null, method: "push" | "replace" = "push") => {
      setActiveSessionId(sessionId);
      if (sessionId) ensureSessionLoaded(sessionId);
      updateManasChatUrl(sessionId, method);
    },
    [ensureSessionLoaded],
  );

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
      const p = payload as {
        citations?: Citation[];
        error?: string;
        message_id?: string;
        cancelled?: boolean;
      };
      const citations = p?.citations;
      const error = p?.error;
      const messageId = p?.message_id;
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
              const withMeta = {
                ...updated,
                ...(messageId ? { id: messageId } : {}),
                ...(citations?.length ? { citations } : {}),
              };
              msgs[msgs.length - 1] = withMeta;
            }
            return { ...session, messages: msgs };
          }),
        );
      }
      streamSessionRef.current = null;
      thinkingSessionIdRef.current = null;
      chatSimResetRef.current();
    },
    onCitations: (citations) => {
      const targetId = streamSessionRef.current ?? activeSessionId;
      if (!targetId || !citations.length) return;
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== targetId) return session;
          const msgs = [...session.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, citations };
          }
          return { ...session, messages: msgs };
        }),
      );
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

      fetchSessionDetail(targetId)
        .then((detail) => {
          if (deletedSessionIdsRef.current.has(targetId)) return;
          setSessions((prev) =>
            prev.map((session) => {
              if (session.id !== targetId) return session;

              if (data?.skipped || (data?.compacted_count ?? 0) === 0) {
                const hasCompacting = session.messages.some(
                  (m) => m.role === "system" && m.isCompacting,
                );
                if (hasCompacting) {
                  const msgs = session.messages.map((m) =>
                    m.role === "system" && m.isCompacting
                      ? {
                          role: "system" as const,
                          content: "Not enough messages to compact yet (keep chatting first).",
                        }
                      : m,
                  );
                  return { ...session, messages: msgs };
                }
                return {
                  ...session,
                  messages: [
                    ...session.messages,
                    {
                      role: "system" as const,
                      content: "Not enough messages to compact yet (keep chatting first).",
                    },
                  ],
                };
              }

              let msgs = detail.messages;
              if (chatLoadingRef.current) {
                const localLast = session.messages[session.messages.length - 1];
                const backendLast = detail.messages[detail.messages.length - 1];
                if (
                  localLast?.role === "assistant" &&
                  !localLast.content &&
                  backendLast?.role === "user"
                ) {
                  msgs = [...detail.messages, localLast];
                }
              }
              return { ...session, messages: msgs };
            }),
          );
          if (!chatLoadingRef.current) {
            streamSessionRef.current = null;
          }
        })
        .catch(() => {
          setSessions((prev) =>
            prev.map((session) => {
              if (session.id !== targetId) return session;
              const hasCompacting = session.messages.some(
                (m) => m.role === "system" && m.isCompacting,
              );
              if (!hasCompacting) return session;
              const msgs = session.messages.map((m) =>
                m.role === "system" && m.isCompacting
                  ? {
                      role: "system" as const,
                      content: `Context compacted — ${data?.compacted_count ?? "older"} messages summarised`,
                    }
                  : m,
              );
              return { ...session, messages: msgs };
            }),
          );
        });
    },
  });

  useEffect(() => {
    chatSimResetRef.current = chatSim.reset;
    chatLoadingRef.current = chatSim.isLoading;
  }, [chatSim.reset, chatSim.isLoading]);

  useEffect(() => {
    let cancelled = false;
    fetchSessions()
      .then((rows) => {
        if (cancelled) return;
        const filtered = rows.filter((s) => !deletedSessionIdsRef.current.has(s.id));
        setSessions((prev) => {
          const byId = new Map(prev.map((s) => [s.id, s]));
          return filtered.map((row) => {
            const local = byId.get(row.id);
            if (!local) return row;
            const streaming =
              chatLoadingRef.current && streamSessionRef.current === row.id;
            return {
              ...row,
              ragDocs: local.ragDocs ?? row.ragDocs,
              messages:
                streaming || local.messages.length > row.messages.length
                  ? local.messages
                  : row.messages,
            };
          });
        });
        if (urlSessionId && !deletedSessionIdsRef.current.has(urlSessionId)) {
          const row = filtered.find((s) => s.id === urlSessionId);
          if (!row || row.messages.length === 0) {
            ensureSessionLoaded(urlSessionId);
          }
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [ensureSessionLoaded]);

  // Direct link / hard refresh — keep active id in sync with URL
  useEffect(() => {
    if (!urlSessionId || deletedSessionIdsRef.current.has(urlSessionId)) {
      if (urlSessionId && deletedSessionIdsRef.current.has(urlSessionId)) {
        setActiveSessionId(null);
        updateManasChatUrl(null, "replace");
      }
      return;
    }
    setActiveSessionId(urlSessionId);
    ensureSessionLoaded(urlSessionId);
  }, [urlSessionId, ensureSessionLoaded]);

  useEffect(() => {
    if (!getAccessToken()) {
      window.location.href = "/login/";
    }
  }, []);

  // Pre-warm Ollama + RAG models so the first message does not cold-start.
  useEffect(() => {
    warmChatStack().catch(() => undefined);
  }, []);

  // Derived state
  const activeSession = activeSessionId ? sessions.find((s) => s.id === activeSessionId) || null : null;
  const isHydratingSession =
    Boolean(activeSessionId && isBackendSessionId(activeSessionId)) &&
    !hydratedSessionIds[activeSessionId] &&
    (!activeSession || activeSession.messages.length === 0);
  const showHero =
    !isHydratingSession && (!activeSession || activeSession.messages.length === 0);
  const hasContext = !!(activeSession?.ragDocs && activeSession.ragDocs.length > 0);
  const contextCount = activeSession?.ragDocs ? activeSession.ragDocs.length : 0;
  const lastMessage = activeSession?.messages[activeSession.messages.length - 1];
  const awaitingAssistantReply =
    lastMessage?.role === "assistant" && !lastMessage.content?.trim();

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

  // Browser back/forward — sync active chat from URL (history API updates skip Next.js router)
  useEffect(() => {
    if (!isMounted) return;
    const onPopState = () => {
      const id = parseManasChatSessionId(window.location.pathname);
      setActiveSessionId(id);
      if (id) ensureSessionLoaded(id);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isMounted, ensureSessionLoaded]);

  // When navigated from sansad hub RAG Logs, open a fresh chat with RAG picker (once)
  const ragDeepLinkHandled = useRef(false);
  useEffect(() => {
    if (!isMounted || ragDeepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("rag") !== "1") return;
    ragDeepLinkHandled.current = true;

    navigateToChat(null, "replace");
    setShowRagSelector(true);
    setShowRightPanel(true);
    setSelectedPreloadedDocs([]);
  }, [isMounted, navigateToChat]);

  const sansadDeepLinkHandled = useRef(false);
  useEffect(() => {
    if (!isMounted || sansadDeepLinkHandled.current || urlSessionId) return;
    const { assetId, prompt, source, assetName } = parseManasDeepLinkParams(window.location.search);
    if (!assetId && !prompt) return;
    sansadDeepLinkHandled.current = true;

    const title = assetName ? `MANAS · ${assetName}` : "MANAS · SANSAD";
    const meta = {
      title,
      sansad_source: source ?? "sansad",
      initial_prompt: prompt ?? "",
    };

    void (async () => {
      try {
        const created = await createSession(assetId && assetId !== "plant" ? assetId : undefined, meta);
        setSessions((prev) => [
          ...prev.filter((s) => s.id !== activeSessionId),
          { ...created, title, messages: [] },
        ]);
        navigateToChat(created.id, "replace");
        if (prompt) setInjectPrompt(prompt);
      } catch {
        if (prompt) setInjectPrompt(prompt);
      }
      const clean = new URL(window.location.href);
      clean.searchParams.delete("asset");
      clean.searchParams.delete("asset_id");
      clean.searchParams.delete("asset_name");
      clean.searchParams.delete("q");
      clean.searchParams.delete("prompt");
      clean.searchParams.delete("source");
      window.history.replaceState(window.history.state, "", clean.pathname + clean.search);
    })();
  }, [isMounted, urlSessionId, activeSessionId, navigateToChat]);

  const handleCustomFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: RagDoc[] = [];
      let emptyTextCount = 0;
      let rejectedPageCount = 0;
      let rejectedTextPageCount = 0;
      for (const file of Array.from(e.target.files)) {
        try {
          let pages: string[] = [];
          let pdfUrl: string | undefined;
          const isPdf =
            file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

          let pageCount = 0;
          if (isPdf) {
            pageCount = await getPdfPageCount(file);
            if (pageCount > MAX_TEXT_PDF_PAGES) {
              rejectedTextPageCount += 1;
              continue;
            }
          }

          const textContent = await extractRagTextFromFile(file);
          if (!textContent?.trim()) {
            emptyTextCount += 1;
          }

          if (
            isPdf &&
            pageCount > MAX_IMAGE_PDF_PAGES &&
            isImageHeavyPdf(pageCount, textContent.length)
          ) {
            rejectedPageCount += 1;
            continue;
          }

          if (isPdf) {
            pdfUrl = URL.createObjectURL(file);
            try {
              const previewCap = isImageHeavyPdf(pageCount, textContent.length)
                ? MAX_IMAGE_PDF_PAGES
                : Math.min(pageCount, 5);
              pages = await getPagesFromPdf(file, { maxPages: previewCap });
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
            pdfUrl,
            textContent: textContent || undefined,
            isCustom: true,
          });
        } catch (err) {
          if (err instanceof Error && err.message === PDF_TOO_MANY_PAGES_MESSAGE) {
            rejectedPageCount += 1;
          } else if (err instanceof Error && err.message === PDF_TOO_MANY_TEXT_PAGES_MESSAGE) {
            rejectedTextPageCount += 1;
          } else {
            console.error("Failed to process file", err);
          }
        }
      }
      if (newFiles.length > 0) {
        setCustomDocs((prev) => [...prev, ...newFiles]);
      }
      if (rejectedTextPageCount > 0) {
        setTriggerToast(PDF_TOO_MANY_TEXT_PAGES_MESSAGE);
        setTimeout(() => setTriggerToast(null), 5000);
      } else if (rejectedPageCount > 0) {
        setTriggerToast(PDF_TOO_MANY_PAGES_MESSAGE);
        setTimeout(() => setTriggerToast(null), 5000);
      } else if (emptyTextCount > 0) {
        setTriggerToast(
          emptyTextCount === 1
            ? "Limited text in that file — using OCR/visual page context where possible"
            : `Limited text in ${emptyTextCount} files — using OCR/visual context where possible`,
        );
        setTimeout(() => setTriggerToast(null), 4500);
      }
      e.target.value = "";
    }
  }, []);

  const handleConfirmRagDocs = useCallback(async (selectedDocs: RagDoc[]) => {
    const usableDocs = selectedDocs.filter(
      (d) => !d.isCustom || Boolean((d.textContent || "").trim()),
    );
    const skipped = selectedDocs.length - usableDocs.length;
    if (usableDocs.length === 0) {
      setTriggerToast("No readable content in selected files — try TXT, MD, or a PDF with text or images");
      setTimeout(() => setTriggerToast(null), 4000);
      return;
    }

    const title = buildRagSessionTitle(usableDocs);

    const applyRagToSession = (session: ChatSession): ChatSession => {
      const nextTitle = isGenericRagSessionTitle(session.title) ? title : session.title;
      return { ...session, title: nextTitle, ragDocs: usableDocs };
    };

    try {
      if (activeSession && activeSession.messages.length > 0 && isBackendSessionId(activeSessionId)) {
        setSessions((prevSessions) =>
          prevSessions.map((session) =>
            session.id === activeSessionId ? applyRagToSession(session) : session,
          ),
        );
      } else if (isBackendSessionId(activeSessionId)) {
        setSessions((prevSessions) =>
          prevSessions.map((session) => {
            if (session.id !== activeSessionId) return session;
            return { ...session, title, messages: [], ragDocs: usableDocs };
          }),
        );
      } else {
        const created = await createSession(undefined, title);
        setSessions((prev) => [
          ...prev.filter((s) => s.id !== activeSessionId),
          { ...created, title, messages: [], ragDocs: usableDocs },
        ]);
        navigateToChat(created.id, "replace");
      }
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? err.message
          : "Could not create chat session — sign in and try again.";
      setTriggerToast(detail);
      setTimeout(() => setTriggerToast(null), 3500);
      return;
    }

    setShowRagSelector(false);
    setShowRightPanel(true);
    const toastMsg =
      skipped > 0
        ? `Loaded ${usableDocs.length} document(s) (${skipped} skipped — no extractable text)`
        : `Loaded ${usableDocs.length} document(s) into context`;
    setTriggerToast(toastMsg);
    setTimeout(() => setTriggerToast(null), 100);
  }, [activeSession, activeSessionId, navigateToChat]);

  const handleOpenConciergeContext = useCallback(() => {
    setSelectedPreloadedDocs(
      activeSession?.ragDocs
        ? activeSession.ragDocs.filter(d => !d.isCustom).map(d => d.name)
        : []
    );
    setCustomDocs(
      activeSession?.ragDocs
        ? activeSession.ragDocs.filter((d) => d.isCustom)
        : []
    );
    setShowRagSelector(true);
  }, [activeSession]);

  // Auto close Right Panel if context documents are cleared
  useEffect(() => {
    if (!activeSession?.ragDocs || activeSession.ragDocs.length === 0) {
      const timer = setTimeout(() => {
        setShowRightPanel(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeSession?.ragDocs]);

  const handleCompactSession = useCallback(async (targetId: string) => {
    streamSessionRef.current = targetId;
    try {
      await chatSim.waitUntilReady();
      await compactChatSession(targetId);
    } catch {
      setTriggerToast("Could not compact — check backend connection");
      setTimeout(() => setTriggerToast(null), 2500);
      streamSessionRef.current = null;
    }
  }, [chatSim]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    const trimmed = messageText.trim();
    const slash = parseSlashCommandInput(trimmed);

    if (slash?.cmd.name === "compact") {
      const targetId = activeSessionId;
      if (!targetId) {
        setTriggerToast("Start a chat session before compacting");
        setTimeout(() => setTriggerToast(null), 2500);
        return;
      }
      await handleCompactSession(targetId);
      return;
    }

    if (slash?.cmd.name === "prompt-optimizer") {
      const draft = slash.args.trim();
      if (!draft) {
        setTriggerToast("Type a draft question to optimize");
        setTimeout(() => setTriggerToast(null), 2500);
        return;
      }
      const session = activeSessionId ? sessions.find((s) => s.id === activeSessionId) : null;
      try {
        const optimized = await optimizeMaintenancePrompt(draft, {
          hasRagContext: (session?.ragDocs?.length ?? 0) > 0,
          userRole: selectedRole ?? undefined,
        });
        setInjectPrompt(optimized);
        setTriggerToast("Prompt optimized — review and send when ready");
        setTimeout(() => setTriggerToast(null), 3000);
      } catch (err) {
        const detail =
          err instanceof ApiError ? err.message : "Could not optimize prompt — check backend connection";
        setTriggerToast(detail);
        setTimeout(() => setTriggerToast(null), 3500);
      }
      return;
    }

    let targetId = activeSessionId;
    const session = targetId ? sessions.find((s) => s.id === targetId) : null;
    const ragNames = session?.ragDocs ?? [];
    const ragPayload = {
      ...ragPayloadFromDocs(ragNames),
      user_role: selectedRole ?? undefined,
    };

    if (!targetId || !isBackendSessionId(targetId)) {
      try {
        const title =
          session?.title && session.title !== "New Session"
            ? session.title
            : messageText.slice(0, 40) || "New Chat";
        const created = await createSession(undefined, title);
        targetId = created.id;
        const isNew = !session?.title || session.title === "New Session" || (session?.messages.length ?? 0) === 0;
        const newTitle = isNew
          ? messageText.length > 25
            ? `${messageText.slice(0, 25)}...`
            : messageText
          : session?.title ?? title;
        const userMsg = { role: "user" as const, content: messageText };
        const assistantMsg = {
          role: "assistant" as const,
          content: "",
          reasoning: deepThinking ? "" : undefined,
        };
        setSessions((prev) => [
          ...prev.filter((s) => s.id !== activeSessionId),
          {
            ...created,
            title: newTitle,
            ragDocs: session?.ragDocs,
            messages: [...(session?.messages ?? []), userMsg, assistantMsg],
          },
        ]);
        setActiveSessionId(created.id);
        updateManasChatUrl(created.id, "replace");
      } catch (err) {
        const detail =
          err instanceof ApiError
            ? err.message
            : "Could not create chat session — sign in and check the backend.";
        setTriggerToast(detail);
        setTimeout(() => setTriggerToast(null), 3500);
        return;
      }
    } else {
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
    }

    thinkingSessionIdRef.current = targetId;
    streamSessionRef.current = targetId;

    chatSim.start();
    try {
      if (!(await fetchBackendReady())) {
        throw new ApiError(503, "Backend is still starting — wait a moment and try again.");
      }
      const wsReady = await chatSim.waitUntilReady(targetId);
      if (!wsReady) {
        throw new ApiError(503, "Live chat connection not ready — try again in a moment.");
      }
      await sendChatMessage(targetId, messageText, ragPayload, { deepThinking });
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? err.status === 401
            ? "Session expired — please sign in again."
            : err.status === 404
              ? "Chat session not found — reload the page or start a new session."
              : err.message
          : "Could not reach the backend. Check login and try again.";
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== targetId) return s;
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant" && !last.content) {
            msgs[msgs.length - 1] = {
              role: "assistant",
              content: `Sorry — ${detail}`,
            };
          }
          return { ...s, messages: msgs };
        }),
      );
      chatSim.reset();
    }
  }, [activeSessionId, sessions, chatSim, selectedRole, deepThinking, handleCompactSession]);

  const handleStopGeneration = useCallback(() => {
    chatSim.cancel();
  }, [chatSim]);

  const handleMessageFeedback = useCallback(
    async (messageId: string, rating: "up" | "down") => {
      const targetId = activeSessionId;
      try {
        await submitChatMessageFeedback(messageId, rating);
        if (targetId) {
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== targetId) return s;
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === messageId ? { ...m, feedbackRating: rating } : m,
                ),
              };
            }),
          );
        }
      } catch {
        setTriggerToast("Could not save feedback");
        setTimeout(() => setTriggerToast(null), 2500);
        throw new Error("feedback failed");
      }
    },
    [activeSessionId],
  );

  // Scroll to bottom on new messages (instant while streaming to avoid layout fight)
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: chatSim.isLoading ? "auto" : "smooth",
    });
  }, [activeSession?.messages, chatSim.isLoading]);

  const handleNewSession = useCallback(() => {
    navigateToChat(null, "replace");
  }, [navigateToChat]);

  const handleSelectSession = useCallback(
    (id: string) => {
      navigateToChat(id, "push");
    },
    [navigateToChat],
  );

  const handleDeleteSession = useCallback(async (idToDelete: string) => {
    if (!isBackendSessionId(idToDelete)) {
      setSessions((prev) => prev.filter((s) => s.id !== idToDelete));
      if (activeSessionId === idToDelete) navigateToChat(null, "replace");
      return;
    }

    deletedSessionIdsRef.current.add(idToDelete);

    setHydratedSessionIds((h) => {
      const next = { ...h };
      delete next[idToDelete];
      return next;
    });

    if (activeSessionId === idToDelete) {
      chatSim.cancel();
      streamSessionRef.current = null;
    }

    let remaining: ChatSession[] = [];
    setSessions((prev) => {
      remaining = prev.filter((s) => s.id !== idToDelete);
      return remaining;
    });

    if (activeSessionId === idToDelete) {
      const nextId = remaining.length > 0 ? remaining[0].id : null;
      navigateToChat(nextId, "replace");
    }

    try {
      await deleteSessionRemote(idToDelete);
    } catch {
      deletedSessionIdsRef.current.delete(idToDelete);
      setTriggerToast("Could not delete session — try again");
      setTimeout(() => setTriggerToast(null), 3000);
      try {
        const rows = await fetchSessions();
        const filtered = rows.filter((s) => !deletedSessionIdsRef.current.has(s.id));
        setSessions(filtered);
      } catch {
        // keep optimistic removal
      }
    }
  }, [activeSessionId, chatSim, navigateToChat]);

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

        {/* Content Stream — single scroll container; no route-level remount on first message */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-[#FAF7F2]">
          <div
            ref={scrollContainerRef}
            className="flex-1 flex flex-col px-6 pt-20 pb-44 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1b253c]/15 hover:[&::-webkit-scrollbar-thumb]:bg-[#1b253c]/35 [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {isHydratingSession && (
              <div className="flex flex-1 flex-col items-center justify-center min-h-[40vh]">
                <TextShimmerLoader text="Loading conversation…" size="md" />
              </div>
            )}

            {showHero && (
              <div className="flex flex-1 flex-col items-center justify-center min-h-[40vh]">
                <div className="flex flex-col items-center gap-2 text-center">
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
              </div>
            )}

            {activeSession && activeSession.messages.length > 0 && (
              <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 mt-0">
                {activeSession.messages.map((msg, i) => {
                  const isLastAssistant =
                    i === activeSession.messages.length - 1 && msg.role === "assistant";
                  return (
                    <MessageItem
                      key={`${msg.role}-${i}`}
                      message={msg}
                      index={i}
                      onExpandFile={setExpandedFile}
                      ragDocs={activeSession.ragDocs}
                      reasoningStreaming={isLastAssistant && chatSim.isThinking}
                      contentStreaming={isLastAssistant && chatSim.isStreaming}
                      showReasoningSlot={
                        isLastAssistant && deepThinking && (chatSim.isLoading || !!msg.reasoning)
                      }
                      onFeedback={handleMessageFeedback}
                    />
                  );
                })}

                {chatSim.isLoading && awaitingAssistantReply && (
                  <div className="max-w-[80%]">
                    <Steps defaultOpen>
                      <StepsTrigger>
                        <TextShimmerLoader
                          text={
                            chatSim.streamPhase === "rag"
                              ? "Processing document"
                              : chatSim.streamPhase === "role"
                                ? "Applying role context"
                                : chatSim.streamPhase === "thinking"
                                  ? "Deep reasoning"
                                  : hasContext
                                    ? "Analyzing maintenance context"
                                    : "Processing your request"
                          }
                          size="md"
                        />
                      </StepsTrigger>
                      <StepsContent bar={<StepsBar />}>
                        <div className="space-y-1">
                          <StepsItem status="complete">Request received</StepsItem>
                          {hasContext && (
                            <StepsItem
                              status={
                                chatSim.streamPhase === "rag"
                                  ? "active"
                                  : chatSim.streamPhase === "post_rag" ||
                                      chatSim.streamPhase === "thinking" ||
                                      chatSim.streamPhase === "answering"
                                    ? "complete"
                                    : "pending"
                              }
                            >
                              {activeSession?.ragDocs && activeSession.ragDocs.length > 0
                                ? `Processing document: ${activeSession.ragDocs.map((d) => d.name).join(", ")}`
                                : "Processing document"}
                            </StepsItem>
                          )}
                          {selectedRole && (
                            <StepsItem
                              status={
                                chatSim.streamPhase === "role"
                                  ? "active"
                                  : chatSim.streamPhase === "post_rag" ||
                                      chatSim.streamPhase === "thinking" ||
                                      chatSim.streamPhase === "answering"
                                    ? "complete"
                                    : chatSim.streamPhase === "rag"
                                      ? "pending"
                                      : "pending"
                              }
                            >
                              Role advisory ({manasRoleLabel(selectedRole) ?? selectedRole})
                            </StepsItem>
                          )}
                          <StepsItem
                            status={
                              chatSim.streamPhase === "post_rag" ||
                              chatSim.streamPhase === "thinking"
                                ? "active"
                                : chatSim.streamPhase === "answering"
                                  ? "complete"
                                  : chatSim.streamPhase === "rag" ||
                                      chatSim.streamPhase === "role"
                                    ? "pending"
                                    : chatSim.streamPhase === "waiting"
                                      ? "active"
                                      : "pending"
                            }
                          >
                            Processing response text
                          </StepsItem>
                          {deepThinking && (
                            <StepsItem
                              status={
                                chatSim.streamPhase === "thinking"
                                  ? "active"
                                  : chatSim.streamPhase === "post_rag"
                                    ? "complete"
                                    : "pending"
                              }
                            >
                              Deep reasoning
                            </StepsItem>
                          )}
                          <StepsItem
                            status={
                              chatSim.streamPhase === "answering" ? "active" : "pending"
                            }
                          >
                            Generating answer
                          </StepsItem>
                        </div>
                      </StepsContent>
                    </Steps>
                  </div>
                )}
                <div ref={chatEndRef} className="h-4 shrink-0" />
              </div>
            )}
          </div>

          <div className="absolute bottom-0 inset-x-0 z-20 pointer-events-none">
            <div className="w-full max-w-3xl mx-auto px-3 pb-3 md:px-5 md:pb-5 relative">
              {activeSession && activeSession.messages.length > 0 && (
                <ScrollButton
                  containerRef={scrollContainerRef}
                  className="pointer-events-auto absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-40"
                />
              )}
              <PromptInputWithActions
                deepThinking={deepThinking}
                onDeepThinkingChange={handleDeepThinkingChange}
                onSendMessage={handleSendMessage}
                onStop={handleStopGeneration}
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
                injectPrompt={injectPrompt}
                onInjectPromptConsumed={() => setInjectPrompt(null)}
                className="pointer-events-auto relative z-10 w-full"
              />
            </div>
          </div>
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
