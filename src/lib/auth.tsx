import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  loadOrgContext,
  orgRoleToStaffRole,
  subscriptionIsLive,
  type OrgContext,
} from "@/lib/org";

export type StaffRole = "admin" | "hostess" | "server";

export interface StaffUser {
  id: string;
  restaurant_id: string;
  full_name: string;
  role: StaffRole;
  email: string | null;
  avatar_url: string | null;
  onboarding_completed_at?: string | null;
}

interface AuthCtx {
  loading: boolean;
  session: Session | null;
  staff: StaffUser | null;
  /** Platform operator who can see every restaurant signup. */
  platformAdmin: boolean;
  /** True when staff exists but restaurant onboarding is unfinished. */
  needsOnboarding: boolean;
  /** Signed in but no org membership — needs invite or bootstrap. */
  needsInvite: boolean;
  /** Org model context (empty/unavailable until Phase 0 migration applied). */
  org: OrgContext;
  /** Owner needs fake (or Stripe) payment wall. */
  needsPayment: boolean;
  /** Subscription allows app access (or legacy pre-migration). */
  subscriptionLive: boolean;
  signOut: () => Promise<void>;
  refreshStaff: () => Promise<void>;
}

const EMPTY_ORG: OrgContext = {
  available: false,
  memberships: [],
  activeOrganizationId: null,
  activeLocationId: null,
  role: null,
  subscriptionStatus: null,
  billingProvider: null,
  signupMode: null,
};

const Ctx = createContext<AuthCtx | null>(null);

async function loadStaffFor(authUserId: string): Promise<StaffUser | null> {
  let { data } = await supabase
    .from("v2_users")
    .select("id, restaurant_id, full_name, role, email, avatar_url")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!data) {
    const { data: linked } = await supabase.rpc("v2_link_current_user_to_staff");
    if (linked) data = linked as any;
  }
  if (!data) return null;

  const { data: restaurant } = await supabase
    .from("v2_restaurants")
    .select("onboarding_completed_at")
    .eq("id", (data as StaffUser).restaurant_id)
    .maybeSingle();

  return {
    ...(data as StaffUser),
    onboarding_completed_at: restaurant?.onboarding_completed_at ?? null,
  };
}

/**
 * When org memberships exist but v2_users row is missing, synthesize a staff
 * view from membership + legacy_restaurant_id so existing screens keep working.
 */
async function staffFromOrg(authUserId: string, org: OrgContext): Promise<StaffUser | null> {
  if (!org.available || !org.activeOrganizationId || !org.role) return null;
  const mem = org.memberships.find((m) => m.organization_id === org.activeOrganizationId);
  if (!mem?.legacy_restaurant_id) return null;

  const { data: user } = await supabase.auth.getUser();
  const meta = user.user?.user_metadata ?? {};

  const { data: restaurant } = await supabase
    .from("v2_restaurants")
    .select("onboarding_completed_at")
    .eq("id", mem.legacy_restaurant_id)
    .maybeSingle();

  return {
    id: authUserId,
    restaurant_id: mem.legacy_restaurant_id,
    full_name: (meta.full_name as string) || user.user?.email || "Team member",
    role: orgRoleToStaffRole(org.role),
    email: user.user?.email ?? null,
    avatar_url: null,
    onboarding_completed_at: restaurant?.onboarding_completed_at ?? null,
  };
}

async function loadPlatformAdmin(): Promise<boolean> {
  const { data: claimed } = await supabase.rpc("v2_claim_platform_admin");
  if (claimed === true) return true;
  const { data } = await supabase.rpc("v2_is_platform_admin");
  return data === true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [org, setOrg] = useState<OrgContext>(EMPTY_ORG);
  const [loading, setLoading] = useState(true);

  const hydrate = async (authUserId: string) => {
    const [s, p, o] = await Promise.all([
      loadStaffFor(authUserId),
      loadPlatformAdmin(),
      loadOrgContext(authUserId),
    ]);
    setOrg(o);
    setPlatformAdmin(p);
    if (s) {
      setStaff(s);
    } else {
      setStaff(await staffFromOrg(authUserId, o));
    }
  };

  const refreshStaff = async () => {
    if (!session?.user) {
      setStaff(null);
      setPlatformAdmin(false);
      setOrg(EMPTY_ORG);
      return;
    }
    await hydrate(session.user.id);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_OUT") {
        setStaff(null);
        setPlatformAdmin(false);
        setOrg(EMPTY_ORG);
      } else if (newSession?.user) {
        setTimeout(() => {
          void hydrate(newSession.user.id);
        }, 0);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        await hydrate(data.session.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setStaff(null);
    setPlatformAdmin(false);
    setOrg(EMPTY_ORG);
    setSession(null);
  };

  const needsInvite =
    !!session &&
    org.available &&
    org.memberships.length === 0 &&
    !staff &&
    !platformAdmin;

  // New Google/email accounts (no staff row yet) must reach the wizard.
  // Legacy staff with a restaurant always count as onboarded enough to leave invite limbo.
  const needsOnboarding =
    !!session &&
    !platformAdmin &&
    (needsInvite ||
      (!staff && org.available && org.memberships.length === 0) ||
      (!!staff && !staff.onboarding_completed_at));

  // No org yet → treat as live so AuthGate does not send people to /billing/locked.
  const subscriptionLive = !org.available
    ? true
    : !org.activeOrganizationId
      ? true
      : subscriptionIsLive(org.subscriptionStatus);

  const needsPayment =
    !!session &&
    org.available &&
    !!org.activeOrganizationId &&
    org.role === "owner" &&
    (org.subscriptionStatus === "incomplete" ||
      org.subscriptionStatus === "canceled" ||
      org.subscriptionStatus === "unpaid" ||
      org.subscriptionStatus === null);

  return (
    <Ctx.Provider
      value={{
        loading,
        session,
        staff,
        platformAdmin,
        needsOnboarding,
        needsInvite,
        org,
        needsPayment,
        subscriptionLive,
        signOut,
        refreshStaff,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
