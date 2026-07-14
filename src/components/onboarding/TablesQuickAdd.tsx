import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

type DraftTable = { id: string; table_number: string; section: string; capacity: number };
const SECTIONS = ["Main Floor", "Patio", "Bar", "Private"];

export function TablesQuickAdd({ restaurantId, onSaved }: { restaurantId: string; onSaved?: () => void }) {
  const [drafts, setDrafts] = useState<DraftTable[]>([]);
  const [busy, setBusy] = useState(false);
  const [existingCount, setExistingCount] = useState(0);

  const refreshCount = async () => {
    const { count } = await supabase
      .from("v2_tables")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);
    setExistingCount(count ?? 0);
  };
  useEffect(() => { refreshCount(); }, [restaurantId]);

  const addRow = () =>
    setDrafts((d) => [...d, {
      id: crypto.randomUUID(),
      table_number: String(existingCount + d.length + 1),
      section: "Main Floor",
      capacity: 4,
    }]);

  const quickAdd = (count: number, section: string, capacity: number) => {
    const base = existingCount + drafts.length;
    setDrafts((d) => [
      ...d,
      ...Array.from({ length: count }, (_, i) => ({
        id: crypto.randomUUID(),
        table_number: String(base + i + 1),
        section, capacity,
      })),
    ]);
  };

  const update = (id: string, patch: Partial<DraftTable>) =>
    setDrafts((d) => d.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setDrafts((d) => d.filter((r) => r.id !== id));

  const save = async () => {
    if (drafts.length === 0) { onSaved?.(); return; }
    setBusy(true);
    const rows = drafts.map((d) => ({
      restaurant_id: restaurantId,
      table_number: d.table_number,
      section: d.section,
      capacity: d.capacity,
    }));
    const { error } = await supabase.from("v2_tables").insert(rows);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${rows.length} table${rows.length === 1 ? "" : "s"}`);
    setDrafts([]);
    await refreshCount();
    onSaved?.();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {existingCount > 0 ? `You have ${existingCount} table${existingCount === 1 ? "" : "s"} already.` : "Add tables so guests can be seated."}
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => quickAdd(8, "Main Floor", 4)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">+ 8 main dining (4 seats)</button>
        <button onClick={() => quickAdd(4, "Patio", 2)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">+ 4 patio (2 seats)</button>
        <button onClick={() => quickAdd(6, "Bar", 2)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">+ 6 bar (2 seats)</button>
        <button onClick={() => quickAdd(1, "Private", 8)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">+ private room (8 seats)</button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_100px_40px] gap-2 bg-muted/50 px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground">
          <div>Table #</div><div>Section</div><div>Capacity</div><div></div>
        </div>
        {drafts.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">No tables staged. Use a preset above or add one below.</div>
        )}
        {drafts.map((d) => (
          <div key={d.id} className="grid grid-cols-[1fr_1fr_100px_40px] gap-2 px-3 py-2 border-t border-border items-center">
            <input value={d.table_number} onChange={(e) => update(d.id, { table_number: e.target.value })} className="rounded-md border border-border bg-background px-2 py-1 text-sm" />
            <select value={d.section} onChange={(e) => update(d.id, { section: e.target.value })} className="rounded-md border border-border bg-background px-2 py-1 text-sm">
              {SECTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <input type="number" min={1} value={d.capacity} onChange={(e) => update(d.id, { capacity: Math.max(1, parseInt(e.target.value) || 1) })} className="rounded-md border border-border bg-background px-2 py-1 text-sm" />
            <button onClick={() => remove(d.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={addRow} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
          <Plus className="size-3.5" /> Add table
        </button>
        <button onClick={save} disabled={busy || drafts.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" />} Save {drafts.length > 0 ? `${drafts.length} tables` : ""}
        </button>
      </div>
    </div>
  );
}
