# Implementation Plan: BIMWeb

**Last updated: 2026-06-25** — 11 of 14 TASKS.md items complete. Gaps: expanded test coverage, API key validation, ecosystem integration wiring.

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

### Phase 3 — 3D Viewer
- [x] three.js WebGL viewer with OrbitControls (659 lines)
- [x] Procedural building model (glass, structure, floors)
- [x] PBR materials, dynamic lighting, shadows
- [x] glTF model loading for uploaded files
- [x] Zoom, reset view, layer toggle controls

### Phase 4 — Advanced Features
- [x] Project detail page with tabbed layout (models, team, settings)
- [x] Delete/edit actions for projects, models, team members
- [x] RBAC checks on server actions (`rbac.ts` with admin/editor/viewer)
- [x] File upload endpoint with local + S3 storage abstraction
- [x] Audit logging (`audit.ts` + `audit_logs` table)
- [x] Email notifications (Resend with dev fallback)
- [x] Error boundaries (root + dashboard) and loading skeletons (6 routes)
- [x] Cloud file storage (S3 via `@aws-sdk/client-s3`)
- [x] Project sharing + activity feed
- [x] IFC parsing (`web-ifc` integration)
- [x] 3D measurement tools + section planes + model tree
- [x] Analytics (PostHog client + server)
- [x] Multi-tenant workspaces (`workspace.ts` + `workspaces` table)
- [x] Public REST API v1 (projects + models endpoints, Bearer auth, rate limiting)
- [x] Ecosystem API clients (BIMAgent, BIMCloud, BIMIndex)

## 📋 In Progress / Next

### Phase 5 — Test Coverage Expansion
- [ ] **Unit tests** — Real coverage of `rbac.ts`, `sharing.ts`, `workspace.ts`, `storage.ts`, `api-clients.ts`, `ifc/parser.ts` (currently only 5 smoke tests exist)
- [ ] **E2E tests** — Playwright setup for login, dashboard, project CRUD, model upload, team invite

### Phase 6 — API Hardening
- [ ] **Per-user API key validation table** — Replace `API_SECRET_KEY` env-only with DB-backed key store
- [ ] **OpenAPI 3.0 schema** — Document the v1 API
- [ ] **Swagger/Scalar UI** — Auto-generated API docs page
- [ ] **Per-key rate limiting** — Replace global in-memory limiter

### Phase 7 — Ecosystem Wiring
- [ ] **Search UI** — Wire frontend search to BIMAgent → BIMIndex path
- [ ] **Deployment UI** — Wire deployment management to BIMCloud
- [ ] **Unified error handling** — Add error boundary that surfaces backend integration errors
- [ ] **Integration tests** — Test full UI → Agent → Index flows

### Phase 8 — Production Polish
- [ ] **Sentry alerting** in `audit.ts` (single TODO line)
- [ ] **Real-time updates** for shared projects via WebSocket or SSE
- [ ] **Bulk import** for projects/models
- [ ] **Export** project data to JSON/CSV
- [ ] **Email preference UI** (currently model exists in Drizzle, no UI)
