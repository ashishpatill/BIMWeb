import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSessionUser,
  isSessionAuthenticated,
  isE2eBypass,
} from "@/lib/session";

describe("session E2E bypass", () => {
  const original = process.env.E2E_TEST_BYPASS;

  beforeEach(() => {
    delete process.env.E2E_TEST_BYPASS;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.E2E_TEST_BYPASS;
    } else {
      process.env.E2E_TEST_BYPASS = original;
    }
  });

  it("isE2eBypass is false by default", () => {
    expect(isE2eBypass()).toBe(false);
  });

  it("returns synthetic user when bypass enabled", async () => {
    process.env.E2E_TEST_BYPASS = "true";
    expect(isE2eBypass()).toBe(true);
    expect(await isSessionAuthenticated()).toBe(true);
    const user = await getSessionUser();
    expect(user).toMatchObject({
      id: "e2e_kinde_user",
      email: "e2e@test.bimrag.local",
    });
  });
});
