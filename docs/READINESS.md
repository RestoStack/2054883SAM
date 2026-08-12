# Readiness — invite demo vs mass public

See **[SHIP.md](./SHIP.md)** for the current ship decision and deploy flags.

## Verdict

| Mode | Ready? |
|------|--------|
| Invite-only launch (recommended) | **Yes** — `VITE_SHIP_MODE=launch` |
| Private / sales demo with sample restaurant | **Yes** — with `VITE_SHIP_MODE=demo` |
| Mass public self-serve signup + untrusted tenants | **No** — P0 blockers below |

## P0 — must fix before mass public

1. **Public demo credentials** — known admin password + staff PINs (gated off in invite mode; still exist in demo mode / DB)  
2. **Demo mixed with “prod” data** — Italian Bistro lives in the same Supabase project as real ops  
3. **RLS / tenant isolation** — role-blind or weak policies are unsafe for untrusted signups  
4. **Predictable PINs / passcodes** — rotate; enforce uniqueness/strength; hash at rest  
5. **Server Pad / POS on global v1 patterns** — tenant leakage risk (UI warned; not fixed)  
6. **Non-tenant storage or shared buckets** — harden paths and policies  
7. **No real Stripe** — do not sell plans without billing + entitlement enforcement  
8. **Bootstrap / signup abuse** — client signup is closed by default; still need server-side RPC kill-switch for `v2_signup_create_restaurant`  

## P1 — before serious growth

- Booking RPC rate limits / abuse controls  
- Lovable-tied Google OAuth assumptions documented or replaced  
- Terms of Service + Privacy Policy — **added** (`/terms`, `/privacy`)  
- Staging environment separate from demo  
- Basic monitoring/alerting (errors, auth spikes)  
- Waitlist/demo-request admin inbox (readable `waitlist_signups` for ops)  

## P2 — polish

- Real email/SMS providers  
- Real integrations (Toast, Square, etc.) beyond JSON stubs  
- Per-restaurant custom domains  
- Broader realtime  
- GDPR tooling  
- Order items + loyalty seed quality for demos  

## Safe demo checklist (current)

- [x] Gated landing → demo request form  
- [x] Sample restaurant with bookings/customers/menu  
- [x] `/demo` one-click admin path (demo mode only)  
- [x] Mobile `/app` PWA  
- [x] Public signup closed by default (invite mode)  
- [x] Demo bootstrap disabled when demo access is off  
- [x] Legal pages  
- [ ] Separate demo Supabase project  
- [ ] Rotated credentials after each public event  
- [ ] Service role never in client or git  
- [ ] Server-side signup RPC deny when invite-only  

## Data quality notes (live demo snapshot)

Expect occasional junk waitlist names, stale open shifts, empty `v2_order_items`, and zero loyalty transactions until someone runs those flows. Refresh booking dates when demos go stale.
