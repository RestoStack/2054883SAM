import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { UserCog, Plus, Search, Users, ChefHat, Briefcase, MoreHorizontal, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useStaffUsers } from "@/lib/v2-data";

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
  const { data: staff = [], isLoading } = useStaffUsers();

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

  return (
    <AppShell>
      <PageHeader
        title="Staff"
        description="Team members for this restaurant only."
        icon={UserCog}
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">Schedule</button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground">
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
                      <button className="size-7 rounded-md hover:bg-muted flex items-center justify-center">
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
    </AppShell>
  );
}
