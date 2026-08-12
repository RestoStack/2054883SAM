# Ship readiness — what is missing

**Verdict (Aug 2026):** Ready to ship as an **invite-only beta**. Not ready for mass public self-serve.

| Mode | Status |
|------|--------|
| **A — Invite-only beta** | Ready with controls in this branch |
| **B — Sales demo deploy** | Ready with `VITE_SHIP_MODE=demo` |
| **C — Public self-serve** | Blocked (P0s below) |

## What “ship” means here

Operators you invite can run bookings, guests, host stand, menu, staff, marketing drafts, loyalty UI, reports, settings, and mobile `/app`. Prospects request demos from the marketing site. You bill manually.

It does **not** mean open signup, Stripe checkout, real SMS/email send, or untrusted multi-tenant hardening.

## Already good enough (invite beta)

- Gated landing → demo request form
- Core v2 ops (dashboard, bookings, customers, menu, host, floorplan, staff, payroll, reports)
- Mobile PWA shell `/app`
- Guest booking `/book/{slug}`
- Terms `/terms` + Privacy `/privacy`
- Ship mode gates (this branch):
  - Public `/start` + `/signup` closed by default
  - Demo credentials / bootstrap only when demo mode is on
  - Optional `VITE_INVITE_CODE` unlock for signup
  - Server Pad labeled as non-tenant demo POS

## Configure the deploy

```bash
# Invite-only customer beta (default)
VITE_SHIP_MODE=invite

# Sales / investor demo site (Italian Bistro sample)
VITE_SHIP_MODE=demo

# Optional invite unlock for /signup while remaining invite-only
VITE_INVITE_CODE=your-shared-code

# Overrides
VITE_ALLOW_PUBLIC_SIGNUP=false
VITE_ENABLE_DEMO_ACCESS=false
```

Code: `src/lib/ship-mode.ts`.

## Still missing before public self-serve (P0)

1. Separate prod Supabase from demo data  
2. Role-aware RLS (not just `restaurant_id` FOR ALL)  
3. Path-scoped storage policies  
4. Tenantized Server Pad / POS (or permanently disable v1 POS)  
5. Hashed / unique staff PINs; no public demo passwords  
6. Real Stripe + entitlement gating  
7. Server-side invite or verified signup kill-switch (client gates are not enough alone)  
8. Booking RPC rate limits / abuse controls  

## Before serious growth (P1)

- Error monitoring (Sentry or equivalent) + health check  
- CI smoke tests  
- Staging environment  
- Ops inbox for `waitlist_signups`  
- Stronger password policy + force password change for seeded accounts  
- Replace Lovable-tied Google OAuth assumptions if leaving Lovable  

## Polish (P2)

- Live email/SMS providers  
- Real integrations beyond JSON toggles  
- GDPR export/delete  
- Richer offline PWA  
- Order line-item / loyalty demo data quality  

## Launch checklist — invite beta

- [ ] Set `VITE_SHIP_MODE=invite` on the customer-facing deploy  
- [ ] Keep `VITE_SHIP_MODE=demo` only on the sales demo URL (or turn demo off entirely)  
- [ ] Confirm `/start` and `/signup` show invite-only / require invite code  
- [ ] Confirm `/demo` redirects home when demo access is off  
- [ ] Confirm `/terms` and `/privacy` linked from footer  
- [ ] Onboard first real restaurant via platform admin or invite code (not public trial)  
- [ ] Do not point customers at Server Pad for live multi-tenant use  
- [ ] Manual billing / sales email agreed  
- [ ] Rotate any credentials that were shared publicly during demos  

## Related docs

- [READINESS.md](./READINESS.md) — original P0–P2 list  
- [FEATURES.md](./FEATURES.md) — built vs missing product surface  
- [ACCESS.md](./ACCESS.md) — demo URLs (demo mode only)  
- [DEVELOPER.md](./DEVELOPER.md) — run / branches  
