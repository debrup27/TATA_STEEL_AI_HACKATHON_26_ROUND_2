import { apiJson, apiList } from "@/lib/api";
import {
  mapChatSession,
  resolveSessionTitle,
  type BackendChatSession,
  type BackendChatMessage,
} from "@/lib/mappers";
import type { ChatSession, Message, RagDoc } from "./types";
import type { RagMessagePayload } from "./chat";

export async function fetchSessions(): Promise<ChatSession[]> {
  const rows = await apiList<BackendChatSession>("/api/v1/chat/sessions/");
  return rows.map((s) => mapChatSession(s));
}

export async function fetchSessionDetail(sessionId: string): Promise<ChatSession> {
  const detail = await apiJson<BackendChatSession & { messages: BackendChatMessage[] }>(
    `/api/v1/chat/sessions/${sessionId}/`,
  );
  return mapChatSession(detail, detail.messages ?? []);
}

export async function createSession(
  assetId?: string,
  metadata?: Record<string, unknown> | string,
): Promise<ChatSession> {
  const meta =
    typeof metadata === "string"
      ? { title: metadata }
      : (metadata ?? {});
  const title =
    typeof metadata === "string"
      ? metadata
      : typeof meta.title === "string"
        ? meta.title
        : undefined;

  const res = await apiJson<{ id: string }>("/api/v1/chat/sessions/", {
    method: "POST",
    body: JSON.stringify({
      asset_id: assetId ?? null,
      metadata: meta,
    }),
  });
  return {
    id: res.id,
    title: title ?? "New Chat",
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    messages: [],
  };
}

export async function deleteSessionRemote(sessionId: string): Promise<void> {
  await apiJson(`/api/v1/chat/sessions/${sessionId}/`, { method: "DELETE" });
}

/** @deprecated Use fetchSessions — kept for gradual migration */
export function getSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  return [];
}

export function addMessage(session: ChatSession, message: Message): ChatSession {
  return { ...session, messages: [...session.messages, message] };
}

export function updateTitle(session: ChatSession, title: string): ChatSession {
  return { ...session, title };
}

export function updateRagDocs(session: ChatSession, docs: RagDoc[]): ChatSession {
  return { ...session, ragDocs: docs };
}

export async function persistSessions(_sessions?: ChatSession[]): Promise<void> {
  // Sessions persist on backend; local cache not required.
  void _sessions;
}

export function deleteSession(sessionId: string, sessions: ChatSession[]): ChatSession[] {
  void deleteSessionRemote(sessionId).catch(() => undefined);
  return sessions.filter((s) => s.id !== sessionId);
}

export async function compactChatSession(
  sessionId: string,
): Promise<{ status: string }> {
  return apiJson(`/api/v1/chat/sessions/${sessionId}/compact/`, {
    method: "POST",
  });
}

export async function sendChatMessage(
  sessionId: string,
  content: string,
  rag: RagMessagePayload | string[] = [],
  options?: { deepThinking?: boolean },
): Promise<{ task_id: string; message_id: string }> {
  const payload =
    Array.isArray(rag)
      ? { rag_collections: rag, rag_document_titles: [], custom_rag_context: "", custom_documents: [], user_role: "" }
      : rag;

  return apiJson(`/api/v1/chat/sessions/${sessionId}/message/`, {
    method: "POST",
    body: JSON.stringify({
      content,
      rag_collections: payload.rag_collections,
      rag_document_titles: payload.rag_document_titles,
      custom_rag_context: payload.custom_rag_context,
      custom_documents: payload.custom_documents,
      user_role: payload.user_role ?? "",
      deep_thinking: options?.deepThinking ?? payload.deep_thinking ?? false,
    }),
  });
}
