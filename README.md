# RestoStack

Multi-tenant restaurant SaaS: gated demo requests, public booking pages, ops dashboard, and a mobile PWA.

**This GitHub repository is the source of truth.** Open it in Cursor on any computer — project context loads from `AGENTS.md` and `.cursor/rules/`.

## Start here (developers)

| Doc | What you get |
|-----|----------------|
| **[AGENTS.md](AGENTS.md)** | Cursor agent brief (read first in any Cursor session) |
| **[INDEPENDENCE.md](INDEPENDENCE.md)** | Own hosting + Supabase — sell without Lovable |
| **[docs/SAAS.md](docs/SAAS.md)** | Invite-beta vs paid self-serve |
| **[docs/SHIP.md](docs/SHIP.md)** | What’s missing to ship (invite beta vs public) |
| **[docs/ACCESS.md](docs/ACCESS.md)** | Live URLs + demo logins |
| **[docs/DEVELOPER.md](docs/DEVELOPER.md)** | Clone, branches, env, run, deploy |
| **[docs/FEATURES.md](docs/FEATURES.md)** | What’s built vs missing |
| **[docs/READINESS.md](docs/READINESS.md)** | Invite-demo vs mass-public blockers |
| **[docs/SUPABASE.md](docs/SUPABASE.md)** | Database project + data gaps |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | App structure |
| **[PRODUCT.md](PRODUCT.md)** | Product surface map |

## Quick start

```bash
git clone git@github.com:RestoStack/2054883SAM.git
cd 2054883SAM
# IMPORTANT: main is nearly empty — check out the latest full-app feature branch
# (see docs/DEVELOPER.md)
npm install
cp .env.example .env   # point at YOUR Supabase for production
npm run dev
```

## Deploy (your infra)

```bash
npm run deploy:cf      # Cloudflare Workers via Wrangler
```

See [INDEPENDENCE.md](INDEPENDENCE.md). Production should not depend on Lovable publish.

## Live

- Canonical: https://restostacks.com (after DNS → your host)  
- Legacy preview may still exist on `*.lovable.app` — treat as optional  
- Sample restaurant (demo mode only): `/demo`  
- Demo admin: `admin@jukebox.com` / `admin1234` (details in `docs/ACCESS.md`)

## Stack

React · Vite · TanStack Router · Supabase · Cloudflare · shadcn/ui · Tailwind · PWA (`/app`)

## Warning

Demo credentials are shared and public by design for sales demos. Do not treat them as production secrets. See `docs/READINESS.md` before any mass-public launch.
