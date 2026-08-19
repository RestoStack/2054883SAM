import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  StepBooking,
  StepDone,
  StepHours,
  StepMenu,
  StepRestaurant,
  StepTables,
  StepTeam,
} from "@/components/onboarding/wizard";
import {
  billingVerify,
  onboardingBootstrapOwner,
  onboardingCheckSlug,
  onboardingComplete,
  onboardingGetV1,
  onboardingSaveBooking,
  onboardingSaveHours,
  onboardingSaveMenu,
  onboardingSaveRestaurant,
  onboardingSaveTablesQuick,
  onboardingSaveTeam,
  onboardingSkipTo,
} from "@/lib/onboarding-api";
import { createRestaurantForCurrentUser } from "@/lib/create-restaurant";
import { readSelectedPlan } from "@/lib/plans";
import {
  DEFAULT_BOOKING,
  DEFAULT_HOURS_RANGES,
  canSkipStep,
  slugifyName,
  stepFromParam,
  type BookingStepInput,
  type HoursStepInput,
  type MenuStepInput,
  type RestaurantStepInput,
  type TablesStepInput,
  type TeamStepInput,
} from "@/lib/schemas/onboarding";

export const Route = createFileRoute("/onboarding/$step")({
  head: () => ({ meta: [{ title: "Get set up — RestoStack" }] }),
  component: OnboardingStepPage,
});

function OnboardingStepPage() {
  const { step: stepParam } = Route.useParams();
  const step = stepFromParam(stepParam);
  const { session, loading, org, needsPayment, subscriptionLive, refreshStaff, staff } = useAuth();
  const navigate = useNavigate();

  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(org.activeOrganizationId);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [resumed, setResumed] = useState(false);

  const [restaurant, setRestaurant] = useState<RestaurantStepInput>({
    name: "",
    location_name: "Main",
    address: "",
    city: "",
    phone: "",
    website: "",
    cuisine: "",
    timezone: "America/Toronto",
    google_place_id: null,
    logo_url: null,
  });
  const [hours, setHours] = useState<HoursStepInput>(DEFAULT_HOURS_RANGES);
  const [booking, setBooking] = useState<BookingStepInput>(DEFAULT_BOOKING);
  const [tables, setTables] = useState<TablesStepInput>({
    mode: "quick",
    count: 8,
    seats: 4,
    section: "Main Floor",
    bookable_online: true,
  });
  const [menu, setMenu] = useState<MenuStepInput>({
    mode: "skip",
    link: "",
    items: [],
  });
  const [team, setTeam] = useState<TeamStepInput>({ invites: [] });
  const [slug, setSlug] = useState("");

  useEffect(() => {
    setOrgId(org.activeOrganizationId);
  }, [org.activeOrganizationId]);

  const go = (n: number) => {
    navigate({ to: "/onboarding/$step", params: { step: String(n) }, replace: false });
  };

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }
    // Do not billing-gate the wizard — owners must see onboarding first.

    let cancelled = false;
    (async () => {
      const meta = (session.user.user_metadata as Record<string, unknown>) ?? {};
      const seedName =
        (meta.full_name as string) ||
        (meta.name as string) ||
        (session.user.email ?? "").split("@")[0] ||
        "";

      let id = orgId;
      if (!id) {
        // Legacy staff already has a restaurant — skip bootstrap/create (avoids hang/errors).
        if (staff?.restaurant_id) {
          if (!cancelled) {
            setRestaurant((r) => ({
              ...r,
              name: r.name || (seedName ? `${seedName.split(/\s+/)[0]}'s restaurant` : "My restaurant"),
            }));
            setError(null);
            setBooting(false);
          }
          return;
        }

        const boot = await onboardingBootstrapOwner(
          seedName,
          seedName ? `${seedName.split(/\s+/)[0]}'s restaurant` : "My restaurant",
        );
        if (!boot.ok) {
          // Org schema / bootstrap RPC missing — fall back to legacy v2 signup.
          const legacy = await createRestaurantForCurrentUser({
            restaurantName: seedName ? `${seedName.split(/\s+/)[0]}'s restaurant` : "My restaurant",
            fullName: seedName,
            plan: readSelectedPlan(),
          });
          if (legacy.ok) {
            await refreshStaff();
            // Stay IN the wizard — do not jump to /app. Seed step-1 fields.
            if (!cancelled) {
              setRestaurant((r) => ({
                ...r,
                name: r.name || (seedName ? `${seedName.split(/\s+/)[0]}'s restaurant` : "My restaurant"),
                slug: legacy.slug || r.slug,
              }));
              if (legacy.slug) setSlug(legacy.slug);
              setError(null);
              setBooting(false);
            }
            return;
          }
          if (!cancelled) {
            // Still show the wizard UI so the owner isn't stuck on a blank/error screen.
            setRestaurant((r) => ({
              ...r,
              name: r.name || (seedName ? `${seedName.split(/\s+/)[0]}'s restaurant` : "My restaurant"),
            }));
            setError(
              legacy.needsMigration
                ? `${legacy.error}\n\nOpen /onboarding/1 after running the SQL — the wizard will appear here.`
                : boot.error || legacy.error,
            );
            setBooting(false);
          }
          return;
        }
        id = String(boot.organization_id);
        setOrgId(id);
        await refreshStaff();
      }

      if (!subscriptionLive && id) {
        const verified = await billingVerify(id);
        if (!verified.ok || !verified.live) {
          navigate({ to: "/billing/setup", replace: true });
          return;
        }
      }

      const prog = await onboardingGetV1(id!);
      if (cancelled) return;

      if (prog.ok) {
        // Do not auto-skip the wizard when completed_at is set during emergency signup.
        // Only leave if the user explicitly finished (draft.completed) or asks via dashboard CTA.
        if (prog.completed_at && (prog.draft as any)?.completed === true) {
          navigate({ to: "/app", replace: true });
          return;
        }
        if (prog.location_id) setLocationId(String(prog.location_id));
        if (prog.public_slug) setSlug(String(prog.public_slug));

        const loc = prog.location as Record<string, unknown> | null;
        if (loc) {
          setRestaurant((r) => ({
            ...r,
            name: String(loc.name ?? r.name),
            address: String(loc.address ?? r.address ?? ""),
            city: String(loc.city ?? r.city ?? ""),
            phone: String(loc.phone ?? r.phone ?? ""),
            website: String(loc.website ?? r.website ?? ""),
            cuisine: String(loc.cuisine ?? r.cuisine ?? ""),
            timezone: String(loc.timezone ?? r.timezone),
            google_place_id: (loc.google_place_id as string) ?? null,
            logo_url: (loc.logo_url as string) ?? null,
            slug: String(loc.public_slug ?? r.slug ?? ""),
          }));
          if (!slug && loc.public_slug) setSlug(String(loc.public_slug));
        }

        const draft = (prog.draft as Record<string, unknown>) ?? {};
        if (typeof draft.restaurant_name === "string" && draft.restaurant_name) {
          setRestaurant((r) => ({ ...r, name: draft.restaurant_name as string }));
        }
        if (draft.menu && typeof draft.menu === "object") {
          setMenu((m) => ({ ...m, ...(draft.menu as MenuStepInput) }));
        }

        const last = Number(prog.step) || 1;
        if (!resumed && step !== last && last >= 1 && last <= 7) {
          setResumed(true);
          // Only auto-resume when landing on default step 1 from /onboarding redirect
          if (stepParam === "1" || stepParam === "restaurant") {
            navigate({
              to: "/onboarding/$step",
              params: { step: String(last) },
              replace: true,
            });
            return;
          }
        }
      }

      if (!restaurant.name && seedName) {
        setRestaurant((r) => ({
          ...r,
          name: r.name || `${seedName.split(/\s+/)[0]}'s restaurant`,
        }));
      }

      setBooting(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, orgId, needsPayment, subscriptionLive, staff?.restaurant_id]);

  const requireOrg = () => {
    if (!orgId) {
      setError("Missing organization");
      return false;
    }
    return true;
  };

  /** When org schema isn't migrated yet, still let the owner walk the wizard UI. */
  const continueOrAdvance = async (next: number, save?: () => Promise<boolean>) => {
    if (!orgId || !locationId) {
      setError(null);
      go(next);
      return;
    }
    if (!save) {
      go(next);
      return;
    }
    setBusy(true);
    setError(null);
    const ok = await save();
    setBusy(false);
    if (ok) go(next);
  };

  const skip = async () => {
    if (!canSkipStep(step)) return;
    setBusy(true);
    setError(null);
    const next = Math.min(7, step + 1);
    if (orgId) await onboardingSkipTo(orgId, next);
    setBusy(false);
    go(next);
  };

  const bookingUrlSlug = useMemo(
    () => slug || slugifyName(restaurant.name) || "restaurant",
    [slug, restaurant.name],
  );

  if (loading || booting) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === 1) {
    return (
      <StepRestaurant
        value={restaurant}
        onChange={setRestaurant}
        busy={busy}
        error={error}
        onContinue={async () => {
          if (!restaurant.name.trim()) {
            setError("Restaurant name is required");
            return;
          }
          setBusy(true);
          setError(null);

          // Prefer org wizard RPC; fall back to legacy v2 create.
          if (orgId) {
            const res = await onboardingSaveRestaurant(orgId, {
              ...restaurant,
              slug: restaurant.slug || slugifyName(restaurant.name),
            });
            setBusy(false);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            if (typeof res.location_id === "string") setLocationId(res.location_id);
            if (typeof res.public_slug === "string") setSlug(res.public_slug);
            go(2);
            return;
          }

          const legacy = await createRestaurantForCurrentUser({
            restaurantName: restaurant.name,
            fullName:
              (session?.user.user_metadata as any)?.full_name ||
              session?.user.email?.split("@")[0] ||
              "Owner",
            city: restaurant.city,
            plan: readSelectedPlan(),
          });
          await refreshStaff();
          setBusy(false);
          if (!legacy.ok) {
            setError(legacy.error);
            return;
          }
          if (legacy.slug) setSlug(legacy.slug);
          // Without org schema, walk remaining steps as UI-only then finish to /app.
          go(2);
        }}
      />
    );
  }

  if (step === 2) {
    return (
      <StepHours
        value={hours}
        onChange={setHours}
        onBack={() => go(1)}
        busy={busy}
        error={error}
        onContinue={async () => {
          await continueOrAdvance(3, async () => {
            if (!orgId || !locationId) return true;
            const res = await onboardingSaveHours(orgId, locationId, hours);
            if (!res.ok) {
              setError(res.error);
              return false;
            }
            setBooking((b) => ({
              ...b,
              use_opening_hours: true,
              booking_ranges: hours.ranges
                .filter((r) => !hours.closed_days.includes(r.day))
                .map((r) => ({ day: r.day, open: r.open, close: r.close })),
            }));
            return true;
          });
        }}
      />
    );
  }

  if (step === 3) {
    return (
      <StepBooking
        value={booking}
        openingHours={hours}
        onChange={setBooking}
        onBack={() => go(2)}
        onSkip={() => void skip()}
        busy={busy}
        error={error}
        onContinue={async () => {
          await continueOrAdvance(4, async () => {
            if (!orgId || !locationId) return true;
            const res = await onboardingSaveBooking(orgId, locationId, booking);
            if (!res.ok) {
              setError(res.error);
              return false;
            }
            return true;
          });
        }}
      />
    );
  }

  if (step === 4) {
    return (
      <StepTables
        value={tables}
        onChange={setTables}
        onBack={() => go(3)}
        onSkip={() => void skip()}
        busy={busy}
        error={error}
        onContinue={async () => {
          await continueOrAdvance(5, async () => {
            if (!orgId || !locationId) return true;
            const res = await onboardingSaveTablesQuick(
              orgId,
              locationId,
              tables.count,
              tables.seats,
              tables.section,
              tables.bookable_online,
            );
            if (!res.ok) {
              setError(res.error);
              return false;
            }
            return true;
          });
        }}
      />
    );
  }

  if (step === 5) {
    return (
      <StepMenu
        value={menu}
        onChange={setMenu}
        onBack={() => go(4)}
        onSkip={() => void skip()}
        busy={busy}
        error={error}
        onContinue={async () => {
          await continueOrAdvance(6, async () => {
            if (!orgId || !locationId) return true;
            const res = await onboardingSaveMenu(orgId, locationId, menu);
            if (!res.ok) {
              setError(res.error);
              return false;
            }
            return true;
          });
        }}
      />
    );
  }

  if (step === 6) {
    return (
      <StepTeam
        value={team}
        onChange={setTeam}
        onBack={() => go(5)}
        onSkip={() => void skip()}
        busy={busy}
        error={error}
        onContinue={async () => {
          if (!slug) setSlug(slugifyName(restaurant.name));
          await continueOrAdvance(7, async () => {
            if (!orgId) return true;
            const res = await onboardingSaveTeam(orgId, team);
            if (!res.ok) {
              setError(res.error);
              return false;
            }
            return true;
          });
        }}
      />
    );
  }

  return (
    <StepDone
      slug={bookingUrlSlug}
      onSlugChange={(s) => {
        setSlug(s);
        setSlugAvailable(null);
      }}
      slugAvailable={slugAvailable}
      onCheckSlug={async () => {
        if (!orgId) {
          setSlugAvailable(true);
          return;
        }
        const res = await onboardingCheckSlug(bookingUrlSlug, orgId);
        setSlugAvailable(res.available);
        if (!res.ok && res.error) setError(res.error);
      }}
      onBack={() => go(6)}
      busy={busy}
      error={error}
      onFinish={async () => {
        setBusy(true);
        setError(null);
        if (orgId) {
          const check = await onboardingCheckSlug(bookingUrlSlug, orgId);
          if (!check.available) {
            setSlugAvailable(false);
            setBusy(false);
            setError("Slug is not available");
            return;
          }
          const res = await onboardingComplete(orgId, bookingUrlSlug);
          if (!res.ok) {
            setBusy(false);
            setError(res.error);
            return;
          }
        } else {
          // Legacy: mark restaurant onboarding complete if we can.
          const { data: staffRow } = await supabase
            .from("v2_users")
            .select("restaurant_id")
            .eq("auth_user_id", session!.user.id)
            .maybeSingle();
          if (staffRow?.restaurant_id) {
            await supabase
              .from("v2_restaurants")
              .update({ onboarding_completed_at: new Date().toISOString(), slug: bookingUrlSlug })
              .eq("id", staffRow.restaurant_id);
          }
        }
        setBusy(false);
        await refreshStaff();
        navigate({ to: "/app", replace: true });
      }}
    />
  );
}
