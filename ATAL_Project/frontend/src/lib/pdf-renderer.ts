let workerConfigured = false;

function ensureWorker() {
  if (workerConfigured) return;
  workerConfigured = true;
  import("pdfjs-dist").then(
    ({ GlobalWorkerOptions }) => {
      GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`;
    },
  );
}

export async function getPagesFromPdf(file: File): Promise<string[]> {
  ensureWorker();

  const { getDocument } = await import("pdfjs-dist");
  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;
  const urls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, viewport }).promise;
    urls.push(canvas.toDataURL("image/webp", 0.92));
  }

  return urls;
}

/** Extract selectable text from a PDF for RAG (not page images). */
export async function extractTextFromPdf(file: File): Promise<string> {
  ensureWorker();

  const { getDocument } = await import("pdfjs-dist");
  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) {
      parts.push(`[Page ${i}]\n${text}`);
    }
  }

  return parts.join("\n\n");
}
