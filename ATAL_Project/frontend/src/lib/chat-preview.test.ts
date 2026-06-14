import { stripMarkdownPreview, getSessionPreviewText } from "@/lib/chat-preview";
import type { ChatSession } from "@/services/types";

describe("chat-preview", () => {
  it("strips bold markdown", () => {
    expect(stripMarkdownPreview("Hello! I am **MANAS** (Maintenance...)")).toBe(
      "Hello! I am MANAS (Maintenance...)",
    );
  });

  it("prefers last user message for sidebar preview", () => {
    const session: ChatSession = {
      id: "s1",
      title: "hi",
      createdAt: "now",
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "Hello! I am **MANAS** (Maintenance Agentic...)" },
        { role: "user", content: "explain **this**" },
      ],
    };
    expect(getSessionPreviewText(session)).toBe("explain this");
  });

  it("does not use assistant message for preview", () => {
    const session: ChatSession = {
      id: "s2",
      title: "hi",
      createdAt: "now",
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "Hello! I am **MANAS**" },
      ],
    };
    expect(getSessionPreviewText(session)).toBe("hi");
  });
});
