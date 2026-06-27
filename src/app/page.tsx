import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LandingClient } from "./landing-client";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const { isAuthenticated } = getKindeServerSession();
  const isSignedIn = (await isAuthenticated()) ?? false;

  return <LandingClient isSignedIn={isSignedIn} />;
}
