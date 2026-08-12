# Readiness — invite demo vs mass public

## Verdict

| Mode | Ready? |
|------|--------|
| Private / invite demo with sample restaurant | **Yes** — use `/demo` and `docs/ACCESS.md` |
| Mass public self-serve signup + untrusted tenants | **No** — P0 blockers below |

## P0 — must fix before mass public

1. **Public demo credentials** — known admin password + staff PINs on a shared DB  
2. **Demo mixed with “prod” data** — Italian Bistro lives in the same Supabase project as real ops  
3. **RLS / tenant isolation** — role-blind or weak policies are unsafe for untrusted signups  
4. **Predictable PINs / passcodes** — rotate; enforce uniqueness/strength  
5. **Server Pad / POS on global v1 patterns** — tenant leakage risk  
6. **Non-tenant storage or shared buckets** — harden paths and policies  
7. **No real Stripe** — do not sell plans without billing + entitlement enforcement  
8. **Bootstrap / signup abuse** — public create-restaurant paths must be invite-only or rate-limited + verified  

## P1 — before serious growth

- Booking RPC rate limits / abuse controls  
- Lovable-tied Google OAuth assumptions documented or replaced  
- Terms of Service + Privacy Policy  
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
- [x] `/demo` one-click admin path  
- [x] Mobile `/app` PWA  
- [ ] Separate demo Supabase project  
- [ ] Rotated credentials after each public event  
- [ ] Service role never in client or git  

## Data quality notes (live demo snapshot)

Expect occasional junk waitlist names, stale open shifts, empty `v2_order_items`, and zero loyalty transactions until someone runs those flows. Refresh booking dates when demos go stale (see prior demo-sample work).
