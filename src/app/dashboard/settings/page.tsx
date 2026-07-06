import { getDbUser, getNotificationPreferences } from "@/lib/actions";
import { getSessionUser } from "@/lib/session";
import { getUserWorkspaces } from "@/lib/workspace";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const kindeUser = await getSessionUser();
  const dbUser = await getDbUser();
  const preferences = await getNotificationPreferences();

  // Fetch workspaces owned by the current user
  let workspaces: Array<{
    id: number;
    name: string;
    ownerId: string;
    createdAt: Date;
  }> = [];
  if (kindeUser?.id) {
    workspaces = await getUserWorkspaces(kindeUser.id);
  }

  return (
    <SettingsClient
      kindeUser={kindeUser}
      dbUser={dbUser}
      preferences={preferences}
      workspaces={workspaces}
    />
  );
}
