import { Link } from "@tanstack/react-router";
import { DemoRequestDialog } from "@/components/DemoRequestDialog";
import { shipModeLabel } from "@/lib/ship-mode";

/** Shown when public self-serve signup is closed (invite-only ship mode). */
export function InviteOnlyPanel({
  title = "Invite-only for now",
  description = "RestoStack is shipping as an invite-only beta. Request a demo and we’ll set up your restaurant.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_45%,_#ffffff_100%)] text-slate-900">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          RestoStack
        </Link>
        <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-20 pt-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
          {shipModeLabel()}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-base text-slate-600">{description}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <DemoRequestDialog
            trigger={
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Request a demo
              </button>
            }
          />
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            I already have an account
          </Link>
        </div>
        <p className="mt-8 text-sm text-slate-500">
          Looking for legal docs?{" "}
          <Link to="/terms" className="underline underline-offset-2">
            Terms
          </Link>{" "}
          ·{" "}
          <Link to="/privacy" className="underline underline-offset-2">
            Privacy
          </Link>
        </p>
      </main>
    </div>
  );
}
