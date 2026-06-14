import { apiJson, apiList } from "@/lib/api";
import {
  mapFactoryHealth,
  type BackendFactory,
  type BackendFactoryHealth,
} from "@/lib/mappers";
import type { FactoryData } from "./types";

export async function fetchFactories(): Promise<FactoryData[]> {
  const factories = await apiList<BackendFactory>("/api/v1/factories/");
  const result: FactoryData[] = [];
  for (const factory of factories) {
    try {
      const health = await apiJson<BackendFactoryHealth>(
        `/api/v1/factories/${factory.id}/health/`,
      );
      result.push(mapFactoryHealth(factory, health));
    } catch {
      result.push({
        id: factory.id,
        name: factory.name,
        code: factory.code,
        description: factory.location ?? factory.name,
        parts: [],
      });
    }
  }
  return result;
}

/** @deprecated Use fetchFactories */
export function getFactories(): FactoryData[] {
  return [];
}

export async function getFactoryById(id: string): Promise<FactoryData | undefined> {
  const factories = await fetchFactories();
  return factories.find((f) => f.id === id);
}
