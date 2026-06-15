import { fetchSamvidhaanHistoricalReports } from "@/services/samvidhaanGraphs";
import type { RagDoc } from "@/services/types";

/** Factory dossiers from /sansad/hub/samvidhaan/reports — not the live system log stream. */
export async function buildHistoricalLogsRagDocs(): Promise<RagDoc[]> {
  const reports = await fetchSamvidhaanHistoricalReports();
  return reports.map((r) => ({
    id: `hist-dossier-${r.id}`,
    name: `${r.factory} — ${r.title}`,
    size: "historical dossier",
    type: "historical_log",
    docType: "historical_log",
    isCustom: true,
    textContent: r.reportMarkdown,
  }));
}

export function isHistoricalLogsDoc(doc: RagDoc): boolean {
  return (doc.docType || doc.type || "").toLowerCase() === "historical_log";
}

export function countHistoricalLogDocs(docs: RagDoc[] | undefined): number {
  return docs?.filter(isHistoricalLogsDoc).length ?? 0;
}
