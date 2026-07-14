import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { UserCog, Plus, Search, Users, ChefHat, Briefcase, MoreHorizontal } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Staff — RestoStack" }] }),
  component: StaffPage,
});

const staff = [
  { name: "Alex Morgan", role: "Manager", dept: "Management", shift: "9:00 AM – 6:00 PM", status: "Working", rate: "$32/h" },
  { name: "Michael Brown", role: "Head Server", dept: "Front of House", shift: "4:00 PM – 11:00 PM", status: "Working", rate: "$22/h" },
  { name: "Sarah Thompson", role: "Server", dept: "Front of House", shift: "5:00 PM – 11:00 PM", status: "Working", rate: "$18/h" },
  { name: "James Wilson", role: "Bartender", dept: "Front of House", shift: "6:00 PM – 12:00 AM", status: "Break", rate: "$20/h" },
  { name: "Marco Rossi", role: "Head Chef", dept: "Back of House", shift: "2:00 PM – 11:00 PM", status: "Working", rate: "$35/h" },
  { name: "Yuki Tanaka", role: "Sous Chef", dept: "Back of House", shift: "3:00 PM – 11:00 PM", status: "Working", rate: "$28/h" },
  { name: "Carlos Silva", role: "Line Cook", dept: "Back of House", shift: "4:00 PM – 12:00 AM", status: "Working", rate: "$19/h" },
  { name: "Olivia Martinez", role: "Hostess", dept: "Front of House", shift: "5:00 PM – 11:00 PM", status: "Off", rate: "$16/h" },
];

const statusStyles: Record<string, string> = {
  Working: "bg-success/15 text-success",
  Break: "bg-warning/15 text-warning",
  Off: "bg-muted text-muted-foreground",
};

const depts = ["All Staff", "Front of House", "Back of House", "Management"];

function StaffPage() {
  const [tab, setTab] = useState(0);
  const filtered = tab === 0 ? staff : staff.filter((s) => s.dept === depts[tab]);

  return (
    <AppShell>
      <PageHeader
        title="Staff"
        description="Manage schedules, roles and payroll."
        icon={UserCog}
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">Schedule</button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground"><Plus className="size-4" /> Add Staff</button>
          </>
        }
      />
      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Total Staff", v: "24", i: Users, c: "bg-accent text-primary" },
            { l: "Working Now", v: "18", i: Briefcase, c: "bg-success/15 text-success" },
            { l: "Front of House", v: "14", i: Users, c: "bg-info/15 text-info" },
            { l: "Back of House", v: "8", i: ChefHat, c: "bg-warning/15 text-warning" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full flex items-center justify-center ${s.c}`}><s.i className="size-5" /></div>
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
                <button key={d} onClick={() => setTab(i)} className={`py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === i ? "border-success text-success" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{d}</button>
              ))}
            </div>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Search staff..." className="rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm w-56" />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              {["Name", "Role", "Department", "Shift Today", "Hourly Rate", "Status", ""].map((h) => (
                <th key={h} className="text-left font-medium px-5 py-3">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.name} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-gradient-to-br from-accent to-primary/30" />
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">{s.role}</td>
                  <td className="px-5 py-4 text-muted-foreground">{s.dept}</td>
                  <td className="px-5 py-4 text-muted-foreground">{s.shift}</td>
                  <td className="px-5 py-4 font-semibold">{s.rate}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[s.status]}`}>{s.status}</span></td>
                  <td className="px-2"><button className="size-7 rounded-md hover:bg-muted flex items-center justify-center"><MoreHorizontal className="size-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
