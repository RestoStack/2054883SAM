# Developer guide — any machine with Cursor

## Goal

Clone this repo on any computer, open it in Cursor, and have enough context (via `AGENTS.md`, `.cursor/rules`, and `docs/`) to run, demo, and continue building without tribal knowledge.

## Prerequisites

- Node.js 20+ (or current LTS used by the team)
- npm
- Git access to `RestoStack/2054883SAM`
- Cursor (desktop or cloud) — rules load from `.cursor/rules/` and `AGENTS.md`

## Clone and open

```bash
git clone git@github.com:RestoStack/2054883SAM.git
cd 2054883SAM
```

Open the folder in Cursor. Agents should auto-pick up `AGENTS.md` and `.cursor/rules/restostack.mdc`.

## Branch reality (important)

| Branch | Reality |
|--------|---------|
| `main` | Nearly empty initial commit — **do not develop here** |
| Feature branches `cursor/*-3a05` | Real app lives here; stack new work on the newest complete branch |

### Known feature PR line (approximate)

1. `cursor/demo-request-form-3a05` — gated landing + demo request form  
2. `cursor/build-remaining-features-3a05` — menu/customers/staff/loyalty/payroll/marketing/settings  
3. `cursor/mobile-app-pwa-3a05` — `/app` PWA  
4. `cursor/demo-sample-access-3a05` — `/demo` + sample login  
5. `cursor/developer-handbook-3a05` — this documentation pack  

Before coding, check:

```bash
git fetch origin
git branch -a | head -50
# Prefer newest full-app branch tip, or merge-base of open PRs
```

Cloud agents sometimes land on a thin prototype branch — switch to the latest full-app branch before editing.

## Install and run

```bash
npm install
cp .env.example .env   # optional if using client defaults
npm run dev
```

Client Supabase defaults in `src/integrations/supabase/config.ts` match the live project so local/Vercel can work without env. Prefer setting env vars for production.

### Env vars (see `.env.example`)

| Var | Client? | Notes |
|-----|---------|--------|
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | Yes | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | Yes | Anon key |
| `VITE_SUPABASE_PROJECT_ID` / `SUPABASE_PROJECT_ID` | Yes | Project ref |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Never commit; never put in Vite client |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Stack snapshot

- React + Vite + TanStack Router (`src/routes/`)
- Supabase Auth + Postgres (`v2_*` schema)
- shadcn/ui + Tailwind
- Optional Lovable Cloud / Cloudflare vite plugin in tooling
- PWA: `public/manifest.webmanifest`, `public/sw.js`

## Deploy

| Channel | Notes |
|---------|--------|
| Lovable publish | Sync from GitHub / Lovable agent; may need desktop MCP auth |
| Vercel | Ensure `SUPABASE_PUBLISHABLE_KEY` (or Vite equivalents) are set; client defaults exist as fallback |
| Custom domain | `restostacks.com` → live app |

## Continuing work in Cursor (anywhere)

1. Open repo → read `AGENTS.md`  
2. Check out latest full-app branch  
3. Confirm access via `docs/ACCESS.md`  
4. Implement against `docs/FEATURES.md` / `docs/READINESS.md`  
5. Prefer small, focused PRs on `cursor/<name>-3a05` branches  

## Lovable MCP (optional)

Workspace may include Lovable MCP tools for iterate/publish. If tools report `needsAuth`, authenticate in Cursor desktop IDE — cloud agents often cannot complete interactive auth.

## Support files map

```
AGENTS.md                 ← Cursor agents
.cursor/rules/*.mdc       ← always-on Cursor rules
README.md                 ← human entry
PRODUCT.md                ← product surface
docs/ACCESS.md            ← URLs + demos
docs/SHIP.md              ← invite beta vs public ship
docs/DEVELOPER.md         ← this file
docs/FEATURES.md          ← built / missing
docs/READINESS.md         ← public launch blockers
docs/SUPABASE.md          ← DB + data gaps
docs/ARCHITECTURE.md      ← structure
.env.example              ← env template + ship mode
```
