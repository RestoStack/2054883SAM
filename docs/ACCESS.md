# Access — URLs, roles, demo logins

Use this anywhere you open the repo in Cursor. These credentials are for the **shared demo tenant** only — not production customer secrets.

## Live URLs

Prefer **your** deployed domain after cutover ([INDEPENDENCE.md](../INDEPENDENCE.md)).

| Surface | URL |
|---------|-----|
| Canonical (production) | https://restostacks.com |
| One-click sample | `/demo` on your domain (requires `VITE_SHIP_MODE=demo`) |
| Admin login | `/admin-login` |
| Staff login | `/login` |
| Mobile PWA shell | `/app` |
| Guest booking (demo) | `/book/italian-bistro` |
| Pitch deck | `/pitchdeck` |

Legacy Lovable preview (`*.lovable.app`) is optional and not required to operate or sell the product.

Local: same paths on `http://localhost:5173` (or whatever Vite prints).

## Demo restaurant

| Field | Value |
|-------|--------|
| Name | Italian Bistro |
| Slug | `italian-bistro` |
| Plan | starter |
| Seed history name | migrations may say “Jukebox”; live brand is Italian Bistro |

## Logins (demo)

| Role | How | Credentials |
|------|-----|-------------|
| Owner / admin | `/demo` or `/admin-login` → “Open Italian Bistro sample” | Email `admin@jukebox.com` / password `admin1234` |
| Optional passcode | On `/admin-login` | `3180` |
| Host (Sophie) | `/login` Staff PIN | PIN `1234` |
| Server (Alex) | `/login` Staff PIN | PIN `1111` |
| Server (Marco) | `/login` Staff PIN | PIN `2222` |

After admin login, open `/app` on a phone (or narrow viewport) for the mobile shell. Install via browser “Add to Home Screen” when the PWA banner appears.

## Lead / demo requests (no public self-serve trial)

Homepage CTAs open **Request a demo** → rows in `waitlist_signups` (name, email, phone, restaurant, best time). Staff should not expect public “Create restaurant” from the marketing page.

Signup/onboarding routes may still exist in code (`/signup`, `/onboarding`) for internal/bootstrap flows — they are not marketing CTAs.

## Platform admin

Emails in `v2_platform_admin_allowlist` can claim platform admin via `v2_claim_platform_admin()` → `/platform`.

**Ready accounts (after running `supabase/emergency/002_production_ready.sql`):**

| Role | URL | Email | Password |
|------|-----|-------|----------|
| Super Admin | `/super-admin-login` | `platform@restostack-mail.dev` | `RestoStack!Platform2026` |
| Restaurant owner | `/login` | `ghassan.owner@restostack-mail.dev` | `RestoStack!Owner2026` |
| Demo restaurant | `/login` | `admin@jukebox.com` | `admin1234` |

Owner restaurant: **Maison Khalil** — booking page `/book/maison-khalil`

Also allowlisted for super admin: `info@dreamlabstudios.ca` (create/login that Auth user, then `/super-admin-login`).

## Supabase (public client)

| Field | Value |
|-------|--------|
| Project ID | `taenbelgzntolqzzjsee` |
| URL | `https://taenbelgzntolqzzjsee.supabase.co` |
| Anon key | Client default in `src/integrations/supabase/config.ts` (env preferred) |

**Never put the service role key in git or Cursor rules.** Use local `.env` only (see `.env.example`).

## Optional: Lovable editor

Lovable is **not** required to run or sell Restostacks. If you still use it as a secondary editor, project id `282aa365-2256-4d7f-ac7b-f277286d2960` may be linked to this GitHub repo. Prefer `npm run deploy:cf` for production.

## Security note for developers

Demo passwords and PINs are **known and shared**. Safe for invite-only demos; **not** safe for mass-public production without rotation, separate demo DB, and hardened RLS. See `docs/READINESS.md`.
