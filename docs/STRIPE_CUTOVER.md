/**
 * Stripe cutover checklist (Phase 1 ships fake wall only).
 * Do not implement webhooks until `billing_provider=stripe`.
 *
 * Prerequisites
 * - [ ] Org/location/subscription schema live (Phase 0 migrations applied)
 * - [ ] Fake wall verified end-to-end for owner invites
 * - [ ] Team invites skip payment (already by design)
 *
 * Cutover steps
 * 1. Create Stripe products/prices for Starter / Growth / Group; store price IDs in env or `subscriptions.price_id`.
 * 2. Set `v2_platform_settings.billing_provider = 'stripe'`.
 * 3. Replace `/billing/checkout` UI with Stripe Checkout Session (or Payment Element).
 * 4. Add Edge Function webhook: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`.
 * 5. Map webhook events → `subscriptions.status` / period end / customer id.
 * 6. Settings → Billing: show Stripe Customer Portal when provider=stripe; keep “Demo payment on file” when fake.
 * 7. Keep `app_activate_fake_subscription` but refuse when provider ≠ fake (already enforced in RPC).
 * 8. Never commit Stripe secret keys; use Supabase secrets / Cloudflare env only.
 *
 * Rollback
 * - Flip `billing_provider` back to `fake` and platform-grant `subscriptions.status=active` for stuck orgs.
 */
