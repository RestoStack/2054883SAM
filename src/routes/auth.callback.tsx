import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { createRestaurantForCurrentUser } from "@/lib/create-restaurant";
import { readSelectedPlan } from "@/lib/plans";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing you in — RestoStack" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshStaff } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const oauthError =
          url.searchParams.get("error_description") || url.searchParams.get("error");
        if (oauthError) throw new Error(oauthError);

        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.getSession();
          if (error) throw error;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate({ to: "/signup", replace: true });
          return;
        }

        const meta = (session.user.user_metadata as Record<string, unknown>) ?? {};
        const fullName =
          (meta.full_name as string) ||
          (meta.name as string) ||
          (session.user.email ?? "").split("@")[0] ||
          "Owner";
        const restaurantName =
          (meta.restaurant_name as string) || `${String(fullName).split(/\s+/)[0]}'s restaurant`;

        const { data: staff } = await supabase
          .from("v2_users")
          .select("restaurant_id")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

        if (!staff?.restaurant_id) {
          const created = await createRestaurantForCurrentUser({
            restaurantName,
            fullName,
            plan: readSelectedPlan(),
          });
          if (!created.ok && !created.needsMigration) {
            throw new Error(created.error);
          }
          if (!created.ok && created.needsMigration) {
            await refreshStaff();
            if (!cancelled) navigate({ to: "/onboarding", replace: true });
            return;
          }
        }

        await refreshStaff();
        if (cancelled) return;

        const { data: restaurant } = staff?.restaurant_id
          ? await supabase
              .from("v2_restaurants")
              .select("onboarding_completed_at")
              .eq("id", staff.restaurant_id)
              .maybeSingle()
          : { data: null };

        if (restaurant && !restaurant.onboarding_completed_at) {
          navigate({ to: "/onboarding", replace: true });
        } else {
          navigate({ to: "/app", replace: true });
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || "Could not finish Google sign-in.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, refreshStaff]);

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <div className="text-center max-w-sm">
        {error ? (
          <>
            <p className="text-sm text-rose-600 mb-4">{error}</p>
            <div className="flex flex-col gap-2 items-center">
              <a href="/signup" className="text-sm font-semibold text-emerald-700 underline">
                Back to create account
              </a>
              <a href="/login" className="text-sm text-slate-500 underline">
                Sign in instead
              </a>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="size-6 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600">Finishing sign-in…</p>
          </>
        )}
      </div>
    </div>
  );
}
