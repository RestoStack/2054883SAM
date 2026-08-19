# Ship readiness — what is missing

**Verdict:** Ready to launch as **invite-only** with `VITE_SHIP_MODE=launch` (default), on **your** Cloudflare + Supabase ([INDEPENDENCE.md](../INDEPENDENCE.md)). Lovable is not required.

| Mode | Status |
|------|--------|
| **A — Launch (invite-only)** | Ready — default. Launch landing + hardened gates |
| **B — Sales demo** | Ready with `VITE_SHIP_MODE=demo` |
| **C — Public self-serve** | Blocked (remaining P0s below) |

## Launch variation (this branch)

- Homepage uses the **ready-for-launch** surface (`LaunchLanding`) when mode is `launch` or `invite`
- Preview anytime at `/launch`
- Public `/start` + `/signup` closed (optional `VITE_INVITE_CODE`)
- Demo credentials / bootstrap off unless `demo` mode
- Global Server Pad hidden/redirected on launch deploys
- `/terms`, `/privacy`, `/health`
- DB migration: `v2_platform_settings` + signup RPC kill-switch (`allow_public_signup` default **false**)

## Configure

```bash
# Customer-facing launch (default)
VITE_SHIP_MODE=launch

# Sales / investor demo site
VITE_SHIP_MODE=demo

# Optional invite unlock for /signup + onboarding RPC
VITE_INVITE_CODE=your-shared-code

# Force Server Pad on a launch deploy (not recommended)
# VITE_ENABLE_SERVER_PAD=true
```

Apply migration `supabase/migrations/20260812210000_launch_signup_kill_switch.sql` on Supabase before inviting real restaurants.

To allow invite-code signups server-side:

```sql
UPDATE v2_platform_settings
SET signup_invite_code = 'your-shared-code', updated_at = now()
WHERE id = 1;
```

## Still missing before public self-serve (P0)

1. Separate prod Supabase from demo data  
2. Role-aware RLS  
3. Path-scoped storage policies  
4. Tenantized POS (or keep Server Pad off permanently)  
5. Hashed / unique staff PINs  
6. Real Stripe + entitlements  
7. Booking RPC rate limits  

## Launch checklist

- [ ] Deploy with `VITE_SHIP_MODE=launch`  
- [ ] Apply signup kill-switch migration  
- [ ] Confirm `/` shows launch landing; `/start` closed; `/demo` off  
- [ ] Confirm Server Pad not in nav  
- [ ] Confirm `/health` returns ok  
- [ ] Confirm `/terms` + `/privacy`  
- [ ] Onboard first restaurant via platform admin or invite code  
- [ ] Keep `demo` mode only on a separate sales URL  

## Related

- [INDEPENDENCE.md](../INDEPENDENCE.md) · [SAAS.md](./SAAS.md) · [READINESS.md](./READINESS.md) · [FEATURES.md](./FEATURES.md) · [ACCESS.md](./ACCESS.md)
