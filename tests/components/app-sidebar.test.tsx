import { describe, it, expect } from "vitest"

describe("AppSidebar", () => {
  it("exports AppSidebar component", async () => {
    const mod = await import("../../src/components/app-sidebar")
    expect(mod.AppSidebar).toBeDefined()
  })
})
