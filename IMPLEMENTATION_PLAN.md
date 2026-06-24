# Implementation Plan: BIMWeb

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
- [x] Model upload with real file storage
- [x] Team member invite and role management
- [x] User settings and platform infrastructure display
- [x] Responsive sidebar and top navigation

### Phase 3 — 3D Viewer
- [x] three.js WebGL viewer with OrbitControls
- [x] Procedural building model (glass, structure, floors)
- [x] PBR materials, dynamic lighting, shadows
- [x] glTF model loading for uploaded files
- [x] Zoom, reset view, layer toggle controls

### Phase 4 — Advanced Features
- [x] Project detail page with tabbed layout (models, team, settings)
- [x] Delete/edit actions for projects, models, team members
- [x] RBAC checks on server actions
- [x] File upload endpoint with local storage

## 📋 In Progress / Next

### Phase 5 — Production Hardening
- [ ] **Automated tests** — Vitest for unit/integration, Playwright for e2e
- [ ] **Error boundaries** — Route-level `error.tsx` and `loading.tsx`
- [ ] **Cloud file storage** — Replace local `public/uploads/` with Vercel Blob / UploadThing / S3
- [ ] **Email notifications** — Send actual invite emails via Resend / SendGrid
- [ ] **Audit logging** — Track project/model changes with timestamps

### Phase 6 — Collaboration
- [ ] **Real team invites** — Kinde org membership or email-based invitation flow
- [ ] **Full RBAC** — Enforce `role` on every server action, not just ownership
- [ ] **Shared projects** — Allow team members to access projects they're invited to
- [ ] **Activity feed** — Real-time activity log for project changes

### Phase 7 — Viewer Enhancements
- [ ] **IFC file format support** — Parse IFC files with web-ifc
- [ ] **Measurement tools** — Distance, angle, and area measurement in 3D
- [ ] **Section cuts** — Clipping planes for cross-section views
- [ ] **Model tree** — Hierarchy panel showing model components
- [ ] **Performance** — Instanced rendering, LOD, frustum culling for large models

### Phase 8 — Platform
- [ ] **CI/CD** — GitHub Actions for lint, typecheck, test, deploy
- [ ] **Analytics** — Usage tracking and project statistics
- [ ] **Multi-tenant** — Organization-level workspaces
- [ ] **API** — Public REST API for external integrations
