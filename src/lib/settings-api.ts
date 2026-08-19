import { supabase } from "@/integrations/supabase/client";
import {
  hoursUpdateSchema,
  locationUpsertSchema,
  profileUpdateSchema,
  specialHoursSchema,
  teamInviteCreateSchema,
  teamRemoveSchema,
  teamRoleUpdateSchema,
  type HoursUpdateInput,
  type LocationUpsertInput,
  type ProfileUpdateInput,
  type SpecialHoursInput,
  type TeamInviteCreateInput,
  type TeamRemoveInput,
  type TeamRoleUpdateInput,
} from "@/lib/schemas/settings";
import { isMissingDbObject, resolveRestaurantId } from "@/lib/legacy-tenant";

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await (supabase as any).rpc(name, args);
  if (error) return { ok: false as const, error: error.message, missing: isMissingDbObject(error) };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Request failed", missing: false };
  return data as { ok: true; [k: string]: unknown };
}

export type SettingsLocation = {
  id: string;
  name: string;
  public_slug: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  timezone: string | null;
  is_active: boolean;
  /** Primary restaurant row vs extra location stored in integrations */
  kind?: "primary" | "extra";
};

type StoredExtraLocation = {
  id: string;
  name: string;
  public_slug: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  timezone?: string | null;
  is_active?: boolean;
};

function asIntegrationsObject(integrations: unknown): Record<string, unknown> {
  // Live rows sometimes store `integrations: []` — treat arrays as empty object.
  if (!integrations || typeof integrations !== "object" || Array.isArray(integrations)) {
    return {};
  }
  return { ...(integrations as Record<string, unknown>) };
}

function extrasFromIntegrations(integrations: unknown): StoredExtraLocation[] {
  const obj = asIntegrationsObject(integrations);
  const locs = obj.locations;
  if (!Array.isArray(locs)) return [];
  return locs.filter((l) => l && typeof l === "object") as StoredExtraLocation[];
}

async function listLegacyLocations(restaurantId?: string | null) {
  const rid = await resolveRestaurantId(restaurantId);
  if (!rid) return { ok: false as const, error: "No restaurant context", locations: [] as SettingsLocation[] };

  const { data, error } = await supabase
    .from("v2_restaurants")
    .select("id, name, slug, address, city, phone, timezone, integrations")
    .eq("id", rid)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message, locations: [] as SettingsLocation[] };
  if (!data) return { ok: true as const, locations: [] as SettingsLocation[] };

  const primary: SettingsLocation = {
    id: data.id,
    name: data.name,
    public_slug: data.slug,
    address: data.address,
    city: data.city,
    phone: data.phone,
    timezone: data.timezone,
    is_active: true,
    kind: "primary",
  };
  const extras = extrasFromIntegrations(data.integrations).map((l) => ({
    id: l.id,
    name: l.name,
    public_slug: l.public_slug,
    address: l.address ?? null,
    city: l.city ?? null,
    phone: l.phone ?? null,
    timezone: l.timezone ?? null,
    is_active: l.is_active !== false,
    kind: "extra" as const,
  }));
  return { ok: true as const, locations: [primary, ...extras] };
}

async function upsertLegacyLocation(
  input: LocationUpsertInput & { restaurant_id?: string | null },
) {
  const rid = await resolveRestaurantId(input.restaurant_id ?? input.organization_id);
  if (!rid) return { ok: false as const, error: "No restaurant context" };

  const { data: restaurant, error: rErr } = await supabase
    .from("v2_restaurants")
    .select("id, slug, integrations")
    .eq("id", rid)
    .maybeSingle();
  if (rErr) return { ok: false as const, error: rErr.message };
  if (!restaurant) return { ok: false as const, error: "Restaurant not found" };

  const slug =
    (input.public_slug?.trim() ||
      input.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")) || "location";

  // Editing the primary restaurant row
  if (input.location_id && input.location_id === rid) {
    const { error } = await supabase
      .from("v2_restaurants")
      .update({
        name: input.name.trim(),
        slug,
        address: input.address ?? null,
        city: input.city ?? null,
        phone: input.phone ?? null,
        timezone: input.timezone ?? "America/Toronto",
      })
      .eq("id", rid);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, location_id: rid };
  }

  // Extra locations live in integrations.locations (works without org migrations)
  const integrations = asIntegrationsObject(restaurant.integrations);
  const extras = extrasFromIntegrations(integrations);
  const id = input.location_id || crypto.randomUUID();
  const next: StoredExtraLocation = {
    id,
    name: input.name.trim(),
    public_slug: slug,
    address: input.address ?? null,
    city: input.city ?? null,
    phone: input.phone ?? null,
    timezone: input.timezone ?? "America/Toronto",
    is_active: input.is_active !== false,
  };
  const idx = extras.findIndex((l) => l.id === id);
  if (idx >= 0) extras[idx] = next;
  else extras.push(next);
  integrations.locations = extras;

  const { error } = await supabase
    .from("v2_restaurants")
    .update({ integrations: integrations as never })
    .eq("id", rid);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, location_id: id };
}

export async function settingsUpdateProfile(input: ProfileUpdateInput) {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_settings_update_profile", {
    _organization_id: parsed.data.organization_id,
    _name: parsed.data.name,
    _brand_color: parsed.data.brand_color ?? null,
    _logo_url: parsed.data.logo_url || null,
    _timezone: parsed.data.timezone ?? null,
    _currency: parsed.data.currency ?? null,
    _locale: parsed.data.locale ?? null,
  });
}

export async function settingsListLocations(
  organizationId: string | null,
  restaurantId?: string | null,
) {
  if (organizationId) {
    const res = await rpc("app_settings_list_locations", { _organization_id: organizationId });
    if (res.ok && Array.isArray((res as any).locations)) {
      return { ok: true as const, locations: (res as any).locations as SettingsLocation[] };
    }
    if (!("missing" in res && res.missing) && !res.ok) {
      // RPC failed for non-missing reason — still try legacy
      const legacy = await listLegacyLocations(restaurantId);
      if (legacy.ok && legacy.locations.length) return legacy;
      return { ok: false as const, error: res.error, locations: [] as SettingsLocation[] };
    }
  }
  return listLegacyLocations(restaurantId ?? organizationId);
}

export async function settingsUpsertLocation(
  input: LocationUpsertInput & { restaurant_id?: string | null },
) {
  const parsed = locationUpsertSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };

  // Prefer org RPC when organization tables exist; otherwise store on the restaurant row.
  const res = await rpc("app_settings_upsert_location", {
    _organization_id: parsed.data.organization_id,
    _payload: parsed.data,
  });
  if (res.ok) return res;

  const missing =
    ("missing" in res && res.missing) ||
    (!!res.error && /could not find|schema cache|does not exist|PGRST202/i.test(res.error));

  // If we only have a restaurant workspace (no real org), always use legacy storage.
  if (!missing && input.restaurant_id && input.restaurant_id === parsed.data.organization_id) {
    return upsertLegacyLocation({ ...parsed.data, restaurant_id: input.restaurant_id });
  }

  if (!missing && res.error) return { ok: false as const, error: res.error };
  return upsertLegacyLocation({ ...parsed.data, restaurant_id: input.restaurant_id });
}

export async function settingsGetHours(organizationId: string, locationId: string) {
  return rpc("app_settings_get_hours", {
    _organization_id: organizationId,
    _location_id: locationId,
  });
}

export async function settingsUpdateHours(input: HoursUpdateInput) {
  const parsed = hoursUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_settings_update_hours", {
    _organization_id: parsed.data.organization_id,
    _location_id: parsed.data.location_id,
    _hours: parsed.data.hours,
  });
}

export async function settingsListSpecialHours(organizationId: string, locationId: string) {
  return rpc("app_settings_list_special_hours", {
    _organization_id: organizationId,
    _location_id: locationId,
  });
}

export async function settingsUpsertSpecialHours(input: SpecialHoursInput) {
  const parsed = specialHoursSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_settings_upsert_special_hours", {
    _organization_id: parsed.data.organization_id,
    _location_id: parsed.data.location_id,
    _on_date: parsed.data.on_date,
    _open: parsed.data.open ?? null,
    _close: parsed.data.close ?? null,
    _is_closed: parsed.data.is_closed,
    _label: parsed.data.label ?? null,
  });
}

export async function settingsDeleteSpecialHours(organizationId: string, id: string) {
  return rpc("app_settings_delete_special_hours", {
    _organization_id: organizationId,
    _id: id,
  });
}

export async function settingsListTeam(organizationId: string) {
  return rpc("app_settings_list_team", { _organization_id: organizationId });
}

export async function settingsInviteTeam(input: TeamInviteCreateInput) {
  const parsed = teamInviteCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_settings_invite_team", {
    _organization_id: parsed.data.organization_id,
    _email: parsed.data.email,
    _role: parsed.data.role,
  });
}

export async function settingsUpdateMemberRole(input: TeamRoleUpdateInput) {
  const parsed = teamRoleUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_settings_update_member_role", {
    _organization_id: parsed.data.organization_id,
    _membership_id: parsed.data.membership_id,
    _role: parsed.data.role,
  });
}

export async function settingsRemoveMember(input: TeamRemoveInput) {
  const parsed = teamRemoveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_settings_remove_member", {
    _organization_id: parsed.data.organization_id,
    _membership_id: parsed.data.membership_id,
  });
}

export async function settingsGetBilling(organizationId: string) {
  return rpc("app_settings_get_billing", { _organization_id: organizationId });
}

export async function openBillingPortal(organizationId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, error: "Not signed in" };
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-portal`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
        },
        body: JSON.stringify({
          organization_id: organizationId,
          return_url: `${window.location.origin}/settings`,
        }),
      },
    );
    const json = await res.json();
    if (!res.ok || !json.url) return { ok: false, error: json.error ?? "Portal unavailable" };
    return { ok: true, url: json.url };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
