import { describe, it, expect } from "vitest";

describe("SearchClient", () => {
  it("exports SearchClient component", async () => {
    const mod = await import("../../src/app/dashboard/search/search-client");
    expect(mod.SearchClient).toBeDefined();
  });
});
