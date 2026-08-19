import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
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
  const { session, loading, org, needsPayment, subscriptionLive, refreshStaff } = useAuth();
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
    if (needsPayment) {
      navigate({ to: "/billing/setup", replace: true });
      return;
    }

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
        const boot = await onboardingBootstrapOwner(
          seedName,
          seedName ? `${seedName.split(/\s+/)[0]}'s restaurant` : "My restaurant",
        );
        if (!boot.ok) {
          if (!cancelled) {
            setError(boot.error);
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
        if (prog.completed_at) {
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
  }, [loading, session, orgId, needsPayment, subscriptionLive]);

  const requireOrg = () => {
    if (!orgId) {
      setError("Missing organization");
      return false;
    }
    return true;
  };

  const skip = async () => {
    if (!canSkipStep(step) || !orgId) return;
    setBusy(true);
    setError(null);
    const next = Math.min(7, step + 1);
    await onboardingSkipTo(orgId, next);
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
          if (!requireOrg()) return;
          if (!restaurant.name.trim()) {
            setError("Restaurant name is required");
            return;
          }
          setBusy(true);
          setError(null);
          const res = await onboardingSaveRestaurant(orgId!, {
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
          if (!requireOrg() || !locationId) {
            setError("Finish creating your restaurant first");
            return;
          }
          setBusy(true);
          setError(null);
          const res = await onboardingSaveHours(orgId!, locationId, hours);
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          // Prefill booking hours from opening hours
          setBooking((b) => ({
            ...b,
            use_opening_hours: true,
            booking_ranges: hours.ranges
              .filter((r) => !hours.closed_days.includes(r.day))
              .map((r) => ({ day: r.day, open: r.open, close: r.close })),
          }));
          go(3);
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
          if (!requireOrg() || !locationId) {
            setError("Finish creating your restaurant first");
            return;
          }
          setBusy(true);
          setError(null);
          const res = await onboardingSaveBooking(orgId!, locationId, booking);
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          go(4);
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
          if (!requireOrg() || !locationId) {
            setError("Finish creating your restaurant first");
            return;
          }
          setBusy(true);
          setError(null);
          const res = await onboardingSaveTablesQuick(
            orgId!,
            locationId,
            tables.count,
            tables.seats,
            tables.section,
            tables.bookable_online,
          );
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          go(5);
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
          if (!requireOrg() || !locationId) {
            setError("Finish creating your restaurant first");
            return;
          }
          setBusy(true);
          setError(null);
          const res = await onboardingSaveMenu(orgId!, locationId, menu);
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          go(6);
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
          if (!requireOrg()) return;
          setBusy(true);
          setError(null);
          const res = await onboardingSaveTeam(orgId!, team);
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          if (!slug) setSlug(slugifyName(restaurant.name));
          go(7);
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
        const res = await onboardingCheckSlug(bookingUrlSlug, orgId ?? undefined);
        setSlugAvailable(res.available);
        if (!res.ok && res.error) setError(res.error);
      }}
      onBack={() => go(6)}
      busy={busy}
      error={error}
      onFinish={async () => {
        if (!requireOrg()) return;
        setBusy(true);
        setError(null);
        const check = await onboardingCheckSlug(bookingUrlSlug, orgId!);
        if (!check.available) {
          setSlugAvailable(false);
          setBusy(false);
          setError("Slug is not available");
          return;
        }
        const res = await onboardingComplete(orgId!, bookingUrlSlug);
        setBusy(false);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        await refreshStaff();
        navigate({ to: "/app", replace: true });
      }}
    />
  );
}
