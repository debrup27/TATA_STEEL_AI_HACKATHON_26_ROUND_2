"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { connectWebSocket } from "@/lib/ws";
import type { Citation } from "@/services/types";

export interface UseChatStreamOptions {
  sessionId: string | null;
  onToken?: (token: string) => void;
  onDone?: (payload?: Record<string, unknown>) => void;
  onError?: () => void;
  onCompacting?: () => void;
  onCompacted?: (payload?: { compacted_count: number }) => void;
  timeoutMs?: number;
}

export function useChatStream({
  sessionId,
  onToken,
  onDone,
  onError,
  onCompacting,
  onCompacted,
  timeoutMs = 240_000,
}: UseChatStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onTokenRef = useRef(onToken);
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  const onCompactingRef = useRef(onCompacting);
  const onCompactedRef = useRef(onCompacted);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onTokenRef.current = onToken;
    onDoneRef.current = onDone;
    onErrorRef.current = onError;
    onCompactingRef.current = onCompacting;
    onCompactedRef.current = onCompacted;
  }, [onToken, onDone, onError, onCompacting, onCompacted]);

  const clearStreamTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    wsRef.current?.close();
    const ws = connectWebSocket(
      `/ws/chat/${sessionId}/`,
      (data) => {
        if (data.type === "started") {
          // Task is alive — restart the timeout clock from now
          clearStreamTimeout();
          timeoutRef.current = setTimeout(() => {
            setIsStreaming(false);
            onDoneRef.current?.({ error: "No response from model — it may still be loading. Try again in a moment." });
          }, timeoutMs);
        }
        if (data.type === "token" && typeof data.token === "string") {
          clearStreamTimeout(); // got a token — cancel timeout
          setIsStreaming(true);
          onTokenRef.current?.(data.token);
        }
        if (data.type === "compacting") {
          onCompactingRef.current?.();
        }
        if (data.type === "compacted") {
          onCompactedRef.current?.({
            compacted_count: (data.compacted_count as number) ?? 0,
          });
        }
        if (data.type === "done") {
          clearStreamTimeout();
          setIsStreaming(false);
          onDoneRef.current?.(data as Record<string, unknown>);
        }
      },
      () => {
        clearStreamTimeout();
        onErrorRef.current?.();
      },
    );
    wsRef.current = ws;
    return () => {
      ws.close();
      clearStreamTimeout();
    };
  }, [sessionId, timeoutMs, clearStreamTimeout]);

  const start = useCallback(() => {
    setIsStreaming(true);
    // Global fallback: if neither "started" nor any WS event arrives in timeoutMs,
    // the Celery worker is probably not running.
    clearStreamTimeout();
    timeoutRef.current = setTimeout(() => {
      setIsStreaming(false);
      onDoneRef.current?.({ error: "No response — backend worker may be offline. Check Celery is running." });
    }, timeoutMs);
  }, [timeoutMs, clearStreamTimeout]);

  const reset = useCallback(() => {
    clearStreamTimeout();
    setIsStreaming(false);
  }, [clearStreamTimeout]);

  return {
    isStreaming,
    start,
    reset,
    isLoading: isStreaming,
    showProcessing: isStreaming,
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
