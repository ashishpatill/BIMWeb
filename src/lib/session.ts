/**
 * Session helpers — Kinde in production, E2E bypass when E2E_TEST_BYPASS=true.
 */

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export type SessionUser = {
  id: string;
  email: string | null;
  given_name?: string | null;
  family_name?: string | null;
};

export function isE2eBypass(): boolean {
  return process.env.E2E_TEST_BYPASS === "true";
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isE2eBypass()) {
    return {
      id: process.env.E2E_TEST_USER_ID || "e2e_kinde_user",
      email: process.env.E2E_TEST_USER_EMAIL || "e2e@test.bimrag.local",
      given_name: "E2E",
      family_name: "Tester",
    };
  }

  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user?.id) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    given_name: user.given_name,
    family_name: user.family_name,
  };
}

export async function isSessionAuthenticated(): Promise<boolean> {
  if (isE2eBypass()) return true;
  const { isAuthenticated } = getKindeServerSession();
  return isAuthenticated();
}
