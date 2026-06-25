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

## Model Routing

**Before any task, read `ROUTING.md` to select the correct model.**
- Compute offload = (blast×3 + ambig×2 + quality×2) / verification
- < 3: free | 3–5: DeepSeek V4 Flash | 5–7: Flash write + Pro verify | > 7: DeepSeek V4 Pro
- **Security/auth code → Pro verify mandatory.**
- **Exposed credentials → local Nanbeige-3B only.**
- **three.js features → Qwen3 Coder Plus (I.90 best for JS/TS).**

## Architecture

- **App Router**: `src/app/` — server components fetch data, pass to `*-client.tsx` client components
- **Server actions**: `src/lib/actions.ts` — all DB mutations via `"use server"`
- **DB**: Drizzle ORM with Neon serverless Postgres; schema in `src/db/schema.ts`, migrations in `src/db/migrations/`
- **Auth**: Kinde via `@kinde-oss/kinde-auth-nextjs/server` — `getKindeServerSession()` → `getUser()`
- **Components**: shadcn/ui primitives in `src/components/ui/`, app components in `src/components/`
- **Dashboard**: `src/app/dashboard/` with sub-routes: projects, models, team, settings
- **3D Viewer**: `src/components/viewer/model-viewer.tsx` — three.js WebGL with OrbitControls (already implemented)

## Task List

Full detailed specs, implementation steps, and model assignments for all 14 remaining tasks are in **`TASKS.md`**.

Priority order: T-WEB-1 (tests) → T-WEB-2 (error boundaries) → T-WEB-3 (file storage) → T-WEB-4 (email) → T-WEB-5 (audit) → T-WEB-6 (RBAC) → T-WEB-7 (sharing) → T-WEB-10 (CI/CD) → T-WEB-11 (analytics) → T-WEB-8 (IFC) → T-WEB-9 (measurements) → T-WEB-13 (API) → T-WEB-12 (workspaces) → T-WEB-14 (ecosystem).

Before starting any task, read `ROUTING.md` to select the correct model.

## Code Standards

- TypeScript strict — avoid `any`, prefer proper types/interfaces
- Components: "use client" for interactive, server components for data fetching
- Imports: `@/` path alias, no relative imports across top-level dirs
- Dark theme: `bg-zinc-950` base, `glass-panel` cards with `border-white/5`, primary accent via CSS `--primary`
- Async: `useTransition` + `startTransition` for form submissions, `router.refresh()` after mutations
- UI: shadcn/ui primitives, framer-motion for animations, lucide-react for icons
- Icons: import individual icons from `lucide-react` (tree-shakable)
