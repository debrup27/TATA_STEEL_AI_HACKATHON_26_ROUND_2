import { apiJson } from "@/lib/api";
import type { Message, RagDoc } from "./types";

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

export async function warmChatStack(): Promise<void> {
  try {
    await apiJson<{ status: string }>("/api/v1/chat/warmup/", { method: "POST" });
  } catch {
    // Non-fatal — stack may already be warm from entrypoint
  }
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
  custom_rag_context: string;
  custom_documents: { name: string; text: string }[];
  /** Selected MANAS persona — tailors backend system prompt. */
  user_role?: string;
  /** Enable Ollama extended thinking (streams reasoning before answer). */
  deep_thinking?: boolean;
}

const DOC_TYPE_TO_COLLECTION: Record<string, string> = {
  sop: "sop",
  iso_standard: "iso",
  safety_code: "safety",
  manual: "manual",
  maintenance_log: "maintenance_log",
  model_explanation: "model_explanation",
};

export async function fetchLibraryDocumentPreview(documentId: string): Promise<{
  title: string;
  doc_type: string;
  excerpt: string;
}> {
  return apiJson(`/api/v1/rag/documents/${documentId}/preview/`);
}

/** Build backend RAG payload from user-selected library + uploaded docs. */
export function ragPayloadFromDocs(docs: RagDoc[]): RagMessagePayload {
  const collections: string[] = [];
  const documentTitles: string[] = [];
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
    const dt = (doc.docType || doc.type || "manual").toLowerCase();
    const coll = DOC_TYPE_TO_COLLECTION[dt] ?? "manual";
    collections.push(coll);
  }

  return {
    rag_collections: [...new Set(collections)],
    rag_document_titles: documentTitles,
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

export function generateDemoReply(userMessage: string): string {
  return `Received: ${userMessage.slice(0, 80)}`;
}
