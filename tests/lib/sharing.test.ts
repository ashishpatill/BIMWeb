import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock variables (accessible from vi.mock factories) ─────────────────
// vi.hoisted() ensures these are initialized before any vi.mock factory runs.

const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
  getKindeServerSession: vi.fn(() => ({
    getUser: mockGetUser,
  })),
}));

const mockLogAction = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/audit", () => ({
  logAction: mockLogAction,
}));

// Thenable mock that supports both .where() and .where().limit() and .innerJoin
const mockWhereResult = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockLimitResult = vi.hoisted(() => vi.fn().mockResolvedValue([]));

function createThenable() {
  return {
    limit: (n: number) => mockLimitResult(n),
    then: (
      onfulfilled: (v: unknown) => unknown,
      onrejected?: (v: unknown) => unknown,
    ) => mockWhereResult().then(onfulfilled, onrejected),
    catch: (onrejected: (v: unknown) => unknown) =>
      mockWhereResult().catch(onrejected),
    finally: (onfinally: () => void) =>
      mockWhereResult().finally(onfinally),
  };
}

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: createThenable,
        })),
        where: createThenable,
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([]),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

// ── Module under test ──────────────────────────────────────────────────────────

import { shareProject, unshareProject, getSharedProjects } from "../../src/lib/sharing";

describe("shareProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("owner can share with viewer permission", async () => {
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "actor-1" }]) // project lookup
      .mockResolvedValueOnce([]);                        // existing member check

    const result = await shareProject(1, "target@test.com", "viewer", "actor-1");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("owner can share with editor permission", async () => {
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "actor-1" }])
      .mockResolvedValueOnce([]);

    const result = await shareProject(1, "editor@test.com", "editor", "actor-1");

    expect(result.success).toBe(true);
  });

  it("non-owner cannot share", async () => {
    mockLimitResult.mockResolvedValue([{ ownerId: "real-owner" }]);

    const result = await shareProject(1, "u@t.com", "viewer", "intruder");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/only.*owner/i);
  });

  it("returns error for non-existent project", async () => {
    mockLimitResult.mockResolvedValue([]);

    const result = await shareProject(999, "u@t.com", "viewer", "actor-1");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns error if target is already a team member", async () => {
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "actor-1" }])
      .mockResolvedValueOnce([{ id: 5, projectId: 1, email: "existing@t.com" }]);

    const result = await shareProject(1, "existing@t.com", "viewer", "actor-1");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already.*member/i);
  });

  it("writes audit log entry on share", async () => {
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "actor-1" }])
      .mockResolvedValueOnce([]);

    await shareProject(1, "new@t.com", "editor", "actor-1");

    expect(mockLogAction).toHaveBeenCalledWith({
      action: "project_shared",
      actorId: "actor-1",
      targetType: "project",
      targetId: 1,
      metadata: { sharedWith: "new@t.com", permission: "editor" },
    });
  });

  it("inserts team member record for the share", async () => {
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "actor-1" }])
      .mockResolvedValueOnce([]);

    await shareProject(1, "new@t.com", "editor", "actor-1");

    const { db } = await import("@/db");
    expect(db.insert).toHaveBeenCalled();
  });

  it("returns error when db operation fails", async () => {
    mockLimitResult.mockImplementation(() => {
      throw new Error("DB out of cheese");
    });

    const result = await shareProject(1, "u@t.com", "viewer", "actor-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to share project");
  });
});

describe("unshareProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("owner can unshare a member", async () => {
    mockLimitResult
      .mockResolvedValueOnce([{ projectId: 1 }])     // find member
      .mockResolvedValueOnce([{ ownerId: "actor-1" }]); // check owner

    const result = await unshareProject(5, "actor-1");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("non-owner cannot unshare", async () => {
    mockLimitResult
      .mockResolvedValueOnce([{ projectId: 1 }])
      .mockResolvedValueOnce([{ ownerId: "real-owner" }]);

    const result = await unshareProject(5, "intruder");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/only.*owner/i);
  });

  it("returns error for non-existent member", async () => {
    mockLimitResult.mockResolvedValueOnce([]);

    const result = await unshareProject(999, "actor-1");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("writes audit log entry on unshare", async () => {
    mockLimitResult
      .mockResolvedValueOnce([{ projectId: 1 }])
      .mockResolvedValueOnce([{ ownerId: "actor-1" }]);

    await unshareProject(5, "actor-1");

    expect(mockLogAction).toHaveBeenCalledWith({
      action: "project_unshared",
      actorId: "actor-1",
      targetType: "team_member",
      targetId: 5,
    });
  });

  it("returns error when db operation fails", async () => {
    mockLimitResult.mockImplementation(() => {
      throw new Error("connection lost");
    });

    const result = await unshareProject(5, "actor-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to unshare project");
  });
});

describe("getSharedProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns shared projects for existing user", async () => {
    const sharedRows = [
      {
        project: { id: 1, name: "Tower A", ownerId: "o1" },
        role: "viewer",
      },
      {
        project: { id: 2, name: "Tower B", ownerId: "o1" },
        role: "editor",
      },
    ];

    // user lookup via .limit(1)
    mockLimitResult.mockResolvedValueOnce([{ email: "user@test.com" }]);
    // shared projects via .where() directly (no .limit())
    mockWhereResult.mockResolvedValueOnce(sharedRows);

    const result = await getSharedProjects("user-1");

    expect(result).toHaveLength(2);
    expect(result).toEqual(sharedRows);
  });

  it("returns only projects shared with this user", async () => {
    const sharedRow = [
      {
        project: { id: 1, name: "Tower A", ownerId: "o1" },
        role: "viewer",
      },
    ];
    mockLimitResult.mockResolvedValueOnce([{ email: "user@test.com" }]);
    mockWhereResult.mockResolvedValueOnce(sharedRow);

    const result = await getSharedProjects("user-1");

    expect(result).toHaveLength(1);
    expect(result[0].project.name).toBe("Tower A");
  });

  it("returns empty array for non-existent user", async () => {
    mockLimitResult.mockResolvedValueOnce([]);

    const result = await getSharedProjects("nonexistent");

    expect(result).toEqual([]);
  });

  it("returns empty array when user has no shares", async () => {
    mockLimitResult
      .mockResolvedValueOnce([{ email: "lonely@t.com" }])
      .mockResolvedValueOnce([]);

    const result = await getSharedProjects("lonely-user");

    expect(result).toEqual([]);
  });
});
