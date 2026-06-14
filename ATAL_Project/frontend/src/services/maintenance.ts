import { apiList } from "@/lib/api";
import { mapMaintenanceEvent, type BackendMaintenanceEvent } from "@/lib/mappers";
import type { MaintenanceLog } from "./types";

interface MaintenanceEventRow extends BackendMaintenanceEvent {
  asset_name?: string;
}

export async function fetchMaintenanceLogs(): Promise<MaintenanceLog[]> {
  const events = await apiList<MaintenanceEventRow>("/api/v1/maintenance/events/");
  return events.map(mapMaintenanceEvent);
}

/** @deprecated Use fetchMaintenanceLogs */
export function getMaintenanceLogs(): MaintenanceLog[] {
  return [];
}

export async function getMaintenanceLogById(id: string): Promise<MaintenanceLog | undefined> {
  const logs = await fetchMaintenanceLogs();
  return logs.find((l) => l.id === id);
}
