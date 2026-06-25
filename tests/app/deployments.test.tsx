import { describe, it, expect } from "vitest";

describe("DeploymentsClient", () => {
  it("exports DeploymentsClient component", async () => {
    const mod = await import("../../src/app/dashboard/deployments/deployments-client");
    expect(mod.DeploymentsClient).toBeDefined();
  });
});
