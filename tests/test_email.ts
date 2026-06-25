import { describe, it, expect } from "vitest"

describe("Email Service", () => {
  it("exports send functions", async () => {
    const mod = await import("../src/lib/email")
    expect(typeof mod.sendWelcomeEmail).toBe("function")
    expect(typeof mod.sendInviteEmail).toBe("function")
    expect(typeof mod.sendProjectSharedEmail).toBe("function")
  })

  it("dev mode fallback returns success", async () => {
    // In dev (no RESEND_API_KEY), should log and return success
    const mod = await import("../src/lib/email")
    const result = await mod.sendWelcomeEmail("test@test.com", "Test")
    expect(result.success).toBe(true)
  })
})
