/**
 * Create the caller's restaurant after auth (email or Google).
 * Uses SECURITY DEFINER RPC — required because RLS blocks direct inserts
 * until the user already has a v2_users row.
 *
 * Live signature (taenbelgzntolqzzjsee):
 *   v2_signup_create_restaurant(_city, _full_name, _restaurant_name, _slug, _plan?)
 * Do NOT pass _invite_code — that signature is not deployed and PostgREST 404s.
 */
import { supabase } from "@/integrations/supabase/client";
import { slugifyName } from "@/lib/schemas/onboarding";

export type CreateRestaurantResult =
  | { ok: true; restaurant_id: string; slug?: string; created?: boolean }
  | { ok: false; error: string; needsMigration?: boolean };

function parseSignupPayload(data: unknown): CreateRestaurantResult | null {
  if (!data) return null;
  const d = data as Record<string, unknown>;

  if (d.ok === false) {
    return { ok: false, error: String(d.error ?? "Could not create restaurant") };
  }
  if (d.ok === true && d.restaurant_id) {
    return {
      ok: true,
      restaurant_id: String(d.restaurant_id),
      slug: d.slug ? String(d.slug) : undefined,
      created: Boolean(d.created),
    };
  }
  if (Array.isArray(data) && data[0]) {
    const row = data[0] as Record<string, unknown>;
    const id = row.restaurant_id ?? row.out_restaurant_id;
    if (id) {
      return {
        ok: true,
        restaurant_id: String(id),
        slug: String(row.slug ?? row.out_slug ?? ""),
        created: true,
      };
    }
  }
  if (d.restaurant_id || d.out_restaurant_id) {
    return {
      ok: true,
      restaurant_id: String(d.restaurant_id ?? d.out_restaurant_id),
      slug: (d.slug ?? d.out_slug) as string | undefined,
      created: true,
    };
  }
  return null;
}

export async function createRestaurantForCurrentUser(input: {
  restaurantName: string;
  fullName?: string;
  city?: string;
  plan?: string;
}): Promise<CreateRestaurantResult> {
  const name = input.restaurantName.trim() || "My restaurant";
  const slug = slugifyName(name) || `restaurant-${Date.now()}`;

  // Match live DB args exactly (5-arg). Empty strings are fine for optional fields.
  const { data, error } = await (supabase as any).rpc("v2_signup_create_restaurant", {
    _restaurant_name: name,
    _slug: slug,
    _city: input.city ?? "",
    _full_name: input.fullName ?? "",
    _plan: input.plan ?? "starter",
  });

  if (error) {
    const msg = error.message ?? "";
    if (
      error.code === "PGRST202" ||
      /could not find the function|schema cache/i.test(msg)
    ) {
      return {
        ok: false,
        needsMigration: true,
        error:
          "Signup is not set up on the database yet. Run supabase/emergency/001_unblock_signup.sql in the Supabase SQL Editor, then try again.",
      };
    }
    return { ok: false, error: msg || "Could not create restaurant" };
  }

  const parsed = parseSignupPayload(data);
  if (parsed) return parsed;
  return { ok: false, error: "Unexpected signup response" };
}

/** Detect Google OAuth misconfiguration (missing client secret in Supabase). */
export function isGoogleOAuthMisconfigured(message: string): boolean {
  return /missing oauth secret|unsupported provider|provider is not enabled/i.test(
    message,
  );
}
