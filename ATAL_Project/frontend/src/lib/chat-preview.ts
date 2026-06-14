import type { ChatSession, Message } from "@/services/types";

/** Plain-text snippet for sidebar / list previews (no markdown). */
export function stripMarkdownPreview(text: string, maxLen = 120): string {
  let s = text
    .replace(/\s*\[\d+\]/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (s.length > maxLen) {
    s = `${s.slice(0, maxLen - 1)}…`;
  }
  return s;
}

function lastUserContent(messages: Message[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user" && m.content?.trim()) {
      return m.content;
    }
  }
  return undefined;
}

/** Sidebar preview: last user message only, markdown stripped. */
export function getSessionPreviewText(session: ChatSession): string {
  const fromMessages = lastUserContent(session.messages ?? []);
  if (fromMessages) {
    return stripMarkdownPreview(fromMessages);
  }
  if (session.lastMessagePreview?.trim()) {
    return stripMarkdownPreview(session.lastMessagePreview);
  }
  return "";
}
