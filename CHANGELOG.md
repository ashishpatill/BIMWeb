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
