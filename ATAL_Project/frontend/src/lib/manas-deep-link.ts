/** Query params for MANAS deep-links from SANSAD §5 pages. */
export interface ManasDeepLinkParams {
  assetId?: string;
  assetName?: string;
  prompt?: string;
  source?: string;
}

export function parseManasDeepLinkParams(search: string): ManasDeepLinkParams {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    assetId: params.get("asset") ?? params.get("asset_id") ?? undefined,
    assetName: params.get("asset_name") ?? undefined,
    prompt: params.get("q") ?? params.get("prompt") ?? undefined,
    source: params.get("source") ?? undefined,
  };
}

export function manasAskPath(opts: {
  assetId: string;
  assetName?: string;
  prompt: string;
  source?: string;
}): string {
  const params = new URLSearchParams({
    asset: opts.assetId,
    q: opts.prompt,
  });
  if (opts.assetName) params.set("asset_name", opts.assetName);
  if (opts.source) params.set("source", opts.source);
  return `/manas/chat?${params.toString()}`;
}
