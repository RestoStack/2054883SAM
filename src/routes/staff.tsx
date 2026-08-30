import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { UserCog, Plus, Search, Users, ChefHat, Briefcase, MoreHorizontal, Loader2, Clock, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  useStaffUsers,
  useCreateStaffUser,
  useUpdateStaffUser,
  useClockShift,
  useShifts,
} from "@/lib/v2-data";
import { toast } from "sonner";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Staff — RestoStack" }] }),
  component: StaffPage,
});

const statusStyles: Record<string, string> = {
  Active: "bg-success/15 text-success",
  Inactive: "bg-muted text-muted-foreground",
};

const depts = ["All Staff", "Front of House", "Back of House", "Management"];

function StaffPage() {
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const { data: staff = [], isLoading } = useStaffUsers();
  const { data: shifts = [] } = useShifts(1);
  const createStaff = useCreateStaffUser();
  const updateStaff = useUpdateStaffUser();
  const clockShift = useClockShift();

  const clockedInIds = useMemo(
    () => new Set(shifts.filter((s) => !s.clock_out_at).map((s) => s.user_id)),
    [shifts],
  );

  const filtered = useMemo(() => {
    let list = tab === 0 ? staff : staff.filter((s) => s.dept === depts[tab]);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((s) => `${s.name} ${s.role} ${s.email}`.toLowerCase().includes(needle));
    }
    return list;
  }, [staff, tab, q]);

  const active = staff.filter((s) => s.active).length;
  const foh = staff.filter((s) => s.dept === "Front of House").length;
  const boh = staff.filter((s) => s.dept === "Back of House").length;

  const openSchedule = () => {
    setShowSchedule(true);
    requestAnimationFrame(() => {
      scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    try {
      await updateStaff.mutateAsync({ id, is_active: !currentlyActive });
      toast.success(currentlyActive ? "Staff member deactivated" : "Staff member activated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update staff status");
    }
  };

  const handleClock = async (userId: string, action: "in" | "out", name: string) => {
    try {
      await clockShift.mutateAsync({ user_id: userId, action });
      toast.success(action === "in" ? `${name} clocked in` : `${name} clocked out`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update shift");
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Staff"
        description="Team members for this restaurant only."
        icon={UserCog}
        actions={
          <>
            <button
              type="button"
              onClick={openSchedule}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <Clock className="size-4" /> Schedule
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground"
            >
              <Plus className="size-4" /> Add Staff
            </button>
          </>
        }
      />
      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Total Staff", v: String(staff.length), i: Users, c: "bg-accent text-primary" },
            { l: "Active", v: String(active), i: Briefcase, c: "bg-success/15 text-success" },
            { l: "Front of House", v: String(foh), i: Users, c: "bg-info/15 text-info" },
            { l: "Back of House", v: String(boh), i: ChefHat, c: "bg-warning/15 text-warning" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full flex items-center justify-center ${s.c}`}>
                  <s.i className="size-5" />
                </div>
                <div className="text-sm text-muted-foreground">{s.l}</div>
              </div>
              <div className="mt-2 text-2xl font-bold">{s.v}</div>
            </div>
          ))}
        </div>

        {showSchedule && (
          <div ref={scheduleRef} id="clock-panel" className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="size-4 text-success" /> Clock In / Out
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Manage today&apos;s shifts for your team.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSchedule(false)}
                className="size-8 rounded-md hover:bg-muted flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {staff.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">No staff members to clock in.</div>
              ) : (
                staff.map((s) => {
                  const onShift = clockedInIds.has(s.id);
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-9 rounded-full bg-gradient-to-br from-accent to-primary/30 flex items-center justify-center text-xs font-bold shrink-0">
                          {s.name[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${onShift ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                          {onShift ? "On shift" : "Off shift"}
                        </span>
                        {onShift ? (
                          <button
                            type="button"
                            onClick={() => handleClock(s.id, "out", s.name)}
                            disabled={clockShift.isPending}
                            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                          >
                            Clock Out
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleClock(s.id, "in", s.name)}
                            disabled={clockShift.isPending || !s.active}
                            className="rounded-lg bg-success px-3 py-1.5 text-sm font-semibold text-success-foreground hover:bg-success/90 disabled:opacity-50"
                          >
                            Clock In
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5">
            <div className="flex items-center gap-4">
              {depts.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setTab(i)}
                  className={`py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === i ? "border-success text-success" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search staff..."
                className="rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm w-56"
              />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                {["Name", "Role", "Department", "Email", "Status", ""].map((h) => (
                  <th key={h} className="text-left font-medium px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <Loader2 className="size-4 animate-spin inline mr-2" /> Loading staff…
                  </td>
                </tr>
              )}
              {!isLoading &&
                filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-gradient-to-br from-accent to-primary/30 flex items-center justify-center text-xs font-bold">
                          {s.name[0]}
                        </div>
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">{s.role}</td>
                    <td className="px-5 py-4 text-muted-foreground">{s.dept}</td>
                    <td className="px-5 py-4 text-muted-foreground">{s.email || "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[s.active ? "Active" : "Inactive"]}`}>
                        {s.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2">
                      <button
                        type="button"
                        title={s.active ? "Deactivate" : "Activate"}
                        onClick={() => handleToggleActive(s.id, s.active)}
                        className="size-7 rounded-md hover:bg-muted flex items-center justify-center"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No staff members yet. Add your team to this restaurant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && (
        <AddStaffDialog
          onClose={() => setAddOpen(false)}
          onCreate={createStaff}
        />
      )}
    </AppShell>
  );
}

function AddStaffDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: ReturnType<typeof useCreateStaffUser>;
}) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "hostess" | "server">("server");
  const [email, setEmail] = useState("");
  const [hourlyWage, setHourlyWage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!email.trim()) {
      toast.error("Email is required (Google / email login — no staff PINs)");
      return;
    }
    const wage = hourlyWage.trim() ? parseFloat(hourlyWage) : undefined;
    if (hourlyWage.trim() && (isNaN(wage!) || wage! < 0)) {
      toast.error("Enter a valid hourly wage");
      return;
    }
    setBusy(true);
    try {
      await onCreate.mutateAsync({
        full_name: fullName,
        role,
        email: email.trim(),
        hourly_wage: wage,
      });
      toast.success("Staff member added");
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add staff member");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-background border border-border shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Add staff member</h2>
          <button type="button" onClick={onClose} className="size-8 rounded-md hover:bg-muted flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <StaffField label="Full name *">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="staff-input" placeholder="Jane Doe" />
          </StaffField>
          <StaffField label="Role *">
            <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "hostess" | "server")} className="staff-input">
              <option value="admin">Admin</option>
              <option value="hostess">Hostess</option>
              <option value="server">Server</option>
            </select>
          </StaffField>
          <StaffField label="Email *">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="staff-input" placeholder="jane@restaurant.com" required />
          </StaffField>
          <StaffField label="Hourly wage (optional)">
            <input type="number" step="0.01" value={hourlyWage} onChange={(e) => setHourlyWage(e.target.value)} className="staff-input" placeholder="15.00" />
          </StaffField>
          <p className="text-xs text-muted-foreground">
            Team signs in with Google or email/password. Staff PIN login is removed for MVP.
          </p>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || onCreate.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:opacity-60"
          >
            {(busy || onCreate.isPending) && <Loader2 className="size-4 animate-spin" />}
            Add staff
          </button>
        </div>
        <style>{`.staff-input{width:100%;border:1px solid hsl(var(--border));border-radius:0.5rem;background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem}`}</style>
      </div>
    </div>
  );
}

function StaffField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
