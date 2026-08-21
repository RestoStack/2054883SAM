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
  legacyOnboardingComplete,
  legacyOnboardingLoadRestaurant,
  legacyOnboardingSaveBookingRules,
  legacyOnboardingSaveHours,
  legacyOnboardingSaveRestaurant,
  legacyOnboardingSaveTables,
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

export const Route = createFileRoute("/onboarding_/$step")({
  head: () => ({ meta: [{ title: "Get set up — RestoStack" }] }),
  component: OnboardingStepPage,
});

function OnboardingStepPage() {
  const { step: stepParam } = Route.useParams();
  const step = stepFromParam(stepParam);
  const { session, loading, org, subscriptionLive, refreshStaff, staff } = useAuth();
  const navigate = useNavigate();

  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(org.activeOrganizationId);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

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

    let cancelled = false;
    (async () => {
      try {
        const meta = (session.user.user_metadata as Record<string, unknown>) ?? {};
        const seedName =
          (meta.full_name as string) ||
          (meta.name as string) ||
          (session.user.email ?? "").split("@")[0] ||
          "";

        // Prefer staff from context; if hydrate is still catching up, resolve once from DB.
        let rid = staff?.restaurant_id ?? null;
        if (!rid) {
          const { data: row } = await supabase
            .from("v2_users")
            .select("restaurant_id")
            .eq("auth_user_id", session.user.id)
            .maybeSingle();
          rid = row?.restaurant_id ?? null;
        }

        if (rid || !org.activeOrganizationId) {
          if (rid) {
            const loaded = await legacyOnboardingLoadRestaurant(rid);
            if (!cancelled && loaded.ok) {
              setRestaurant((r) => ({ ...r, ...loaded.restaurant }));
              setLocationId(loaded.location_id);
              if (loaded.slug) setSlug(loaded.slug);
            } else if (!cancelled) {
              setRestaurant((r) => ({
                ...r,
                name:
                  r.name ||
                  (seedName ? `${seedName.split(/\s+/)[0]}'s restaurant` : "My restaurant"),
              }));
              setLocationId(rid);
            }
          } else if (!cancelled) {
            setRestaurant((r) => ({
              ...r,
              name:
                r.name ||
                (seedName ? `${seedName.split(/\s+/)[0]}'s restaurant` : "My restaurant"),
            }));
          }
          if (!cancelled) {
            setError(null);
            setBooting(false);
          }
          return;
        }

        const activeOrgId = org.activeOrganizationId;
        if (!subscriptionLive && activeOrgId) {
          const verified = await billingVerify(activeOrgId);
          if (!verified.ok || !verified.live) {
            navigate({ to: "/billing/setup", replace: true });
            return;
          }
        }

        const prog = await onboardingGetV1(activeOrgId!);
        if (cancelled) return;

        if (prog.ok) {
          if (prog.completed_at && (prog.draft as any)?.completed === true) {
            navigate({ to: "/app", replace: true });
            return;
          }
          if (prog.location_id) setLocationId(String(prog.location_id));
          if (prog.public_slug) setSlug(String(prog.public_slug));
        }

        if (!cancelled) setBooting(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not start onboarding");
          setBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-run once staff/org settle after login — safe because we only set form state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, !!session, staff?.restaurant_id, org.activeOrganizationId]);

  /** Always run the step save (org RPC or legacy v2 write), then advance. */
  const continueOrAdvance = async (next: number, save?: () => Promise<boolean>) => {
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

  const restaurantId = staff?.restaurant_id ?? null;

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

          // Prefer org wizard RPC; else update existing restaurant or create once.
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

          if (restaurantId) {
            const res = await legacyOnboardingSaveRestaurant(restaurantId, {
              ...restaurant,
              slug: restaurant.slug || slug || slugifyName(restaurant.name),
            });
            setBusy(false);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setLocationId(res.location_id);
            if (res.public_slug) setSlug(res.public_slug);
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
          if (legacy.restaurant_id) setLocationId(legacy.restaurant_id);
          if (legacy.slug) setSlug(legacy.slug);
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
            if (orgId && locationId) {
              const res = await onboardingSaveHours(orgId, locationId, hours);
              if (!res.ok) {
                setError(res.error);
                return false;
              }
            } else if (restaurantId) {
              const res = await legacyOnboardingSaveHours(restaurantId, hours);
              if (!res.ok) {
                setError(res.error);
                return false;
              }
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
            if (orgId && locationId) {
              const res = await onboardingSaveBooking(orgId, locationId, booking);
              if (!res.ok) {
                setError(res.error);
                return false;
              }
              return true;
            }
            if (restaurantId) {
              const res = await legacyOnboardingSaveBookingRules(restaurantId, booking);
              if (!res.ok) {
                setError(res.error);
                return false;
              }
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
            if (orgId && locationId) {
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
            }
            if (restaurantId) {
              const res = await legacyOnboardingSaveTables(
                restaurantId,
                tables.count,
                tables.seats,
                tables.section,
              );
              if (!res.ok) {
                setError(res.error);
                return false;
              }
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
        const res = await onboardingCheckSlug(
          bookingUrlSlug,
          orgId ?? restaurantId ?? undefined,
        );
        // Own restaurant slug is always fine for legacy.
        if (restaurantId && !orgId) {
          const { data: own } = await supabase
            .from("v2_restaurants")
            .select("id")
            .eq("id", restaurantId)
            .eq("slug", bookingUrlSlug.trim().toLowerCase())
            .maybeSingle();
          if (own) {
            setSlugAvailable(true);
            return;
          }
        }
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
          const rid =
            restaurantId ||
            (
              await supabase
                .from("v2_users")
                .select("restaurant_id")
                .eq("auth_user_id", session!.user.id)
                .maybeSingle()
            ).data?.restaurant_id;
          if (!rid) {
            setBusy(false);
            setError("Missing restaurant — go back to step 1 and save your details.");
            return;
          }
          const res = await legacyOnboardingComplete(rid, bookingUrlSlug);
          if (!res.ok) {
            setBusy(false);
            setError(res.error);
            return;
          }
        }
        setBusy(false);
        await refreshStaff();
        window.location.assign("/app");
      }}
    />
  );
}
