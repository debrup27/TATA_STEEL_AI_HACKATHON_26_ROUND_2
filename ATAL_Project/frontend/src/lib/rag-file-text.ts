import { apiFetch, ApiError } from "@/lib/api";
import {
  PDF_TOO_MANY_PAGES_MESSAGE,
  PDF_TOO_MANY_TEXT_PAGES_MESSAGE,
} from "@/lib/constants";
import { extractTextFromPdf } from "@/lib/pdf-renderer";

const TEXT_LIKE = /\.(txt|md|markdown|csv|log|json|xml|html?)$/i;
const MIN_PDF_TEXT = 48;

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function extractViaBackend(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch("/api/v1/rag/extract-upload/", {
    method: "POST",
    body: form,
    headers: {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body as { detail?: string }).detail ?? res.statusText;
    throw new ApiError(res.status, detail, body);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text || "").trim();
}

/** Extract plain text from an uploaded file for MANAS RAG context. */
export async function extractRagTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (
    file.type.startsWith("text/")
    || TEXT_LIKE.test(name)
    || name.endsWith(".doc")
  ) {
    try {
      return (await file.text()).trim();
    } catch {
      return "";
    }
  }

  if (isPdfFile(file)) {
    let text = "";
    try {
      text = (await extractTextFromPdf(file)).trim();
    } catch {
      text = "";
    }
    if (text.length < MIN_PDF_TEXT) {
      try {
        const backendText = await extractViaBackend(file);
        if (backendText.length > text.length) {
          text = backendText;
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.message.includes("Image-based uploads")) {
            throw new Error(PDF_TOO_MANY_PAGES_MESSAGE);
          }
          if (err.message.includes("Text-based uploads")) {
            throw new Error(PDF_TOO_MANY_TEXT_PAGES_MESSAGE);
          }
        }
      }
    }
    return text;
  }

  return "";
}
