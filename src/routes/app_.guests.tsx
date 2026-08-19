import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Download, Loader2, Save, Search, Users, BookmarkCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  guestsToCsv,
  listGuests,
  listSegments,
  saveSegment,
  type GuestFilters,
  type GuestRow,
} from "@/lib/guests-api";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app_/guests")({
  head: () => ({ meta: [{ title: "Guests — RestoStack" }] }),
  component: GuestsPage,
});

type OptInFilter = "any" | "yes" | "no";
type PhoneFilter = "any" | "yes" | "no";

type SavedSegment = {
  id: string;
  name: string;
  filters: { q?: string; optIn?: OptInFilter; hasPhone?: PhoneFilter };
};

function GuestsPage() {
  const { org } = useAuth();
  const orgId = org.activeOrganizationId;

  const [q, setQ] = useState("");
  const [optIn, setOptIn] = useState<OptInFilter>("any");
  const [hasPhone, setHasPhone] = useState<PhoneFilter>("any");
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<SavedSegment[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [segmentName, setSegmentName] = useState("");
  const [saving, setSaving] = useState(false);

  const filters: GuestFilters = useMemo(
    () => ({
      optIn: optIn === "any" ? undefined : optIn,
      hasPhone: hasPhone === "any" ? undefined : hasPhone === "yes",
    }),
    [optIn, hasPhone],
  );

  const refresh = async () => {
    if (!orgId) return;
    setLoading(true);
    const res = await listGuests(orgId, q, filters);
    if (!res.ok) toast.error(res.error);
    setGuests(res.guests);
    setLoading(false);
  };

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    const t = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, q, optIn, hasPhone]);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const res = await listSegments(orgId);
      if (res.ok) setSegments(res.segments as SavedSegment[]);
    })();
  }, [orgId]);

  const applySegment = (seg: SavedSegment) => {
    setQ(seg.filters.q ?? "");
    setOptIn(seg.filters.optIn ?? "any");
    setHasPhone(seg.filters.hasPhone ?? "any");
    toast.success(`Segment "${seg.name}" applied`);
  };

  const handleSaveSegment = async () => {
    if (!orgId) return;
    if (!segmentName.trim()) {
      toast.error("Segment name is required");
      return;
    }
    setSaving(true);
    const res = await saveSegment(orgId, segmentName.trim(), { q, optIn, hasPhone });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Segment saved");
    setSaveOpen(false);
    setSegmentName("");
    const list = await listSegments(orgId);
    if (list.ok) setSegments(list.segments as SavedSegment[]);
  };

  const handleExport = () => {
    if (guests.length === 0) {
      toast.error("No guests to export");
      return;
    }
    const csv = guestsToCsv(guests);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guests_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`Exported ${guests.length} guest${guests.length === 1 ? "" : "s"}`);
  };

  return (
    <AppShell>
      <PageHeader
        title="Guests"
        description="Search, filter, and manage your guest CRM."
        icon={Users}
        actions={
          <>
            {segments.length > 0 && (
              <Select
                onValueChange={(id) => {
                  const seg = segments.find((s) => s.id === id);
                  if (seg) applySegment(seg);
                }}
              >
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <BookmarkCheck className="size-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Saved segments" />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button
              type="button"
              onClick={() => setSaveOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50"
            >
              <Save className="size-4" /> Save segment
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50"
            >
              <Download className="size-4" /> Export CSV
            </button>
          </>
        }
      />

      <div className="p-4 lg:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, or phone…"
              className="pl-9"
            />
          </div>
          <Select value={optIn} onValueChange={(v) => setOptIn(v as OptInFilter)}>
            <SelectTrigger className="w-[170px] h-9 text-sm">
              <SelectValue placeholder="Marketing opt-in" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Opt-in: any</SelectItem>
              <SelectItem value="yes">Opted in</SelectItem>
              <SelectItem value="no">Not opted in</SelectItem>
            </SelectContent>
          </Select>
          <Select value={hasPhone} onValueChange={(v) => setHasPhone(v as PhoneFilter)}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Has phone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Phone: any</SelectItem>
              <SelectItem value="yes">Has phone</SelectItem>
              <SelectItem value="no">No phone</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {loading ? "Loading…" : `${guests.length} guest${guests.length === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                {["Name", "Email", "Phone", "Marketing opt-in", "Tags", "Since"].map((h) => (
                  <th key={h} className="text-left font-medium px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    <Loader2 className="size-4 animate-spin inline mr-2" /> Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                guests.map((g) => (
                  <tr key={g.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-4">
                      <Link
                        to="/app/guests/$id"
                        params={{ id: g.id }}
                        className="flex items-center gap-3 font-medium hover:underline"
                      >
                        <div className="size-9 rounded-full bg-gradient-to-br from-accent to-primary/30 shrink-0" />
                        {g.full_name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{g.email ?? "—"}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {g.phone_e164 ?? g.phone ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={g.marketing_opt_in ? "default" : "outline"}
                        className={
                          g.marketing_opt_in
                            ? "bg-success/15 text-success border-transparent"
                            : "text-muted-foreground"
                        }
                      >
                        {g.marketing_opt_in ? "Opted in" : "Opted out"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {(g.tags ?? []).length > 0 ? g.tags!.join(", ") : "—"}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Date(g.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              {!loading && guests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    {orgId ? "No guests match these filters." : "No organization selected."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="size-5 text-success" /> Save segment
            </DialogTitle>
            <DialogDescription>
              Save the current search and filters so you can reapply them later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="segment-name" className="text-xs font-medium text-muted-foreground">
              Segment name
            </Label>
            <Input
              id="segment-name"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              placeholder="e.g. VIPs with phone"
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setSaveOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSegment}
              disabled={saving || !segmentName.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground hover:bg-success/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save segment
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
