import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Clock, DollarSign, Loader2, Timer, Wallet } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { useClockShift, useShifts, useStaffUsers } from "@/lib/v2-data";

export const Route = createFileRoute("/payroll")({
  head: () => ({ meta: [{ title: "Payroll — RestoStack" }] }),
  component: PayrollPage,
});

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const fmtHours = (h: number) => h.toFixed(2);

function PayrollPage() {
  const { data: shifts = [], isLoading } = useShifts(14);
  const { data: staff = [] } = useStaffUsers();
  const clockShift = useClockShift();

  const activeStaff = staff.filter((s) => s.active);

  const openShiftByUser = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of shifts) {
      if (!s.clock_out_at && !map[s.user_id]) map[s.user_id] = s.id;
    }
    return map;
  }, [shifts]);

  const kpis = useMemo(() => {
    const totalHours = shifts.reduce((sum, s) => sum + s.hours, 0);
    const estimatedPay = shifts.reduce((sum, s) => sum + s.pay, 0);
    const tips = shifts.reduce((sum, s) => sum + s.tips_total, 0);
    const openShifts = shifts.filter((s) => !s.clock_out_at).length;
    return { totalHours, estimatedPay, tips, openShifts };
  }, [shifts]);

  const handleClock = async (userId: string, action: "in" | "out") => {
    try {
      await clockShift.mutateAsync({ user_id: userId, action });
      toast.success(action === "in" ? "Clocked in" : "Clocked out");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clock action failed");
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Payroll"
        description="Staff shifts and estimated pay for the last 14 days"
        icon={Wallet}
        iconBg="bg-success/15"
        iconColor="text-success"
      />

      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Total Hours", v: fmtHours(kpis.totalHours), i: Timer, c: "bg-accent text-primary" },
            { l: "Estimated Pay", v: fmtMoney(kpis.estimatedPay), i: DollarSign, c: "bg-success/15 text-success" },
            { l: "Tips", v: fmtMoney(kpis.tips), i: Wallet, c: "bg-info/15 text-info" },
            { l: "Open Shifts", v: String(kpis.openShifts), i: Clock, c: "bg-warning/15 text-warning" },
          ].map((k) => (
            <div key={k.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full flex items-center justify-center ${k.c}`}>
                  <k.i className="size-5" />
                </div>
                <div className="text-sm text-muted-foreground">{k.l}</div>
              </div>
              <div className="mt-2 text-2xl font-bold">{isLoading ? "…" : k.v}</div>
            </div>
          ))}
        </div>

        {activeStaff.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">Quick clock in / out</h3>
            <div className="flex flex-wrap gap-2">
              {activeStaff.map((s) => {
                const isClockedIn = Boolean(openShiftByUser[s.id]);
                return (
                  <div
                    key={s.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{s.name}</span>
                    <button
                      onClick={() => handleClock(s.id, isClockedIn ? "out" : "in")}
                      disabled={clockShift.isPending}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                        isClockedIn
                          ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                          : "bg-success/15 text-success hover:bg-success/25"
                      }`}
                    >
                      {isClockedIn ? "Clock out" : "Clock in"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-semibold">Shift history</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 14 days</p>
          </div>
          {isLoading ? (
            <div className="px-5 py-12 text-center text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin inline mr-2" /> Loading shifts…
            </div>
          ) : shifts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Clock className="size-8 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium">No shifts recorded yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clock staff in above to start tracking hours and pay.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                    {["Staff", "Clock in", "Clock out", "Hours", "Wage", "Pay", "Tips"].map((h) => (
                      <th key={h} className="text-left font-medium px-5 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-4 font-medium">{s.staff_name}</td>
                      <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{fmtDateTime(s.clock_in_at)}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {s.clock_out_at ? (
                          <span className="text-muted-foreground">{fmtDateTime(s.clock_out_at)}</span>
                        ) : (
                          <span className="rounded-full bg-warning/15 text-warning text-xs font-semibold px-2 py-0.5">
                            Open
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">{fmtHours(s.hours)}</td>
                      <td className="px-5 py-4 text-muted-foreground">{fmtMoney(s.hourly_wage)}/hr</td>
                      <td className="px-5 py-4 font-semibold">{fmtMoney(s.pay)}</td>
                      <td className="px-5 py-4">{fmtMoney(s.tips_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
