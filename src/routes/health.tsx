import { createFileRoute } from "@tanstack/react-router";

/** Lightweight liveness probe for launch deploys / uptime checks. */
export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [{ title: "Health — RestoStack" }, { name: "robots", content: "noindex" }],
  }),
  component: HealthPage,
});

function HealthPage() {
  const payload = {
    ok: true,
    service: "restostack",
    ts: new Date().toISOString(),
  };

  return (
    <pre className="m-0 min-h-screen bg-black p-6 font-mono text-sm text-emerald-400">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}
