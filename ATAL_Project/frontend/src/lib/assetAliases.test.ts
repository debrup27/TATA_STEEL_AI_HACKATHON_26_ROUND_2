import {
  buildLogModuleFilters,
  buildValidAssetModuleSet,
  createAssetAliasResolver,
  isUuid,
  resolveLogModuleLabel,
} from "@/lib/assetAliases";

describe("assetAliases", () => {
  const assets = [
    { id: "aaa", name: "Hydraulic AGC Cylinders", asset_type: "HAGCC" },
    { id: "bbb", name: "High-Pressure Air Knives", asset_type: "HPAK" },
  ];

  it("detects UUID strings", () => {
    expect(isUuid("2ecab1f3-d15d-4aa8-b100-cbcab9b19f39")).toBe(true);
    expect(isUuid("High-Pressure Air Knives")).toBe(false);
  });

  it("resolves only known catalog assets", () => {
    const resolve = createAssetAliasResolver(assets);
    expect(resolve({ id: "bbb" })).toBe("High-Pressure Air Knives");
    expect(resolve({ name: "Hydraulic AGC Cylinders" })).toBe("Hydraulic AGC Cylinders");
    expect(resolve({ code: "HPAK" })).toBe("High-Pressure Air Knives");
  });

  it("rejects unknown modules and static fallbacks", () => {
    const resolve = createAssetAliasResolver(assets);
    expect(resolve({ id: "2ecab1f3-d15d-4aa8-b100-cbcab9b19f39" })).toBeNull();
    expect(resolve({ name: "CokeOven-Agent" })).toBeNull();
    expect(resolve({ code: "SRF" })).toBeNull();
    expect(resolve({ fallback: "MANAS" } as never)).toBeNull();
  });

  it("filters module list to catalog assets only", () => {
    const valid = buildValidAssetModuleSet(assets);
    expect(
      buildLogModuleFilters(
        ["Hydraulic AGC Cylinders", "MANAS", "CokeOven-Agent", "High-Pressure Air Knives"],
        valid,
      ),
    ).toEqual(["ALL MODULES", "High-Pressure Air Knives", "Hydraulic AGC Cylinders"]);
  });

  it("falls back to backend asset name when catalog is empty", () => {
    const resolve = createAssetAliasResolver([]);
    expect(
      resolveLogModuleLabel(resolve, { name: "Hydraulic AGC Cylinders" }),
    ).toBe("Hydraulic AGC Cylinders");
    expect(resolveLogModuleLabel(resolve, { name: "CokeOven-Agent" })).toBe("CokeOven-Agent");
    expect(
      resolveLogModuleLabel(resolve, {
        id: "2ecab1f3-d15d-4aa8-b100-cbcab9b19f39",
      }),
    ).toBeNull();
  });
});
