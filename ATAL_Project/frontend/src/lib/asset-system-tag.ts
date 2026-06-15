/** Map display names / codes to canonical plant system tags (SRF, HAGCC, …). */
const NAME_TO_TAG: Record<string, string> = {
  srf: "SRF",
  "slab reheating furnace": "SRF",
  hhpd: "HHPD",
  "high-pressure descaler": "HHPD",
  fs: "FS",
  "finishing stand": "FS",
  "finishing stands": "FS",
  hagcc: "HAGCC",
  "hydraulic agc": "HAGCC",
  "hydraulic agc cylinders": "HAGCC",
  apt: "APT",
  "acid pickling": "APT",
  tcms: "TCMS",
  "tandem cold mill": "TCMS",
  cgp: "CGP",
  "continuous galvanizing": "CGP",
  hpak: "HPAK",
  "high-pressure air knives": "HPAK",
  "air knives": "HPAK",
};

export function assetSystemTag(input?: {
  code?: string | null;
  name?: string | null;
  asset_type?: string | null;
}): string {
  const code = input?.code?.trim().toUpperCase();
  if (code && code.length <= 6 && !code.includes(" ")) return code;

  const type = input?.asset_type?.trim().toUpperCase();
  if (type && type.length <= 6) return type;

  const name = (input?.name ?? "").trim().toLowerCase();
  if (!name) return "SYSTEM EMIT";

  for (const [key, tag] of Object.entries(NAME_TO_TAG)) {
    if (name.includes(key)) return tag;
  }

  const acronym = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return acronym.slice(0, 6) || "PLANT";
}
