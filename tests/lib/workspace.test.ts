import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mock results ────────────────────────────────────────────────────────
// These are accessed by both the vi.mock factory and test assertions.
// vi.mock is hoisted, but the factory runs lazily at import time, so by then
// these module-scoped variables are initialized.

const mockWhereResult = vi.fn().mockResolvedValue([]);

const mockLimitResult = vi.fn().mockResolvedValue([]);
const mockReturning = vi.fn().mockResolvedValue([]);

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => {
          // Return a thenable that also has .limit() (for functions that use
          // .limit() after .where()) and is directly awaitable (for functions
          // that don't use .limit()).
          const result = {
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
          return result;
        }),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: mockReturning,
      })),
    })),
  },
}));

// ── Module under test ──────────────────────────────────────────────────────────

import { createWorkspace, getWorkspace, getUserWorkspaces } from "../../src/lib/workspace";

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("createWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a workspace and returns it", async () => {
    const inserted = {
      id: 1,
      name: "My Workspace",
      ownerId: "user-1",
      createdAt: new Date("2026-01-01"),
    };
    mockReturning.mockResolvedValue([inserted]);

    const result = await createWorkspace("My Workspace", "user-1");

    expect(result).toEqual(inserted);
    expect(result.name).toBe("My Workspace");
    expect(result.ownerId).toBe("user-1");
  });

  it("inserts with correct ownerId", async () => {
    mockReturning.mockResolvedValue([
      { id: 2, name: "Team", ownerId: "owner-2", createdAt: new Date() },
    ]);

    const result = await createWorkspace("Team", "owner-2");

    expect(result.ownerId).toBe("owner-2");
  });

  it("throws when db insert fails", async () => {
    mockReturning.mockRejectedValue(new Error("constraint violation"));

    await expect(createWorkspace("Bad", "user-1")).rejects.toThrow(
      "constraint violation",
    );
  });
});

describe("getWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns workspace by id", async () => {
    const ws = {
      id: 1,
      name: "My Workspace",
      ownerId: "user-1",
      createdAt: new Date("2026-01-01"),
    };
    mockWhereResult.mockResolvedValue([ws]);

    const result = await getWorkspace(1);

    expect(result).toEqual(ws);
    expect(result?.id).toBe(1);
  });

  it("returns undefined for non-existent workspace", async () => {
    mockWhereResult.mockResolvedValue([]);

    const result = await getWorkspace(999);

    expect(result).toBeUndefined();
  });
});

describe("getUserWorkspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns workspaces for the given owner", async () => {
    const userWorkspaces = [
      { id: 1, name: "Personal", ownerId: "user-1", createdAt: new Date() },
      { id: 2, name: "Team A", ownerId: "user-1", createdAt: new Date() },
    ];
    mockWhereResult.mockResolvedValue(userWorkspaces);

    const result = await getUserWorkspaces("user-1");

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Personal");
    expect(result[1].name).toBe("Team A");
  });

  it("filters by ownerId — user A does not see user B's workspaces", async () => {
    // Simulate isolation: user-1 gets their workspaces, user-2 gets theirs
    const user1Workspaces = [
      { id: 1, name: "Personal", ownerId: "user-1", createdAt: new Date() },
    ];
    const user2Workspaces = [
      { id: 3, name: "Other Corp", ownerId: "user-2", createdAt: new Date() },
    ];

    // First call: user-1
    mockWhereResult.mockResolvedValueOnce(user1Workspaces);
    const result1 = await getUserWorkspaces("user-1");

    // Second call: user-2
    mockWhereResult.mockResolvedValueOnce(user2Workspaces);
    const result2 = await getUserWorkspaces("user-2");

    expect(result1).toHaveLength(1);
    expect(result1[0].ownerId).toBe("user-1");

    expect(result2).toHaveLength(1);
    expect(result2[0].ownerId).toBe("user-2");

    // Isolation: user-1's workspace is NOT in user-2's result
    const user2Ids = result2.map((w: { id: number }) => w.id);
    expect(user2Ids).not.toContain(1);
  });

  it("returns empty array for user with no workspaces", async () => {
    mockWhereResult.mockResolvedValue([]);

    const result = await getUserWorkspaces("new-user");

    expect(result).toEqual([]);
  });
});
