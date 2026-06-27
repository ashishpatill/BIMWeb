# Changelog: BIMWeb

All notable changes to the `BIMWeb` repository will be documented in this file.

## [v1.0.0] - Core Platform Release

### Added
- **Core Infrastructure**: Next.js 16 App Router setup with TypeScript strict mode, Tailwind CSS v4, and shadcn/ui.
- **Database & Auth**: Neon Postgres via Drizzle ORM and Kinde OAuth authentication.
- **Dashboard & CRUD**: Complete project management, team invites, and user settings.
- **3D Viewer**: WebGL integration using `three.js` with OrbitControls, PBR materials, and glTF model loading.
- **File Uploads**: Local file storage capability integrated with the viewer.

### Changed
- Standardized documentation: Renamed `ROADMAP.md` to `IMPLEMENTATION_PLAN.md`.
- Explicitly defined the repository's role as the user-facing interface for the BIMRAG ecosystem in `README.md`.

## [v1.2.0] - UX Redesign & Gap Closure (2026-06-27)

### Added
- **UX Redesign (9 new/redesigned pages)**: Full-screen 3D viewer with IFC/glTF loading, measurement, sections, dynamic model tree, keyboard shortcuts, onboarding tour — at `/dashboard/projects/[id]/models/[modelId]`. Landing page rewrite with hero, comparison strip (BIMWeb vs LlamaParse vs Pinecone), ecosystem diagram. Overview dashboard with real stats, onboarding checklist, recent activity. Research page (`/dashboard/research`) with multi-mode search (Smart/Keyword/Semantic/Relationships), answer panel with source citations, trace timeline. Documents page (`/dashboard/documents`) with upload dropzone, pipeline status (Queued/Parsing/Indexing/Ready/Failed), indexed docs list. Platform Health (`/dashboard/health`) with 4 service cards, test query via gateway, metrics charts. API Keys management page (`/dashboard/api-keys`) with create/copy/revoke/rotate and one-time key reveal. Audit Log page (`/dashboard/audit`) with filters, expandable metadata, CSV/JSON export. Invite acceptance route (`/invite?token=`). Team page with editable roles, pending/joined status, resend/remove. Settings tabbed (Profile, Appearance, Notifications, Workspace, API Keys, Danger Zone).
- **New shared components**: `EmptyState`, `PageHeader`, `StatCard` (real data), `ConfirmDialog`, `ConnectionBadge`, `RoleBadge`, `SegmentedTabs` (URL-synced), `Kbd`, `HelpCallout`, `CommandPalette` (Cmd+K), `ThemeProvider`/`ThemeToggle`, `WorkspaceSwitcher`, `OnboardingChecklist`.
- **REST API v1 (full)**: 9 endpoint files covering projects, models, team, search, documents, audit — with shared auth middleware, per-user API key validation (SHA-256 + constant-time compare), per-key in-memory rate limiting (429 + Retry-After), scope enforcement. Schema + migration `0002` with `api_keys`, `search_history`, `documents`, `notification_preferences`, `workspaces` tables.
- **Sentry alerting**: `sentry.client.config.ts`, `src/instrumentation.ts`, Sentry wired in `audit.ts` catch block (gated by `NODE_ENV` + `SENTRY_DSN`).
- **BIMExtractClient**: 11 methods (health, pipeline, parse, graph, auto-rag, mdoc) in `src/lib/api-clients.ts`. `getEcosystemHealth()` now returns 4 services.
- **Sidebar + navigation**: Grouped with prefix-match active state, collapsible icon-rail, badges, workspace switcher, real notifications, avatar menu, functional command-palette trigger.
- **Breadcrumbs** on every page below `/dashboard`.
- **Toast feedback** on every action (sonner `Toaster`).

### Changed
- Redesigned existing pages: Overview (real stats), Projects (search/sort/view toggle, grid/table, ⋯ menu), Models (cross-project, real status, project filter), Team (editable roles, invite flow, pending/joined), Settings (tabbed, real data, no fake badges), Landing (auth-aware, demo link).
- All pages now have explicit states: loading skeleton, empty state (`EmptyState`), error (toast/inline), offline (`ConnectionBanner`), forbidden (viewer-blocked toasts).
- No fake data anywhere — every displayed value comes from a real query, renders `<Skeleton/>` while loading, or shows "—" / "Unknown".

### Tests
- Expanded from 21 tests (6 files) to **192 tests across 16 files**.
- New unit test files: `rbac.test.ts` (27), `sharing.test.ts` (17), `storage.test.ts` (15), `workspace.test.ts` (8), `api-keys.test.ts` (29), `ifc-parser.test.ts` (14), `actions.test.ts` (26), `audit.test.ts` (4).
- New RTL component tests: `empty-state.test.tsx` (6), `confirm-dialog.test.tsx` (6), `stat-card.test.tsx` (10), `segmented-tabs.test.tsx` (9).
- `api-clients.test.ts` expanded from 13 to 18 tests (added BIMExtractClient).
- `@playwright/test` installed; E2E specs designed but not yet implemented (pending live env).

### Fixed
- Removed `// TODO: alert monitoring (e.g. Sentry.captureException)` from `audit.ts` — Sentry fully wired.
- Replaced global `API_SECRET_KEY` Bearer auth with per-user API key validation against DB store.
- Removed all hardcoded/fake statuses ("99.9% uptime", "GPU Accelerated", "Normal", "Status: Joined", etc.).
- Removed silent 3D building fallback — unsupported formats now show a clear error panel.
- Build passes with 28 routes (up from previous count).

## [v1.1.0] - Production Hardening

### Added
- **Error Boundaries**: Root `src/app/error.tsx` + `src/app/dashboard/error.tsx` with glass-panel card design + retry button. 6 `loading.tsx` skeletons (root, dashboard, projects, models, team, settings).
- **Cloud File Storage**: `src/lib/storage.ts` with dual backend — local (`public/uploads/`) or S3 (`@aws-sdk/client-s3`). MIME allowlist, 100MB max, path traversal protection.
- **Email Notifications**: `src/lib/email.ts` with Resend integration (`sendWelcomeEmail`, `sendInviteEmail`, `sendProjectSharedEmail`) and dev console fallback.
- **Audit Logging**: `src/lib/audit.ts` + `audit_logs` table in Drizzle schema with `logAction()` and `getAuditLogs()`.
- **RBAC**: `src/lib/rbac.ts` with `Role` type (admin/editor/viewer) and full role hierarchy enforcement on server actions.
- **Project Sharing**: `src/lib/sharing.ts` with `shareProject()`, `unshareProject()`, `getSharedProjects()` and audit trail.
- **IFC Parsing**: `src/lib/ifc/parser.ts` + `types.ts` using `web-ifc@^0.0.46` for BIM file format support.
- **3D Tools**: `src/components/viewer/measurement-tools.ts` (raycasting distance), `section-plane.ts` (X/Y/Z clipping), and 6-layer model tree.
- **Analytics**: `src/lib/analytics/client.ts` + `server.ts` with PostHog integration.
- **Multi-Tenant Workspaces**: `src/lib/workspace.ts` + `workspaces` table with `workspace_id` foreign keys on all entities. Migration `0001` applied.
- **Public REST API v1**: `src/app/api/v1/projects/route.ts` and `models/route.ts` with Bearer auth + in-memory rate limiting.
- **Ecosystem UI**: `src/app/dashboard/search/` (Ask Agent + Direct Index tabs) and `src/app/dashboard/deployments/` (gateway health + query route) wired to BIMAgent, BIMIndex, and BIMCloud.
- **Unified Ecosystem Error Handling**: `EcosystemError` class and `fetchWithTimeout` timeout wrapper in `src/lib/api-clients.ts`.
- **Ecosystem API Clients**: `src/lib/api-clients.ts` with HTTP clients for BIMAgent, BIMCloud, BIMIndex.
- **CI/CD**: `.github/workflows/ci.yml` (lint + typecheck + build) and `cd.yml` (deploy to Vercel).

### Tests
- 21 passing Vitest tests across 6 files, including 13 real integration tests for ecosystem API clients (`tests/lib/api-clients.test.ts`) with mocked fetch, error, and timeout coverage.

### Fixed
- Resolved `lightningcss` native-binary mismatch; `next build` now passes.
