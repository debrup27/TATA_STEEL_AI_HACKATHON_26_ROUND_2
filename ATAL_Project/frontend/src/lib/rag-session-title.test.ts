import { buildRagSessionTitle, isGenericRagSessionTitle } from "@/lib/rag-session-title";

describe("rag-session-title", () => {
  it("uses document name for a single doc", () => {
    expect(
      buildRagSessionTitle([{ name: "Danieli DANOIL Oil-Film Bearings Manual.pdf", size: "" }]),
    ).toBe("Danieli DANOIL Oil-Film Bearings Manual");
  });

  it("summarizes multiple docs", () => {
    expect(
      buildRagSessionTitle([
        { name: "manual-a.pdf", size: "" },
        { name: "manual-b.pdf", size: "" },
        { name: "sop.md", size: "" },
      ]),
    ).toBe("manual-a +2 docs");
  });

  it("detects generic RAG session titles", () => {
    expect(isGenericRagSessionTitle("RAG Session: 1 Doc Loaded")).toBe(true);
    expect(isGenericRagSessionTitle("Danieli DANOIL Manual")).toBe(false);
  });
});
