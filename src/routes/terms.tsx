import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — RestoStack" },
      { name: "description", content: "RestoStack terms of service for invite-only beta customers." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-semibold tracking-tight">
            RestoStack
          </Link>
          <Link to="/privacy" className="text-sm text-zinc-600 hover:text-zinc-900">
            Privacy
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated August 12, 2026</p>
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-zinc-700">
          <p>
            These Terms govern use of RestoStack during the invite-only beta. By creating an account or using the
            service, you agree to them.
          </p>
          <h2 className="pt-4 text-lg font-semibold text-zinc-900">1. Service</h2>
          <p>
            RestoStack provides restaurant operations software (reservations, guest CRM, floor tools, and related
            features). Features may change during beta. We do not guarantee uninterrupted availability.
          </p>
          <h2 className="pt-4 text-lg font-semibold text-zinc-900">2. Accounts</h2>
          <p>
            You are responsible for account credentials and for activity under your restaurant’s account. Do not share
            admin passwords. Staff PINs must be treated as sensitive.
          </p>
          <h2 className="pt-4 text-lg font-semibold text-zinc-900">3. Customer data</h2>
          <p>
            You retain ownership of restaurant and guest data you upload. You grant us a license to host and process
            that data only to provide the service. See our{" "}
            <Link to="/privacy" className="underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
          <h2 className="pt-4 text-lg font-semibold text-zinc-900">4. Acceptable use</h2>
          <p>
            Do not abuse booking endpoints, scrape other tenants’ data, attempt to bypass access controls, or use the
            service for unlawful activity.
          </p>
          <h2 className="pt-4 text-lg font-semibold text-zinc-900">5. Billing</h2>
          <p>
            During invite-only beta, pricing may be agreed manually with sales. Published plan prices are
            informational until a paid agreement is signed.
          </p>
          <h2 className="pt-4 text-lg font-semibold text-zinc-900">6. Disclaimer</h2>
          <p>
            The service is provided “as is” during beta. To the maximum extent permitted by law, RestoStack disclaims
            warranties of merchantability and fitness for a particular purpose.
          </p>
          <h2 className="pt-4 text-lg font-semibold text-zinc-900">7. Contact</h2>
          <p>
            Questions:{" "}
            <a href="mailto:sales@restostacks.com" className="underline underline-offset-2">
              sales@restostacks.com
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
