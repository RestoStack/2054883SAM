# Architecture

## High level

```
Browser (Vite SPA)
  ├─ Marketing `/` → DemoRequestDialog → waitlist_signups
  ├─ Auth `/login` `/admin-login` `/demo` `/signup`
  ├─ Ops shell (sidebar) → dashboard, bookings, menu, …
  ├─ Role apps `/host-stand` `/server-app` `/app` (PWA)
  └─ Public `/book/{slug}`
        │
        ▼
Supabase Auth + Postgres (v2_* multi-tenant)
```

## Frontend layout

| Path | Role |
|------|------|
| `src/routes/` | File-based TanStack Router pages |
| `src/routes/__root.tsx` | Root layout, auth gate, public path allowlist |
| `src/components/` | UI including `DemoRequestDialog` |
| `src/lib/v2-data.ts` | Primary data hooks for `v2_*` |
| `src/lib/auth-bootstrap.functions.ts` | Session / restaurant bootstrap |
| `src/integrations/supabase/` | Client + public config defaults |
| `public/` | PWA manifest, service worker, icons |

## Auth flow (simplified)

1. Email/password or staff PIN → Supabase Auth / bootstrap  
2. Resolve `v2_users` + `restaurant_id`  
3. Route by role: dashboard / host / server / mobile `/app`  
4. Public booking stays unauthenticated  

## Mobile PWA

- Manifest: `public/manifest.webmanifest`  
- Service worker: `public/sw.js`  
- Shell: `src/routes/app.tsx` — role tiles + bottom nav  
- Install banner on supporting browsers  

## Design system

Admin: green success accent, sidebar, dense operational cards.  
Public booking: restaurant-branded (Bella Vista–style template).  
Do not replace the design system casually — see frontend design rules when touching marketing surfaces.

## Related docs

- Access & creds: `docs/ACCESS.md`  
- Features: `docs/FEATURES.md`  
- DB: `docs/SUPABASE.md`  
- Product map: `PRODUCT.md`  
