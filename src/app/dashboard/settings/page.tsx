import { getDbUser } from "@/lib/actions";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();
  const dbUser = await getDbUser();

  return <SettingsClient kindeUser={kindeUser} dbUser={dbUser} />;
}
