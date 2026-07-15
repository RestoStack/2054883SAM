import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
  signOut: () => Promise<void>;
  refreshStaff: () => Promise<void>;
}

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

async function loadPlatformAdmin(): Promise<boolean> {
  // Claim from allowlist if eligible, then report status.
  const { data: claimed } = await supabase.rpc("v2_claim_platform_admin");
  if (claimed === true) return true;
  const { data } = await supabase.rpc("v2_is_platform_admin");
  return data === true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshStaff = async () => {
    if (!session?.user) {
      setStaff(null);
      setPlatformAdmin(false);
      return;
    }
    const [s, p] = await Promise.all([loadStaffFor(session.user.id), loadPlatformAdmin()]);
    setStaff(s);
    setPlatformAdmin(p);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_OUT") {
        setStaff(null);
        setPlatformAdmin(false);
      } else if (newSession?.user) {
        setTimeout(async () => {
          const [s, p] = await Promise.all([
            loadStaffFor(newSession.user.id),
            loadPlatformAdmin(),
          ]);
          setStaff(s);
          setPlatformAdmin(p);
        }, 0);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        const [s, p] = await Promise.all([
          loadStaffFor(data.session.user.id),
          loadPlatformAdmin(),
        ]);
        setStaff(s);
        setPlatformAdmin(p);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setStaff(null);
    setPlatformAdmin(false);
    setSession(null);
  };

  const needsOnboarding = !!session && (!staff || !staff.onboarding_completed_at);

  return (
    <Ctx.Provider
      value={{ loading, session, staff, platformAdmin, needsOnboarding, signOut, refreshStaff }}
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
