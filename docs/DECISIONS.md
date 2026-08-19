# DECISIONS.md — Stakeholder locks (2026-08-19)

Confirmed answers before Phase 0. Do not reopen without explicit product change.

| # | Question | Decision |
|---|----------|----------|
| 1 | DHG / Industria structure | **Separate organizations** (not one org with two locations). |
| 2 | Host Stand on day-1 go-live | **Required.** Critical path includes Phase 3 before production invite. |
| 3 | Domains | **Single domain `restostacks.com`** serves marketing redirect, `/app`, and `/book/{slug}`. No `app.restostacks.com` required for v1. |
| 4 | Billing at launch | **Fake payment wall only** — no Stripe keys/webhooks in v1 launch. Funnel still has a pay step; completion sets `subscriptions.status = active` (or `trialing` if trial flag on). Design schema so Stripe can replace the wall later without rewriting tenancy. |
| 5 | Staff auth | **Google SSO and email+password only.** No staff PIN login in MVP. |

## Implications

- Seed/invite **two** orgs for first customers (DHG, Industria), each with their own location(s).
- Phase order to first production tenant: **0 → 1 → 2 → 3 → (4–5 as needed) → 6**, with Host Stand non-optional.
- `platform_settings.billing_provider` = `fake` \| `stripe` (start `fake`).
- Settings → Billing shows plan + “Payment method on file (demo)” until Stripe; no Customer Portal until `billing_provider=stripe`.
- Delete PIN tiles / `pin-{pin}` auth paths in Phase 0.
