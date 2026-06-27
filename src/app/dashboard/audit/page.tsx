import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db } from "@/db";
import { auditLogs, users, projects } from "@/db/schema";
import { eq, desc, like, and, gte, lte, sql } from "drizzle-orm";
import { AuditClient } from "./audit-client";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;

interface AuditSearchParams {
  actor?: string;
  action?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  offset?: string;
}

async function fetchAuditData(
  params: AuditSearchParams,
  limit: number,
  offset: number,
) {
  const conditions: (ReturnType<typeof eq> | ReturnType<typeof like> | ReturnType<typeof gte> | ReturnType<typeof lte> | ReturnType<typeof and> | ReturnType<typeof sql>)[] = [];

  // Actor filter (search by name or email via users table)
  if (params.actor && params.actor.trim() !== "") {
    const matchingUsers = await db
      .select({ kindeId: users.kindeId })
      .from(users)
      .where(
        sql`${users.name} ILIKE ${`%${params.actor.trim()}%`} OR ${users.email} ILIKE ${`%${params.actor.trim()}%`} OR ${users.firstName} ILIKE ${`%${params.actor.trim()}%`} OR ${users.lastName} ILIKE ${`%${params.actor.trim()}%`}`,
      );
    const matchingIds = matchingUsers.map((u) => u.kindeId);
    if (matchingIds.length > 0) {
      conditions.push(sql`${auditLogs.actorId} = ANY(${matchingIds}::text[])`);
    } else {
      conditions.push(sql`1=0`);
    }
  }

  // Action filter (plain text search on action column)
  if (params.action && params.action.trim() !== "") {
    conditions.push(like(auditLogs.action, `%${params.action.trim()}%`));
  }

  // Target type filter
  if (params.targetType && params.targetType.trim() !== "") {
    conditions.push(eq(auditLogs.targetType, params.targetType.trim()));
  }

  // Date range
  if (params.dateFrom && params.dateFrom.trim() !== "") {
    conditions.push(gte(auditLogs.createdAt, new Date(params.dateFrom)));
  }
  if (params.dateTo && params.dateTo.trim() !== "") {
    const endDate = new Date(params.dateTo);
    endDate.setDate(endDate.getDate() + 1);
    conditions.push(lte(auditLogs.createdAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, userRows, projectRows, countResult] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({
        kindeId: users.kindeId,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users),
    db
      .select({
        id: projects.id,
        name: projects.name,
      })
      .from(projects)
      .limit(200),
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause)
      .then((r) => Number(r[0]?.count ?? 0)),
  ]);

  return { rows, userRows, projectRows, countResult };
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<AuditSearchParams>;
}) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user?.id) {
    return <AuditClient auditLogs={[]} users={[]} projects={[]} error="Not authenticated" />;
  }

  const params = await searchParams;
  const limit = DEFAULT_LIMIT;
  const offset = params.offset ? Number(params.offset) : 0;

  let data: Awaited<ReturnType<typeof fetchAuditData>> | null = null;
  try {
    data = await fetchAuditData(params, limit, offset);
  } catch (err) {
    console.error("Error loading audit logs:", err);
  }

  if (!data) {
    return (
      <AuditClient
        auditLogs={[]}
        users={[]}
        projects={[]}
        error="Failed to load audit logs. Please try again."
      />
    );
  }

  return (
    <AuditClient
      auditLogs={data.rows}
      users={data.userRows}
      projects={data.projectRows}
      totalCount={data.countResult}
      currentOffset={offset}
      limit={limit}
      filters={{
        actor: params.actor ?? "",
        action: params.action ?? "",
        targetType: params.targetType ?? "",
        dateFrom: params.dateFrom ?? "",
        dateTo: params.dateTo ?? "",
      }}
    />
  );
}
