import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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
        // Handle both PKCE (?code=) and hash token redirects.
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.getSession();
          if (error) throw error;
        }

        await refreshStaff();
        if (cancelled) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate({ to: "/login", replace: true });
          return;
        }

        const { data: staff } = await supabase
          .from("v2_users")
          .select("restaurant_id")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

        if (!staff?.restaurant_id) {
          navigate({ to: "/onboarding", replace: true });
          return;
        }

        const { data: restaurant } = await supabase
          .from("v2_restaurants")
          .select("onboarding_completed_at")
          .eq("id", staff.restaurant_id)
          .maybeSingle();

        if (restaurant?.onboarding_completed_at) {
          navigate({ to: "/dashboard", replace: true });
        } else {
          navigate({ to: "/onboarding", replace: true });
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
            <a href="/login" className="text-sm font-semibold text-emerald-700 underline">
              Back to sign in
            </a>
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
