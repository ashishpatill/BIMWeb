import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
  const migrationTag = "0002_narrow_lady_ursula";

  const journal = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'drizzle'
        AND table_name = '__drizzle_migrations'
    ) AS exists
  `;

  let appliedViaMigrate = false;
  if (journal[0]?.exists) {
    const rows = await sql`
      SELECT hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC
    `;
    if (rows.length > 0) {
      console.log("drizzle.__drizzle_migrations entries:", rows.length);
      appliedViaMigrate = rows.some((r) => String(r.hash).includes("0002") || String(r.hash).includes("narrow_lady"));
    } else {
      console.log("drizzle.__drizzle_migrations exists but is empty.");
    }
  } else {
    console.log("No drizzle.__drizzle_migrations table (migrate not run yet, or schema was pushed).");
  }

  const workspace = await sql`
    SELECT to_regclass('public.workspaces') AS reg
  `;
  const workspacesLive = workspace[0]?.reg !== null;

  if (workspacesLive) {
    console.log("status: APPLIED — public.workspaces exists (0002 schema present).");
    if (!appliedViaMigrate) {
      console.log("note: schema may have been applied via drizzle-kit push rather than migrate.");
    }
    process.exit(0);
  }

  console.log(`status: PENDING — public.workspaces missing; apply ${migrationTag} with:`);
  console.log("  pnpm db:migrate");
  console.log("Review SQL first:");
  console.log(`  src/db/migrations/${migrationTag}.sql`);
  process.exit(2);
}

main()
  .catch((err) => {
    console.error("check failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
