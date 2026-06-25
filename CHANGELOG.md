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
- **Ecosystem API Clients**: `src/lib/api-clients.ts` with HTTP clients for BIMAgent, BIMCloud, BIMIndex.
- **CI/CD**: `.github/workflows/ci.yml` (lint + typecheck + build) and `cd.yml` (deploy to Vercel).

### Tests
- 5 vitest smoke tests: `test_email.ts`, `lib/actions.test.ts`, `lib/audit.test.ts`, `components/app-sidebar.test.tsx`, `setup.ts`. Test coverage expansion pending.
