# RestoStack — Cursor agent guide

This file is the always-on brief for any Cursor agent opening this repo on any computer.

## What this product is

**RestoStack** is a multi-tenant restaurant SaaS (ops dashboard + public booking + mobile PWA).

- **GitHub:** `RestoStack/2054883SAM` (this repo is source of truth)
- **Primary deploy:** Cloudflare from this repo (`npm run deploy:cf`) — see [INDEPENDENCE.md](INDEPENDENCE.md)
- **Canonical domain:** https://restostacks.com (point DNS at your host; do not require `*.lovable.app`)
- **Supabase:** use **your** project in production env vars (current trial ref may still be `taenbelgzntolqzzjsee`)

## Read these first

| Doc | Purpose |
|-----|---------|
| [README.md](README.md) | Clone, run, links |
| [INDEPENDENCE.md](INDEPENDENCE.md) | Own hosting + DB — no Lovable required |
| [docs/SAAS.md](docs/SAAS.md) | Selling invite-beta vs self-serve |
| [docs/SHIP.md](docs/SHIP.md) | What’s missing to ship + invite vs public |
| [docs/ACCESS.md](docs/ACCESS.md) | URLs + demo logins |
| [docs/DEVELOPER.md](docs/DEVELOPER.md) | Env, branches, deploy |
| [docs/FEATURES.md](docs/FEATURES.md) | Built vs missing |
| [docs/READINESS.md](docs/READINESS.md) | Mass-public blockers |
| [docs/SUPABASE.md](docs/SUPABASE.md) | Schema + demo data gaps |
| [PRODUCT.md](PRODUCT.md) | Product surface map |

## Critical working rules

1. **`main` is nearly empty.** Do not build on `main`. Prefer the latest full-app feature branch (see `docs/DEVELOPER.md`). Stack new work on the newest complete branch unless the user says otherwise.
2. **Never commit service role keys.** Anon/publishable key may appear in client defaults; service role stays in local `.env` only.
3. **Landing is gated.** Default ship mode is **launch** (`src/lib/ship-mode.ts`): ready-for-launch homepage, closed `/start`/`/signup`, Server Pad off. Demo mode only for sales sample. Public CTAs → “Request a demo”.
4. **Demo sample restaurant** is Italian Bistro (`italian-bistro`). One-click entry: `/demo` only when `VITE_SHIP_MODE=demo`. Credentials in `docs/ACCESS.md`. Preview launch landing anytime at `/launch`.
5. **Tenant key** is `restaurant_id` on `v2_*` tables. Prefer hooks in `src/lib/v2-data.ts`.
6. **Design lock:** green success accent, existing Restostacks admin shell. Do not redesign the whole product when fixing a feature.
7. **Do not treat Lovable publish as required.** Ship via GitHub → Cloudflare/Wrangler (or your host). Lovable MCP/editor is optional only.

## Quick demo path (for agents verifying UI)

Requires `VITE_SHIP_MODE=demo` (or `VITE_ENABLE_DEMO_ACCESS=true`).

1. Open `/demo` or `/admin-login`
2. Use “Open Italian Bistro sample” or `admin@jukebox.com` / `admin1234`
3. Mobile shell: `/app` after login
4. Guest book: `/book/italian-bistro`

## Where code lives

- Routes: `src/routes/`
- Data hooks: `src/lib/v2-data.ts`
- Auth bootstrap: `src/lib/auth-bootstrap.functions.ts`
- Supabase client defaults: `src/integrations/supabase/config.ts`
- Migrations: `supabase/migrations/`
- Demo request UI: `src/components/DemoRequestDialog.tsx`
- Mobile PWA: `src/routes/app.tsx`, `public/manifest.webmanifest`, `public/sw.js`
