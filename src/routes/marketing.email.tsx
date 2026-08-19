import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Megaphone, Copy, FileSpreadsheet } from "lucide-react";
import { useCustomers } from "@/lib/v2-data";
import { exportCsv } from "@/lib/export";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/marketing/email")({
  head: () => ({ meta: [{ title: "Email Marketing — RestoStack" }] }),
  component: Page,
});

function Page() {
  const { data: customers = [] } = useCustomers();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const audience = useMemo(
    () => customers.filter((c) => c.email.trim().length > 0),
    [customers],
  );

  const copyRecipients = async () => {
    const list = audience.map((c) => c.email).join("\n");
    if (!list) {
      toast.error("No customers with email on file");
      return;
    }
    try {
      await navigator.clipboard.writeText(list);
      toast.success(`Copied ${audience.length} email${audience.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const exportRecipients = () => {
    if (!audience.length) {
      toast.error("No customers with email on file");
      return;
    }
    exportCsv(
      `email_audience_${format(new Date(), "yyyy-MM-dd")}`,
      ["Name", "Email", "Phone"],
      audience.map((c) => ({ Name: c.name, Email: c.email, Phone: c.phone })),
    );
    toast.success("Audience exported");
  };

  return (
    <AppShell>
      <PageHeader
        title="Email Marketing"
        description="Draft a campaign and export your audience — no sample metrics."
        icon={Megaphone}
      />
      <div className="p-4 lg:p-5 max-w-3xl space-y-5">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold">Audience</h2>
            <p className="text-sm text-muted-foreground mt-1">
              All customers with an email on file — <span className="font-medium text-foreground">{audience.length}</span>{" "}
              recipient{audience.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void copyRecipients()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50"
            >
              <Copy className="size-4" /> Copy recipient list
            </button>
            <button
              onClick={exportRecipients}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50"
            >
              <FileSpreadsheet className="size-4 text-success" /> Export CSV
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Draft message</h2>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. This week's specials"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Write your email copy here…"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y"
            />
          </label>
        </div>

        <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
          Sending requires an email provider — export or copy your recipient list for now, then paste into Mailchimp or your ESP.
        </p>
      </div>
    </AppShell>
  );
}
