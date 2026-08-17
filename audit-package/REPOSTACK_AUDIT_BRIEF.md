# RestoStack — Claude audit brief

**Archive:** `restostack-source-audit-20260817.tar.gz` (or `.zip`)  
**Branch snapshot:** `cursor/host-stand-mockup-layout-3a05` @ `94779c0`  
**Generated:** 2026-08-17  

## What this package is

Full RestoStack application **source** for security / architecture audit:

- React + Vite + TanStack Router frontend (`src/`)
- Supabase schema & RPCs (`supabase/migrations/`)
- Product / ship docs (`docs/`, `AGENTS.md`, `PRODUCT.md`)
- PWA assets (`public/`)

## Intentionally excluded

| Excluded | Why |
|---------|-----|
| `node_modules/` | Dependencies (reinstall with `npm install`) |
| `.git/` | History noise |
| `.env` | Secrets — never ship |
| `.output/` / build artifacts | Generated |
| Lockfiles | Large; regenerable |

Use `.env.example` + `src/integrations/supabase/config.ts` (public anon defaults only).

## Suggested audit focus

1. **Multi-tenant isolation** — RLS on `v2_*`, `restaurant_id`, storage bucket policies  
2. **Auth** — staff PIN scheme (`pin-{pin}`), demo bootstrap (`auth-bootstrap.functions.ts`), signup RPC kill-switch  
3. **Public surfaces** — `/book/{slug}`, waitlist signup, booking RPCs (rate limits / abuse)  
4. **Server Pad / v1 POS** — global (non-tenant) tables via `pos.functions.ts`  
5. **Ship modes** — `src/lib/ship-mode.ts` (client gates vs server enforcement)  
6. **Secrets** — no service role in client; anon key is public by design  

## How to open for Claude

1. Download / unpack the archive  
2. Attach the folder (or key paths) in Claude  
3. Start with: `REPOSTACK_AUDIT_BRIEF.md`, `docs/SHIP.md`, `docs/READINESS.md`, `AGENTS.md`, then `supabase/migrations/` + `src/lib/`  

## Live refs (context only)

- App: https://restostacks.lovable.app  
- Repo: `RestoStack/2054883SAM`  
- Supabase project ref: `taenbelgzntolqzzjsee`  

## Demo credentials (known public sample — treat as insecure)

See `docs/ACCESS.md`. Do not treat as production secrets.
