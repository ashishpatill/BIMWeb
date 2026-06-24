# BIMWeb — Building Information Modeling Platform

Next.js 16 + Drizzle ORM + Neon Postgres + Kinde Auth + Tailwind v4 + shadcn/ui + three.js

## Quick Commands

```
pnpm dev         # Start dev server
pnpm build       # Production build
pnpm lint        # ESLint check
pnpm drizzle-kit push  # Push schema to DB
pnpm drizzle-kit generate  # Generate migration
```

## Architecture

- **App Router**: `src/app/` — server components fetch data, pass to `*-client.tsx` client components
- **Server actions**: `src/lib/actions.ts` — all DB mutations via `"use server"`
- **DB**: Drizzle ORM with Neon serverless Postgres; schema in `src/db/schema.ts`, migrations in `src/db/migrations/`
- **Auth**: Kinde via `@kinde-oss/kinde-auth-nextjs/server` — `getKindeServerSession()` → `getUser()`
- **Components**: shadcn/ui primitives in `src/components/ui/`, app components in `src/components/`
- **Dashboard**: `src/app/dashboard/` with sub-routes: projects, models, team, settings
- **3D Viewer**: `src/components/mock-viewer.tsx` — currently CSS-3D mock, target is three.js WebGL

## Remaining Work (Priority Order)

1. **Real 3D WebGL viewer** — install three.js + OrbitControls, replace `mock-viewer.tsx`, load glTF/IFC models
2. **Real file upload** — integrate Vercel Blob / UploadThing / S3 for actual model file storage, wire into `createModel`
3. **Project detail page** — `src/app/dashboard/projects/[id]/page.tsx` with model list, team, settings tabs
4. **Delete/edit actions** — `deleteProject`, `updateProject`, `deleteModel`, `removeTeamMember` server actions + UI
5. **RBAC enforcement** — respect `teamMembers.role` in server actions for project access control
6. **Actual team invites** — Kinde org invite or sendgrid/resend email for real invitations
7. **Tests** — component + e2e tests
8. **Project documentation** — update README, add ROADMAP.md

## Code Standards

- TypeScript strict — avoid `any`, prefer proper types/interfaces
- Components: "use client" for interactive, server components for data fetching
- Imports: `@/` path alias, no relative imports across top-level dirs
- Dark theme: `bg-zinc-950` base, `glass-panel` cards with `border-white/5`, primary accent via CSS `--primary`
- Async: `useTransition` + `startTransition` for form submissions, `router.refresh()` after mutations
- UI: shadcn/ui primitives, framer-motion for animations, lucide-react for icons
- Icons: import individual icons from `lucide-react` (tree-shakable)
