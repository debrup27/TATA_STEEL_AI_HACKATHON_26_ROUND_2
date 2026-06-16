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

  it("leaves unicode H₂S as plain text (renders fine, no math)", () => {
    expect(normalizeTechnicalMarkdown("sour H₂S service")).toBe("sour H₂S service");
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

  it("leaves FeCl₂ unicode subscript as plain text", () => {
    expect(normalizeTechnicalMarkdown("Ferrous Chloride (FeCl₂)")).toBe("Ferrous Chloride (FeCl₂)");
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

  it("leaves bare FeCl2 (no underscore) as plain text — avoids stray subscripts on units", () => {
    expect(normalizeTechnicalMarkdown("FeCl2 concentration")).toBe("FeCl2 concentration");
    expect(normalizeTechnicalMarkdown("ventilation at 5000 Nm3/h")).toBe("ventilation at 5000 Nm3/h");
  });

  it("protectChemicalSubscripts alias still works", () => {
    expect(protectChemicalSubscripts("H_2S")).toContain("$H_{2}S$");
  });

  it("leaves unicode β₁₀(c) ≥ 200 as plain text", () => {
    expect(normalizeTechnicalMarkdown("filters rated at β₁₀(c) ≥ 200")).toBe(
      "filters rated at β₁₀(c) ≥ 200",
    );
  });

  it("wraps β_10(c) with underscore before markdown emphasis", () => {
    const out = normalizeTechnicalMarkdown("β_10(c) ≥ 200 absolute 10-micron");
    expect(out).toContain("$\\beta_{10}(c) \\geq 200$");
    expect(out).toContain("10-micron");
  });

  it("leaves unicode superscripts as plain text (m², 10⁶, Nm³ render fine)", () => {
    expect(normalizeTechnicalMarkdown("area 10⁶ cycles")).toBe("area 10⁶ cycles");
    expect(normalizeTechnicalMarkdown("unit m²")).toBe("unit m²");
    expect(normalizeTechnicalMarkdown("flow 5000 Nm³/h")).toBe("flow 5000 Nm³/h");
  });

  it("wraps ASCII caret exponents (literal ^ renders badly)", () => {
    expect(normalizeTechnicalMarkdown("order 10^6 samples")).toContain("$10^{6}$");
    expect(normalizeTechnicalMarkdown("accel 9.8 m/s^2")).toContain("$s^{2}$");
  });

  it("repairs finishing stand F^1 superscript to subscript", () => {
    const out = normalizeTechnicalMarkdown(
      "Finishing Stands $F^1$ through $F^7$ within FS scope",
    );
    expect(out).toContain("$F_{1}$");
    expect(out).toContain("$F_{7}$");
    expect(out).not.toContain("F^1");
    expect(out).not.toContain("F^7");
  });

  it("leaves unicode F¹ / F⁷ stand labels as plain text (already readable)", () => {
    expect(normalizeTechnicalMarkdown("stand F¹ and F⁷")).toBe("stand F¹ and F⁷");
  });

  it("leaves unicode F₁–F₇ stand range as plain text", () => {
    expect(normalizeTechnicalMarkdown("Finishing Stands F₁–F₇")).toBe("Finishing Stands F₁–F₇");
  });

  it("still converts ASCII F1 - F7 stand range to subscripts", () => {
    const out = normalizeTechnicalMarkdown("Finishing Stands F1 - F7");
    expect(out).toContain("$F_{1}$");
    expect(out).toContain("$F_{7}$");
  });

  it("repairs broken $F - F$ range inside math", () => {
    const out = normalizeTechnicalMarkdown("scope FS ($F - F_7$)");
    expect(out).toContain("F_{1}");
    expect(out).toContain("F_{7}");
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
