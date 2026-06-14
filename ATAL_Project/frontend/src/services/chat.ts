import { apiJson } from "@/lib/api";
import type { Message } from "./types";

const WELCOME_MESSAGE = "Hi! I am Manas. Ask me anything about ATAL's assets or diagnostics.";

export function getWelcomeMessage(): Message {
  return { role: "assistant", content: WELCOME_MESSAGE };
}

export function getRagWelcomeMessage(docCount: number): Message {
  return {
    role: "assistant",
    content: `Hi! I have loaded the selected ${docCount} document(s) into my context. Ask me anything referencing their content.`,
  };
}

export async function getPreloadedDocs() {
  try {
    const res = await apiJson<{
      documents: { id: string; title: string; doc_type: string }[];
    }>("/api/v1/rag/documents/");
    return res.documents.map((d) => ({
      name: d.title,
      size: d.doc_type,
      type: d.doc_type,
    }));
  } catch {
    return [];
  }
}

export async function queryRag(
  query: string,
  type = "asset_intelligence",
  assetId?: string,
) {
  return apiJson<{ results: unknown[]; count: number }>("/api/v1/rag/query/", {
    method: "POST",
    body: JSON.stringify({ query, type, asset_id: assetId }),
  });
}

/** Map selected doc names to RAG collection keys for the chat task. */
export function ragCollectionsFromDocs(docNames: string[]): string[] {
  const collections: string[] = [];
  for (const name of docNames) {
    const lower = name.toLowerCase();
    if (lower.includes("sop") || lower.includes("procedure")) collections.push("sop");
    if (lower.includes("safety") || lower.includes("osha")) collections.push("safety");
    if (lower.includes("iso")) collections.push("iso");
  }
  return [...new Set(collections)];
}

export async function simulateProcessingSteps(
  stepCount: number,
  intervalMs: number,
  onStep: (stepIndex: number) => void,
): Promise<void> {
  for (let i = 0; i < stepCount; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    onStep(i);
  }
}

// Legacy stubs — real replies come from WebSocket streaming
export function getRandomStaticReply(): string {
  return "Processing your request…";
}

export function generateDemoReply(userMessage: string): string {
  return `Received: ${userMessage.slice(0, 80)}`;
}
