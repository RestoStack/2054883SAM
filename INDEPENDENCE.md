# Running RestoStack as your own SaaS (no Lovable required)

**Goal:** sell and operate Restostacks on infrastructure you own. Lovable is optional tooling — never a runtime dependency.

## Architecture you own

| Layer | What you use | Notes |
|-------|----------------|-------|
| Code | This GitHub repo | Source of truth |
| Auth + DB + Storage | Your Supabase project | Migrations in `supabase/migrations/` |
| App hosting | Cloudflare Workers (Wrangler) | `npm run deploy:cf` |
| Domain | Your DNS (e.g. `restostacks.com`) | Point at Cloudflare, not `*.lovable.app` |
| Google OAuth | Supabase Auth → Google provider | Native; no Lovable OAuth broker |

## One-time cutover

### 1. Own the database

1. Create a project at https://supabase.com (your org).
2. Apply every file in `supabase/migrations/` in timestamp order (SQL editor or CLI).
3. Create storage bucket `restaurant-media` (public read if booking pages need images).
4. Auth → URL configuration: add `https://YOUR_DOMAIN/auth/callback` (and local `http://localhost:5173/auth/callback`).
5. Auth → Providers → Google: enable with your Google Cloud OAuth client (optional until you want Google signup).
6. Set env (local `.env` + host secrets):

```bash
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=YOUR_REF
SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_PROJECT_ID=YOUR_REF
SUPABASE_SERVICE_ROLE_KEY=your-service-role   # server only
VITE_SHIP_MODE=launch
```

If you still have data on Lovable Cloud: **Cloud → Overview → Advanced → Export project data**, restore into your Supabase, then retire Lovable Cloud.

### 2. Own hosting

```bash
npm install
npm run build          # Vite → Nitro → Cloudflare
npm run deploy:cf      # wrangler deploy (requires Cloudflare login)
```

Or connect this repo to Cloudflare Pages / Workers CI and set the same env vars there.

Point `restostacks.com` (and `www`) at that Worker. Treat `*.lovable.app` as disposable.

### 3. Verify

- [ ] `/health` ok on your domain  
- [ ] Email/password admin login  
- [ ] Public booking `/book/{slug}`  
- [ ] Host Stand + dashboard bookings  
- [ ] Google sign-in (if enabled) hits `/auth/callback` without Lovable redirects  
- [ ] No customer traffic depends on lovable.dev  

## Soft leftover (not Lovable Cloud)

`@lovable.dev/vite-tanstack-config` is a **public npm** Vite helper (TanStack Start + Tailwind + Cloudflare plugins). It does not call Lovable hosting. Replacing it with a hand-rolled Vite config is optional cleanup; builds work on any machine with `npm install`.

## Selling SaaS (after independence)

Independence ≠ paid product. Still required for self-serve sales:

1. Stripe Checkout + webhooks + plan entitlements  
2. Separate prod Supabase from demo/sample data  
3. Harden RLS / storage / staff PINs (see `docs/SHIP.md`)  
4. Keep `VITE_SHIP_MODE=launch` on customer URL; run demo mode on a separate sales URL only  

See `docs/SHIP.md` and `docs/SAAS.md`.
