# Production unblock — do this once

Cloud agents **cannot** open the Supabase Dashboard or store your service role / Google Client Secret. You must do these three Dashboard steps; the app code + SQL below are already in the repo.

## 1. Run SQL (unlocks public booking + super admin)

1. Open https://supabase.com/dashboard/project/taenbelgzntolqzzjsee/sql/new  
2. Paste and run the full contents of `supabase/emergency/002_production_ready.sql`  
3. Confirm it finishes without errors

This creates `v2_public_create_booking` (guest `/book/{slug}`), allowlists super-admin emails, and keeps signup RPC healthy.

## 2. Google Auth

1. Google Cloud Console → create OAuth **Web** client  
2. Authorized redirect URI:  
   `https://taenbelgzntolqzzjsee.supabase.co/auth/v1/callback`  
3. Supabase → **Authentication → Providers → Google** → paste Client ID + **Client Secret** → enable  
4. Supabase → **Authentication → URL Configuration** → add redirect URLs:  
   - `https://restostacks.com/auth/callback`  
   - `https://app.restostacks.com/auth/callback` (if used)  
   - `http://localhost:5173/auth/callback`  
   - your Vercel preview origin `/auth/callback` (or turn off Deployment Protection for OAuth)

Until the Client Secret is set, the app shows a clear email-only message (probe returns `missing OAuth secret`).

## 3. Service role (deploy / CI only)

Supabase → **Project Settings → API** → copy `service_role` into host secrets as `SUPABASE_SERVICE_ROLE_KEY`.  
Never put it in `VITE_*` or the browser.

## Smoke test after SQL

| Step | URL / action |
|------|----------------|
| Owner login | `/login` → `ghassan.owner@restostack-mail.dev` / `RestoStack!Owner2026` → Dashboard shows **Maison Khalil** |
| Host / reservation | `/app/host` — see seeded booking; seat / walk-in |
| Public book | `/book/maison-khalil` — pick slot → confirm |
| Demo book | `/book/italian-bistro` |
| Super admin | `/super-admin-login` → `platform@restostack-mail.dev` / `RestoStack!Platform2026` → restaurant **counts** |
| Google | `/signup` → Continue with Google (after step 2) |

## Deploy

- App: Vercel (or `npm run deploy:cf`) with `VITE_SUPABASE_*` pointing at this project  
- Point `restostacks.com` DNS at that host  
- Claim temporary Vercel deploys or attach a project so previews do not expire
