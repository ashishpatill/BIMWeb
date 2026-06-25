import { describe, it, expect, vi } from "vitest"

vi.mock("server-only", () => ({}))

describe("Server Actions", () => {
  it("exports project actions", async () => {
    const mod = await import("../../src/lib/actions")
    expect(typeof mod.createProject).toBe("function")
    expect(typeof mod.getProjects).toBe("function")
    expect(typeof mod.deleteProject).toBe("function")
  })

  it("exports model actions", async () => {
    const mod = await import("../../src/lib/actions")
    expect(typeof mod.createModel).toBe("function")
    expect(typeof mod.getModels).toBe("function")
    expect(typeof mod.deleteModel).toBe("function")
  })

  it("exports team actions", async () => {
    const mod = await import("../../src/lib/actions")
    expect(typeof mod.addTeamMember).toBe("function")
    expect(typeof mod.removeTeamMember).toBe("function")
    expect(typeof mod.getTeamMembers).toBe("function")
  })
})
