# Unblock signup (do this once)

## Good news (2026-08-19)

Live project `taenbelgzntolqzzjsee` **already has** `v2_signup_create_restaurant`
with signature `(_city, _full_name, _restaurant_name, _slug, _plan?)`.

The app must call that 5-arg form (do **not** pass `_invite_code` — that 404s).

Org tables (`organizations`, Host Stand RPCs, `get_dashboard`) are **not** on live DB.
The app now falls back to `v2_bookings` / `v2_customers` / `v2_tables` so Dashboard,
Reservations, Host Stand, and Guests work after email signup.

## Step A — Create an account (email)

**https://restostacks.com/signup**

Use **email + password** (Google needs Step B).

After signup you land on `/onboarding` then `/app` once the wizard is finished
(or skip where allowed).

## Step B — Fix Google (optional)

1. Open https://supabase.com/dashboard/project/taenbelgzntolqzzjsee/auth/providers  
2. Enable **Google** and paste **Client ID + Client Secret**  
3. Google Cloud redirect URI:  
   `https://taenbelgzntolqzzjsee.supabase.co/auth/v1/callback`  
4. Supabase Auth URL config allow:  
   - `https://restostacks.com/auth/callback`  
   - `https://restostacks.com/**`

## Step C — Only if restaurant create still 404s

Paste `supabase/emergency/001_unblock_signup.sql` in the SQL editor:
https://supabase.com/dashboard/project/taenbelgzntolqzzjsee/sql/new

## Deploy note

`restostacks.com` is the public host. Vercel `*.vercel.app` previews require team SSO
and break Google OAuth. Merge/deploy this branch to production to get the new
onboarding wizard + month-range dashboard on the public site.
