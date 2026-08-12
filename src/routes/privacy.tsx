import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — RestoStack" },
      { name: "description", content: "How RestoStack handles restaurant and guest data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-semibold tracking-tight">
            RestoStack
          </Link>
          <Link to="/terms" className="text-sm text-zinc-600 hover:text-zinc-900">
            Terms
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated August 12, 2026</p>
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-zinc-700">
          <p>
            This policy explains what RestoStack collects while providing restaurant operations software during the
            invite-only beta.
          </p>
          <h2 className="pt-4 text-lg font-semibold text-zinc-900">What we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account information (name, email, restaurant details)</li>
            <li>Operational data you enter (bookings, guests, menu, staff, orders)</li>
            <li>Demo request leads submitted on the marketing site</li>
            <li>Basic technical logs needed to run and secure the service</li>
          </ul>
          <h2 className="pt-4 text-lg font-semibold text-zinc-900">How we use it</h2>
          <p>
            We use data to provide the product, support customers, improve reliability, and respond to demo requests.
            We do not sell personal data.
          </p>
          <h2 className="pt-4 text-lg font-semibold text-zinc-900">Sharing</h2>
          <p>
            We use infrastructure providers (for example hosting and database) as processors. They only process data to
            run RestoStack. We may disclose information if required by law.
          </p>
          <h2 className="pt-4 text-lg font-semibold text-zinc-900">Retention</h2>
          <p>
            We retain account and restaurant data while your workspace is active and for a reasonable period afterward
            for backups and legal obligations. Contact us to request deletion of a beta workspace.
          </p>
          <h2 className="pt-4 text-lg font-semibold text-zinc-900">Contact</h2>
          <p>
            Privacy questions:{" "}
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
