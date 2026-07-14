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
}

interface AuthCtx {
  loading: boolean;
  session: Session | null;
  staff: StaffUser | null;
  signOut: () => Promise<void>;
  refreshStaff: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function loadStaffFor(authUserId: string): Promise<StaffUser | null> {
  // Try direct lookup
  let { data } = await supabase
    .from("v2_users")
    .select("id, restaurant_id, full_name, role, email, avatar_url")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  // If not linked yet, try linking now (matches by email server-side)
  if (!data) {
    const { data: linked } = await supabase.rpc("v2_link_current_user_to_staff");
    if (linked) data = linked as any;
  }
  return (data as StaffUser | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStaff = async () => {
    if (!session?.user) {
      setStaff(null);
      return;
    }
    setStaff(await loadStaffFor(session.user.id));
  };

  useEffect(() => {
    // Listener first
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_OUT") {
        setStaff(null);
      } else if (newSession?.user) {
        // defer to avoid deadlock
        setTimeout(async () => {
          setStaff(await loadStaffFor(newSession.user.id));
        }, 0);
      }
    });

    // Then existing session
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        setStaff(await loadStaffFor(data.session.user.id));
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setStaff(null);
    setSession(null);
  };

  return (
    <Ctx.Provider value={{ loading, session, staff, signOut, refreshStaff }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
