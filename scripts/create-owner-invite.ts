/**
 * Generate an owner_onboarding invitation (Phase 6 §8).
 *
 * Usage (staging or prod — service role required):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   OWNER_EMAIL=owner@dhg.example \
 *   ORG_NAME="DHG" \
 *   npx tsx scripts/create-owner-invite.ts
 *
 * Prints the one-time invite URL. Never commit the raw token.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const email = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
const orgName = (process.env.ORG_NAME ?? "DHG").trim();
const appUrl = (process.env.PUBLIC_APP_URL ?? "https://app.restostacks.com").replace(/\/$/, "");

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("Set OWNER_EMAIL to the DHG owner address");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function tokenHash(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

async function main() {
  const { data: org, error: orgErr } = await sb
    .from("organizations")
    .insert({
      name: orgName,
      timezone: "America/Toronto",
      currency: "CAD",
      locale: "en-CA",
      signup_mode: "invite_only",
    })
    .select("id, name")
    .single();

  if (orgErr) {
    // Org may already exist — look up by name
    const { data: existing } = await sb
      .from("organizations")
      .select("id, name")
      .eq("name", orgName)
      .maybeSingle();
    if (!existing) throw orgErr;
    console.warn(`Using existing org ${existing.id} (${existing.name})`);
    await createInvite(existing.id);
    return;
  }

  await sb.from("subscriptions").upsert({
    organization_id: org.id,
    status: "incomplete",
    plan_id: "starter",
  });

  await createInvite(org.id);
}

async function createInvite(organizationId: string) {
  const raw = randomBytes(32).toString("base64url");
  const hash = tokenHash(raw);
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await sb
    .from("invitations")
    .insert({
      organization_id: organizationId,
      email,
      role: "owner",
      token_hash: hash,
      kind: "owner_onboarding",
      expires_at: expires,
    })
    .select("id, expires_at")
    .single();

  if (error) throw error;

  const inviteUrl = `${appUrl}/invite/${raw}`;
  console.log(
    JSON.stringify(
      {
        ok: true,
        organization_id: organizationId,
        invitation_id: data.id,
        email,
        expires_at: data.expires_at,
        invite_url: inviteUrl,
        note: "Deliver out-of-band. Token is shown once — not stored in plaintext.",
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
