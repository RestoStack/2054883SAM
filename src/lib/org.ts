/**
 * Org/location membership helpers (Phase 1).
 * Gracefully no-ops when Phase 0 migrations are not yet applied.
 */
import { supabase } from "@/integrations/supabase/client";

export type OrgRole = "owner" | "manager" | "host";

export type OrgMembership = {
  organization_id: string;
  role: OrgRole;
  organization_name: string | null;
  location_id: string | null;
  legacy_restaurant_id: string | null;
};

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid"
  | null;

export type OrgContext = {
  /** False when org tables/RPCs are unavailable (pre-migration). */
  available: boolean;
  memberships: OrgMembership[];
  activeOrganizationId: string | null;
  activeLocationId: string | null;
  role: OrgRole | null;
  subscriptionStatus: SubscriptionStatus;
  billingProvider: "fake" | "stripe" | null;
  signupMode: "invite_only" | "open" | null;
};

const EMPTY: OrgContext = {
  available: false,
  memberships: [],
  activeOrganizationId: null,
  activeLocationId: null,
  role: null,
  subscriptionStatus: null,
  billingProvider: null,
  signupMode: null,
};

function isMissingRelation(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message ?? "").toLowerCase();
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

export function subscriptionIsLive(status: SubscriptionStatus): boolean {
  return status === "trialing" || status === "active";
}

/** Map MVP org roles → legacy staff roles used by existing UI. */
export function orgRoleToStaffRole(role: OrgRole): "admin" | "hostess" | "server" {
  if (role === "owner" || role === "manager") return "admin";
  return "hostess";
}

export async function loadOrgContext(authUserId: string): Promise<OrgContext> {
  try {
    const { data: membershipsRaw, error: memErr } = await (supabase as any)
      .from("organization_memberships")
      .select("organization_id, role, organizations(name, legacy_restaurant_id)")
      .eq("user_id", authUserId)
      .eq("is_active", true);

    if (memErr) {
      if (isMissingRelation(memErr)) return EMPTY;
      console.warn("loadOrgContext memberships", memErr.message);
      return EMPTY;
    }

    const { data: ctxRow } = await (supabase as any)
      .from("user_active_context")
      .select("organization_id, location_id")
      .eq("user_id", authUserId)
      .maybeSingle();

    const orgIds = [
      ...new Set((membershipsRaw ?? []).map((m: any) => m.organization_id as string)),
    ];
    const locationsByOrg: Record<string, string> = {};
    if (orgIds.length > 0) {
      const { data: locs } = await (supabase as any)
        .from("locations")
        .select("id, organization_id")
        .in("organization_id", orgIds)
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      for (const loc of locs ?? []) {
        if (!locationsByOrg[loc.organization_id]) {
          locationsByOrg[loc.organization_id] = loc.id;
        }
      }
    }

    const memberships: OrgMembership[] = (membershipsRaw ?? []).map((m: any) => ({
      organization_id: m.organization_id as string,
      role: m.role as OrgRole,
      organization_name: m.organizations?.name ?? null,
      location_id: locationsByOrg[m.organization_id] ?? null,
      legacy_restaurant_id: m.organizations?.legacy_restaurant_id ?? null,
    }));

    let activeOrganizationId =
      (ctxRow?.organization_id as string | null) ??
      memberships[0]?.organization_id ??
      null;

    if (
      activeOrganizationId &&
      !memberships.some((m) => m.organization_id === activeOrganizationId)
    ) {
      activeOrganizationId = memberships[0]?.organization_id ?? null;
    }

    const activeMem = memberships.find((m) => m.organization_id === activeOrganizationId);
    const activeLocationId =
      (ctxRow?.location_id as string | null) ?? activeMem?.location_id ?? null;

    let subscriptionStatus: SubscriptionStatus = null;
    if (activeOrganizationId) {
      const { data: sub, error: subErr } = await (supabase as any)
        .from("subscriptions")
        .select("status")
        .eq("organization_id", activeOrganizationId)
        .maybeSingle();
      if (!subErr && sub) subscriptionStatus = sub.status as SubscriptionStatus;
      else if (subErr && !isMissingRelation(subErr)) {
        console.warn("loadOrgContext subscription", subErr.message);
      }
    }

    let billingProvider: "fake" | "stripe" | null = null;
    let signupMode: "invite_only" | "open" | null = null;
    const { data: settings, error: setErr } = await (supabase as any)
      .from("v2_platform_settings")
      .select("billing_provider, signup_mode")
      .eq("id", 1)
      .maybeSingle();
    if (!setErr && settings) {
      billingProvider = (settings.billing_provider as "fake" | "stripe") ?? "fake";
      signupMode = (settings.signup_mode as "invite_only" | "open") ?? "invite_only";
    }

    return {
      available: true,
      memberships,
      activeOrganizationId,
      activeLocationId,
      role: activeMem?.role ?? null,
      subscriptionStatus,
      billingProvider,
      signupMode,
    };
  } catch (e) {
    console.warn("loadOrgContext failed", e);
    return EMPTY;
  }
}

export async function setActiveOrgContext(input: {
  organizationId: string;
  locationId?: string | null;
}): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return false;
  const { error } = await (supabase as any).from("user_active_context").upsert({
    user_id: uid,
    organization_id: input.organizationId,
    location_id: input.locationId ?? null,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

export async function activateFakeSubscription(organizationId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { data, error } = await (supabase as any).rpc("app_activate_fake_subscription", {
    _organization_id: organizationId,
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error ?? "Activation failed" };
  return { ok: true };
}

export async function fetchSignupMode(): Promise<"invite_only" | "open"> {
  const { data, error } = await (supabase as any)
    .from("v2_platform_settings")
    .select("signup_mode")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data?.signup_mode) {
    // Env ship-mode remains the pre-migration source of truth.
    return "invite_only";
  }
  return data.signup_mode === "open" ? "open" : "invite_only";
}
