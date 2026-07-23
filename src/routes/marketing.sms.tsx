import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Megaphone, Copy, FileSpreadsheet } from "lucide-react";
import { useCustomers } from "@/lib/v2-data";
import { exportCsv } from "@/lib/export";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/marketing/sms")({
  head: () => ({ meta: [{ title: "SMS Campaigns — RestoStack" }] }),
  component: Page,
});

function Page() {
  const { data: customers = [] } = useCustomers();
  const [message, setMessage] = useState("");

  const audience = useMemo(
    () => customers.filter((c) => c.phone.trim().length > 0),
    [customers],
  );

  const copyRecipients = async () => {
    const list = audience.map((c) => c.phone).join("\n");
    if (!list) {
      toast.error("No customers with phone on file");
      return;
    }
    try {
      await navigator.clipboard.writeText(list);
      toast.success(`Copied ${audience.length} phone number${audience.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const exportRecipients = () => {
    if (!audience.length) {
      toast.error("No customers with phone on file");
      return;
    }
    exportCsv(
      `sms_audience_${format(new Date(), "yyyy-MM-dd")}`,
      ["Name", "Phone", "Email"],
      audience.map((c) => ({ Name: c.name, Phone: c.phone, Email: c.email })),
    );
    toast.success("Audience exported");
  };

  return (
    <AppShell>
      <PageHeader
        title="SMS Campaigns"
        description="Draft an SMS blast and export your audience — no sample metrics."
        icon={Megaphone}
      />
      <div className="p-4 lg:p-5 max-w-3xl space-y-5">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold">Audience</h2>
            <p className="text-sm text-muted-foreground mt-1">
              All customers with a phone on file — <span className="font-medium text-foreground">{audience.length}</span>{" "}
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
            <span className="text-xs font-medium text-muted-foreground">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={320}
              placeholder="Keep it short — guests read this on their phone…"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y"
            />
          </label>
          <div className="text-xs text-muted-foreground">{message.length}/320 characters</div>
        </div>

        <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
          Sending requires an SMS provider — export or copy your recipient list for now, then send via Twilio or your SMS tool.
        </p>
      </div>
    </AppShell>
  );
}
