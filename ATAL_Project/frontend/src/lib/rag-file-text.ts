import { extractTextFromPdf } from "@/lib/pdf-renderer";

const TEXT_LIKE = /\.(txt|md|markdown|csv|log|json|xml|html?)$/i;

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

  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    try {
      return (await extractTextFromPdf(file)).trim();
    } catch {
      return "";
    }
  }

  return "";
}
