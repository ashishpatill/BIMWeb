#!/usr/bin/env bash
# Verify Neon migration 0002 status (does not apply migrations).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MIGRATION_TAG="0002_narrow_lady_ursula"
MIGRATION_FILE="src/db/migrations/${MIGRATION_TAG}.sql"

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "error: missing migration file: $MIGRATION_FILE" >&2
  exit 1
fi

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set."
  echo ""
  echo "Migration ${MIGRATION_TAG} is committed in this repo but not verified against a database."
  echo "Steps:"
  echo "  1. cp .env.local.example .env.local"
  echo "  2. Set DATABASE_URL to your Neon connection string"
  echo "  3. Apply: pnpm db:migrate   (or pnpm db:push after reviewing SQL)"
  echo "  4. Re-run: ./scripts/check-migration.sh"
  exit 1
fi

echo "Checking database for migration ${MIGRATION_TAG} markers..."
pnpm exec tsx scripts/check-migration-status.ts
