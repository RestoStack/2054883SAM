import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { DEFAULT_HOURS } from "@/components/onboarding/HoursEditor";
import {
  StepBooking,
  StepDone,
  StepLocation,
  StepOrganization,
  StepTables,
  StepTeam,
  StepWelcome,
} from "@/components/onboarding/wizard";
import {
  billingVerify,
  onboardingBooking,
  onboardingDone,
  onboardingGet,
  onboardingLocation,
  onboardingOrganization,
  onboardingTables,
  onboardingTeam,
  onboardingWelcome,
} from "@/lib/onboarding-api";
import type {
  BookingStepInput,
  LocationStepInput,
  OnboardingStepId,
  OrganizationStepInput,
  TablesStepInput,
  TeamStepInput,
  WelcomeStepInput,
} from "@/lib/schemas/onboarding";
import { STEP_ORDER } from "@/lib/schemas/onboarding";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get set up — RestoStack" }] }),
  component: OnboardingWizardPage,
});

/**
 * 7-step onboarding. Each Continue calls a transaction-safe RPC.
 * Progress resumes from onboarding_progress.current_step on refresh.
 * Settings pages are intentionally NOT wired in this PR — wizard components first.
 */
function OnboardingWizardPage() {
  const { session, loading, org, needsPayment, subscriptionLive, refreshStaff } = useAuth();
  const navigate = useNavigate();

  const [booting, setBooting] = useState(true);
  const [step, setStep] = useState<OnboardingStepId>("welcome");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [bookingPath, setBookingPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [welcome, setWelcome] = useState<WelcomeStepInput>({ full_name: "" });
  const [organization, setOrganization] = useState<OrganizationStepInput>({
    organization_name: "",
    brand_color: "#059669",
    logo_path: null,
  });
  const [location, setLocation] = useState<LocationStepInput>({
    location_name: "Main",
    address: "",
    city: "",
    phone: "",
    timezone: "America/Toronto",
    hours: DEFAULT_HOURS,
  });
  const [tables, setTables] = useState<TablesStepInput>({
    groups: [{ count: 8, capacity: 4, section: "Main Floor" }],
  });
  const [booking, setBooking] = useState<BookingStepInput>({
    slot_interval_minutes: 30,
    max_party_size: 12,
    lead_time_hours: 2,
  });
  const [team, setTeam] = useState<TeamStepInput>({ invites: [] });

  const orgId = org.activeOrganizationId;

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
    if (!subscriptionLive) {
      navigate({ to: "/billing/locked", replace: true });
      return;
    }
    if (!orgId) {
      setBooting(false);
      setError("No organization yet. Accept your owner invite first.");
      return;
    }

    let cancelled = false;
    (async () => {
      const meta = (session.user.user_metadata as Record<string, unknown>) ?? {};
      const seed =
        (meta.full_name as string) ||
        (meta.name as string) ||
        (session.user.email ?? "").split("@")[0] ||
        "";
      setWelcome((w) => ({ full_name: w.full_name || seed }));

      // Verify subscription from mirrored row — never trust client claim.
      const verified = await billingVerify(orgId);
      if (!verified.ok || !verified.live) {
        navigate({ to: "/billing/setup", replace: true });
        return;
      }

      const prog = await onboardingGet(orgId);
      if (cancelled) return;
      if (!prog.ok) {
        // Pre-migration: allow wizard UI to render for review.
        setBooting(false);
        return;
      }
      const current = (prog.current_step as OnboardingStepId) || "welcome";
      if (STEP_ORDER.includes(current)) setStep(current);
      if (typeof prog.location_id === "string") setLocationId(prog.location_id);
      if (typeof prog.public_slug === "string") {
        setBookingPath(`/book/${prog.public_slug}`);
      }
      const draft = (prog.draft as Record<string, unknown>) ?? {};
      if (typeof draft.full_name === "string") setWelcome({ full_name: draft.full_name });
      if (typeof draft.organization_name === "string") {
        setOrganization((o) => ({
          ...o,
          organization_name: draft.organization_name as string,
          brand_color: (draft.brand_color as string) || o.brand_color,
        }));
      }
      if (prog.completed_at) {
        navigate({ to: "/app", replace: true });
        return;
      }
      setBooting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, session, orgId, needsPayment, subscriptionLive, navigate]);

  const requireOrg = () => {
    if (!orgId) {
      setError("Missing organization");
      return false;
    }
    return true;
  };

  const goBack = () => {
    const i = STEP_ORDER.indexOf(step);
    if (i > 0) setStep(STEP_ORDER[i - 1]!);
  };

  if (loading || booting) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === "welcome") {
    return (
      <StepWelcome
        value={welcome}
        onChange={setWelcome}
        busy={busy}
        error={error}
        onContinue={async () => {
          if (!requireOrg()) return;
          setBusy(true);
          setError(null);
          const res = await onboardingWelcome(orgId!, welcome);
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setStep("organization");
        }}
      />
    );
  }

  if (step === "organization") {
    return (
      <StepOrganization
        value={organization}
        onChange={setOrganization}
        onBack={goBack}
        busy={busy}
        error={error}
        onContinue={async () => {
          if (!requireOrg()) return;
          setBusy(true);
          setError(null);
          const res = await onboardingOrganization(orgId!, organization);
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setStep("location");
        }}
      />
    );
  }

  if (step === "location") {
    return (
      <StepLocation
        value={location}
        onChange={setLocation}
        onBack={goBack}
        busy={busy}
        error={error}
        onContinue={async () => {
          if (!requireOrg()) return;
          setBusy(true);
          setError(null);
          const res = await onboardingLocation(orgId!, location);
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          if (typeof res.location_id === "string") setLocationId(res.location_id);
          if (typeof res.public_slug === "string") setBookingPath(`/book/${res.public_slug}`);
          setStep("tables");
        }}
      />
    );
  }

  if (step === "tables") {
    return (
      <StepTables
        value={tables}
        onChange={setTables}
        onBack={goBack}
        busy={busy}
        error={error}
        onContinue={async () => {
          if (!requireOrg() || !locationId) {
            setError(locationId ? "Missing organization" : "Finish the location step first");
            return;
          }
          setBusy(true);
          setError(null);
          const res = await onboardingTables(orgId!, locationId, tables);
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setStep("booking");
        }}
      />
    );
  }

  if (step === "booking") {
    return (
      <StepBooking
        value={booking}
        onChange={setBooking}
        onBack={goBack}
        busy={busy}
        error={error}
        onContinue={async () => {
          if (!requireOrg() || !locationId) {
            setError("Finish the location step first");
            return;
          }
          setBusy(true);
          setError(null);
          const res = await onboardingBooking(orgId!, locationId, booking);
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setStep("team");
        }}
      />
    );
  }

  if (step === "team") {
    return (
      <StepTeam
        value={team}
        onChange={setTeam}
        onBack={goBack}
        busy={busy}
        error={error}
        onContinue={async () => {
          if (!requireOrg()) return;
          setBusy(true);
          setError(null);
          const res = await onboardingTeam(orgId!, team);
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setStep("done");
        }}
      />
    );
  }

  return (
    <StepDone
      bookingPath={bookingPath}
      busy={busy}
      error={error}
      onFinish={async () => {
        if (!requireOrg()) return;
        setBusy(true);
        setError(null);
        const res = await onboardingDone(orgId!);
        setBusy(false);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        if (typeof res.booking_url === "string") setBookingPath(res.booking_url);
        await refreshStaff();
        navigate({ to: "/app", replace: true });
      }}
    />
  );
}
