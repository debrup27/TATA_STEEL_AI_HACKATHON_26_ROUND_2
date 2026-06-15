import { normalizeSystemEmitTags } from "@/lib/systemLogFormat";

describe("normalizeSystemEmitTags", () => {
  it("replaces UNKNOWN with SYSTEM EMIT", () => {
    expect(
      normalizeSystemEmitTags("[UNKNOWN] Provide asset_id(s) for analysis target"),
    ).toBe("[SYSTEM EMIT] Provide asset_id(s) for analysis target");
  });

  it("replaces PLANT with SYSTEM EMIT", () => {
    expect(normalizeSystemEmitTags("[PLANT] nominal")).toBe("[SYSTEM EMIT] nominal");
  });
});
