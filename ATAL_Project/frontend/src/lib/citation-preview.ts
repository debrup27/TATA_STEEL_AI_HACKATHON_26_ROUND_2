import { fetchLibraryDocumentPreview, getLibraryDocuments } from "@/services/chat";
import { inferDocumentFormat } from "@/lib/document-format";
import { previewTextForDoc } from "@/lib/rag-doc-groups";
import type { Citation, MessageFile, RagDoc } from "@/services/types";

export interface CitationPreviewData {
  title: string;
  body: string;
  pages: string[];
  fileType?: string;
  truncated?: boolean;
  documentId?: string;
  sourceFormat?: ReturnType<typeof inferDocumentFormat>;
}

function mapCitationDocumentId(citation: Citation): string | undefined {
  return citation.documentId
    ?? (citation as Citation & { document_id?: string }).document_id;
}

function findRagDoc(citation: Citation, ragDocs: RagDoc[]): RagDoc | undefined {
  const docId = mapCitationDocumentId(citation);
  if (docId) {
    return ragDocs.find((d) => d.id === docId);
  }
  const title = citation.doc.trim().toLowerCase();
  return ragDocs.find((d) => d.name.trim().toLowerCase() === title);
}

export async function loadCitationPreview(
  citation: Citation,
  ragDocs: RagDoc[] = [],
): Promise<CitationPreviewData> {
  const title = citation.doc || "Source document";
  const local = findRagDoc(citation, ragDocs);

  if (local?.isCustom) {
    return {
      title: local.name,
      body: local.textContent?.trim() || citation.excerpt || previewTextForDoc(local),
      pages: local.pages ?? [],
      fileType: local.type,
      sourceFormat: inferDocumentFormat(local.name, local.type),
    };
  }

  const docId = mapCitationDocumentId(citation) ?? local?.id;
  if (docId) {
    try {
      const res = await fetchLibraryDocumentPreview(docId);
      const body = pickBestPreviewBody(res.excerpt, citation.excerpt);
      return {
        title: res.title || title,
        body,
        pages: [],
        truncated: res.truncated,
        documentId: docId,
        sourceFormat: inferDocumentFormat(res.title || title, res.doc_type, res.source_format),
      };
    } catch {
      // fall through
    }
  }

  try {
    const library = await getLibraryDocuments();
    const match =
      library.find((d) => d.id && d.id === docId)
      ?? library.find((d) => d.name.trim().toLowerCase() === title.toLowerCase());
    if (match?.id) {
      const res = await fetchLibraryDocumentPreview(match.id);
      const body = pickBestPreviewBody(res.excerpt, citation.excerpt);
      return {
        title: res.title || match.name,
        body,
        pages: [],
        truncated: res.truncated,
        documentId: match.id,
        sourceFormat: inferDocumentFormat(res.title || match.name, res.doc_type, res.source_format),
      };
    }
  } catch {
    // fall through
  }

  return {
    title,
    body: citation.excerpt || "No preview available.",
    pages: [],
    sourceFormat: inferDocumentFormat(title),
  };
}

function pickBestPreviewBody(apiExcerpt?: string, citationExcerpt?: string): string {
  const api = (apiExcerpt || "").trim();
  const cite = (citationExcerpt || "").trim();
  if (!api) return cite || "No preview available.";
  if (!cite) return api;
  if (cite.length > api.length && !api.includes(cite.slice(0, 80))) {
    return `${api}\n\n---\n\n**Referenced in answer:**\n\n${cite}`;
  }
  return api;
}

export function citationToMessageFile(citation: Citation, ragDocs: RagDoc[]): MessageFile | null {
  const local = findRagDoc(citation, ragDocs);
  if (!local) return null;

  const sourceFormat = inferDocumentFormat(local.name, local.type);
  if (sourceFormat === "pdf") {
    return {
      name: local.name,
      type: local.type || "application/pdf",
      pages: local.pages,
      pdfUrl: local.pdfUrl,
      sourceFormat: "pdf",
    };
  }
  if (sourceFormat === "image" && local.pages?.length) {
    return {
      name: local.name,
      type: local.type || "image/png",
      pages: local.pages,
      sourceFormat: "image",
    };
  }
  if (local.textContent?.trim() || local.id) {
    return {
      name: local.name,
      type: local.type || "text/plain",
      body: local.textContent?.trim(),
      documentId: local.id,
      sourceFormat,
    };
  }
  return null;
}

export function citationPreviewToMessageFile(data: CitationPreviewData): MessageFile {
  return {
    name: data.title,
    type: data.fileType || (data.sourceFormat === "pdf" ? "application/pdf" : "text/plain"),
    pages: data.pages,
    body: data.body,
    documentId: data.documentId,
    sourceFormat: data.sourceFormat,
  };
}
