import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  platformAdmin: boolean;
  needsOnboarding: boolean;
  needsInvite: boolean;
  org: OrgContext;
  needsPayment: boolean;
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
    try {
      const { data: linked } = await supabase.rpc("v2_link_current_user_to_staff");
      if (linked) data = linked as unknown as typeof data;
    } catch {
      /* ignore */
    }
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

async function staffFromOrg(authUserId: string, org: OrgContext): Promise<StaffUser | null> {
  if (!org.available || !org.activeOrganizationId || !org.role) return null;
  const mem = org.memberships.find((m) => m.organization_id === org.activeOrganizationId);
  if (!mem?.legacy_restaurant_id) return null;

  const { data: restaurant } = await supabase
    .from("v2_restaurants")
    .select("onboarding_completed_at")
    .eq("id", mem.legacy_restaurant_id)
    .maybeSingle();

  return {
    id: authUserId,
    restaurant_id: mem.legacy_restaurant_id,
    full_name: "Team member",
    role: orgRoleToStaffRole(org.role),
    email: null,
    avatar_url: null,
    onboarding_completed_at: restaurant?.onboarding_completed_at ?? null,
  };
}

async function loadPlatformAdmin(): Promise<boolean> {
  try {
    const { data: claimed } = await supabase.rpc("v2_claim_platform_admin");
    if (claimed === true) return true;
    const { data } = await supabase.rpc("v2_is_platform_admin");
    return data === true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [org, setOrg] = useState<OrgContext>(EMPTY_ORG);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);
  const hydratingRef = useRef(false);
  const lastHydratedUser = useRef<string | null>(null);

  const hydrate = async (authUserId: string, force = false) => {
    if (hydratingRef.current) return;
    if (!force && lastHydratedUser.current === authUserId) return;
    hydratingRef.current = true;
    try {
      const [s, p, o] = await Promise.all([
        loadStaffFor(authUserId),
        loadPlatformAdmin(),
        loadOrgContext(authUserId),
      ]);
      setOrg(o);
      setPlatformAdmin(p);
      if (s) setStaff(s);
      else setStaff(await staffFromOrg(authUserId, o));
      lastHydratedUser.current = authUserId;
    } catch (e) {
      console.warn("auth hydrate failed", e);
    } finally {
      hydratingRef.current = false;
    }
  };

  const refreshStaff = async () => {
    const current = sessionRef.current;
    if (!current?.user) {
      setStaff(null);
      setPlatformAdmin(false);
      setOrg(EMPTY_ORG);
      lastHydratedUser.current = null;
      return;
    }
    await hydrate(current.user.id, true);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      sessionRef.current = newSession;
      setSession(newSession);

      if (event === "SIGNED_OUT") {
        setStaff(null);
        setPlatformAdmin(false);
        setOrg(EMPTY_ORG);
        lastHydratedUser.current = null;
        return;
      }

      // Only hydrate on real sign-in / initial session — never on TOKEN_REFRESHED
      // (token refresh storms freeze the tab via repeated setState + RPC).
      if (
        newSession?.user &&
        (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED")
      ) {
        setTimeout(() => {
          void hydrate(newSession.user.id, event === "SIGNED_IN");
        }, 0);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      sessionRef.current = data.session;
      setSession(data.session);
      if (data.session?.user) {
        await hydrate(data.session.user.id, true);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    sessionRef.current = null;
    setStaff(null);
    setPlatformAdmin(false);
    setOrg(EMPTY_ORG);
    setSession(null);
    lastHydratedUser.current = null;
  };

  const needsInvite =
    !!session &&
    org.available &&
    org.memberships.length === 0 &&
    !staff &&
    !platformAdmin;

  // Force onboarding when:
  // - no restaurant yet (new signup), or
  // - legacy restaurant exists but setup was never finished (null completed_at).
  // Do NOT use org bootstrap RPCs for legacy restaurant_id users — the wizard
  // updates v2_restaurants / v2_tables directly to avoid the freeze loop.
  const needsOnboarding =
    !!session &&
    !platformAdmin &&
    ((!staff?.restaurant_id &&
      (needsInvite || (!staff && org.available && org.memberships.length === 0))) ||
      (!!staff?.restaurant_id && !staff.onboarding_completed_at));

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

  const value = useMemo(
    () => ({
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
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      loading,
      session,
      staff,
      platformAdmin,
      needsOnboarding,
      needsInvite,
      org,
      needsPayment,
      subscriptionLive,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
