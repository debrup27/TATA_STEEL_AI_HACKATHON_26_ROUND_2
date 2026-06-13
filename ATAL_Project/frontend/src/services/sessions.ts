import type { ChatSession, Message, RagDoc } from "./types";

const STORAGE_KEY = "manas_chat_sessions";

let sessionCounter = 3;

export function getSessions(): ChatSession[] {
  if (typeof window === "undefined") return getMockSessions();
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as ChatSession[];
    } catch {
      return getMockSessions();
    }
  }
  return getMockSessions();
}

function getMockSessions(): ChatSession[] {
  return [
    {
      id: "session-3",
      title: "Hydraulic Valve Status",
      createdAt: "2 days ago",
      messages: [
        { role: "user", content: "Is the hydraulic valve leaking?" },
        { role: "assistant", content: "No leakage detected. Pressure stability index is at 98.4%, indicating normal seal integrity." },
      ],
    },
    {
      id: "session-2",
      title: "Furnace 3 Telemetry",
      createdAt: "Yesterday",
      messages: [
        { role: "user", content: "Generate telemetry report for furnace 3" },
        { role: "assistant", content: "Furnace 3 telemetry check: Temperature gradient is within normal bounds. Core sensor report is nominal." },
      ],
    },
    {
      id: "session-1",
      title: "Turbine Wear Check",
      createdAt: "10:24 AM",
      messages: [
        { role: "user", content: "Analyze predictive wear patterns for Turbine #3" },
        { role: "assistant", content: "Analysis complete. Asset integrity levels are nominal. Predictive wear models estimate 1,200 run hours before replacement. Let me know if you would like me to schedule a diagnostic run." },
      ],
    },
  ];
}

export function createSession(title?: string): ChatSession {
  sessionCounter++;
  const session: ChatSession = {
    id: `session-${sessionCounter}`,
    title: title ?? "New Chat",
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    messages: [],
  };
  return session;
}

export function addMessage(session: ChatSession, message: Message): ChatSession {
  return {
    ...session,
    messages: [...session.messages, message],
  };
}

export function updateTitle(session: ChatSession, title: string): ChatSession {
  return { ...session, title };
}

export function updateRagDocs(session: ChatSession, docs: RagDoc[]): ChatSession {
  return { ...session, ragDocs: docs };
}

export async function persistSessions(sessions: ChatSession[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const trimmed = sessions.map((s) => ({
      ...s,
      messages: s.messages,
      ragDocs: s.ragDocs?.map((d) => ({
        ...d,
        pages: undefined,
      })),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded or storage unavailable
  }
}

export function deleteSession(sessionId: string, sessions: ChatSession[]): ChatSession[] {
  return sessions.filter((s) => s.id !== sessionId);
}
