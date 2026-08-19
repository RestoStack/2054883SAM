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

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await (supabase as any).rpc(name, args);
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Request failed" };
  return data as { ok: true; [k: string]: unknown };
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

export async function settingsListLocations(organizationId: string) {
  return rpc("app_settings_list_locations", { _organization_id: organizationId });
}

export async function settingsUpsertLocation(input: LocationUpsertInput) {
  const parsed = locationUpsertSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_settings_upsert_location", {
    _organization_id: parsed.data.organization_id,
    _payload: parsed.data,
  });
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
