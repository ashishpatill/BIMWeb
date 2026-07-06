import { isSessionAuthenticated } from "@/lib/session";
import { LandingClient } from "./landing-client";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const isSignedIn = (await isSessionAuthenticated()) ?? false;

  return <LandingClient isSignedIn={isSignedIn} />;
}
