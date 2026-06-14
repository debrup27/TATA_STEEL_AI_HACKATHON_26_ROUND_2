import type { RagDoc } from "@/services/types";

export const LIBRARY_GROUP_ORDER = [
  "maintenance_log",
  "manual",
  "sop",
  "iso_standard",
  "safety_code",
  "model_explanation",
  "other",
] as const;

export const LIBRARY_GROUP_LABELS: Record<string, string> = {
  maintenance_log: "Logs",
  manual: "Equipment Manuals",
  sop: "SOPs",
  iso_standard: "ISO Standards",
  safety_code: "Safety Codes",
  model_explanation: "Model Explanations",
  other: "Other Documents",
};

export interface RagDocGroup {
  key: string;
  label: string;
  docs: RagDoc[];
}

export function groupLibraryDocuments(docs: RagDoc[]): RagDocGroup[] {
  const buckets = new Map<string, RagDoc[]>();

  for (const doc of docs) {
    const key = (doc.docType || doc.type || "other").toLowerCase();
    const bucket = LIBRARY_GROUP_LABELS[key] ? key : "other";
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push(doc);
  }

  return LIBRARY_GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    label: LIBRARY_GROUP_LABELS[key],
    docs: buckets.get(key)!.sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export function previewTextForDoc(doc: RagDoc): string {
  if (doc.textContent?.trim()) return doc.textContent.trim();
  if (doc.pages?.length && doc.pages[0]?.startsWith("data:image")) {
    return "[Image preview — open full preview to view pages]";
  }
  return "No text preview available for this file.";
}
