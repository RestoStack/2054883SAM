// Supabase Edge Function: create Stripe Checkout Session for /billing/setup.
// Requires secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_STARTER, STRIPE_PRICE_GROWTH
// Optional: STRIPE_PRICE_GROUP
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return json({ error: "Stripe not configured" }, 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const organizationId = body.organization_id as string;
    const planId = body.plan_id as string;
    const successUrl = body.success_url as string;
    const cancelUrl = body.cancel_url as string;
    if (!organizationId || !planId || !successUrl || !cancelUrl) {
      return json({ error: "Missing fields" }, 400);
    }

    const priceMap: Record<string, string | undefined> = {
      starter: Deno.env.get("STRIPE_PRICE_STARTER"),
      growth: Deno.env.get("STRIPE_PRICE_GROWTH"),
      group: Deno.env.get("STRIPE_PRICE_GROUP"),
    };
    const price = priceMap[planId];
    if (!price) return json({ error: `No Stripe price for plan ${planId}` }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Owner check
    const { data: mem } = await admin
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!mem || mem.role !== "owner") return json({ error: "Owner only" }, 403);

    const { data: org } = await admin
      .from("organizations")
      .select("stripe_customer_id, name")
      .eq("id", organizationId)
      .single();

    let customerId = org?.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe(stripeKey, "customers", {
        email: user.email ?? "",
        name: org?.name ?? "",
        "metadata[organization_id]": organizationId,
      });
      customerId = customer.id;
      await admin
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", organizationId);
    }

    const session = await stripe(stripeKey, "checkout/sessions", {
      mode: "subscription",
      customer: customerId!,
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      success_url: successUrl,
      cancel_url: cancelUrl,
      "metadata[organization_id]": organizationId,
      "metadata[plan_id]": planId,
      "subscription_data[metadata][organization_id]": organizationId,
      "subscription_data[metadata][plan_id]": planId,
    });

    return json({ url: session.url, id: session.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

async function stripe(key: string, path: string, form: Record<string, string>) {
  const body = new URLSearchParams(form);
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Stripe error");
  return json;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
