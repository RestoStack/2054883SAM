import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/billing/locked")({
  head: () => ({ meta: [{ title: "Subscription locked — RestoStack" }] }),
  component: BillingLockedPage,
});

function BillingLockedPage() {
  const { session, loading, org, needsPayment, subscriptionLive } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Sign in to manage billing.</p>
          <Link to="/login" className="mt-3 inline-block text-sm font-semibold underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (org.available && subscriptionLive) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Your subscription is active.</p>
          <Link
            to="/dashboard"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Back to app
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
        <div className="mx-auto size-12 rounded-full bg-muted grid place-items-center">
          <Lock className="size-5 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Subscription locked</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This organization does not have an active subscription
          {org.subscriptionStatus ? ` (status: ${org.subscriptionStatus})` : ""}. Contact your owner
          or RestoStack support to restore access.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {needsPayment && (
            <Link
              to="/billing/setup"
              className="rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Complete activation
            </Link>
          )}
          <Link to="/settings" className="rounded-lg border border-border py-2.5 text-sm font-medium">
            Open settings
          </Link>
          <Link to="/login" className="text-xs text-muted-foreground underline mt-2">
            Switch account
          </Link>
        </div>
      </div>
    </div>
  );
}
