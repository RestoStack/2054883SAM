import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Mail,
  Merge,
  Phone,
  PlusCircle,
  ShieldAlert,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth";
import {
  addGuestNote,
  anonymizeGuest,
  getGuest,
  getGuestHistory,
  getGuestNotes,
  getGuestStats,
  listGuests,
  mergeGuests,
  type GuestRow,
} from "@/lib/guests-api";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app_/guests/$id")({
  head: () => ({ meta: [{ title: "Guest — RestoStack" }] }),
  component: GuestDetail,
});

type Guest = GuestRow & Record<string, unknown>;

type LocationStat = {
  guest_id: string;
  location_id: string;
  visits: number;
  no_shows: number;
  cancellations: number;
  first_visit: string | null;
  last_visit: string | null;
};

type HistoryRow = {
  id: string;
  reserved_date: string;
  reserved_time: string;
  party_size: number;
  status: string;
  source: string;
  table_number: string | null;
};

type NoteRow = {
  id: string;
  body: string;
  created_at: string;
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

const statusStyle = (s: string) =>
  s === "seated" || s === "completed"
    ? "bg-success/15 text-success"
    : s === "cancelled" || s === "no_show"
      ? "bg-destructive/15 text-destructive"
      : "bg-info/15 text-info";

function GuestDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { org } = useAuth();
  const orgId = org.activeOrganizationId;
  const canManage = org.role === "owner" || org.role === "manager";
  const isOwner = org.role === "owner";

  const [guest, setGuest] = useState<Guest | null>(null);
  const [stats, setStats] = useState<LocationStat[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteBody, setNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const [mergeQuery, setMergeQuery] = useState("");
  const [mergeCandidates, setMergeCandidates] = useState<GuestRow[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [merging, setMerging] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);

  const refresh = async () => {
    if (!orgId) return;
    setLoading(true);
    const [g, s, h, n] = await Promise.all([
      getGuest(orgId, id),
      getGuestStats(id),
      getGuestHistory(orgId, id),
      getGuestNotes(id),
    ]);
    if (!g.ok) {
      toast.error(g.error);
      setGuest(null);
    } else {
      setGuest(g.guest);
    }
    if (s.ok) setStats(s.stats as LocationStat[]);
    if (h.ok) setHistory(h.rows as HistoryRow[]);
    if (n.ok) setNotes(n.notes as NoteRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, id]);

  useEffect(() => {
    if (!orgId || !mergeQuery.trim()) {
      setMergeCandidates([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await listGuests(orgId, mergeQuery);
      if (res.ok) setMergeCandidates(res.guests.filter((c) => c.id !== id));
    }, 250);
    return () => clearTimeout(t);
  }, [orgId, mergeQuery, id]);

  const handleAddNote = async () => {
    if (!orgId || !noteBody.trim()) return;
    setAddingNote(true);
    const res = await addGuestNote(orgId, id, noteBody.trim());
    setAddingNote(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setNoteBody("");
    toast.success("Note added");
    const n = await getGuestNotes(id);
    if (n.ok) setNotes(n.notes as NoteRow[]);
  };

  const handleMerge = async () => {
    if (!orgId || !mergeTargetId) return;
    setMerging(true);
    const res = await mergeGuests(orgId, id, mergeTargetId);
    setMerging(false);
    setMergeConfirmOpen(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Guests merged");
    setMergeTargetId("");
    setMergeQuery("");
    setMergeCandidates([]);
    await refresh();
  };

  const handleAnonymize = async () => {
    if (!orgId) return;
    setAnonymizing(true);
    const res = await anonymizeGuest(orgId, id);
    setAnonymizing(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Guest data deleted");
    navigate({ to: "/app/guests" });
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-10 text-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin inline mr-2" /> Loading guest…
        </div>
      </AppShell>
    );
  }

  if (!guest) {
    return (
      <AppShell>
        <div className="p-10 text-center">
          <div className="text-lg font-semibold">Guest not found</div>
          <p className="text-sm text-muted-foreground mt-1">
            This guest is not part of your organization's data.
          </p>
          <Link
            to="/app/guests"
            className="inline-flex items-center gap-2 mt-4 rounded-lg bg-success text-success-foreground px-4 py-2 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" /> Back to Guests
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/app/guests"
            className="size-9 rounded-full border border-border bg-card flex items-center justify-center"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/app/guests" className="text-muted-foreground">
              Guests
            </Link>
            <span className="text-muted-foreground">›</span>
            <span className="font-medium">{guest.full_name}</span>
          </nav>
        </div>
      </div>

      <div className="px-5 sm:px-8 pt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-full bg-gradient-to-br from-accent to-primary/30 flex items-center justify-center text-2xl font-bold">
            {initials(guest.full_name)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{guest.full_name}</h1>
              <Badge
                variant={guest.marketing_opt_in ? "default" : "outline"}
                className={
                  guest.marketing_opt_in
                    ? "bg-success/15 text-success border-transparent"
                    : "text-muted-foreground"
                }
              >
                {guest.marketing_opt_in ? "Opted in" : "Opted out"}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
              {guest.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-4" /> {guest.email}
                </span>
              )}
              {(guest.phone_e164 ?? guest.phone) && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-4" /> {(guest.phone_e164 ?? guest.phone) as string}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" /> Guest since{" "}
                {new Date(guest.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-8 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Stats by location">
            {stats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visit history yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.map((s) => (
                  <div
                    key={s.location_id}
                    className="grid grid-cols-4 gap-2 text-center rounded-lg border border-border p-3"
                  >
                    <Stat label="Visits" value={s.visits} />
                    <Stat label="No-shows" value={s.no_shows} />
                    <Stat label="Cancels" value={s.cancellations} />
                    <div>
                      <div className="text-xs text-muted-foreground">Last visit</div>
                      <div className="text-sm font-semibold mt-1">
                        {s.last_visit ? new Date(s.last_visit).toLocaleDateString() : "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Profile">
            <dl className="space-y-3 text-sm">
              {[
                ["Full name", guest.full_name],
                ["Email", guest.email ?? "—"],
                ["Phone", (guest.phone_e164 ?? guest.phone ?? "—") as string],
                ["Marketing opt-in source", (guest.marketing_opt_in_source as string) ?? "—"],
                [
                  "Opted in at",
                  guest.marketing_opt_in_at
                    ? new Date(guest.marketing_opt_in_at as string).toLocaleString()
                    : "—",
                ],
                ["Tags", ((guest.tags as string[]) ?? []).join(", ") || "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium text-right">{v as string}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        <Panel title={`Reservation history${history.length ? ` (${history.length})` : ""}`}>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reservations on record for this guest.
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden -m-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                    {["Date", "Time", "Party", "Table", "Source", "Status"].map((h) => (
                      <th key={h} className="text-left font-medium px-4 py-2.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-muted-foreground">{r.reserved_date}</td>
                      <td className="px-4 py-2.5">{(r.reserved_time ?? "").slice(0, 5)}</td>
                      <td className="px-4 py-2.5 inline-flex items-center gap-1">
                        <Users className="size-3.5 text-muted-foreground" /> {r.party_size}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.table_number ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground capitalize">
                        {r.source?.replace("_", " ")}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(r.status)}`}
                        >
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Notes">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Add a note about this guest (allergies, preferences, occasions)…"
                rows={2}
                className="flex-1"
              />
              <button
                type="button"
                disabled={addingNote || !noteBody.trim()}
                onClick={handleAddNote}
                className="inline-flex items-center gap-1.5 h-fit self-end rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {addingNote ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PlusCircle className="size-4" />
                )}
                Add
              </button>
            </div>
            <div className="space-y-2">
              {notes.length === 0 && (
                <p className="text-sm text-muted-foreground">No notes yet for this guest.</p>
              )}
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {canManage && (
          <Panel title="Merge duplicate guest">
            <p className="text-sm text-muted-foreground mb-3">
              Search for a duplicate guest profile and merge it into this one. Reservations and
              notes move over; the duplicate profile is removed.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={mergeQuery}
                onChange={(e) => setMergeQuery(e.target.value)}
                placeholder="Search by name, email, or phone…"
                className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger className="w-[220px] h-9 text-sm">
                  <SelectValue placeholder="Pick duplicate guest" />
                </SelectTrigger>
                <SelectContent>
                  {mergeCandidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} {c.email ? `· ${c.email}` : ""}
                    </SelectItem>
                  ))}
                  {mergeCandidates.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
                  )}
                </SelectContent>
              </Select>
              <button
                type="button"
                disabled={!mergeTargetId}
                onClick={() => setMergeConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                <Merge className="size-4" /> Merge into this guest
              </button>
            </div>
          </Panel>
        )}

        {isOwner && (
          <Panel title="Danger zone" tone="danger">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Delete guest data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently anonymizes this guest's name, email, phone, and notes. Past
                  reservation counts are retained for reporting but stripped of personal data. This
                  cannot be undone.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive shrink-0"
                  >
                    <ShieldAlert className="size-4" /> Delete guest data
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this guest's data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes {guest.full_name}'s personal information (name,
                      email, phone, notes) from your organization. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={anonymizing}
                      onClick={handleAnonymize}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {anonymizing ? "Deleting…" : "Delete guest data"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Panel>
        )}
      </div>

      <AlertDialog open={mergeConfirmOpen} onOpenChange={setMergeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge guests?</AlertDialogTitle>
            <AlertDialogDescription>
              The selected guest's reservations, notes, and tags will move to {guest.full_name}, and
              the duplicate profile will be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merging}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={merging} onClick={handleMerge}>
              {merging ? "Merging…" : "Merge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}

function Panel({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${tone === "danger" ? "border-destructive/30 bg-destructive/[0.03]" : "border-border bg-card"}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
