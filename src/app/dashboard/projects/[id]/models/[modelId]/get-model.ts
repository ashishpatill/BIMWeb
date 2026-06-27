import "server-only";

import { db } from "@/db";
import { models } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface ModelRecord {
  id: number;
  name: string;
  description: string | null;
  projectId: number;
  workspaceId: number | null;
  fileSize: string;
  fileUrl: string | null;
  status: string;
  createdAt: Date;
}

export async function getModelById(
  modelId: number,
  projectId: number
): Promise<ModelRecord | null> {
  try {
    const result = await db
      .select()
      .from(models)
      .where(
        and(eq(models.id, modelId), eq(models.projectId, projectId))
      )
      .limit(1);
    return result[0] || null;
  } catch {
    return null;
  }
}
