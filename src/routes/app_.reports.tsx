import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { BarChart3, Bookmark, Download, Loader2, Lock, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import {
  getReportMetrics,
  listReportPresets,
  saveReportPreset,
  deleteReportPreset,
  type ReportPreset,
} from "@/lib/dashboard-api";
import { settingsListLocations } from "@/lib/settings-api";
import { exportCsv } from "@/lib/export";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/app_/reports")({
  head: () => ({ meta: [{ title: "Reports — RestoStack" }] }),
  component: ReportsPage,
});

type GroupBy = "day" | "week" | "month" | "location" | "source";
type MetricRow = { bucket: string; reservations: number; covers: number; no_shows: number };

const GROUP_LABELS: Record<GroupBy, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  location: "Location",
  source: "Source",
};

function ReportsPage() {
  const { org } = useAuth();
  const orgId = org.activeOrganizationId;
  const allowed = !org.available || org.role === "owner" || org.role === "manager";

  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [range, setRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const [rows, setRows] = useState<MetricRow[]>([]);
  const [priorFrom, setPriorFrom] = useState<string | null>(null);
  const [priorTo, setPriorTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [presets, setPresets] = useState<ReportPreset[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [saving, setSaving] = useState(false);

  const fromISO = range?.from
    ? format(range.from, "yyyy-MM-dd")
    : format(subDays(new Date(), 29), "yyyy-MM-dd");
  const toISO = range?.to
    ? format(range.to, "yyyy-MM-dd")
    : format(range?.from ?? new Date(), "yyyy-MM-dd");
  const rangeLabel = `${format(new Date(fromISO), "MMM d")} – ${format(new Date(toISO), "MMM d, yyyy")}`;

  useEffect(() => {
    if (!orgId || !allowed) return;
    (async () => {
      const res = await settingsListLocations(orgId);
      const locs = (res.ok && Array.isArray(res.locations) ? res.locations : []) as Array<{
        id: string;
        name: string;
      }>;
      setLocations(locs);
    })();
    (async () => {
      const res = await listReportPresets(orgId);
      if (res.ok) setPresets(res.presets);
    })();
  }, [orgId, allowed]);

  useEffect(() => {
    if (!orgId || !allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const res = await getReportMetrics(orgId, locationId || null, fromISO, toISO, groupBy);
      if (!res.ok) {
        toast.error(res.error);
        setLoading(false);
        return;
      }
      setRows(res.rows);
      setPriorFrom(res.prior_from);
      setPriorTo(res.prior_to);
      setLoading(false);
    })();
  }, [orgId, allowed, locationId, fromISO, toISO, groupBy]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          reservations: acc.reservations + r.reservations,
          covers: acc.covers + r.covers,
          no_shows: acc.no_shows + r.no_shows,
        }),
        { reservations: 0, covers: 0, no_shows: 0 },
      ),
    [rows],
  );

  const bucketLabel = (b: string) => {
    if (groupBy === "location") {
      return locations.find((l) => l.id === b)?.name ?? b;
    }
    return b;
  };

  const handleExportCsv = () => {
    if (rows.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportCsv(
      `reports_${groupBy}_${fromISO}_${toISO}`,
      ["Bucket", "Reservations", "Covers", "No-shows"],
      rows.map((r) => ({
        Bucket: bucketLabel(r.bucket),
        Reservations: r.reservations,
        Covers: r.covers,
        "No-shows": r.no_shows,
      })),
    );
    toast.success("Exported CSV");
  };

  const applyPreset = (preset: ReportPreset) => {
    setLocationId(preset.config.location_id ?? "");
    setGroupBy((preset.config.group_by as GroupBy) ?? "day");
    if (preset.config.from && preset.config.to) {
      setRange({ from: new Date(preset.config.from), to: new Date(preset.config.to) });
    }
    toast.success(`Preset "${preset.name}" applied`);
  };

  const handleSavePreset = async () => {
    if (!orgId || !presetName.trim()) {
      toast.error("Preset name is required");
      return;
    }
    setSaving(true);
    const res = await saveReportPreset(orgId, presetName.trim(), {
      location_id: locationId || null,
      from: fromISO,
      to: toISO,
      group_by: groupBy,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Preset saved");
    setSaveOpen(false);
    setPresetName("");
    const list = await listReportPresets(orgId);
    if (list.ok) setPresets(list.presets);
  };

  const handleDeletePreset = async (id: string) => {
    if (!orgId) return;
    const res = await deleteReportPreset(orgId, id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setPresets((prev) => prev.filter((p) => p.id !== id));
  };

  if (!allowed) {
    return (
      <AppShell>
        <PageHeader title="Reports" icon={BarChart3} />
        <div className="p-10 text-center">
          <Lock className="size-8 mx-auto text-muted-foreground mb-3" />
          <div className="text-lg font-semibold">Owner or manager access required</div>
          <p className="text-sm text-muted-foreground mt-1">
            Ask an owner or manager on your team to view reports.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        description="Reservation performance rolled up by day, week, month, location, or source."
        icon={BarChart3}
        actions={
          <>
            {presets.length > 0 && (
              <Select
                onValueChange={(id) => {
                  const p = presets.find((x) => x.id === id);
                  if (p) applyPreset(p);
                }}
              >
                <SelectTrigger className="w-[170px] h-9 text-sm">
                  <Bookmark className="size-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Saved presets" />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
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
              <Save className="size-4" /> Save preset
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50"
            >
              <Download className="size-4" /> Export CSV
            </button>
          </>
        }
      />

      <div className="p-4 lg:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {locations.length > 1 && (
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="w-[170px] h-9 text-sm">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All locations</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(GROUP_LABELS) as GroupBy[]).map((g) => (
                <SelectItem key={g} value={g}>
                  Group by {GROUP_LABELS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker value={range} onChange={setRange} />
        </div>

        {priorFrom && priorTo && (
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{rangeLabel}</span> · compared to
            prior period <span className="font-medium text-foreground">{priorFrom}</span> to{" "}
            <span className="font-medium text-foreground">{priorTo}</span>.
          </p>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="py-14 text-center text-muted-foreground">
              <Loader2 className="size-4 animate-spin inline mr-2" /> Loading report…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground">
              No reservation activity in this range yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{GROUP_LABELS[groupBy]}</TableHead>
                  <TableHead className="text-right">Reservations</TableHead>
                  <TableHead className="text-right">Covers</TableHead>
                  <TableHead className="text-right">No-shows</TableHead>
                  <TableHead className="text-right">No-show rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.bucket}>
                    <TableCell className="font-medium">{bucketLabel(r.bucket)}</TableCell>
                    <TableCell className="text-right">{r.reservations}</TableCell>
                    <TableCell className="text-right">{r.covers}</TableCell>
                    <TableCell className="text-right">{r.no_shows}</TableCell>
                    <TableCell className="text-right">
                      {r.reservations > 0
                        ? `${((r.no_shows / r.reservations) * 100).toFixed(1)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <TableRow className="bg-muted/30 font-semibold hover:bg-muted/30">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totals.reservations}</TableCell>
                  <TableCell className="text-right">{totals.covers}</TableCell>
                  <TableCell className="text-right">{totals.no_shows}</TableCell>
                  <TableCell className="text-right">
                    {totals.reservations > 0
                      ? `${((totals.no_shows / totals.reservations) * 100).toFixed(1)}%`
                      : "—"}
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          )}
        </div>

        {presets.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">Saved presets</h3>
            <ul className="space-y-1.5">
              {presets.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="hover:underline text-left"
                  >
                    {p.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(p.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Delete preset ${p.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="size-5 text-success" /> Save report preset
            </DialogTitle>
            <DialogDescription>
              Save the current location, date range, and grouping so you can reload this view later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="preset-name" className="text-xs font-medium text-muted-foreground">
              Preset name
            </Label>
            <Input
              id="preset-name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="e.g. Monthly by location"
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
              onClick={handleSavePreset}
              disabled={saving || !presetName.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground hover:bg-success/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save preset
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
