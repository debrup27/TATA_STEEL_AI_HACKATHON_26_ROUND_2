import {
  normalizeTechnicalMarkdown,
  protectChemicalSubscripts,
  repairCollapsedMarkdownTables,
} from "@/lib/markdown-stream";

describe("normalizeTechnicalMarkdown", () => {
  it("wraps bare H_2S in inline math", () => {
    expect(normalizeTechnicalMarkdown("exposure to H_2S in sour service")).toContain(
      "$H_{2}S$",
    );
  });

  it("does not alter existing math blocks", () => {
    const input = "already $H_{2}S$ fine";
    expect(normalizeTechnicalMarkdown(input)).toBe(input);
  });

  it("escapes ISO underscore codes", () => {
    expect(normalizeTechnicalMarkdown("per ISO_15156 and ISO_17945")).toContain(
      "ISO\\_15156",
    );
    expect(normalizeTechnicalMarkdown("per ISO_15156 and ISO_17945")).toContain(
      "ISO\\_17945",
    );
  });

  it("fixes broken [H_2S Environments): bracket pattern", () => {
    const input =
      "**Material Suitability for Sour Service** [H_2S Environments): The handbook";
    const out = normalizeTechnicalMarkdown(input);
    expect(out).toContain("($H_{2}S$ Environments):");
    expect(out).not.toMatch(/\[\s*H_2S/);
  });

  it("fixes [H S Environments) when subscript was eaten by emphasis", () => {
    const out = normalizeTechnicalMarkdown("[H S Environments):");
    expect(out).toContain("$H_{2}S$");
    expect(out).toContain("Environments):");
  });

  it("normalizes unicode H₂S", () => {
    expect(normalizeTechnicalMarkdown("sour H₂S service")).toContain("$H_{2}S$");
  });

  it("normalizes unicode subscript digits on standards", () => {
    expect(normalizeTechnicalMarkdown("ISO 17945₂")).toBe("ISO 179452");
  });

  it("fixes $H_2S$ to use braced subscript", () => {
    expect(normalizeTechnicalMarkdown("gas $H_2S$ limits")).toContain("$H_{2}S$");
  });

  it("wraps FeCl_2 as a single formula (not Cl_2 only)", () => {
    const out = normalizeTechnicalMarkdown("Ferrous Chloride (FeCl_2) in the bath");
    expect(out).toContain("$FeCl_{2}$");
    expect(out).not.toContain("$Cl_{2}$");
  });

  it("wraps FeCl₂ unicode subscript", () => {
    expect(normalizeTechnicalMarkdown("Ferrous Chloride (FeCl₂)")).toContain("$FeCl_{2}$");
  });

  it("preserves braced inline math (H_{2}S, FeCl_{2})", () => {
    expect(normalizeTechnicalMarkdown("already $H_{2}S$ fine")).toBe("already $H_{2}S$ fine");
    expect(normalizeTechnicalMarkdown("$FeCl_{2}$ in bath")).toBe("$FeCl_{2}$ in bath");
  });

  it("repairs split FeCl delimiters without double-wrapping", () => {
    expect(normalizeTechnicalMarkdown("($FeCl$_2)")).toContain("$FeCl_{2}$");
    expect(normalizeTechnicalMarkdown("($FeCl$_2)")).not.toContain("$$");
    expect(normalizeTechnicalMarkdown("Iron Chloride ($FeCl$₂)")).toContain("$FeCl_{2}$");
  });

  it("wraps FeCl_{2} in prose (outside math)", () => {
    expect(normalizeTechnicalMarkdown("Ferrous Chloride (FeCl_{2})")).toContain("$FeCl_{2}$");
  });

  it("wraps bare FeCl2 without underscore", () => {
    expect(normalizeTechnicalMarkdown("FeCl2 concentration")).toContain("$FeCl_{2}$");
  });

  it("protectChemicalSubscripts alias still works", () => {
    expect(protectChemicalSubscripts("H_2S")).toContain("$H_{2}S$");
  });

  it("wraps β₁₀(c) ≥ 200 filtration notation", () => {
    const out = normalizeTechnicalMarkdown("filters rated at β₁₀(c) ≥ 200");
    expect(out).toContain("$\\beta_{10}(c) \\geq 200$");
  });

  it("wraps β_10(c) with underscore before markdown emphasis", () => {
    const out = normalizeTechnicalMarkdown("β_10(c) ≥ 200 absolute 10-micron");
    expect(out).toContain("$\\beta_{10}(c) \\geq 200$");
    expect(out).toContain("10-micron");
  });

  it("wraps unicode superscripts", () => {
    expect(normalizeTechnicalMarkdown("area 10⁶ cycles")).toContain("$10^{6}$");
    expect(normalizeTechnicalMarkdown("unit m²")).toContain("$m^{2}$");
  });

  it("wraps caret exponents", () => {
    expect(normalizeTechnicalMarkdown("order 10^6 samples")).toContain("$10^{6}$");
  });
});

describe("repairCollapsedMarkdownTables", () => {
  it("splits glued table separator rows", () => {
    const input = "| Asset | Type ||---|---|| SRF | furnace |";
    const out = repairCollapsedMarkdownTables(input);
    expect(out).toContain("|\n|---");
    expect(out).toContain("|\n| SRF");
  });
});
