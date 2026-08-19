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

const RPC_TIMEOUT_MS = 20_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out. Check your connection and try again.`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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

/** When RPC says the user already owns a restaurant, resolve it from v2_users. */
async function existingRestaurantForUser(): Promise<CreateRestaurantResult | null> {
  const { data, error } = await supabase
    .from("v2_users")
    .select("restaurant_id")
    .limit(1)
    .maybeSingle();
  if (error || !data?.restaurant_id) return null;

  let slug: string | undefined;
  const { data: rest } = await supabase
    .from("v2_restaurants")
    .select("slug")
    .eq("id", data.restaurant_id)
    .maybeSingle();
  if (rest?.slug) slug = rest.slug;

  return {
    ok: true,
    restaurant_id: String(data.restaurant_id),
    slug,
    created: false,
  };
}

export async function createRestaurantForCurrentUser(input: {
  restaurantName: string;
  fullName?: string;
  city?: string;
  plan?: string;
}): Promise<CreateRestaurantResult> {
  const name = input.restaurantName.trim() || "My restaurant";
  const slug = slugifyName(name) || `restaurant-${Date.now()}`;

  // Idempotent: if staff row already exists, continue without calling create again.
  const existing = await withTimeout(
    existingRestaurantForUser(),
    RPC_TIMEOUT_MS,
    "Looking up restaurant",
  ).catch(() => null);
  if (existing?.ok) return existing;

  // Match live DB args exactly (5-arg). Empty strings are fine for optional fields.
  let data: unknown;
  let error: { message?: string; code?: string } | null = null;
  try {
    const res = await withTimeout(
      (async () =>
        (await (supabase as any).rpc("v2_signup_create_restaurant", {
          _restaurant_name: name,
          _slug: slug,
          _city: input.city ?? "",
          _full_name: input.fullName ?? "",
          _plan: input.plan ?? "starter",
        })) as { data: unknown; error: { message?: string; code?: string } | null })(),
      RPC_TIMEOUT_MS,
      "Creating restaurant",
    );
    data = res.data;
    error = res.error;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create restaurant" };
  }

  if (error) {
    const msg = error.message ?? "";
    if (/already has a restaurant/i.test(msg)) {
      const again = await existingRestaurantForUser();
      if (again?.ok) return again;
    }
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
