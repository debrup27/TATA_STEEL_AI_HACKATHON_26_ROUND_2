import { apiJson, apiList } from "@/lib/api";
import {
  mapChatSession,
  type BackendChatSession,
  type BackendChatMessage,
} from "@/lib/mappers";
import type { ChatSession, Message, RagDoc } from "./types";

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

export async function createSession(assetId?: string, title?: string): Promise<ChatSession> {
  const res = await apiJson<{ id: string }>("/api/v1/chat/sessions/", {
    method: "POST",
    body: JSON.stringify({
      asset_id: assetId ?? null,
      metadata: title ? { title } : {},
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

export async function sendChatMessage(
  sessionId: string,
  content: string,
  ragCollections: string[] = [],
): Promise<{ task_id: string; message_id: string }> {
  return apiJson(`/api/v1/chat/sessions/${sessionId}/message/`, {
    method: "POST",
    body: JSON.stringify({ content, rag_collections: ragCollections }),
  });
}
