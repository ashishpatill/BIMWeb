# BIMWeb: Human-in-the-Loop 3D Convergence

## The Breakthrough
The final hurdle in realizing the value of the BIMRAG ecosystem is the user experience. Raw JSON outputs and terminal logs, no matter how accurate, fail to provide actionable context for architectural or engineering workflows.

**BIMWeb** is the convergence point where state-of-the-art AI research meets human-in-the-loop validation. It is a modern web application that physically maps the extracted data, relationships, and Tri-Modal search results directly onto 3D building models.

## Ecosystem Integration
BIMWeb serves as the primary interface for the BIMRAG platform. When a user asks a complex query:
1. The request flows through the **BIMCloud** edge gateway.
2. The **BIMAgent** orchestrates the deep research.
3. The **BIMIndex** retrieves the exact structural coordinates.
4. **BIMWeb** renders the results in the browser, highlighting exact bounding boxes and components on the WebGL (three.js) canvas.

![Web Application Convergence](assets/bimweb_premium.png)

### Tech Stack & System Architecture
![BIMWeb Tech Stack Flow](assets/bimweb_excalidraw.png)

This architecture bridges the gap between abstract AI reasoning and tangible, visual engineering data.

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript (Strict Mode) |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **3D Rendering**| three.js (WebGL) |
| **Database** | Neon Postgres + Drizzle ORM |
| **Auth** | Kinde OAuth |

## Getting Started

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.local.example .env.local

# Run the development server
pnpm dev
```
