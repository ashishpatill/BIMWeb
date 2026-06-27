import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mock results ────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
  getKindeServerSession: vi.fn(() => ({
    getUser: mockGetUser,
  })),
}));

// Both .where() and .where().limit() patterns need to work.
// .where() returns a thenable that also has .limit().
const mockWhereResult = vi.fn().mockResolvedValue([]);
const mockLimitResult = vi.fn().mockResolvedValue([]);

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => {
          const thenable = {
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
          return thenable;
        }),
      })),
    })),
  },
}));

// ── Module under test ──────────────────────────────────────────────────────────

import {
  hasMinRole,
  getUserRole,
  requireRole,
  requireProjectAccess,
  requireProjectWriteAccess,
  requireProjectAdminAccess,
} from "../../src/lib/rbac";

describe("hasMinRole", () => {
  it("admin >= admin returns true", () => {
    expect(hasMinRole("admin", "admin")).toBe(true);
  });

  it("admin >= editor returns true", () => {
    expect(hasMinRole("admin", "editor")).toBe(true);
  });

  it("admin >= viewer returns true", () => {
    expect(hasMinRole("admin", "viewer")).toBe(true);
  });

  it("editor >= viewer returns true", () => {
    expect(hasMinRole("editor", "viewer")).toBe(true);
  });

  it("editor < admin returns false", () => {
    expect(hasMinRole("editor", "admin")).toBe(false);
  });

  it("viewer < editor returns false", () => {
    expect(hasMinRole("viewer", "editor")).toBe(false);
  });

  it("viewer < admin returns false", () => {
    expect(hasMinRole("viewer", "admin")).toBe(false);
  });

  it("equal roles return true", () => {
    expect(hasMinRole("viewer", "viewer")).toBe(true);
    expect(hasMinRole("editor", "editor")).toBe(true);
    expect(hasMinRole("admin", "admin")).toBe(true);
  });
});

describe("getUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns admin when user is project owner", async () => {
    mockLimitResult.mockResolvedValue([{ ownerId: "user-1" }]);

    const role = await getUserRole("user-1", 1);

    expect(role).toBe("admin");
  });

  it("returns viewer for team member with viewer role", async () => {
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "other-owner" }])
      .mockResolvedValueOnce([{ email: "u@t.com" }])
      .mockResolvedValueOnce([{ role: "viewer" }]);

    const role = await getUserRole("user-viewer", 1);

    expect(role).toBe("viewer");
  });

  it("returns editor for team member with editor role", async () => {
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "other-owner" }])
      .mockResolvedValueOnce([{ email: "ed@t.com" }])
      .mockResolvedValueOnce([{ role: "editor" }]);

    const role = await getUserRole("user-editor", 1);

    expect(role).toBe("editor");
  });

  it("returns null when user has no db record", async () => {
    mockLimitResult
      .mockResolvedValueOnce([])       // project query: no match
      .mockResolvedValueOnce([]);      // user query: empty

    const role = await getUserRole("unknown-user", 1);

    expect(role).toBeNull();
  });

  it("returns null when user is not a team member", async () => {
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "other-owner" }])
      .mockResolvedValueOnce([{ email: "stranger@t.com" }])
      .mockResolvedValueOnce([]);      // teamMembers: no match

    const role = await getUserRole("stranger", 1);

    expect(role).toBeNull();
  });
});

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin user when requiring admin role", async () => {
    mockGetUser.mockResolvedValue({ id: "user-1" });
    mockLimitResult.mockResolvedValue([{ ownerId: "user-1" }]);

    const result = await requireRole(42, "admin");
    expect(result.allowed).toBe(true);
    expect(result.userId).toBe("user-1");
  });

  it("allows editor when requiring editor role", async () => {
    mockGetUser.mockResolvedValue({ id: "user-editor" });
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "owner-1" }])
      .mockResolvedValueOnce([{ email: "ed@t.com" }])
      .mockResolvedValueOnce([{ role: "editor" }]);

    const result = await requireRole(42, "editor");
    expect(result.allowed).toBe(true);
    expect(result.userId).toBe("user-editor");
  });

  it("denies viewer when requiring admin role", async () => {
    mockGetUser.mockResolvedValue({ id: "user-viewer" });
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "owner-1" }])
      .mockResolvedValueOnce([{ email: "vw@t.com" }])
      .mockResolvedValueOnce([{ role: "viewer" }]);

    const result = await requireRole(42, "admin");
    expect(result.allowed).toBe(false);
    expect(result.userId).toBe("user-viewer");
  });

  it("denies non-member user", async () => {
    mockGetUser.mockResolvedValue({ id: "stranger" });
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "owner-1" }])
      .mockResolvedValueOnce([{ email: "s@t.com" }])
      .mockResolvedValueOnce([]); // not a team member

    const result = await requireRole(42, "viewer");
    expect(result.allowed).toBe(false);
    expect(result.userId).toBe("stranger");
  });

  it("denies unauthenticated user (null)", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await requireRole(42, "viewer");
    expect(result.allowed).toBe(false);
    expect(result.userId).toBe("");
  });

  it("denies user without id", async () => {
    mockGetUser.mockResolvedValue({});

    const result = await requireRole(42, "viewer");
    expect(result.allowed).toBe(false);
    expect(result.userId).toBe("");
  });
});

describe("requireProjectAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows viewer-level access for owner", async () => {
    mockGetUser.mockResolvedValue({ id: "owner-1" });
    mockLimitResult.mockResolvedValue([{ ownerId: "owner-1" }]);

    const result = await requireProjectAccess(1);
    expect(result.allowed).toBe(true);
  });

  it("allows viewer-level access for member with viewer role", async () => {
    mockGetUser.mockResolvedValue({ id: "u1" });
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "o1" }])
      .mockResolvedValueOnce([{ email: "u@t.com" }])
      .mockResolvedValueOnce([{ role: "viewer" }]);

    const result = await requireProjectAccess(1);
    expect(result.allowed).toBe(true);
  });

  it("denies non-member access", async () => {
    mockGetUser.mockResolvedValue({ id: "stranger" });
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "o1" }])
      .mockResolvedValueOnce([{ email: "s@t.com" }])
      .mockResolvedValueOnce([]);

    const result = await requireProjectAccess(1);
    expect(result.allowed).toBe(false);
  });
});

describe("requireProjectWriteAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows editor write access", async () => {
    mockGetUser.mockResolvedValue({ id: "user-editor" });
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "owner-1" }])
      .mockResolvedValueOnce([{ email: "ed@t.com" }])
      .mockResolvedValueOnce([{ role: "editor" }]);

    const result = await requireProjectWriteAccess(1);
    expect(result.allowed).toBe(true);
  });

  it("blocks viewer write access", async () => {
    mockGetUser.mockResolvedValue({ id: "user-viewer" });
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "owner-1" }])
      .mockResolvedValueOnce([{ email: "vw@t.com" }])
      .mockResolvedValueOnce([{ role: "viewer" }]);

    const result = await requireProjectWriteAccess(1);
    expect(result.allowed).toBe(false);
  });
});

describe("requireProjectAdminAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin access for owner", async () => {
    mockGetUser.mockResolvedValue({ id: "owner-1" });
    mockLimitResult.mockResolvedValue([{ ownerId: "owner-1" }]);

    const result = await requireProjectAdminAccess(1);
    expect(result.allowed).toBe(true);
  });

  it("blocks editor admin access", async () => {
    mockGetUser.mockResolvedValue({ id: "user-editor" });
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "owner-1" }])
      .mockResolvedValueOnce([{ email: "ed@t.com" }])
      .mockResolvedValueOnce([{ role: "editor" }]);

    const result = await requireProjectAdminAccess(1);
    expect(result.allowed).toBe(false);
  });

  it("blocks viewer admin access", async () => {
    mockGetUser.mockResolvedValue({ id: "user-viewer" });
    mockLimitResult
      .mockResolvedValueOnce([{ ownerId: "owner-1" }])
      .mockResolvedValueOnce([{ email: "vw@t.com" }])
      .mockResolvedValueOnce([{ role: "viewer" }]);

    const result = await requireProjectAdminAccess(1);
    expect(result.allowed).toBe(false);
  });
});
