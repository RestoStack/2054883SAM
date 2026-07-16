# Running RestoStack without Lovable

Goal: your product is not blocked if Lovable is unavailable, paused, or cancelled.

## What “independent” means

1. **Code** lives in GitHub (this repo).
2. **Database / Auth / Storage** live in a Supabase project you control.
3. **Production site** is deployed from this repo to your host (not only `*.lovable.app`).

Lovable can still be used as an optional editor later, but it must not be required to ship.

## Step 1 — Own the code (done in this repo)

This repository already contains the full Restostacks application export:

- App source under `src/`
- Supabase migrations under `supabase/migrations/`
- Env template: `.env.example`

Optional (recommended): in the Lovable project **Restostacks**, connect **GitHub sync** so future editor changes also land in a repo you own:

1. Open https://lovable.dev/projects/282aa365-2256-4d7f-ac7b-f277286d2960  
2. Connect GitHub (Settings / Git sync)  
3. Prefer the `RestoStack` org, or keep syncing into this repository  

Docs: https://docs.lovable.dev/integrations/git-sync-overview

## Step 2 — Own the database

Today the live trial may still use Lovable Cloud Postgres (Supabase under the hood). To leave that:

### Official path (same project export)

In Lovable: **Cloud → Overview → Advanced** → **Export project data**, download the backup, then restore into **your** Supabase project. Only after a verified restore, remove Lovable Cloud and reconnect your Supabase if you still use the editor.

### Migrations-only path (fresh project)

1. Create a Supabase project at https://supabase.com  
2. Run every file in `supabase/migrations/` in timestamp order  
3. Create storage bucket `restaurant-media` (public read if your booking pages need public images)  
4. Copy Auth settings you need (email confirmations, redirect URLs)  
5. Put the new URL + anon key into `.env` / hosting env vars:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_PROJECT_ID=
```

## Step 3 — Own hosting

Build from this repo:

```bash
npm install
npm run build
```

Deploy the result to Cloudflare (Wrangler config is present), Vercel, Netlify, or any Node-capable host. Set the same Supabase env vars in the host dashboard.

Point your custom domain at that host. Treat `*.lovable.app` as optional, not primary.

## Soft dependency note

`package.json` still lists `@lovable.dev/vite-tanstack-config` — that is a **public npm package** used by Vite, not Lovable Cloud hosting. The app builds with `npm install` on any machine. Replacing it with a plain Vite/TanStack config is optional cleanup later.

## Cutover checklist

- [ ] App runs locally with `.env` pointing at **your** Supabase  
- [ ] Migrations applied; signup + public booking + admin login work  
- [ ] Storage uploads work for logo/cover  
- [ ] Production deploy from this GitHub repo succeeds  
- [ ] Custom domain live  
- [ ] Lovable hosting no longer required for customers  
- [ ] (Optional) Lovable editor disconnected or kept only as a secondary tool  
