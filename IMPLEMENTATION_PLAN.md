# Implementation Plan: BIMWeb

**Last updated: 2026-06-27** — All 14 TASKS.md items complete. UX redesign shipped across all pages. 192 tests passing. Migration `0002` generated (not pushed). All gaps closed except E2E tests and DB migration.

## 🚀 Completed

### Phase 1 — Core Infrastructure
- [x] Next.js 16 App Router setup with TypeScript strict mode
- [x] Tailwind CSS v4 + shadcn/ui component library
- [x] Neon Postgres database with Drizzle ORM and migrations
- [x] Kinde OAuth authentication with user sync
- [x] Dark theme with glass-morphism design system

### Phase 2 — Dashboard & CRUD
- [x] Dashboard overview with live database stats
- [x] Project list, create, edit, delete with search
- [x] Model upload with real file storage (local + S3)
- [x] Team member invite and role management
- [x] User settings and platform infrastructure display
- [x] Responsive sidebar and top navigation
- [x] Breadcrumbs on every nested page
- [x] Toast feedback (sonner) on every action
- [x] Loading skeletons, empty states, error boundaries on all pages

### Phase 3 — 3D Viewer
- [x] Full-screen viewer route at `/dashboard/projects/[id]/models/[modelId]`
- [x] glTF + IFC (web-ifc) model loading with real progress
- [x] Measurement tools (raycasting, floating labels, panel)
- [x] Section planes (multiple, axis lock, slider control)
- [x] Dynamic model tree (real loaded geometry, not hardcoded layers)
- [x] IFC classification grouping (IfcWall/IfcSlab etc.)
- [x] Labeled toolbar with tooltips + aria-labels
- [x] Keyboard shortcuts (O/P/M/S/T/R/F/Esc/H)
- [x] Screenshot, fullscreen toggle
- [x] Onboarding tour (first-visit 3-step)
- [x] States: loading/progress, ready, parsing-ifc, unsupported-format, webgl-unsupported, error, empty
- [x] No silent fallback — unsupported formats show clear error

### Phase 4 — Advanced Features
- [x] Project detail page with tabbed layout (models, documents, team, insights, settings)
- [x] Delete/edit actions for projects, models, team members
- [x] RBAC checks on server actions (`rbac.ts` with admin/editor/viewer) — 27 unit tests
- [x] File upload endpoint with local + S3 storage abstraction
- [x] Audit logging (`audit.ts` + `audit_logs` table) — Sentry wired
- [x] Email notifications (Resend with dev fallback)
- [x] Error boundaries (root + dashboard) and loading skeletons
- [x] Cloud file storage (S3 via `@aws-sdk/client-s3`)
- [x] Project sharing + activity feed — 17 unit tests
- [x] IFC parsing (`web-ifc` integration) — 14 unit tests
- [x] 3D measurement tools + section planes + model tree
- [x] Analytics (PostHog client + server)
- [x] Multi-tenant workspaces (`workspace.ts` + `workspaces` table) — 8 unit tests
- [x] Ecosystem API clients (BIMAgent, BIMCloud, BIMIndex, BIMExtract)
- [x] Unified ecosystem error handling (`EcosystemError`, `fetchWithTimeout`)

### Phase 5 — Test Coverage Expansion
- [x] **api-clients unit tests** — 18 tests (BIMAgent/Cloud/Index/Extract clients)
- [x] **rbac tests** — 27 tests covering role hierarchy, access control
- [x] **sharing tests** — 17 tests for share/unshare/isolation
- [x] **storage tests** — 15 tests for local/S3/security
- [x] **workspace tests** — 8 tests for workspace isolation
- [x] **api-keys tests** — 29 tests for hashing/validation/scopes
- [x] **ifc-parser tests** — 14 tests (mocked web-ifc)
- [x] **actions tests** — 26 tests with mocked DB + Kinde
- [x] **audit tests** — 4 tests including Sentry mock
- [x] **Component tests** — 31 RTL tests (EmptyState, ConfirmDialog, StatCard, SegmentedTabs)
- [ ] **E2E tests** — Playwright dep installed, 12 journeys designed; no config/specs yet (pending live env)

### Phase 6 — API Hardening
- [x] **Per-user API key validation table** — `api_keys` table with SHA-256 hashed keys + constant-time compare
- [x] **Full v1 endpoint coverage** — 9 routes covering projects, models, team, search, documents, audit
- [x] **Per-key rate limiting** — in-memory map by key prefix; 429 + Retry-After
- [x] **Shared auth middleware** — `_auth.ts` with scope enforcement
- [x] **OpenAPI 3.1 schema** (1275 lines, 18 operationIds)
- [x] **Scalar UI** at `/api/docs` — interactive API reference

### Phase 7 — Ecosystem Wiring
- [x] **Research page** — `/dashboard/research` with multi-mode search (Smart/Keyword/Semantic/Relationships)
- [x] **Documents page** — `/dashboard/documents` with dropzone, pipeline status, indexed list
- [x] **Platform Health page** — `/dashboard/health` with 4 service cards, test query, metrics, circuit breaker
- [x] **BIMExtractClient** — 11 methods (health, pipeline, parse, graph, auto-rag, mdoc)
- [x] **4-service `getEcosystemHealth()`** — BIMAgent, BIMCloud, BIMIndex, BIMExtract
- [x] **Offline handling** — `ConnectionBanner` + `./start-platform.sh` instructions
- [x] **Integration tests** — 18 api-clients tests with mocked fetch

### Phase 8 — Production Polish
- [x] **Sentry alerting** in `audit.ts` — wired with `Sentry.captureException` (gated NODE_ENV + SENTRY_DSN)
- [x] **instrumentation.ts** + **sentry.client.config.ts** — both created
- [ ] **Real-time updates** for shared projects (WebSocket/SSE) — deferred
- [ ] **Bulk import** for projects/models — deferred
- [ ] **Export** project data — deferred (audit page has CSV/JSON export)
- [x] **Notification preferences UI** — implemented in Settings tab

## 🚀 UX Redesign (Waves 1–5) — Completed

Following `REDESIGN_PLAN.md`, the full UX redesign was executed across 5 parallel waves:

### Wave 1 — Foundation
- Design system components: EmptyState, PageHeader, StatCard, ConfirmDialog, ConnectionBadge, RoleBadge, SegmentedTabs, Kbd, HelpCallout, CommandPalette
- Theme toggle (light/dark/system), not-found pages, globals.css chart colors
- Schema migration `0002` (5 new tables + column alters)
- Server actions for all new features (api-keys, search history, documents, notifications, onboarding, team role updates, ecosystem health)
- Full-screen viewer with IFC/measurement/sections/tree
- BIMExtractClient ecosystem client

### Wave 2 — Pages
- Sidebar + top-nav + workspace switcher (grouped nav, prefix-active, badges, collapsible icon-rail)
- Overview (real stats, onboarding, audit-driven activity, health summary, quick actions)
- Projects (search/sort/view-toggle, grid/table, 5-action ⋯ menu, create/edit/delete dialogs)
- Project detail (URL-synced tabs, role-gated, contextual upload, viewer link, share)
- Models (cross-project, filter by project, real status, upload with project selector)
- Research (multi-mode, answer+sources, trace timeline, history sidebar)
- Documents (dropzone, pipeline stages, indexed docs, re-run/delete)
- Team (editable roles, invite dialog, acceptance route, pending/joined status)
- Settings (Profile/Appearance/Notifications/Workspace/API Keys/Danger Zone)
- API Keys (create/copy/revoke/rotate, one-time reveal, docs links)
- Audit (filters, expandable metadata, CSV/JSON export, pagination)
- Health (4 service cards, test query, metrics, circuit breaker, start-instructions)
- Landing (hero, 3-step, 6-feature grid, comparison strip, ecosystem diagram)

### Wave 3 — REST API Hardening
- Per-user API key validation via `api_keys` table (SHA-256 + constant-time)
- Full v1 endpoints (9 routes with shared auth middleware)
- Per-key rate limiting (in-memory, upgrade to Redis noted)

### Wave 4 — Tests
- 192 tests across 16 files (10 lib unit + 4 RTL component + 2 smoke)
- Missing: Playwright E2E (dep installed, no config/specs yet)

### Wave 5 — Polish & Docs
- Sentry alerting in audit.ts, instrumentation.ts, sentry.client.config.ts
- Docs updated: TASKS.md, CHANGELOG.md, IMPLEMENTATION_PLAN.md, README.md, REDESIGN_BUILD_PLAN.md §7

## 📋 Remaining

| Item | Priority | Notes |
|------|----------|-------|
| Push migration `0002` to DB | High | Human approval required before `pnpm drizzle-kit push` |
| Playwright E2E in CI | Medium | Dep installed; needs config + spec files + live env |
| Upgrade rate limiter to Redis | Low | Current in-memory (resets on restart) |
| A11Y pass (Lighthouse ≥95) | Low | axe-core scan pending |
