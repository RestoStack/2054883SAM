/**
 * Create the caller's restaurant after auth (email or Google).
 * Uses SECURITY DEFINER RPC — required because RLS blocks direct inserts
 * until the user already has a v2_users row.
 */
import { supabase } from "@/integrations/supabase/client";
import { slugifyName } from "@/lib/schemas/onboarding";

export type CreateRestaurantResult =
  | { ok: true; restaurant_id: string; slug?: string; created?: boolean }
  | { ok: false; error: string; needsMigration?: boolean };

export async function createRestaurantForCurrentUser(input: {
  restaurantName: string;
  fullName?: string;
  city?: string;
  plan?: string;
}): Promise<CreateRestaurantResult> {
  const name = input.restaurantName.trim() || "My restaurant";
  const slug = slugifyName(name) || `restaurant-${Date.now()}`;

  const { data, error } = await (supabase as any).rpc("v2_signup_create_restaurant", {
    _restaurant_name: name,
    _slug: slug,
    _city: input.city ?? "",
    _full_name: input.fullName ?? "",
    _plan: input.plan ?? "starter",
    _invite_code: null,
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

  // RPC may return jsonb or table rows depending on which migration is live.
  if (data?.ok === false) {
    return { ok: false, error: data.error ?? "Could not create restaurant" };
  }
  if (data?.ok === true && data.restaurant_id) {
    return {
      ok: true,
      restaurant_id: String(data.restaurant_id),
      slug: data.slug ? String(data.slug) : undefined,
      created: Boolean(data.created),
    };
  }
  if (Array.isArray(data) && data[0]) {
    const row = data[0];
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
  if (data?.restaurant_id || data?.out_restaurant_id) {
    return {
      ok: true,
      restaurant_id: String(data.restaurant_id ?? data.out_restaurant_id),
      slug: data.slug ?? data.out_slug,
      created: true,
    };
  }

  return { ok: false, error: "Unexpected signup response" };
}

/** Detect Google OAuth misconfiguration (missing client secret in Supabase). */
export function isGoogleOAuthMisconfigured(message: string): boolean {
  return /missing oauth secret|unsupported provider|provider is not enabled/i.test(
    message,
  );
}
