import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  },
}));

vi.mock("@/db/schema", () => ({
  auditLogs: {},
}));

vi.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
  getKindeServerSession: vi.fn().mockReturnValue({
    getUser: vi.fn().mockResolvedValue({ id: "test-user" }),
  }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("Audit Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exports logAction function", async () => {
    const mod = await import("../../src/lib/audit");
    expect(typeof mod.logAction).toBe("function");
  });

  it("exports getAuditLogs function", async () => {
    const mod = await import("../../src/lib/audit");
    expect(typeof mod.getAuditLogs).toBe("function");
  });

  it("calls Sentry.captureException on DB failure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SENTRY_DSN", "https://test@sentry.io/test");

    const { db } = await import("@/db");
    const mockError = new Error("DB connection failed");
    const valuesMock = vi.fn().mockRejectedValue(mockError);
    const insertMock = db.insert as ReturnType<typeof vi.fn>;
    insertMock.mockReturnValue({ values: valuesMock });

    const { logAction } = await import("../../src/lib/audit");
    await logAction({
      action: "test_action",
      actorId: "actor-1",
      targetType: "project",
      targetId: "42",
    });

    const Sentry = await import("@sentry/nextjs");
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(mockError, {
      extra: {
        action: "test_action",
        targetType: "project",
        targetId: "42",
      },
    });
  });

  it("does NOT call Sentry.captureException in dev mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SENTRY_DSN", "https://test@sentry.io/test");

    const { db } = await import("@/db");
    const mockError = new Error("DB connection failed");
    const valuesMock = vi.fn().mockRejectedValue(mockError);
    const insertMock = db.insert as ReturnType<typeof vi.fn>;
    insertMock.mockReturnValue({ values: valuesMock });

    const { logAction } = await import("../../src/lib/audit");
    await logAction({
      action: "dev_test",
      actorId: "actor-1",
      targetType: "project",
      targetId: "99",
    });

    const Sentry = await import("@sentry/nextjs");
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
