import type { RagDoc } from "@/services/types";

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "").trim() || name;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/** Human-readable chat title from loaded RAG documents (not "RAG Session: 1 Doc"). */
export function buildRagSessionTitle(docs: RagDoc[]): string {
  if (docs.length === 0) return "New Session";

  if (docs.length === 1) {
    return truncate(stripExtension(docs[0].name), 52);
  }

  const first = truncate(stripExtension(docs[0].name), 28);
  if (docs.length === 2) {
    const second = truncate(stripExtension(docs[1].name), 22);
    return truncate(`${first}, ${second}`, 52);
  }

  return truncate(`${first} +${docs.length - 1} docs`, 52);
}

export function isGenericRagSessionTitle(title?: string): boolean {
  if (!title) return true;
  const t = title.trim();
  return (
    t === "New Session"
    || t === "New Chat"
    || /^RAG Session:/i.test(t)
  );
}
