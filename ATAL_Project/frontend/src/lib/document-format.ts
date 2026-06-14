import type { DocumentSourceFormat, MessageFile, RagDoc } from "@/services/types";

export function inferDocumentFormat(
  name: string,
  fileType?: string,
  sourceFormat?: string,
): DocumentSourceFormat {
  const fmt = (sourceFormat || "").toLowerCase();
  if (fmt === "pdf" || fmt === "markdown" || fmt === "html" || fmt === "text" || fmt === "image") {
    return fmt;
  }
  const lower = name.toLowerCase();
  if (fileType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (fileType === "text/markdown" || /\.(md|markdown)$/i.test(lower)) return "markdown";
  if (fileType?.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(lower)) return "image";
  if (fileType?.includes("html") || /\.html?$/i.test(lower)) return "html";
  return "text";
}

export function messageFileFormat(file: MessageFile): DocumentSourceFormat {
  if (file.sourceFormat) return file.sourceFormat;
  return inferDocumentFormat(file.name, file.type);
}

export function ragDocFormat(doc: RagDoc): DocumentSourceFormat {
  return inferDocumentFormat(doc.name, doc.type, doc.docType);
}

export function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s|^\s*[-*]\s|\*\*|```|^\s*\d+\.\s/m.test(text);
}

export function shouldUseExpandedPreview(
  format: DocumentSourceFormat,
  file: Pick<MessageFile, "pages" | "body" | "documentId">,
): boolean {
  if (format === "pdf" || format === "markdown" || format === "image") return true;
  if (format === "html" || format === "text") return Boolean(file.body?.trim() || file.documentId);
  return Boolean(file.pages?.length || file.body?.trim() || file.documentId);
}
