export interface AssetAliasRow {
  id: string;
  name: string;
  asset_type?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Module labels that exist in the live asset catalog. */
export function buildValidAssetModuleSet(assets: AssetAliasRow[]): Set<string> {
  return new Set(assets.map((a) => a.name.trim()).filter(Boolean));
}

/**
 * Resolve a log module label only when it maps to a real asset in the catalog.
 * Returns null for unknown UUIDs, stale names, or synthetic fallbacks.
 */
export function createAssetAliasResolver(assets: AssetAliasRow[]) {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const byName = new Map(assets.map((a) => [a.name.trim().toLowerCase(), a]));

  return function resolveAssetModule(input: {
    id?: string | null;
    name?: string | null;
    code?: string | null;
  }): string | null {
    const id = input.id?.trim();
    const name = input.name?.trim();
    const code = input.code?.trim();

    if (id && byId.has(id)) {
      return byId.get(id)!.name;
    }

    if (name && !isUuid(name)) {
      const hit = byName.get(name.toLowerCase());
      if (hit) return hit.name;
    }

    if (code) {
      const match = assets.find(
        (a) => a.asset_type?.trim().toUpperCase() === code.toUpperCase(),
      );
      if (match) return match.name;
    }

    return null;
  };
}

/**
 * Resolve a log module label for display.
 * Prefers catalog match; falls back to backend-provided asset name when trustworthy.
 */
export function resolveLogModuleLabel(
  resolve: ReturnType<typeof createAssetAliasResolver>,
  input: {
    id?: string | null;
    name?: string | null;
    code?: string | null;
  },
): string | null {
  const catalog = resolve(input);
  if (catalog) return catalog;

  const name = input.name?.trim();
  if (name && !isUuid(name)) return name;

  return null;
}

/** Asset filter list: only modules present in both the log stream and asset catalog. */
export function buildLogModuleFilters(
  logModules: string[],
  validModules?: Set<string>,
): string[] {
  let unique = [...new Set(logModules.map((m) => m.trim()).filter(Boolean))];
  if (validModules && validModules.size > 0) {
    unique = unique.filter((m) => validModules.has(m));
  }
  unique.sort((a, b) => a.localeCompare(b));
  return ["ALL MODULES", ...unique];
}

export function logModuleFilterLabel(module: string): string {
  if (module === "ALL MODULES") return "Show All Modules";
  return module;
}
