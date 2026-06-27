# BIMWeb — UX Redesign & Gap Closure Plan

**Author:** BIMWeb engineering
**Created:** 2026-06-27
**Scope:** Full UX/UX redesign of BIMWeb + closure of T-WEB-1, T-WEB-13, T-WEB-5, plus surfacing every wired-but-hidden feature and every BIMRAG ecosystem capability.

> **Goal in one sentence:** Make BIMWeb the BIM-intelligence platform that a practitioner *actually prefers* over LlamaParse and Pinecone — by being obvious, guided, visual, and never leaving a user wondering "what do I do here?"

---

## 0. Executive Summary

BIMWeb today is a **developer scaffold disguised as a product**. It has strong backends (3D viewer, Kinde auth, Neon, the full BIMRAG ecosystem) but the UX fails ordinary users:

- No onboarding, no tooltips, no toasts, no breadcrumbs, no command palette.
- Fake data everywhere ("99.9% uptime", "GPU Accelerated", "Status: Joined").
- Dead ends: model cards link to the wrong page, IFC files silently fall back to a fake building, measurement has no readout, section planes can't move, layer toggle is dead code.
- Jargon pages ("tri-modal index", "circuit breaker", "vectorless") aimed at engineers, not BIM users.
- Wired-but-hidden: workspaces, audit logs, RBAC, sharing, email invites, IFC parser, API keys, analytics — all exist in code with **zero UI**.

This plan redesigns BIMWeb into a **guided, visual, role-aware platform** and closes every remaining gap. It is organized so each section is independently executable.

---

## 1. Goals & Success Metrics

### 1.1 Product goals
1. **Obvious first run.** A new user can go from sign-up → first 3D model in the viewer → first grounded search answer in < 5 minutes with zero external docs.
2. **No dead ends.** Every action has visible success, failure, loading, empty, and offline states.
3. **No fake data.** Every number, badge, and status is derived from a real query or removed.
4. **Surface the ecosystem.** BIMAgent, BIMIndex, BIMExtract, BIMCloud are exposed as *user-facing features* (Research, Documents, Platform Health) not internals.
5. **Compete with LlamaParse/Pinecone.** Match their core promise (ingest → search → retrieve) and exceed it with 3D + graph + multi-modal, presented simply.

### 1.2 Success metrics (measurable)
| Metric | Target |
|---|---|
| Time to first 3D model on screen | < 3 min for a guided user |
| Time to first grounded search answer | < 1 min after model/docs present |
| % of pages with real empty/loading/error states | 100% |
| % of actions with toast feedback | 100% |
| Playwright E2E covering all primary journeys | 12+ specs, all green |
| Lighthouse a11y score (key pages) | ≥ 95 |
| Unit test coverage of `lib/*` business logic | ≥ 80% |
| "I know what to do next" heuristic | Every page has ≥1 clear primary CTA |

---

## 2. Personas & Primary Journeys

### 2.1 Personas
- **Maya — BIM Practitioner / Architect.** Uploads IFC models, navigates 3D, measures, sections, asks "where is the fire rating for floor 3?".
- **Ravi — Project / Team Admin.** Creates projects, invites team, assigns roles, shares externally, reviews activity.
- **Sam — Platform / Dev Admin.** Manages API keys, monitors ecosystem health, ingests documents, reads audit logs.

### 2.2 Primary journeys (every step must have a UI)
1. **First run:** Sign up → onboarding checklist → create workspace → create project → upload IFC → view in 3D → invite teammate.
2. **Research:** Ask a question → grounded answer + source citations → click a source → highlight element in 3D (when linked).
3. **Ingest:** Upload PDF/spec → ingestion pipeline status → indexed → searchable.
4. **Collaborate:** Invite by email → teammate accepts → sees shared project → role enforced.
5. **Admin:** Generate API key → call REST API → see usage → revoke → review audit log.
6. **Monitor:** Open Platform Health → see 4 services → run test query → read trace + latency → start a stopped service (instructions).

---

## 3. Design Principles

1. **Progressive disclosure.** Show the 80% path prominently; hide power-user controls behind tooltips/tabs/expansion.
2. **One primary action per screen.** Each page has a single obvious CTA; secondary actions are ghost buttons.
3. **Plain language first.** User-facing labels say "Smart Search" not "vectorless"; "How this answer was built" not "trace".
4. **Always show state.** Loading skeleton, empty illustration, error + retry, success toast — never silent.
5. **Never fake.** No hardcoded statuses. If something is unknown, show "Unknown" with a way to fix it.
6. **Contextual help.** Tooltips on every non-obvious control; `?` help affordance on dense pages; an in-app onboarding tour.
7. **Keyboard + touch parity.** No hover-only actions; every list row has an explicit "⋯" menu; Cmd+K command palette.
8. **Visual + spatial.** Lean on the 3D viewer as the hero; link search results to 3D elements where possible.

---

## 4. Design System Additions

### 4.1 New shared components to build (in `src/components/ui/` or `src/components/common/`)
| Component | Purpose | Notes |
|---|---|---|
| `ToastProvider` + `useToast` | Success/error feedback | Add `sonner`. Replace silent `router.refresh()`. |
| `Tooltip` usage | Contextual help | `TooltipProvider` already global; actually use `Tooltip` on every icon button. |
| `Breadcrumbs` | Location context | Use installed `breadcrumb` primitive on every nested page. |
| `EmptyState` | Consistent empty illustrations | Props: `icon`, `title`, `description`, `primaryAction`, `secondaryAction`. |
| `PageHeader` | Standard page top | Props: `title`, `description`, `breadcrumbs`, `primaryAction`, `secondaryActions`. |
| `StatCard` (real) | Data-driven stats | Takes a `value: number\|string` + `source` + `loading`. No fake values. |
| `ConfirmDialog` | Dangerous actions | Reuse for delete/remove/revoke. |
| `CommandPalette` | Cmd+K navigation + actions | `cmdk` library. |
| `OnboardingChecklist` | First-run guidance | Persisted per user in `users` metadata. |
| `ConnectionBadge` | Ecosystem service status | Reusable health pill. |
| `RoleBadge` | Team role display | admin/editor/viewer with color + tooltip. |
| `SegmentedTabs` | URL-synced tabs | Used by project detail, settings, search. |
| `HelpCallout` | `?` popover | Jargon-buster on dense pages. |
| `Kbd` | Keyboard hint display | For shortcuts in palette/tooltips. |

### 4.2 Theme
- Keep dark glass-morphism but introduce a **light mode toggle** (tokens already exist in `globals.css`).
- Add chart color variety (currently grayscale) for analytics.
- Standardize dialog backgrounds to one value.

### 4.3 Iconography & labels
- Every icon-only button must have a `Tooltip` AND an accessible `aria-label`.
- Replace viewer `title=` attributes with shadcn `Tooltip`.

---

## 5. Information Architecture & Navigation

### 5.1 New sidebar structure
```
[Workspace Switcher ▾]   ← multi-tenant (T-WEB-12 surface)

WORKSPACE
  Overview          /dashboard
  Projects          /dashboard/projects
  Models            /dashboard/models            (global; also project-scoped)
  Research          /dashboard/research          (rename of Search)
  Documents         /dashboard/documents         (NEW — ingestion/BIMExtract)

TEAM
  Team              /dashboard/team

PLATFORM
  API Keys          /dashboard/api-keys          (NEW — T-WEB-13 surface)
  Audit Log         /dashboard/audit             (NEW — surface audit_logs)
  Platform Health   /dashboard/health            (rename of Deployments)
  Settings          /dashboard/settings
```
- Group headers (WORKSPACE / TEAM / PLATFORM) separate end-user from admin.
- Active state uses **prefix matching** (`/dashboard/projects/5` highlights Projects).
- Item badges: Projects count, Models count, pending invites count.
- Collapsible to icon-rail with tooltips.

### 5.2 Top nav
- `SidebarTrigger`, **functional** command-palette trigger input (opens Cmd+K) — not a dead search box.
- **Workspace switcher** (left of search on larger screens) or in sidebar header.
- Right: **real notifications** bell with dropdown (recent audit events for the user), user **avatar menu** (Profile, Settings, API Keys, Sign out).
- Remove the permanent fake notification dot.

### 5.3 Breadcrumbs
- Every page below `/dashboard` renders a `Breadcrumbs` trail, e.g. `Workspace / Projects / Tower A / Models`.

### 5.4 Command palette (Cmd+K)
- Pages, quick actions (New project, Upload model, Invite member, Generate API key), recent projects, run search.
- Keyboard-first; replaces the decorative top search.

---

## 6. Page-by-Page Redesign (states & scenarios)

Each page spec lists: **Purpose**, **Layout**, **Primary CTA**, **Data sources**, **States** (empty/loading/error/success/offline), **Scenarios**, **Use cases**.

---

### 6.1 Landing page — `/`
**Purpose:** Convert visitors; explain what BIMWeb does and why it beats LlamaParse/Pinecone.
**Layout:**
- Sticky nav: logo, anchor links (Features, How it works, Ecosystem, Docs), Sign in, Get started.
- Hero: headline + subhead + CTA "Start free" + secondary "See live demo" (opens a read-only viewer with sample model).
- "How it works" 3-step: Upload BIM model → Ask questions → See answers on the 3D model.
- Features grid (6): 3D BIM Viewer, Tri-Modal Search, Document Ingestion, Team Collaboration, API Access, Platform Health — each with icon + 1-line plain description.
- Comparison strip: BIMWeb vs LlamaParse vs Pinecone (BIM+3D, graph retrieval, self-hostable, model-agnostic).
- Ecosystem diagram (BIMWeb → BIMAgent → BIMIndex/BIMExtract, BIMCloud gateway).
- Footer: links, repo, status.
**States:** signed-in → replace CTAs with "Go to dashboard"; demo viewer loading skeleton.
**Scenarios:** anonymous visitor; returning signed-in user; mobile.

---

### 6.2 Onboarding (first-run overlay) — `/dashboard?onboarding=1`
**Purpose:** Guide Maya to value in 5 minutes.
**Steps (checklist persisted on `users`):**
1. Create a workspace (auto-create "My workspace" if skipped).
2. Create your first project.
3. Upload a BIM model (IFC/glTF).
4. Open it in the 3D viewer.
5. Ask your first research question.
6. Invite a teammate (optional).
**UI:** Right-docked `Sheet` with progress ring, skipable, resumes on next login. Each step links to the right page and auto-opens the relevant dialog.
**States:** not started, in progress, completed, dismissed; each step pending/done.
**Scenarios:** brand-new user; returning user who skipped; user who completed all.

---

### 6.3 Overview — `/dashboard`
**Purpose:** Mission control; answer "what's happening and what should I do next?"
**Layout:**
- `PageHeader`: "Welcome, {firstName}" + workspace name.
- **Onboarding checklist** card (if incomplete) with CTA to next step.
- **Real stat cards** (replace fake ones): Projects, Models, Team members, Indexed documents — all live counts; show skeleton while loading; show "—" if zero.
- **Recent projects** (4 cards) with model counts and "Open".
- **Recent activity** (audit-driven, replaces placeholder): last 10 audit events (created project, uploaded model, invited member, shared, searched). Real from `audit_logs`.
- **Platform health summary**: 4 `ConnectionBadge`s (BIMAgent/BIMIndex/BIMCloud/BIMExtract) with overall status + "View health".
- **Quick actions**: New project, Upload model, Ask research, Invite.
**States:** loading skeletons; empty workspace (all zero → big "Create your first project" CTA); partial ecosystem down (amber banner + start instructions).
**Scenarios:** first-run empty; active user; some backends offline.

---

### 6.4 Projects — `/dashboard/projects`
**Purpose:** Manage BIM projects.
**Layout:**
- `PageHeader` + primary "New project".
- Toolbar: **functional** search (client filter), sort (Recent / Name / Models count), view toggle (Grid / Table).
- Cards: icon, name, description, **model count**, **member count**, owner, updated date, "⋯" menu (Open, Edit, Duplicate, Share, Delete).
- Whole card clickable → project detail.
**Create dialog:** name, description, workspace (defaults current), template (empty / sample).
**States:** empty first-run ("Create your first project"), empty search ("No matches"), loading skeleton, delete confirm, error toast.
**Scenarios:** create; edit; delete with cascade warning; duplicate; search miss; touch device (no hover).

---

### 6.5 Project Detail — `/dashboard/projects/[id]`
**Purpose:** Single project workspace; **URL-synced tabs** so refresh/links keep context.
**Layout:**
- Breadcrumbs: Workspace / Projects / {name}.
- Header: project name, description, owner, created date, member count, **Edit** & **Delete** (admin only), **Share**.
- `SegmentedTabs` (URL `?tab=`):
  - **Models** (count badge)
  - **Documents** (count badge) — project-scoped ingestion
  - **Team** (count badge)
  - **Insights** — analytics for this project
  - **Settings** — project config
**Models tab:**
- "Upload model" (uploads **into this project**, not global).
- Grid of model cards; **click opens the viewer** at `/dashboard/projects/[id]/models/[modelId]` (not the global models page).
- Each card: thumbnail/preview, name, size, status (real), "Open", "⋯" (Rename, Delete).
**Documents tab:** project-scoped document ingestion (see 6.10).
**Team tab:** real project-scoped members + invite (see 6.11), not a placeholder.
**Insights tab:** per-project analytics (searches, uploads, views) from PostHog/audit.
**Settings tab:** name/description edit, danger zone (delete), sharing visibility, default viewer settings.
**States:** not found (custom 404 with "Back to projects"), loading, empty per tab, permission denied (viewer sees read-only tabs).
**Scenarios:** owner vs editor vs viewer; open model; share; delete; tab persistence via URL.

---

### 6.6 3D Viewer (full page) — `/dashboard/projects/[id]/models/[modelId]`
**Purpose:** The hero. Real BIM viewing + measurement + sections + tree + ecosystem link.
See **§7** for the full feature spec. Key UX:
- Full-screen route (not a side pane), with a back button + breadcrumbs + model name.
- Onboarding tour on first open (orbit, measure, section, tree).
- Real IFC loading via `web-ifc` (not silent fallback). Unsupported files show a clear error with supported formats.
- Measurement **shows the distance** as a floating label + in a results panel.
- Section planes have **sliders** to move the cut and axis lock.
- Model tree reflects **actual loaded geometry**, not hardcoded layers.
- Toolbar buttons have **labels + tooltips**, not mystery icons.
- Keyboard shortcuts (O orbit, M measure, S section, R reset, F fullscreen, H help).
**States:** loading with progress, parse error, unsupported format, empty (no model), low-perf warning, WebGL unsupported.

---

### 6.7 Models (global) — `/dashboard/models`
**Purpose:** Cross-project model browser (kept for power users; project detail is the primary path).
- Table/grid with **project column**, filter by project, sort.
- "Upload model" with project selector.
- Click → viewer route with project context.
- Same states as before but real status + no fake "GPU Accelerated".

---

### 6.8 Research (rename Search) — `/dashboard/research`
**Purpose:** Ask questions about your BIM knowledge base; get grounded answers with citations. This is the LlamaParse/Pinecone competitor surface.
**Layout:**
- `PageHeader`: "Research" + "Ask questions across your BIM documents and models."
- **Connection banner** if any backend down: "Search backend offline — start BIMAgent/BIMIndex. [How?]"
- Big search input with **example query chips** ("What fire rating is required for floor 3?", "Show specs for curtain wall glazing", "Summarize the structural report").
- **Mode selector** as plain segmented control:
  - **Smart (Recommended)** → BIMAgent (`/query`) — synthesized answer.
  - **Quick keyword** → BIMIndex `vectorless`.
  - **Semantic** → BIMIndex `dense`.
  - **Relationships** → BIMIndex `graph`.
- **Answer panel:** synthesized response, **source cards** (title, snippet, score, source backend, "Open" if linked to a document/model), **"How this answer was built"** expandable showing trace steps in plain language (not raw JSON).
- **History sidebar:** last queries (per user, persisted in a new `search_history` table or localStorage).
- **Linked 3D highlight:** when a source references a model element, show a "Show on model" button that opens the viewer and highlights the element.
**States:** empty (examples + no history), loading (skeleton + "Searching…"), no results, partial (some modes down), error (friendly + retry + start-backend hint), success with sources.
**Scenarios:** first search; switch modes; click source; offline backend; graph vs keyword difference; re-run from history.
**Use cases:** architect querying specs; engineer checking loads; PM summarizing report.

---

### 6.9 Documents & Ingestion — `/dashboard/documents` (+ project tab)
**Purpose:** Surface **BIMExtract** as a user feature: "Add documents to your searchable knowledge base."
**Layout:**
- `PageHeader` + "Upload documents".
- Upload dropzone (PDF, images, text; clearly states "Documents" not BIM models).
- **Pipeline status table:** document, type, status (Queued → Parsing → Building index → Ready / Failed), progress, actions (Re-run, Delete, View chunks).
- **Indexed documents list:** title, chunks, last indexed, searchable toggle.
- "Run ingestion" triggers BIMExtract pipeline via BIMAgent (or direct BIMExtract client — add `BIMExtractClient`).
**Data flow:** upload → storage → `POST /pipeline/ingest` → poll status → index into BIMIndex `/ingest`.
**States:** empty ("Upload your first document"), uploading, parsing (animated), indexing, ready, failed (error + retry), backend offline.
**Scenarios:** upload one PDF; batch upload; re-index after edit; delete; backend down; large file (progress).
**Use cases:** ingest spec sheets, structural reports, manufacturer PDFs so Research can answer from them.

---

### 6.10 Team — `/dashboard/team`
**Purpose:** Real collaboration management.
**Layout:**
- `PageHeader` + "Invite member".
- Members table: avatar (real name/photo from Kinde where available), name, email, **role (editable dropdown)**, project assignment (editable), status (Pending/Joined — real via invite token), invited date, "⋯" (Resend, Remove).
- Filter by project.
**Invite dialog:** email, project, role (with plain descriptions: Admin = full control, Editor = upload/edit, Viewer = read only). On submit → `addTeamMember` **+ `sendInviteEmail()`** (wire the existing email lib) → toast "Invitation sent to {email}".
**Acceptance flow:** email link to `/invite?token=…` → if logged in & not already a member → join; if logged out → login then join; if already joined → redirect. Status flips Pending→Joined.
**Role change:** inline select → `updateTeamMemberRole` (new action) → toast.
**States:** empty, pending invites shown distinctly, resend cooldown, remove confirm, email send failure (toast + retry), no projects (warning + link).
**Scenarios:** invite new user; invite existing user; resend; change role; remove; viewer tries admin action (blocked + toast "You need Admin rights").

---

### 6.11 Settings — `/dashboard/settings` (tabbed)
**Purpose:** Real configuration, not read-only badges.
**Tabs (URL-synced):**
- **Profile:** edit first/last name (write to Kinde/DB), avatar, email (read-only w/ "managed by Kinde" tooltip).
- **Appearance:** dark/light/system toggle (persist in `localStorage` + cookie).
- **Notifications:** toggles for invite/shared/project emails (backed by a `notification_preferences` column/table).
- **Workspace:** rename, default project visibility, danger (delete workspace — admin only).
- **API Keys:** link/summary to `/dashboard/api-keys`.
- **Danger zone:** delete account.
**Remove** the fake "Platform Infrastructure" badges; move real infra status to Platform Health.

---

### 6.12 API Keys — `/dashboard/api-keys` (NEW — T-WEB-13)
**Purpose:** Let Sam generate/manage keys and access API docs.
**Layout:**
- `PageHeader` + "Create key".
- Keys table: label, key (masked `sk-…••••`), created, last used, rate limit, status (Active/Revoked), "⋯" (Copy, Revoke, Rotate).
- Create dialog: label, per-key rate limit (req/min), scope (projects:read, models:write, etc.).
- **On create:** show full key **once** with copy button + warning "You won't see this again."
- **API docs:** link to `/api/docs` (Scalar/Swagger) + "OpenAPI schema" download.
- Usage sparkline per key (from a lightweight `api_key_usage` log or audit).
**Schema:** new `api_keys` table (see §12).
**States:** empty ("Create your first API key"), created-once reveal, revoked, copy toast, no keys.
**Scenarios:** create, copy, rotate, revoke, hit rate limit (API returns 429 with clear message), per-key identity in REST responses.

---

### 6.13 Audit Log — `/dashboard/audit` (NEW)
**Purpose:** Surface `audit_logs` for accountability.
**Layout:**
- Filters: actor, action type, target, date range.
- Table: timestamp, actor (name+avatar), action (plain: "Created project X"), target link, metadata (expandable).
- Export CSV/JSON.
**States:** empty ("No activity yet"), loading, filtered-empty, error.
**Scenarios:** admin reviews team activity; filter by member; export for compliance.

---

### 6.14 Platform Health (rename Deployments) — `/dashboard/health`
**Purpose:** Show the 4-service ecosystem status and a safe test-query playground.
**Layout:**
- 4 `ServiceCard`s: **BIMAgent, BIMIndex, BIMExtract, BIMCloud** — each with `ConnectionBadge`, version, latency, region (BIMCloud), key sub-status (BIMCloud: circuit breaker closed/open/half-open; BIMIndex: modes available; BIMExtract: skills; BIMAgent: session store).
- "Start platform" callout with `./start-platform.sh` snippet when a service is offline.
- **Test query** card: input + "Run through gateway" → shows answer, **trace as a timeline** (not raw JSON), latency, trace_id, status. Circuit-breaker state explained in plain words ("Protected — retrying shortly").
- BIMCloud `/metrics` summary (requests, error rate, p95 latency) as small charts.
- Regions list (from BIMCloud health `region`).
**States:** all healthy, partial outage (amber), gateway open (red + explanation), offline (instructions), loading, test-query success/error.
**Scenarios:** health check; run test query; circuit breaker opens; region failover; copy start command.

---

### 6.15 Workspaces — surfaced via switcher + Settings
**Purpose:** Multi-tenant isolation (T-WEB-12) becomes visible.
- Workspace switcher in sidebar lists `getUserWorkspaces()` + "Create workspace".
- All data-scoped pages pass `workspaceId` from the active workspace (server components read current workspace from URL/cookie).
- Settings → Workspace tab for rename/delete/transfer.
**States:** single workspace (switcher shows one), multiple, create dialog, switch confirmation.
**Scenarios:** user in Workspace A cannot see B; create workspace; switch; delete workspace.

---

## 7. 3D Viewer Feature Spec (deep)

**Route:** `/dashboard/projects/[id]/models/[modelId]` (full screen) + embedded option in project detail.

### 7.1 Loading & format support
- Use `web-ifc` (already a dep + `src/lib/ifc/parser.ts`) to load `.ifc` into three.js geometry. Wire the parser into the viewer (today only GLTF loads).
- Supported: `.gltf`, `.glb`, `.ifc`. Unsupported (`.obj`, `.fbx`) → show clear toast "Format not supported yet. Convert to glTF or IFC." (remove them from the upload accept list until supported, or implement loaders).
- On parse error → error panel with "Try another file" + "Report issue"; never silently show the fake building.
- Loading overlay: real progress (bytes / parsing stages), not an indeterminate spinner.

### 7.2 Controls (labeled toolbar, left dock)
| Tool | Label | Behavior |
|---|---|---|
| Orbit | "Orbit" | Default; drag to rotate. |
| Pan | "Pan" | Right-drag / two-finger. |
| Measure | "Measure" | Click two points → line + **floating distance label (m)** + entry in "Measurements" panel; clear button. |
| Section | "Section" | Choose axis X/Y/Z → plane appears + **slider** to move it + flip button + lock. Multiple planes allowed. |
| Tree | "Model Tree" | Real scene hierarchy from loaded geometry; click → isolate/highlight; checkbox → show/hide. |
| Layers | "Layers" | If IFC classification available, group by IfcWall/IfcSlab/IfcColumn etc. (replaces hardcoded 6 items). |
| Reset | "Reset view" | Camera + clear measurements/sections. |
| Fullscreen | "Fullscreen" | Toggle. |
| Screenshot | "Screenshot" | Download PNG. |
| Help | "Help" | Keyboard shortcuts + tour. |

### 7.3 Keyboard shortcuts
`O` orbit, `P` pan, `M` measure, `S` section, `T` tree, `R` reset, `F` fullscreen, `Esc` exit tool/fullscreen, `H` help.

### 7.4 States
loading (progress), ready, parsing-ifc (stage labels), unsupported-format, webgl-unsupported, low-fps (optional perf monitor), empty.

### 7.5 Scenarios
open glTF; open IFC; measure distance between two columns; section through floors; isolate wall type in tree; screenshot; reset; unsupported file; large model (perf warning).

---

## 8. Ecosystem Integration UX

Map each backend to a **user-facing feature** with plain names:

| Backend | User feature | UI location | Plain label |
|---|---|---|---|
| BIMAgent | Research (Smart) | /dashboard/research | "Smart Search" |
| BIMIndex | Research (Quick/Semantic/Relationships) + indexed docs | /dashboard/research, /documents | "Keyword / Semantic / Relationships" |
| BIMExtract | Documents ingestion pipeline | /dashboard/documents | "Add documents" |
| BIMCloud | Platform Health + test query | /dashboard/health | "Platform Health" |

Add a **`BIMExtractClient`** to `api-clients.ts` (skills, pipeline trigger + poll, parsers, graph) so Documents page can orchestrate ingestion. Keep BIMAgent as the orchestrator path for Smart Search.

**Offline handling:** every page that calls a backend shows a `ConnectionBanner` with the service name, a one-line explanation, and the exact `./start-platform.sh` command. Never dump env-var hints at end users.

---

## 9. Gap Closure — T-WEB-13: Public REST API

### 9.1 Schema (`src/db/schema.ts`)
New `apiKeys` table:
```
id, userId (fk users.kindeId), label, keyHash (not plaintext), prefix (sk-xxxxx…),
scopes (text[]), rateLimitPerMin (int default 60), lastUsedAt, revokedAt, createdAt.
```
Plaintext key shown only once at creation; store `sha256(key)`.

### 9.2 Auth rewrite (`validateApiKey`)
- Look up key by `prefix`, compare hash, check `revokedAt`.
- Return `{ userId, scopes, rateLimitPerMin }` → real per-user identity.
- Per-key in-memory rate limit (upgrade to Redis/Upstash later — note as TODO).

### 9.3 Endpoint coverage (v1)
| Resource | Methods |
|---|---|
| `/api/v1/projects` | GET, POST |
| `/api/v1/projects/[id]` | GET, PATCH, DELETE |
| `/api/v1/models` | GET, POST |
| `/api/v1/models/[id]` | GET, DELETE |
| `/api/v1/team` | GET, POST |
| `/api/v1/team/[id]` | DELETE, PATCH (role) |
| `/api/v1/search` | POST (mode param) |
| `/api/v1/documents` | GET, POST (ingest) |
| `/api/v1/audit` | GET |

### 9.4 Docs
- Generate OpenAPI 3.1 schema (a `src/lib/openapi.ts` spec or `@hono/zod-openapi`-style). Serve at `/api/v1/openapi.json`.
- Serve Scalar UI at `/api/docs` (or Swagger). Link from API Keys page.

### 9.5 Security (Pro verify mandatory)
- Key hashing, constant-time compare, scope checks per endpoint, 429 with `Retry-After`, audit log on key create/revoke/revoke.

---

## 10. Gap Closure — T-WEB-1: Tests

### 10.1 Unit tests (Vitest) — cover all `lib/*`
| Module | Test cases |
|---|---|
| `rbac.ts` | role hierarchy, requireRole allow/deny, project access for owner/member/non-member, viewer blocked from write, admin allowed. |
| `sharing.ts` | share/unshare, getSharedProjects only returns shared, audit entry created. |
| `storage.ts` | local write path, MIME allowlist reject, size limit reject, path traversal blocked, S3 branch (mock). |
| `workspace.ts` | create, get, list, isolation (user A ≠ B). |
| `api-clients.ts` | (exists) extend: BIMExtractClient, timeout, all error statuses. |
| `ifc/parser.ts` | parse sample IFC → elements, geometry, properties, classification (mock web-ifc). |
| `audit.ts` | logAction writes, getAuditLogs filters by user, Sentry hook called on failure (after §11). |
| `actions.ts` | createProject/getProjects/deleteModel with mocked db + auth. |

### 10.2 Component tests (RTL)
- Projects empty state, create dialog, model viewer mounts, search result card, team invite form validation, API key one-time reveal.

### 10.3 E2E (Playwright) — primary journeys
1. Auth: landing → sign in → dashboard.
2. Onboarding checklist completion.
3. Project CRUD (create, edit, delete).
4. Upload IFC → viewer opens with real geometry.
5. Measurement shows distance.
6. Research: ask → answer + sources.
7. Documents: upload → pipeline → ready.
8. Team: invite → accept (second context) → role enforced.
9. API key: create → copy → call API → revoke.
10. Audit log filters.
11. Platform Health → test query.
12. Workspace isolation (A can't see B).

### 10.4 Coverage target ≥ 80% for `src/lib/*`; CI gate.

---

## 11. Gap Closure — T-WEB-5: Sentry Alerting

- Add `@sentry/nextjs` (or lightweight `Sentry` SDK).
- In `audit.ts` `logAction` catch → `Sentry.captureException(error, { extra: { action, targetType, targetId } })` when `NODE_ENV === "production"` and `SENTRY_DSN` set.
- Add `SENTRY_DSN` to `.env.local.example`.
- Add a global `sentry.*` config + `instrumentation.ts` hook for server/client error boundaries.
- Unit test: mock Sentry, assert capture on db failure.

---

## 12. Schema Changes (`src/db/schema.ts` + migration)

| Table | Columns | Purpose |
|---|---|---|
| `apiKeys` | id, userId, label, keyHash, prefix, scopes, rateLimitPerMin, lastUsedAt, revokedAt, createdAt | T-WEB-13 |
| `searchHistory` | id, userId, query, mode, createdAt | Research history |
| `documents` | id, workspaceId, projectId?, name, fileUrl, status, chunks, indexedAt, createdAt | Ingestion tracking |
| `notificationPreferences` | id, userId, inviteEmails, sharedEmails, projectEmails | Settings |
| `users` (alter) | add `onboardingState` jsonb, `firstName`, `lastName` | Onboarding + profile |

Generate migration `0002`; push via `pnpm drizzle-kit generate && pnpm drizzle-kit push`.

---

## 13. Master State & Scenario Matrix

For every feature, ensure these states have explicit UI:

| Feature | Empty | Loading | Error | Success | Offline | Forbidden |
|---|---|---|---|---|---|---|
| Projects | ✅ first-run + search-miss | skeleton | toast + retry | toast | n/a | n/a |
| Project detail | per-tab empty | skeleton | 404 card | — | n/a | read-only tabs |
| Viewer | "no model" | progress | parse error toast | render | webgl-unsupported | n/a |
| Research | examples + no history | "Searching…" | friendly + retry | answer+sources | start-backend banner | n/a |
| Documents | "upload first" | pipeline stages | failed+retry | ready | backend banner | n/a |
| Team | "no members" | skeleton | email-fail toast | invite toast | n/a | viewer blocked |
| API keys | "create first" | skeleton | toast | one-time reveal | n/a | admin-only |
| Audit | "no activity" | skeleton | toast | table | n/a | admin-only |
| Health | — | per-card | offline card | healthy | start instructions | n/a |
| Workspaces | one workspace | — | — | switch | n/a | admin for delete |

**Scenario checklist (must-pass before "done"):**
- First run with zero data.
- Returning user with data.
- Touch device (no hover).
- Keyboard only.
- Backend offline.
- Permission denied (viewer → admin action).
- Large file / slow network.
- Error recovery (retry succeeds).
- Tab/URL persistence.
- Multi-workspace isolation.

---

## 14. Implementation Phases & Model Routing

Per `ROUTING.md`. Offload scoring in parentheses.

### Phase A — Foundation (Flash)
A1. Design-system components: `ToastProvider` (sonner), `EmptyState`, `PageHeader`, `ConfirmDialog`, `Breadcrumbs` wiring, `Tooltip` usage, `CommandPalette` (cmdk). (3–5, Flash)
A2. Theme toggle (light/dark). (3, Flash)
A3. Not-found pages (`not-found.tsx`). (3, Flash)
A4. Remove all fake data; replace with real/skeleton/unknown. (4, Flash)

### Phase B — Navigation & Shell (Flash)
B1. Sidebar grouping + prefix active state + badges + collapse. (4, Flash)
B2. Top nav: functional command-palette trigger, real notifications, avatar menu. (4, Flash)
B3. Workspace switcher. (5, Flash→Pro verify — tenant isolation)

### Phase C — Onboarding & Overview (Flash)
C1. Onboarding checklist + persisted state + `Sheet` tour. (4, Flash)
C2. Overview redesign: real stats, recent activity (audit), health summary. (4, Flash)

### Phase D — Projects & Detail (Flash)
D1. Projects list redesign + table view + sort + ⋯ menu. (4, Flash)
D2. Project detail URL-synced tabs + breadcrumbs + contextual upload. (4, Flash)
D3. Custom project 404. (3, Flash)

### Phase E — 3D Viewer (Qwen3 Coder Plus)
E1. Full-screen viewer route. (8, Qwen3 Coder Plus)
E2. Wire `ifc/parser.ts` into viewer; remove silent fallback. (8, Qwen3 Coder Plus)
E3. Measurement readout + panel. (8, Qwen3 Coder Plus)
E4. Section sliders + multiple planes. (8, Qwen3 Coder Plus)
E5. Real model tree + IFC layers. (8, Qwen3 Coder Plus)
E6. Screenshot, fullscreen, keyboard shortcuts, tour. (7, Qwen3 Coder Plus)

### Phase F — Research (Flash→Pro)
F1. Research page redesign: modes, examples, sources, trace timeline. (5, Flash→Pro)
F2. Search history persistence. (4, Flash)
F3. 3D link from sources (when applicable). (6, Qwen3 Coder Plus)

### Phase G — Documents & Ingestion (Flash→Pro)
G1. `BIMExtractClient` in api-clients. (5, Flash→Pro)
G2. Documents page + pipeline status + polling. (6, Flash→Pro)
G3. Index into BIMIndex. (5, Flash→Pro)

### Phase H — Team & Collaboration (Flash→Pro verify — security)
H1. Real email invites (wire `email.ts`). (5, Flash→Pro verify)
H2. Invite acceptance route `/invite?token=`. (6, Flash→Pro verify)
H3. Role change + resend + remove. (5, Flash→Pro verify)
H4. Sharing UI in project detail. (5, Flash→Pro verify)

### Phase I — Settings (Flash)
I1. Tabbed settings, profile edit, appearance, notifications, workspace, danger zone. (4, Flash)

### Phase J — API Keys & REST API (Flash→Pro verify — security)
J1. `apiKeys` schema + migration. (7, Pro)
J2. `validateApiKey` rewrite + per-key rate limit. (7, Flash→Pro verify)
J3. Full v1 endpoints. (6, Flash→Pro verify)
J4. OpenAPI schema + Scalar UI. (5, Flash→Pro verify)
J5. API Keys UI. (4, Flash)

### Phase K — Audit Log & Platform Health (Flash→Pro)
K1. Audit log page + filters + export. (4, Flash→Pro verify)
K2. Platform Health redesign (4 services + metrics + test query timeline). (5, Flash→Pro)
K3. Wire Sentry (T-WEB-5). (6, Pro verify)

### Phase L — Tests (Flash→Pro)
L1. Unit tests for all `lib/*`. (7, Flash write, Pro verify)
L2. Component tests. (5, Flash)
L3. Playwright E2E for 12 journeys. (7, Flash write, Pro verify)
L4. Coverage gate in CI. (5, Flash)

### Phase M — Docs & Polish (Flash)
M1. Update AGENTS.md, TASKS.md, CHANGELOG, README, ROUTING. (3, Flash)
M2. Landing page redesign + comparison. (4, Flash)
M3. Accessibility pass + Lighthouse. (4, Flash)

**Recommended execution order:** A → B → C → D → E (parallel with F) → F → G → H → I → J → K → L → M.

---

## 15. Verification & Acceptance

Per phase:
- `pnpm lint` — 0 errors (warnings allowed but minimized).
- `pnpm build` — passes.
- `pnpm test` — green; coverage ≥ 80% for `src/lib/*` after Phase L.
- Playwright E2E green after Phase L.
- Manual: every state in §13 visually verified.
- Security (Pro verify) for: RBAC, API keys, invites, sharing, workspace isolation, payment-adjacent code.
- No fake data: grep for hardcoded "99.9", "GPU Accelerated", "Status: Joined", "Normal" and remove/replace.

---

## 16. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| IFC parsing perf in-browser | Stream + worker (`web-ifc` web worker); show progress; warn on > X MB. |
| Ecosystem offline during dev | `ConnectionBanner` + `start-platform.sh` instructions; mock fallback in tests. |
| Scope creep | Phased delivery; each phase ships independently usable value. |
| Auth/security regressions | Pro verify on every RBAC/key/invite change; E2E permission specs. |
| Kinde email for invites | Use Resend (already integrated) for invite emails; token in URL. |
| Schema migration on Neon | Generate + review migration; backup before push. |

---

## 17. What "Better than LlamaParse/Pinecone" Looks Like

- **LlamaParse** = parse documents. BIMWeb = parse **and** search **and** visualize on 3D BIM models, with graph + keyword + semantic in one UI.
- **Pinecone** = vector DB. BIMWeb = full tri-modal retrieval (Tantivy + LanceDB + KùzuDB) with a human-in-the-loop 3D convergence layer and guided UX.
- The differentiator is **the 3D canvas + guided workflows**: a practitioner doesn't see JSON — they see their building, their documents, and grounded answers with citations, all in one place.

---

*End of plan. Execute phase by phase, verify each, update docs after every phase.*
