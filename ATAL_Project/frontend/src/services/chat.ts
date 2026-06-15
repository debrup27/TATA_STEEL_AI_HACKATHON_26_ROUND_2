import { apiJson, apiBlob } from "@/lib/api";
import type { Message, RagDoc } from "./types";

const WELCOME_MESSAGE = "Hi! I am Manas. Ask me anything about ATAL's assets or diagnostics.";

export const CHAT_GENERATION_STOPPED_MESSAGE = "Generation stopped.";

export function applyStoppedGenerationContent(content: string, cancelled?: boolean): string {
  if (!cancelled) return content;
  const body = (content || "").trim();
  if (!body) return CHAT_GENERATION_STOPPED_MESSAGE;
  if (body.includes(CHAT_GENERATION_STOPPED_MESSAGE)) return content;
  return `${body}\n\n*${CHAT_GENERATION_STOPPED_MESSAGE}*`;
}

export function getWelcomeMessage(): Message {
  return { role: "assistant", content: WELCOME_MESSAGE };
}

export function getRagWelcomeMessage(docCount: number): Message {
  return {
    role: "assistant",
    content: `Hi! I have loaded the selected ${docCount} document(s) into my context. Ask me anything referencing their content.`,
  };
}

export async function warmChatStack(): Promise<void> {
  try {
    await apiJson<{ status: string }>("/api/v1/chat/warmup/", { method: "POST" });
  } catch {
    // Non-fatal — stack may already be warm from entrypoint
  }
}

export type OptimizePromptResult = {
  action: "allow" | "block" | "steer";
  optimized: string;
  draft: string;
  message?: string;
  category?: string;
};

export async function optimizeMaintenancePrompt(
  draft: string,
  options?: { hasRagContext?: boolean; userRole?: string },
): Promise<OptimizePromptResult> {
  const res = await apiJson<OptimizePromptResult>("/api/v1/chat/optimize-prompt/", {
    method: "POST",
    body: JSON.stringify({
      draft,
      has_rag_context: Boolean(options?.hasRagContext),
      user_role: options?.userRole ?? "",
    }),
  });
  return {
    action: res.action ?? "allow",
    optimized: (res.optimized || draft).trim(),
    draft: res.draft ?? draft,
    message: res.message,
    category: res.category,
  };
}

export async function submitChatMessageFeedback(
  messageId: string,
  rating: "up" | "down",
): Promise<{ style_summary?: string }> {
  return apiJson(`/api/v1/chat/messages/${messageId}/feedback/`, {
    method: "POST",
    body: JSON.stringify({ rating }),
  });
}

/** Plant document library (ingested on backend — user opts in per session). */
export async function getLibraryDocuments(): Promise<RagDoc[]> {
  try {
    const res = await apiJson<{
      documents: { id: string; title: string; doc_type: string }[];
    }>("/api/v1/rag/documents/");
    return res.documents.map((d) => ({
      id: d.id,
      name: d.title,
      size: d.doc_type.replace(/_/g, " "),
      type: d.doc_type,
      docType: d.doc_type,
    }));
  } catch {
    return [];
  }
}

/** @deprecated Use getLibraryDocuments */
export const getPreloadedDocs = getLibraryDocuments;

export interface RagMessagePayload {
  rag_collections: string[];
  rag_document_titles: string[];
  rag_document_ids: string[];
  custom_rag_context: string;
  custom_documents: { name: string; text: string }[];
  /** Selected MANAS persona — tailors backend system prompt. */
  user_role?: string;
  /** Enable Ollama extended thinking (streams reasoning before answer). */
  deep_thinking?: boolean;
  /** Run 0.8b role advisory workers before 9b answer. */
  advice_mode?: boolean;
}

const DOC_TYPE_TO_COLLECTION: Record<string, string> = {
  sop: "sop",
  iso_standard: "iso",
  safety_code: "safety",
  manual: "manual",
  maintenance_log: "maintenance_log",
  model_explanation: "model_explanation",
};

function inferDocTypeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("sop")) return "sop";
  if (lower.includes("iso")) return "iso_standard";
  if (lower.includes("safety") || lower.includes("osha") || lower.includes("lockout")) {
    return "safety_code";
  }
  if (lower.includes("maintenance") || lower.includes("mr-")) return "maintenance_log";
  return "manual";
}

export async function fetchLibraryDocumentPreview(documentId: string): Promise<{
  title: string;
  doc_type: string;
  excerpt: string;
  truncated?: boolean;
  char_count?: number;
  source_format?: string;
}> {
  return apiJson(`/api/v1/rag/documents/${documentId}/preview/`);
}

export async function fetchLibraryDocumentFileUrl(documentId: string): Promise<string> {
  const blob = await apiBlob(`/api/v1/rag/documents/${documentId}/file/`);
  return URL.createObjectURL(blob);
}

/** Build backend RAG payload from user-selected library + uploaded docs. */
export function ragPayloadFromDocs(docs: RagDoc[]): RagMessagePayload {
  const collections: string[] = [];
  const documentTitles: string[] = [];
  const documentIds: string[] = [];
  const customParts: string[] = [];
  const customDocuments: { name: string; text: string }[] = [];

  for (const doc of docs) {
    if (doc.isCustom) {
      const text = (doc.textContent || "").trim();
      if (text) {
        customDocuments.push({ name: doc.name, text: text.slice(0, 12000) });
        customParts.push(`--- ${doc.name} ---\n${text}`);
      }
      continue;
    }
    documentTitles.push(doc.name);
    if (doc.id) {
      documentIds.push(doc.id);
    }
    const dt = (doc.docType || doc.type || inferDocTypeFromName(doc.name)).toLowerCase();
    const coll = DOC_TYPE_TO_COLLECTION[dt] ?? "manual";
    collections.push(coll);
  }

  return {
    rag_collections: [...new Set(collections)],
    rag_document_titles: documentTitles,
    rag_document_ids: documentIds,
    custom_rag_context: customParts.join("\n\n").slice(0, 12000),
    custom_documents: customDocuments,
    user_role: undefined,
  };
}

/** @deprecated Use ragPayloadFromDocs */
export function ragCollectionsFromDocs(docNames: string[]): string[] {
  return ragPayloadFromDocs(docNames.map((name) => ({ name, size: "" }))).rag_collections;
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

export function getRandomStaticReply(): string {
  return "Processing your request…";
}

export const MANAS_DEMO_LOGIN_REPLY =
  "Hey, I'm Manas! This is just a preview — log in and open Manas Chat to talk to me with live plant data and RAG-backed answers.";

export function generateDemoReply(): string {
  return MANAS_DEMO_LOGIN_REPLY;
}
