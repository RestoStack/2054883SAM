# RestoStack — Cursor agent guide

This file is the always-on brief for any Cursor agent opening this repo on any computer.

## What this product is

**RestoStack** is a multi-tenant restaurant SaaS (ops dashboard + public booking + mobile PWA).

- **GitHub:** `RestoStack/2054883SAM` (this repo is source of truth)
- **Live app:** https://restostacks.lovable.app and https://restostacks.com
- **Lovable project ID:** `282aa365-2256-4d7f-ac7b-f277286d2960`
- **Supabase:** project `taenbelgzntolqzzjsee` → `https://taenbelgzntolqzzjsee.supabase.co`

## Read these first

| Doc | Purpose |
|-----|---------|
| [README.md](README.md) | Clone, run, links |
| [docs/ACCESS.md](docs/ACCESS.md) | URLs + demo logins |
| [docs/DEVELOPER.md](docs/DEVELOPER.md) | Env, branches, deploy |
| [docs/FEATURES.md](docs/FEATURES.md) | Built vs missing |
| [docs/READINESS.md](docs/READINESS.md) | Mass-public blockers |
| [docs/SUPABASE.md](docs/SUPABASE.md) | Schema + demo data gaps |
| [PRODUCT.md](PRODUCT.md) | Product surface map |

## Critical working rules

1. **`main` is nearly empty.** Do not build on `main`. Prefer the latest full-app feature branch (see `docs/DEVELOPER.md`). Stack new work on the newest complete branch unless the user says otherwise.
2. **Never commit service role keys.** Anon/publishable key may appear in client defaults; service role stays in local `.env` only.
3. **Landing is gated.** Public CTAs go to “Request a demo” → `waitlist_signups`. Do not re-add Staff login / Create restaurant / `/start` on the marketing homepage unless asked.
4. **Demo sample restaurant** is Italian Bistro (`italian-bistro`). One-click entry: `/demo`. Credentials in `docs/ACCESS.md`.
5. **Tenant key** is `restaurant_id` on `v2_*` tables. Prefer hooks in `src/lib/v2-data.ts`.
6. **Design lock:** green success accent, existing Restostacks admin shell. Do not redesign the whole product when fixing a feature.
7. **Lovable MCP** may need interactive auth on desktop Cursor. Cloud agents often cannot complete Lovable auth — push to GitHub and document; ask the human to auth/publish if needed.

## Quick demo path (for agents verifying UI)

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
