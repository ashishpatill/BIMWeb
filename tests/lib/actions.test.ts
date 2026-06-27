import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — all external boundaries (hoisted by vitest before any import)
// ---------------------------------------------------------------------------

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn() as Mock,
    insert: vi.fn() as Mock,
    update: vi.fn() as Mock,
    delete: vi.fn() as Mock,
  },
}));

vi.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
  getKindeServerSession: vi.fn() as Mock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn() as Mock,
}));

vi.mock("@/lib/api-keys", () => ({
  generateApiKey: vi.fn() as Mock,
}));

vi.mock("@/lib/audit", () => ({
  logAction: vi.fn().mockResolvedValue(undefined) as Mock,
}));

vi.mock("@/lib/email", () => ({
  sendInviteEmail: vi.fn().mockResolvedValue({ success: true }) as Mock,
}));

vi.mock("@/lib/rbac", () => ({
  requireProjectAdminAccess: vi.fn().mockResolvedValue({ allowed: true }) as Mock,
}));

vi.mock("@/lib/api-clients", () => ({
  getEcosystemHealth: vi.fn().mockResolvedValue({
    BIMAgent: { status: "healthy", ok: true },
    BIMCloud: { status: "healthy", ok: true },
    BIMIndex: { status: "healthy", ok: true },
    BIMExtract: { status: "healthy", ok: true },
  }) as Mock,
}));

// ---------------------------------------------------------------------------
// Import mocked modules — vitest replaces with mocks because vi.mock is
// hoisted above any import.
// ---------------------------------------------------------------------------

import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { generateApiKey } from "@/lib/api-keys";

// ---------------------------------------------------------------------------
// Types for Drizzle-like chains
// ---------------------------------------------------------------------------

interface MockChain {
  from: Mock;
  where: Mock;
  limit: Mock;
  orderBy: Mock;
  leftJoin: Mock;
  then: Mock;
}

interface InsertChain {
  values: Mock;
  returning: Mock;
}

interface DeleteChain {
  where: Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSelect(returnData: unknown[] = []): MockChain {
  // The chain is both chainable and thenable so actions that await
  // `db.select().from(t).where(...)` directly (without .limit()) resolve.
  const thenable = Promise.resolve(returnData);
  const chain: MockChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnData),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    then: vi.fn((onfulfilled: (v: unknown[]) => unknown) =>
      thenable.then(onfulfilled),
    ) as unknown as Mock,
  };
  vi.mocked(db.select).mockReturnValue(chain as never);
  return chain;
}

function mockInsert(returningData: unknown[] = [{ id: 1 }]): InsertChain {
  const chain: InsertChain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returningData),
  };
  vi.mocked(db.insert).mockReturnValue(chain as never);
  return chain;
}

function mockDelete(): DeleteChain {
  const chain: DeleteChain = {
    where: vi.fn().mockResolvedValue(undefined),
  };
  vi.mocked(db.delete).mockReturnValue(chain as never);
  return chain;
}

/** Set up Kinde to return a fake authenticated user. */
function mockAuthUser(
  overrides: Partial<{
    id: string;
    email: string;
    given_name: string;
    family_name: string;
  }> = {},
): void {
  const user = {
    id: "kinde_123",
    email: "test@example.com",
    given_name: "Test",
    family_name: "User",
    ...overrides,
  };
  vi.mocked(getKindeServerSession).mockReturnValue({
    getUser: vi.fn().mockResolvedValue(user),
  } as never);
}

/** Unset Kinde user (simulates unauthenticated state). */
function mockNoAuth(): void {
  vi.mocked(getKindeServerSession).mockReturnValue({
    getUser: vi.fn().mockResolvedValue(null),
  } as never);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser();
  });

  // ======================== Exports ========================

  describe("module exports", () => {
    it("exports project actions", async () => {
      const mod = await import("../../src/lib/actions");
      expect(typeof mod.createProject).toBe("function");
      expect(typeof mod.getProjects).toBe("function");
      expect(typeof mod.deleteProject).toBe("function");
    });

    it("exports model actions", async () => {
      const mod = await import("../../src/lib/actions");
      expect(typeof mod.createModel).toBe("function");
      expect(typeof mod.getModels).toBe("function");
      expect(typeof mod.deleteModel).toBe("function");
    });

    it("exports team actions", async () => {
      const mod = await import("../../src/lib/actions");
      expect(typeof mod.addTeamMember).toBe("function");
      expect(typeof mod.removeTeamMember).toBe("function");
      expect(typeof mod.getTeamMembers).toBe("function");
    });
  });

  // ======================== Projects ========================

  describe("createProject", () => {
    it("inserts a project and returns success", async () => {
      const insertChain = mockInsert([
        { id: 1, name: "Test Project", ownerId: "kinde_123" },
      ]);

      const { createProject } = await import("../../src/lib/actions");
      const result = await createProject("Test Project", "A desc");

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      expect(result.project!.name).toBe("Test Project");

      expect(db.insert).toHaveBeenCalled();
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Test Project", ownerId: "kinde_123" }),
      );
    });

    it("returns error when not authenticated", async () => {
      mockNoAuth();

      const { createProject } = await import("../../src/lib/actions");
      const result = await createProject("X");

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not authenticated/i);
    });

    it("returns error when name is empty", async () => {
      const { createProject } = await import("../../src/lib/actions");
      const result = await createProject("  ");

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/name is required/i);
    });
  });

  describe("getProjects", () => {
    it("queries projects by ownerId and returns them", async () => {
      const mockProjects = [
        { id: 1, name: "P1", ownerId: "kinde_123" },
        { id: 2, name: "P2", ownerId: "kinde_123" },
      ];
      const selectChain = mockSelect(mockProjects);

      const { getProjects } = await import("../../src/lib/actions");
      const result = await getProjects();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("P1");
      expect(selectChain.where).toHaveBeenCalled();
    });

    it("returns empty array when not authenticated", async () => {
      mockNoAuth();

      const { getProjects } = await import("../../src/lib/actions");
      const result = await getProjects();
      expect(result).toEqual([]);
    });
  });

  describe("deleteProject", () => {
    it("deletes project when user is owner", async () => {
      mockSelect([{ id: 1, name: "Test", ownerId: "kinde_123" }]);
      const deleteChain = mockDelete();

      const { deleteProject } = await import("../../src/lib/actions");
      const result = await deleteProject(1);

      expect(result.success).toBe(true);
      expect(deleteChain.where).toHaveBeenCalled();
    });

    it("denies deletion when user is not owner", async () => {
      mockSelect([{ id: 1, name: "Test", ownerId: "other_user" }]);

      const { deleteProject } = await import("../../src/lib/actions");
      const result = await deleteProject(1);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not authorized/i);
    });
  });

  // ======================== Models ========================

  describe("createModel", () => {
    it("inserts a model and returns success", async () => {
      const insertChain = mockInsert([
        { id: 10, name: "My Model", projectId: 1 },
      ]);

      const { createModel } = await import("../../src/lib/actions");
      const result = await createModel(1, "My Model");

      expect(result.success).toBe(true);
      expect(result.model).toBeDefined();
      expect(result.model!.name).toBe("My Model");

      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ name: "My Model", projectId: 1 }),
      );
    });
  });

  describe("getModels", () => {
    it("returns models filtered by projectId", async () => {
      const mockModels = [{ id: 1, name: "M1", projectId: 5 }];
      const selectChain = mockSelect(mockModels);

      const { getModels } = await import("../../src/lib/actions");
      const result = await getModels(5);

      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe(5);
      expect(selectChain.where).toHaveBeenCalled();
    });
  });

  describe("deleteModel", () => {
    it("deletes model when user owns the project", async () => {
      const selectChain = mockSelect([]);
      selectChain.limit
        .mockResolvedValueOnce([{ id: 99, projectId: 5 }]) // model lookup
        .mockResolvedValueOnce([{ id: 5, ownerId: "kinde_123" }]); // project ownership

      const deleteChain = mockDelete();

      const { deleteModel } = await import("../../src/lib/actions");
      const result = await deleteModel(99);

      expect(result.success).toBe(true);
      expect(deleteChain.where).toHaveBeenCalled();
    });

    it("denies model deletion when user is not project owner", async () => {
      const selectChain = mockSelect([]);
      selectChain.limit
        .mockResolvedValueOnce([{ id: 99, projectId: 5 }]) // model exists
        .mockResolvedValueOnce([{ id: 5, ownerId: "stranger" }]); // not our project

      const { deleteModel } = await import("../../src/lib/actions");
      const result = await deleteModel(99);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not authorized/i);
    });
  });

  // ======================== Team ========================

  describe("addTeamMember", () => {
    it("inserts team member and returns invite token", async () => {
      const insertChain = mockInsert([
        { id: 50, projectId: 1, email: "dev@bim.io", inviteToken: "abc123" },
      ]);
      const selectChain = mockSelect([]);
      // The action calls limit twice: project name lookup, then inviter name
      selectChain.limit
        .mockResolvedValueOnce([{ name: "My Project" }])
        .mockResolvedValueOnce([
          { firstName: "Test", lastName: "User", name: null, email: "test@example.com" },
        ]);

      const { addTeamMember } = await import("../../src/lib/actions");
      const result = await addTeamMember(1, "dev@bim.io", "editor");

      expect(result.success).toBe(true);
      expect(result.member).toBeDefined();
      // inviteToken is from crypto.randomBytes — assert it's a hex string (64 chars)
      expect(result.inviteToken).toMatch(/^[0-9a-f]{64}$/);
      // The DB row stores the same token
      expect(result.member!.inviteToken).toBe("abc123");
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ email: "dev@bim.io", role: "editor" }),
      );
    });
  });

  describe("removeTeamMember", () => {
    it("removes team member when user is owner", async () => {
      const selectChain = mockSelect([]);
      selectChain.limit
        .mockResolvedValueOnce([{ id: 10, projectId: 5 }]) // member exists
        .mockResolvedValueOnce([{ id: 5, ownerId: "kinde_123" }]); // ownership check

      const deleteChain = mockDelete();

      const { removeTeamMember } = await import("../../src/lib/actions");
      const result = await removeTeamMember(10);

      expect(result.success).toBe(true);
      expect(deleteChain.where).toHaveBeenCalled();
    });

    it("denies removal when user is not project owner", async () => {
      const selectChain = mockSelect([]);
      selectChain.limit
        .mockResolvedValueOnce([{ id: 10, projectId: 5 }])
        .mockResolvedValueOnce([{ id: 5, ownerId: "stranger" }]);

      const { removeTeamMember } = await import("../../src/lib/actions");
      const result = await removeTeamMember(10);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not authorized/i);
    });
  });

  // ======================== API Keys ========================

  describe("createApiKey", () => {
    it("generates key, stores hash, returns plaintext once", async () => {
      vi.mocked(generateApiKey).mockReturnValue({
        plaintext: "sk_abc123...secret",
        prefix: "sk_abc123",
        keyHash: "sha256hash...",
      });

      const insertChain = mockInsert([{ id: 77 }]);

      const { createApiKey } = await import("../../src/lib/actions");
      const result = await createApiKey("My Key", ["projects:read"], 100);

      expect(result.success).toBe(true);
      expect(
        (result as { success: true; plaintext: string }).plaintext,
      ).toBeDefined();

      // Verify hash is stored, not plaintext
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          keyHash: "sha256hash...",
          label: "My Key",
          prefix: "sk_abc123",
        }),
      );
      // Plaintext should NOT be in the DB insert args
      const callArgs = (insertChain.values as Mock).mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("plaintext");
    });

    it("returns error when label is empty", async () => {
      const { createApiKey } = await import("../../src/lib/actions");
      const result = await createApiKey("");

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/label is required/i);
    });
  });

  describe("getApiKeys", () => {
    it("returns keys without keyHash", async () => {
      const mockKeys = [
        {
          id: 1,
          prefix: "sk_a1b2",
          label: "Dev Key",
          scopes: ["projects:read"],
          rateLimitPerMin: 60,
          lastUsedAt: null,
          revokedAt: null,
          createdAt: new Date(),
        },
      ];
      const selectChain = mockSelect(mockKeys);
      // getApiKeys uses orderBy
      selectChain.orderBy = vi.fn().mockReturnThis();

      const { getApiKeys } = await import("../../src/lib/actions");
      const result = await getApiKeys();

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe("Dev Key");
      expect(result[0].prefix).toBe("sk_a1b2");
      // keyHash MUST NOT be present
      expect(result[0]).not.toHaveProperty("keyHash");
    });
  });

  // ======================== Edge: no auth ========================

  describe("error handling", () => {
    it.each([
      ["createProject", async () => {
        const m = await import("../../src/lib/actions");
        return m.createProject("X");
      }],
      ["createModel", async () => {
        const m = await import("../../src/lib/actions");
        return m.createModel(1, "X");
      }],
      ["deleteProject", async () => {
        const m = await import("../../src/lib/actions");
        return m.deleteProject(1);
      }],
      ["deleteModel", async () => {
        const m = await import("../../src/lib/actions");
        return m.deleteModel(1);
      }],
      ["addTeamMember", async () => {
        const m = await import("../../src/lib/actions");
        return m.addTeamMember(1, "x@y.com");
      }],
      ["removeTeamMember", async () => {
        const m = await import("../../src/lib/actions");
        return m.removeTeamMember(1);
      }],
    ] as const)("%s returns error when not authenticated", async (_, action) => {
      mockNoAuth();

      const result = await action();
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
      expect(String(result.error)).toMatch(/not authenticated/i);
    });
  });
});
