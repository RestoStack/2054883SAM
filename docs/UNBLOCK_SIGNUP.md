# Unblock signup (do this once)

Signup is broken for **two database reasons**, not the UI:

1. **Google:** Supabase returns `Unsupported provider: missing OAuth secret` — Google Client Secret was never saved.
2. **Create restaurant:** `v2_signup_create_restaurant` is missing, and RLS blocks direct inserts into `v2_restaurants`.

## Step A — Paste emergency SQL (2 minutes)

1. Open: https://supabase.com/dashboard/project/taenbelgzntolqzzjsee/sql/new  
2. Paste the contents of `supabase/emergency/001_unblock_signup.sql`  
3. Click **Run**

## Step B — Fix Google (optional but needed for Google button)

1. Open: https://supabase.com/dashboard/project/taenbelgzntolqzzjsee/auth/providers  
2. Enable **Google**  
3. Paste **Client ID** and **Client Secret** from Google Cloud Console  
4. Authorized redirect URI in Google Cloud:  
   `https://taenbelgzntolqzzjsee.supabase.co/auth/v1/callback`  
5. In Supabase → Authentication → URL Configuration, add:  
   - `https://restostacks.com/auth/callback`  
   - `https://restostacks.com/**`

## Step C — Create an account

Use the **public** site (not `*.vercel.app` — those have Vercel SSO):

**https://restostacks.com/signup**

- Prefer **email** until Step B is done  
- After Step A, Create account → restaurant is created → `/app`

Until Step A is run, no client can finish signup. Code cannot fix a missing DB function or Google secret without dashboard access.
