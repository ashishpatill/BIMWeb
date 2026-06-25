import { describe, it, expect, vi } from "vitest"

vi.mock("server-only", () => ({}))

describe("Audit Logging", () => {
  it("exports logAction function", async () => {
    const mod = await import("../../src/lib/audit")
    expect(typeof mod.logAction).toBe("function")
  })

  it("exports getAuditLogs function", async () => {
    const mod = await import("../../src/lib/audit")
    expect(typeof mod.getAuditLogs).toBe("function")
  })
})
