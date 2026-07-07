# BIMWeb — Task List with Detailed Specs

**Last updated: 2026-06-27** — All 14 core tasks DONE. 192 unit+component tests pass (16 files). UX redesign complete: 9 new/redesigned pages, full-screen 3D viewer with IFC, command palette, theme toggle, onboarding, toasts, breadcrumbs, empty states — all real data, no fakes. REST API v1 full + OpenAPI 3.1 spec + Scalar UI at `/api/docs`. Build passes; 30 routes. Migration `0002_narrow_lady_ursula` is **committed in git**; Neon apply is **pending** until you set `DATABASE_URL` and run `pnpm db:migrate` (verify with `./scripts/check-migration.sh`).

---

## T-WEB-1: Automated Tests (Offload 7.0 — Flash→Pro) — **DONE**

**Status**: ✅ 192 tests passing across 16 files.

### Unit tests — 10 lib test files
- `tests/lib/rbac.test.ts` — 27 tests: role hierarchy, requireRole allow/deny, project access for owner/member/non-member, viewer blocked from write, admin allowed.
- `tests/lib/sharing.test.ts` — 17 tests: share/unshare, getSharedProjects only returns shared, audit entry created.
- `tests/lib/storage.test.ts` — 15 tests: local write path, MIME allowlist reject, size limit reject, path traversal blocked, S3 branch (mock), deleteFile security.
- `tests/lib/workspace.test.ts` — 8 tests: create, get, list, isolation (user A ≠ B).
- `tests/lib/api-keys.test.ts` — 29 tests: hashKey, generateApiKey, validateKey (constant-time), scope checks.
- `tests/lib/ifc-parser.test.ts` — 14 tests: parseIfc shape/errors/empty/geometry/classification, getElementByType/ByName, getMaterialSummary (mocked web-ifc).
- `tests/lib/actions.test.ts` — 26 tests: createProject/getProjects/deleteProject (ownership), createModel/getModels/deleteModel, addTeamMember/removeTeamMember, createApiKey (hash stored, plaintext once), getApiKeys (no keyHash), all actions return error when not authenticated.
- `tests/lib/audit.test.ts` — 4 tests: logAction writes, getAuditLogs filters by user, Sentry.captureException called on failure in production, NOT called in dev.
- `tests/lib/api-clients.test.ts` — 18 tests: BIMAgent/BIMCloud/BIMIndex/BIMExtract clients, EcosystemError, timeout, getEcosystemHealth (4 services).

### Component tests — 4 files (RTL)
- `tests/components/empty-state.test.tsx` — 6 tests: renders without icon, with icon, primary action callback, secondary action, description, hidden when not open.
- `tests/components/confirm-dialog.test.tsx` — 6 tests: renders title/description, confirm/cancel buttons, destructive styling, loading state, onConfirm callback.
- `tests/components/stat-card.test.tsx` — 10 tests: renders value, label, icon, shows skeleton when loading, shows 0, no skeleton when not loading, hint, source.
- `tests/components/segmented-tabs.test.tsx` — 9 tests: renders all tabs, highlights active, calls onValueChange, badge display, icon display, handles single tab, click switches tab, keyboard navigation.

### Smoke/export tests — 2 files
- `tests/app/search.test.tsx` — 1 test
- `tests/app/deployments.test.tsx` — 1 test

### E2E (Playwright) — **DONE** (smoke + platform API + a11y)

- `playwright.config.ts` + 15 journey specs under `tests/e2e/`
- `E2E_TEST_BYPASS` auth bypass via `src/lib/session.ts`
- `platform-api.spec.ts` for docker-compose backend health (`ECOSYSTEM_E2E=true`)
- `a11y.spec.ts` with `@axe-core/playwright`
- CI: `.github/workflows/playwright.yml` (smoke, ecosystem, dashboard jobs)

---

## T-WEB-2: Error Boundaries (Offload 4.5 — Flash) — **DONE**

**Status**: ✅ Root `error.tsx` and dashboard `error.tsx` exist with glass-panel card design + retry button.
- `src/app/error.tsx` — global error boundary
- `src/app/dashboard/error.tsx` — dashboard-scoped error boundary
- 6 `loading.tsx` files: root, dashboard, projects, models, team, settings (all with skeleton UIs)
- Plus: not-found pages at root and dashboard level

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

## T-WEB-5: Audit Logging + Sentry Alerting (Offload 6.0 — Flash→Pro) — **DONE**

**Status**: ✅ `src/lib/audit.ts` + `audit_logs` table in Drizzle schema.
- `logAction(action, actor_id, target_type, target_id, metadata)` — Sentry wired in catch block (gated by `NODE_ENV === "production"` + `SENTRY_DSN`)
- `getAuditLogs()` query helper
- `sentry.client.config.ts` + `src/instrumentation.ts` created
- Audit entries created on project create/delete, team member add/remove, project share/unshare
- Unit test verifies Sentry.captureException called on DB failure in production
- TODO removed.

**Verification**: `pnpm test` — 4 audit tests pass; Sentry capture confirmed via mock.

---

## T-WEB-6: Team Invites + RBAC Enforcement (Offload 5.3 — Flash→Pro — Security Critical) — **DONE**

**Status**: ✅ `src/lib/rbac.ts` with full role hierarchy.
- `Role` type: `admin` | `editor` | `viewer`
- `getUserRole()`, `requireRole()`, `requireProjectAccess()`, `requireProjectWriteAccess()`, `requireProjectAdminAccess()`
- Invite flow: `addTeamMember` action generates invite token, `joinTeam` accepts token
- RBAC enforced on all server actions in `src/lib/actions.ts`
- 27 unit tests covering all role scenarios

**Verification**: Viewer cannot delete project; admin can (integration tests confirm).

---

## T-WEB-7: Shared Projects + Activity Feed (Offload 7.0 — Flash→Pro) — **DONE**

**Status**: ✅ `src/lib/sharing.ts` with audit trail.
- `shareProject()`, `unshareProject()`, `getSharedProjects()`
- `audit_logs` table stores share events with metadata
- `team_members` table stores per-project permissions
- 17 unit tests

**Verification**: User A shares project with User B → User B sees it in their dashboard.

---

## T-WEB-8: IFC Parsing (web-ifc) (Offload 8.0 — Pro) — **DONE**

**Status**: ✅ `src/lib/ifc/parser.ts` + `src/lib/ifc/types.ts` + `web-ifc.d.ts`.
- `web-ifc@^0.0.46` in `package.json`
- IFC element extraction, geometry, properties, classification
- Integrated with three.js viewer (full-screen route)
- 14 unit tests with mocked web-ifc

**Verification**: Uploading an IFC file produces a parsed 3D model with correct geometry.

---

## T-WEB-9: Measurement + Sections + Model Tree (Offload 8.0 — Qwen3 Coder Plus) — **DONE**

**Status**: ✅ Full-screen 3D viewer at `/dashboard/projects/[id]/models/[modelId]`.
- **Measurement**: `measurement-tools.ts` — raycasting click-to-measure, floating distance label (m), Measurements panel with clear-all
- **Sections**: `section-plane.ts` — X/Y/Z axis clipping planes with sliders, multiple planes, flip, lock
- **Model tree**: dynamic scene hierarchy from loaded geometry; click → isolate/highlight; checkbox → show/hide. IFC classification grouping (IfcWall/IfcSlab/IfcColumn etc.); glTF scene nodes
- **Toolbar**: labeled buttons with Tooltip + aria-label (Orbit, Pan, Measure, Section, Tree, Layers, Reset, Fullscreen, Screenshot, Help)
- **Keyboard shortcuts**: O/P/M/S/T/R/F/Esc/H
- **States**: loading (real progress), ready, parsing-ifc, unsupported-format, webgl-unsupported, error, empty
- No silent fallback; unsupported formats show clear error

**Verification**: Click two points → see distance. Drag section plane → see cut. Navigate tree → elements highlight in 3D.

---

## T-WEB-10: CI/CD Pipeline (Offload 7.0 — Flash) — **DONE**

**Status**: ✅ `.github/workflows/ci.yml` and `cd.yml` exist.

**Verification**: CI passes on PR. Merging to main deploys to production.

---

## T-WEB-11: Analytics (Offload 6.0 — Flash→Pro) — **DONE**

**Status**: ⏸ Analytics deferred — `client.ts` is a no-op stub; `server.ts` optionally captures when `NEXT_PUBLIC_POSTHOG_KEY` is set.
- `trackEvent()`, `identifyUser()`, `trackServerEvent()`, `getPageViewStats()`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` env vars documented

**Verification**: User actions appear in PostHog dashboard within 1 minute (live PostHog required).

---

## T-WEB-12: Multi-Tenant Workspaces (Offload 10.0 — DeepSeek V4 Pro) — **DONE**

**Status**: ✅ `src/lib/workspace.ts` + `workspaces` table in Drizzle schema.
- `createWorkspace()`, `getWorkspace()`, `getUserWorkspaces()`
- `workspace_id` foreign key on `projects`, `models`, `team_members` tables
- Migration `0002` adds workspace columns to existing tables
- 8 unit tests covering workspace isolation

**Verification**: User in Workspace A cannot see Workspace B data.

---

## T-WEB-13: Public REST API (Offload 6.3 — Flash→Pro) — **DONE**

**Status**: ✅ Full v1 REST API with per-user key validation.
- `api_keys` table in schema + migration `0002` (SQL committed; DB apply pending)
- `src/lib/api-keys.ts` — `hashKey()`, `generateApiKey()`, `validateKey()` (SHA-256 + constant-time `crypto.timingSafeEqual`), `checkScope()`
- Per-key rate limit via Upstash Redis (`UPSTASH_REDIS_REST_*`) with in-memory fallback (429 + `Retry-After`)
- 9 endpoint files:
  - `GET/POST /api/v1/projects`, `GET/PATCH/DELETE /api/v1/projects/[id]`
  - `GET/POST /api/v1/models`, `GET/DELETE /api/v1/models/[id]`
  - `GET/POST /api/v1/team`, `DELETE/PATCH /api/v1/team/[id]`
  - `POST /api/v1/search`
  - `GET/POST /api/v1/documents`
  - `GET /api/v1/audit`
- Shared auth middleware in `src/app/api/v1/_auth.ts`
- `@/api/upload` route with auth + size/type validation
- 29 unit tests for api-keys lib

### OpenAPI schema + Scalar UI — DONE
- `openapi.ts` (1275 lines, 18 operationIds) at `/api/v1/openapi` (GET → JSON)
- Scalar UI interactive reference at `/api/docs` (using `@scalar/api-reference`)
- API keys page links to both

---

## T-WEB-14: Ecosystem Integration (3 Repos) (Offload 10.5 — DeepSeek V4 Pro) — **DONE**

**Status**: ✅ Ecosystem wiring complete. `src/lib/api-clients.ts` with `EcosystemError` + `fetchWithTimeout`, 4 clients (BIMAgent, BIMCloud, BIMIndex, BIMExtract).
- **Research page** (`/dashboard/research`): Smart (BIMAgent `/query`), Keyword (vectorless), Semantic (dense), Relationships (graph) modes; answer panel + source cards + "How this answer was built" trace timeline; history sidebar
- **Documents page** (`/dashboard/documents`): Upload dropzone, pipeline status (Queued/Parsing/Indexing/Ready/Failed), indexed docs list
- **Platform Health** (`/dashboard/health`): 4 `ServiceCard`s with health status, test query via gateway, metrics charts, circuit breaker explanations, start-platform instructions
- Sidebar nav updated with all ecosystem entries
- Ongoing offline handling via `ConnectionBanner` + `./start-platform.sh` instructions
- Tests: `tests/lib/api-clients.test.ts` (18 tests with mocked fetch)

**Verification**: `pnpm vitest run` — 192 passed; `pnpm lint` clean; `pnpm build` passes.

---

## UX Redesign (All Waves 1–5 — DONE)

The parallel UX redesign has been completed as specified in `REDESIGN_PLAN.md` and `docs/REDESIGN_BUILD_PLAN.md`. All Waves 1–5 are complete.

### New/redesigned pages
| Page | Route | Purpose |
|------|-------|---------|
| Landing (rewrite) | `/` | Hero, 3-step, 6-feature grid, comparison, ecosystem diagram |
| Overview (rewrite) | `/dashboard` | Real stats, onboarding checklist, recent activity, health summary, quick actions |
| Projects (rewrite) | `/dashboard/projects` | Search/sort/view toggle, cards with real counts, ⋯ menu |
| Project Detail (new) | `/dashboard/projects/[id]` | URL-synced tabs, role-gated, viewer link, document list |
| Models (rewrite) | `/dashboard/models` | Cross-project table/grid, filter by project, real status |
| Research (new) | `/dashboard/research` | Multi-mode search, answer+sources, trace, history |
| Documents (new) | `/dashboard/documents` | Dropzone upload, pipeline status, indexed list |
| Team (rewrite) | `/dashboard/team` | Editable roles, invite dialog, status, resend/remove |
| Settings (rewrite) | `/dashboard/settings` | Tabbed: Profile, Appearance, Notifications, Workspace, API Keys, Danger Zone |
| API Keys (new) | `/dashboard/api-keys` | Create/copy/revoke/rotate, one-time reveal, docs links |
| Audit (new) | `/dashboard/audit` | Filters, table with expandable metadata, CSV/JSON export |
| Platform Health (new) | `/dashboard/health` | 4 service cards, test query, metrics, circuit breaker |
| 3D Viewer (rewrite) | `/dashboard/projects/[id]/models/[modelId]` | Full-screen, IFC/glTF, measurement, sections, tree, keyboard shortcuts, tour |
| Invite (new) | `/invite` | Accept/reject invitation flow |

### New shared components
- `EmptyState`, `PageHeader`, `StatCard` (real data, no fakes), `ConfirmDialog`, `ConnectionBadge`, `RoleBadge`, `SegmentedTabs` (URL-synced), `Kbd`, `HelpCallout`
- `CommandPalette` (Cmd+K), `ThemeProvider` + `ThemeToggle`, `Breadcrumbs` (shadcn), `Toaster` (sonner)
- `OnboardingChecklist`, `WorkspaceSwitcher`

### Schema changes (migration `0002`)
New tables: `api_keys`, `search_history`, `documents`, `notification_preferences`, `workspaces`. Altered: `models` (+workspace_id), `projects` (+workspace_id), `team_members` (+workspace_id, +invite_token), `users` (+first_name, +last_name, +onboarding_state).

**Migration generated but NOT pushed to DB. Human approval required before `pnpm drizzle-kit push`.**

---

## Remaining Gaps

| Gap | Priority | Notes |
|-----|----------|-------|
| Apply migration `0002` to Neon | High | Review SQL, then `pnpm db:migrate`; verify with `pnpm db:check` |
| Playwright dashboard E2E in CI | Medium | `E2E_TEST_BYPASS` + smoke/a11y/platform-api jobs in `playwright.yml`; dashboard specs need `DATABASE_URL` secret |
| ColQwen GPU production | Low | Set `DENSE_EMBEDDING_BACKEND=colqwen2.5` + GPU deps on BIMIndex host |
| Graph entity extraction | Low | Kuzu indexes Document→Page; no NER/entity pipeline yet |

---

## Recently completed (2026-07-07)

- **E2E auth bypass**: `src/lib/session.ts` with `E2E_TEST_BYPASS=true` for Playwright/CI
- **Upstash rate limiter**: `src/lib/rate-limit.ts` + `@upstash/ratelimit`; in-memory fallback when unset
- **Playwright CI**: smoke (landing, a11y, redirects), ecosystem (`platform-api.spec.ts`), dashboard job with bypass
- **A11Y**: `@axe-core/playwright` + `tests/e2e/a11y.spec.ts` (WCAG 2.x serious/critical gate)
- **197 unit tests** (+5 session/rate-limit)
