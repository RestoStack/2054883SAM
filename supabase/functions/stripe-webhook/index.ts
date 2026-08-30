// Supabase Edge Function: Stripe webhook → mirror into public.subscriptions.
// Access unlock must read this row — never trust Checkout return alone.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe webhook not configured", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  const raw = await req.text();
  if (!signature) return new Response("Missing signature", { status: 400 });

  // Minimal signature check via Stripe API construct (manual HMAC for Deno).
  const ok = await verifyStripeSignature(raw, signature, webhookSecret);
  if (!ok) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(raw);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created"
    ) {
      const obj = event.data.object;
      const organizationId =
        obj.metadata?.organization_id ||
        obj.subscription_data?.metadata?.organization_id ||
        null;

      let subId = obj.subscription ?? obj.id;
      let status = obj.status ?? "active";
      let customerId = obj.customer ?? null;
      let planId = obj.metadata?.plan_id ?? null;

      if (event.type === "checkout.session.completed") {
        status = "active";
        subId = obj.subscription;
        planId = obj.metadata?.plan_id ?? planId;
      }

      if (!organizationId) {
        console.warn("No organization_id on event", event.type);
        return new Response(JSON.stringify({ received: true, skipped: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const mapped = mapStatus(status);
      await admin.from("subscriptions").upsert(
        {
          organization_id: organizationId,
          stripe_customer_id: customerId,
          stripe_subscription_id: typeof subId === "string" ? subId : null,
          status: mapped,
          plan_id: planId,
          activated_via: "stripe",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" },
      );

      if (customerId) {
        await admin
          .from("organizations")
          .update({ stripe_customer_id: customerId })
          .eq("id", organizationId);
      }
    }

    if (event.type === "customer.subscription.deleted" || event.type === "invoice.payment_failed") {
      const obj = event.data.object;
      const organizationId = obj.metadata?.organization_id;
      if (organizationId) {
        await admin
          .from("subscriptions")
          .update({
            status: event.type === "customer.subscription.deleted" ? "canceled" : "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("organization_id", organizationId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response((e as Error).message, { status: 500 });
  }
});

function mapStatus(s: string): string {
  if (["trialing", "active", "past_due", "canceled", "incomplete", "unpaid"].includes(s)) {
    return s;
  }
  return "active";
}

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): Promise<boolean> {
  // Stripe-Signature: t=timestamp,v1=signature
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v];
    }),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const signed = `${t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v1;
}
