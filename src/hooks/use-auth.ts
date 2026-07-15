import { useAuth as useLibAuth, type StaffUser } from "@/lib/auth";

export type AuthProfile = {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  role: StaffUser["role"];
  restaurant_id: string;
};

/**
 * Thin wrapper around `@/lib/auth` that exposes a `profile` shape
 * expected by settings and similar screens.
 */
export function useAuth() {
  const auth = useLibAuth();
  const profile: AuthProfile | null = auth.staff
    ? {
        id: auth.staff.id,
        full_name: auth.staff.full_name,
        email: auth.staff.email,
        avatar_url: auth.staff.avatar_url,
        role: auth.staff.role,
        restaurant_id: auth.staff.restaurant_id,
      }
    : null;

  return {
    ...auth,
    profile,
    user: auth.session?.user ?? null,
  };
}
