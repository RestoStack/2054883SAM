# Selling Restostacks as SaaS

This is the product path **after** you own hosting + Supabase ([INDEPENDENCE.md](../INDEPENDENCE.md)).

## Positioning

Multi-tenant restaurant ops: dashboard, Host Stand, public booking, staff, customers, PWA. Tenant key = `restaurant_id` on `v2_*`.

## Launch tiers

| Tier | Ship mode | Who |
|------|-----------|-----|
| Invite beta | `VITE_SHIP_MODE=launch` | You onboard restaurants manually / invite code |
| Sales demo | `VITE_SHIP_MODE=demo` | Separate URL only — sample Italian Bistro |
| Public self-serve | After P0s in `SHIP.md` | Stripe + hardened tenancy |

## Must-have for paid self-serve

1. **Billing** — Stripe Checkout + Customer Portal; map `price_id` → plan on `v2_restaurants`; webhook updates entitlements  
2. **Clean prod DB** — no shared demo passwords / Italian Bistro in customer prod  
3. **RLS** — role-aware policies; path-scoped storage  
4. **Signup** — turn on `allow_public_signup` (or invite codes) only when billing works  
5. **Support** — terms/privacy already exist; add billing email + status page  

## Already in the product

- Multi-restaurant tenancy + onboarding  
- Invite / signup kill-switch (`v2_platform_settings`)  
- Plan labels in Settings (mailto sales today — replace with Stripe)  
- Platform admin routes for ops  

## Do not block independence on Stripe

You can sell **invite-only** (manual invoices / Founder deals) on your own Cloudflare + Supabase today. Stripe unlocks unattended self-serve.
