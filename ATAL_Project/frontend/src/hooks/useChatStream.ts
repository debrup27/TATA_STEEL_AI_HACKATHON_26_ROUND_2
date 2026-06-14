"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { connectWebSocket } from "@/lib/ws";
import type { Citation } from "@/services/types";

export type StreamPhase = "idle" | "waiting" | "rag" | "post_rag" | "thinking" | "answering";

export interface UseChatStreamOptions {
  sessionId: string | null;
  onToken?: (token: string) => void;
  onThinkToken?: (token: string) => void;
  onDone?: (payload?: Record<string, unknown>) => void;
  onCitations?: (citations: Citation[]) => void;
  onError?: () => void;
  onCompacting?: () => void;
  onCompacted?: (payload?: { compacted_count: number; skipped?: boolean }) => void;
  timeoutMs?: number;
}

export function useChatStream({
  sessionId,
  onToken,
  onThinkToken,
  onDone,
  onCitations,
  onError,
  onCompacting,
  onCompacted,
  timeoutMs = 240_000,
}: UseChatStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [awaitingFirstToken, setAwaitingFirstToken] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [streamPhase, setStreamPhase] = useState<StreamPhase>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const connectedSessionRef = useRef<string | null>(null);
  const wsReadyRef = useRef<Promise<void> | null>(null);
  const wsReadyResolveRef = useRef<(() => void) | null>(null);
  const onTokenRef = useRef(onToken);
  const onThinkTokenRef = useRef(onThinkToken);
  const onDoneRef = useRef(onDone);
  const onCitationsRef = useRef(onCitations);
  const onErrorRef = useRef(onError);
  const onCompactingRef = useRef(onCompacting);
  const onCompactedRef = useRef(onCompacted);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onTokenRef.current = onToken;
    onThinkTokenRef.current = onThinkToken;
    onDoneRef.current = onDone;
    onCitationsRef.current = onCitations;
    onErrorRef.current = onError;
    onCompactingRef.current = onCompacting;
    onCompactedRef.current = onCompacted;
  }, [onToken, onThinkToken, onDone, onCitations, onError, onCompacting, onCompacted]);

  const clearStreamTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    wsRef.current?.close();
    let readyResolve: () => void;
    wsReadyRef.current = new Promise<void>((resolve) => {
      readyResolve = resolve;
    });
    wsReadyResolveRef.current = readyResolve!;
    const ws = connectWebSocket(
      `/ws/chat/${sessionId}/`,
      (data) => {
        if (data.type === "started") {
          clearStreamTimeout();
          setStreamPhase("waiting");
          timeoutRef.current = setTimeout(() => {
            setIsStreaming(false);
            setAwaitingFirstToken(false);
            setStreamPhase("idle");
            onDoneRef.current?.({ error: "No response from model — it may still be loading. Try again in a moment." });
          }, timeoutMs);
        }
        if (data.type === "phase" && typeof data.phase === "string") {
          const phase = data.phase as string;
          if (phase === "rag") setStreamPhase("rag");
          else if (phase === "rag_done") setStreamPhase("post_rag");
          else if (phase === "thinking") {
            setStreamPhase("thinking");
            setIsThinking(true);
          }
        }
        if (data.type === "think_token" && typeof data.token === "string") {
          clearStreamTimeout();
          setAwaitingFirstToken(false);
          setIsThinking(true);
          setStreamPhase("thinking");
          onThinkTokenRef.current?.(data.token);
        }
        if (data.type === "token" && typeof data.token === "string") {
          clearStreamTimeout();
          setAwaitingFirstToken(false);
          setIsThinking(false);
          setIsStreaming(true);
          setStreamPhase("answering");
          onTokenRef.current?.(data.token);
        }
        if (data.type === "compacting") {
          onCompactingRef.current?.();
        }
        if (data.type === "compacted") {
          onCompactedRef.current?.({
            compacted_count: (data.compacted_count as number) ?? 0,
            skipped: Boolean(data.skipped),
          });
        }
        if (data.type === "citations" && Array.isArray(data.citations)) {
          onCitationsRef.current?.(data.citations as Citation[]);
        }
        if (data.type === "done") {
          clearStreamTimeout();
          setIsStreaming(false);
          setAwaitingFirstToken(false);
          setIsThinking(false);
          setStreamPhase("idle");
          onDoneRef.current?.(data as Record<string, unknown>);
        }
      },
      () => {
        clearStreamTimeout();
        onErrorRef.current?.();
      },
    );
    ws.onopen = () => {
      connectedSessionRef.current = sessionId;
      wsReadyResolveRef.current?.();
    };
    wsRef.current = ws;
    return () => {
      ws.close();
      if (connectedSessionRef.current === sessionId) {
        connectedSessionRef.current = null;
      }
      clearStreamTimeout();
    };
  }, [sessionId, timeoutMs, clearStreamTimeout]);

  const start = useCallback(() => {
    setIsStreaming(true);
    setAwaitingFirstToken(true);
    setIsThinking(false);
    setStreamPhase("waiting");
    // Global fallback: if neither "started" nor any WS event arrives in timeoutMs,
    // the Celery worker is probably not running.
    clearStreamTimeout();
    timeoutRef.current = setTimeout(() => {
      setIsStreaming(false);
      setAwaitingFirstToken(false);
      onDoneRef.current?.({ error: "No response — backend worker may be offline. Check Celery is running." });
    }, timeoutMs);
  }, [timeoutMs, clearStreamTimeout]);

  const reset = useCallback(() => {
    clearStreamTimeout();
    setIsStreaming(false);
    setAwaitingFirstToken(false);
    setIsThinking(false);
    setStreamPhase("idle");
  }, [clearStreamTimeout]);

  const waitUntilReady = useCallback(async (expectedSessionId?: string | null) => {
    const sid = expectedSessionId ?? sessionId;
    if (!sid) return false;
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (
        connectedSessionRef.current === sid &&
        wsRef.current?.readyState === WebSocket.OPEN
      ) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }, [sessionId]);

  const cancel = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cancel" }));
    }
    clearStreamTimeout();
    setIsStreaming(false);
    setAwaitingFirstToken(false);
    setIsThinking(false);
    setStreamPhase("idle");
  }, [clearStreamTimeout]);

  return {
    isStreaming,
    isThinking,
    streamPhase,
    start,
    reset,
    cancel,
    waitUntilReady,
    isLoading: awaitingFirstToken || isThinking || isStreaming,
    showProcessing: awaitingFirstToken || isThinking || isStreaming,
    currentStep: 0,
  };
}

export type { Citation };

/** Backward-compatible shim for pages still using useMockChatSimulation API */
export function useMockChatSimulation(options: {
  stepInterval?: number;
  stepCount?: number;
  processingDelay?: number;
  extraDoneDelay?: number;
  onDone?: () => void;
} = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const onDoneRef = useRef(options.onDone);

  useEffect(() => {
    onDoneRef.current = options.onDone;
  }, [options.onDone]);

  const start = useCallback(() => {
    setIsLoading(true);
    setShowProcessing(true);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setShowProcessing(false);
  }, []);

  const complete = useCallback(() => {
    setIsLoading(false);
    setShowProcessing(false);
    onDoneRef.current?.();
  }, []);

  return {
    isLoading,
    showProcessing,
    currentStep: 0,
    start,
    reset,
    complete,
  };
}

export type UseMockChatSimulationOptions = Parameters<typeof useMockChatSimulation>[0];
