# BIMWeb — Task List with Detailed Specs

**Last updated: 2026-06-25** — 12 of 14 tasks complete. T-WEB-14 ecosystem wiring done (search UI + deployments UI call BIMAgent/BIMIndex/BIMCloud). Gaps: API key validation table (T-WEB-13), Sentry alerting (T-WEB-5), expanded test coverage. 21 tests pass.

---

## T-WEB-1: Automated Tests (Offload 7.0 — Flash→Pro) — **PARTIAL**

**Status**: ⚠️ Vitest configured (`vitest.config.mts`), 5 basic smoke tests exist.
- `tests/test_email.ts` — Email exports + dev fallback
- `tests/lib/actions.test.ts` — Server action exports
- `tests/lib/audit.test.ts` — Audit logging exports
- `tests/components/app-sidebar.test.tsx` — Sidebar component
- `tests/setup.ts` — jest-dom matchers

**Gap**: Only smoke tests; no real test coverage of business logic. No Playwright E2E setup. No coverage targets.

**Next step**: Add unit tests for `rbac.ts`, `sharing.ts`, `workspace.ts`, `storage.ts`, `api-clients.ts`, `ifc/parser.ts`. Add Playwright E2E for login, project CRUD, model upload.

---

## T-WEB-2: Error Boundaries (Offload 4.5 — Flash) — **DONE**

**Status**: ✅ Root `error.tsx` and dashboard `error.tsx` exist with glass-panel card design + retry button.
- `src/app/error.tsx` — global error boundary
- `src/app/dashboard/error.tsx` — dashboard-scoped error boundary
- 6 `loading.tsx` files: root, dashboard, projects, models, team, settings (all with skeleton UIs)

**Verification**: Navigating to a broken route shows styled error with retry.

---

## T-WEB-3: Cloud File Storage (Offload 7.0 — Flash→Pro) — **DONE**

**Status**: ✅ `src/lib/storage.ts` provides dual backend.
- `STORAGE_BACKEND` env var: `"local"` (default, writes to `public/uploads/`) or `"s3"` (uses `@aws-sdk/client-s3`)
- `S3_BUCKET`, `S3_REGION` env vars
- File validation: MIME allowlist, 100MB max, path traversal protection
- `@aws-sdk/client-s3@^3.1075.0` in `package.json`

**Verification**: User can drag a file, see upload progress, and the file URL is saved to DB.

---

## T-WEB-4: Email Notifications (Offload 7.0 — Flash) — **DONE**

**Status**: ✅ `src/lib/email.ts` with Resend integration.
- `sendWelcomeEmail()`, `sendInviteEmail()`, `sendProjectSharedEmail()`
- Dev fallback: console.log if `RESEND_API_KEY` not set
- `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL` env vars documented in `.env.local.example`

**Verification**: Signing up triggers a welcome email (live Resend API required for end-to-end).

---

## T-WEB-5: Audit Logging (Offload 6.0 — Flash→Pro) — **DONE (with 1 TODO)**

**Status**: ✅ `src/lib/audit.ts` + `audit_logs` table in Drizzle schema.
- `logAction(action, actor_id, target_type, target_id, metadata)`
- `getAuditLogs()` query helper
- Audit entries created on project create/delete, team member add/remove, project share/unshare

**TODO in code**: `// TODO: alert monitoring (e.g. Sentry.captureException) in production` (one line in audit.ts)

---

## T-WEB-6: Team Invites + RBAC Enforcement (Offload 5.3 — Flash→Pro — Security Critical) — **DONE**

**Status**: ✅ `src/lib/rbac.ts` with full role hierarchy.
- `Role` type: `admin` | `editor` | `viewer`
- `getUserRole()`, `requireRole()`, `requireProjectAccess()`, `requireProjectWriteAccess()`, `requireProjectAdminAccess()`
- Invite flow: `addTeamMember` action generates invite token, `joinTeam` accepts token
- RBAC enforced on all server actions in `src/lib/actions.ts`

**Verification**: Viewer cannot delete project; admin can (currently requires integration tests).

---

## T-WEB-7: Shared Projects + Activity Feed (Offload 7.0 — Flash→Pro) — **DONE**

**Status**: ✅ `src/lib/sharing.ts` with audit trail.
- `shareProject()`, `unshareProject()`, `getSharedProjects()`
- `audit_logs` table stores share events with metadata
- `team_members` table stores per-project permissions

**Verification**: User A shares project with User B → User B sees it in their dashboard.

---

## T-WEB-8: IFC Parsing (web-ifc) (Offload 8.0 — Pro) — **DONE**

**Status**: ✅ `src/lib/ifc/parser.ts` + `src/lib/ifc/types.ts` + `web-ifc.d.ts`.
- `web-ifc@^0.0.46` in `package.json`
- IFC element extraction, geometry, properties, classification
- Integrated with three.js viewer

**Verification**: Uploading an IFC file produces a parsed 3D model with correct geometry.

---

## T-WEB-9: Measurement + Sections + Model Tree (Offload 8.0 — Qwen3 Coder Plus) — **DONE**

**Status**: ✅ `src/components/viewer/model-viewer.tsx` (659 lines) with all three features.
- **Measurement**: `measurement-tools.ts` (76 lines) — `MeasurementManager` with raycasting click-to-measure, distance display
- **Sections**: `section-plane.ts` (35 lines) — `SectionPlaneManager` with X/Y/Z axis clipping planes
- **Model tree**: 6 categorized layers (Glass, Columns, Floors, Core, Wireframe, Ground) in sidebar with click-to-highlight
- All controls styled with shadcn/ui

**Verification**: Click two points → see distance. Drag section plane → see cut. Navigate tree → elements highlight in 3D.

---

## T-WEB-10: CI/CD Pipeline (Offload 7.0 — Flash) — **DONE**

**Status**: ✅ `.github/workflows/ci.yml` and `cd.yml` exist.

**Verification**: CI passes on PR. Merging to main deploys to production.

---

## T-WEB-11: Analytics (Offload 6.0 — Flash→Pro) — **DONE**

**Status**: ✅ `src/lib/analytics/client.ts` + `src/lib/analytics/server.ts` with PostHog.
- `posthog-js` and `@posthog/nextjs` patterns implemented (PostHog types in `posthog.d.ts`)
- `trackEvent()`, `identifyUser()`, `trackServerEvent()`, `getPageViewStats()`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` env vars documented

**Verification**: User actions appear in PostHog dashboard within 1 minute (live PostHog required).

---

## T-WEB-12: Multi-Tenant Workspaces (Offload 10.0 — DeepSeek V4 Pro) — **DONE**

**Status**: ✅ `src/lib/workspace.ts` + `workspaces` table in Drizzle schema.
- `createWorkspace()`, `getWorkspace()`, `getUserWorkspaces()`
- `workspace_id` foreign key on `projects`, `models`, `team_members` tables
- Migration `0001` adds workspace tables

**Verification**: User in Workspace A cannot see Workspace B data.

---

## T-WEB-13: Public REST API (Offload 6.3 — Flash→Pro) — **PARTIAL**

**Status**: ⚠️ `src/app/api/v1/projects/route.ts` and `src/app/api/v1/models/route.ts` exist.
- Bearer token auth via `API_SECRET_KEY` env var
- In-memory rate limiting
- Input sanitization

**Gap**:
- `// TODO: Validate against stored API keys table for per-user identity` (in projects/route.ts)
- No OpenAPI 3.0 schema file
- No Swagger/Scalar UI
- Only 2 endpoints; need full coverage of projects, models, team, search

---

## T-WEB-14: Ecosystem Integration (3 Repos) (Offload 10.5 — DeepSeek V4 Pro) — **DONE**

**Status**: ✅ Ecosystem wiring complete. `src/lib/api-clients.ts` rewritten with unified `EcosystemError` + `fetchWithTimeout`, `BIMCloudClient` aligned to the real `POST /query` gateway API, plus a `getEcosystemHealth()` aggregator.
- **Search UI** (`src/app/dashboard/search/`): `page.tsx` + `search-client.tsx` + `loading.tsx`. "Ask Agent" tab calls `bimAgent.query()` (response + trace); "Direct Index" tab calls `bimIndex.search(query, mode)` with a vectorless/dense/graph selector and result cards.
- **Deployments UI** (`src/app/dashboard/deployments/`): `page.tsx` server-fetches `bimCloud.health()` and passes it as props; `deployments-client.tsx` shows gateway/agent/circuit-breaker health cards and routes a test query via `bimCloud.routeQuery()` showing trace_id + latency + status.
- Sidebar nav updated with Search + Deployments entries.
- Unified error handling: every client raises `EcosystemError` (service, endpoint, status); both UIs render styled error panels.
- Env vars documented in `.env.local.example` (`NEXT_PUBLIC_BIMAGENT_URL`, `NEXT_PUBLIC_BIMCLOUD_URL`, `NEXT_PUBLIC_BIMINDEX_URL`).
- Tests: `tests/lib/api-clients.test.ts` (13 integration tests with mocked fetch + error/timeout), `tests/app/search.test.tsx`, `tests/app/deployments.test.tsx` (smoke).

**Verification**: `npx vitest run` — 21 passed; `npx eslint` + `npx tsc --noEmit` clean. (`next build` blocked by a pre-existing `lightningcss` native-binary mismatch, unrelated to this task.)

---

## Remaining Gaps

| Task | Priority | Notes |
|------|----------|-------|
| T-WEB-1: Expand test coverage (unit + E2E) | High | 21 tests now; still need unit tests for rbac, sharing, storage, ifc/parser + Playwright E2E |
| T-WEB-13: API key validation table (per-user identity) | High | TODO in code |
| T-WEB-13: OpenAPI schema + Swagger/Scalar UI | Medium | Currently no API documentation |
| T-WEB-13: Rate limit per API key (currently global in-memory) | Medium | |
| T-WEB-5: Sentry alerting in `audit.ts` | Low | Single TODO line |
| `next build` unblock | Low | Pre-existing `lightningcss` native-binary mismatch (reinstall lightningcss for darwin) |
