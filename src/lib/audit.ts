import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import * as Sentry from "@sentry/nextjs";

export interface AuditLogEntry {
  action: string;
  actorId: string;
  targetType: string;
  targetId: string | number;
  metadata?: Record<string, unknown>;
}

export async function logAction(entry: AuditLogEntry): Promise<void> {
  const user = await getSessionUser();
  const effectiveActorId = user?.id ?? entry.actorId;

  try {
    await db.insert(auditLogs).values({
      action: entry.action,
      actorId: effectiveActorId,
      targetType: entry.targetType,
      targetId: String(entry.targetId),
      metadata: entry.metadata,
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
    if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: { action: entry.action, targetType: entry.targetType, targetId: entry.targetId },
      });
    }
  }
}

export async function getAuditLogs(limit = 50) {
  const user = await getSessionUser();
  if (!user?.id) {
    throw new Error("Unauthorized: authentication required");
  }

  try {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.actorId, user.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}
