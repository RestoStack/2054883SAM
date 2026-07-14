# RestoStack

Multi-tenant restaurant SaaS: self-serve signup, restaurant setup, public booking pages, and an ops admin backend.

This repository is the **owned source of truth**. You can run and deploy it without Lovable.

## Stack

- TanStack Start / Router + React 19 + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres, Storage, RLS)
- Optional Cloudflare deploy via Wrangler (`wrangler.jsonc`)

## Quick start

1. Create a [Supabase](https://supabase.com) project (your account).
2. Copy env files:

```bash
cp .env.example .env
```

3. Fill in your Supabase URL and anon/publishable key in `.env`.
4. Apply SQL migrations from `supabase/migrations/` in order (Supabase SQL editor or CLI).
5. Install and run:

```bash
npm install
npm run dev
```

## Independence from Lovable

| Piece | Where it lives now |
|-------|--------------------|
| Code | This GitHub repo |
| Database / Auth / Storage | Your Supabase project (migrate off Lovable Cloud) |
| Hosting | Your choice (Cloudflare, Vercel, Netlify, etc.) |

See **[INDEPENDENCE.md](./INDEPENDENCE.md)** for the cutover checklist (GitHub sync, Supabase export, hosting).

## Product map

See **[PRODUCT.md](./PRODUCT.md)** for routes, roles, and the `v2_*` data model.

## Demo notes

If you still point `.env` at an existing shared Supabase project, demo logins and seeded restaurants may work. For production, use **your own** Supabase project and never commit `.env`.
