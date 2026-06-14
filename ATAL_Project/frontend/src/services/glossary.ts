import { apiJson } from "@/lib/api";

export interface GlossaryEntry {
  term: string;
  shortForm: string;
  category: string;
  definition: string;
  relatedAssets?: string[];
  isoRef?: string;
}

export async function fetchGlossary(category?: string, q?: string): Promise<{
  entries: GlossaryEntry[];
  categories: string[];
}> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  const qs = params.toString();
  return apiJson(`/api/v1/glossary/${qs ? `?${qs}` : ""}`);
}
