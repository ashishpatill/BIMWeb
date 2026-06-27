import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getDocuments, getEcosystemHealthForOverview } from "@/lib/actions";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DocumentsClient } from "./documents-client";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [{ getUser }] = await Promise.all([Promise.resolve(getKindeServerSession())]);
  const kindeUser = await getUser();

  const [documents, ecosystemHealth] = await Promise.all([
    getDocuments(),
    getEcosystemHealthForOverview(),
  ]);

  // Resolve the first workspace for the current user (needed for document create)
  let workspaceId: number | null = null;
  if (kindeUser?.id) {
    try {
      const userWorkspaces = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.ownerId, kindeUser.id))
        .limit(1);
      if (userWorkspaces.length > 0) {
        workspaceId = userWorkspaces[0].id;
      }
    } catch {
      // fallback — upload will show an error toast
    }
  }

  return (
    <DocumentsClient
      initialDocuments={documents}
      ecosystemHealth={ecosystemHealth as Record<string, { status: string; ok: boolean }>}
      workspaceId={workspaceId}
    />
  );
}
