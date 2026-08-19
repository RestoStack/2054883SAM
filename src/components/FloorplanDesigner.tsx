import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, LayoutGrid, Trash2 } from "lucide-react";

type Shape = "round" | "square" | "rectangle";
type Table = {
  id: string;
  table_number: string;
  section: string | null;
  capacity: number;
  shape: Shape;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
};

const CANVAS_W = 1000;
const CANVAS_H = 560;
const DEFAULT_W: Record<Shape, number> = { round: 60, square: 70, rectangle: 100 };
const DEFAULT_H: Record<Shape, number> = { round: 60, square: 70, rectangle: 60 };
const SECTIONS = ["Main Floor", "Patio", "Bar", "Private"];

export function FloorplanDesigner({ restaurantId }: { restaurantId: string }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; offX: number; offY: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("v2_tables")
        .select("id, table_number, section, capacity, shape, position_x, position_y, width, height")
        .eq("restaurant_id", restaurantId)
        .order("table_number");
      if (error) toast.error(error.message);
      setTables((data ?? []) as Table[]);
      setLoading(false);
    })();
  }, [restaurantId]);

  const selected = useMemo(() => tables.find((t) => t.id === selectedId) ?? null, [tables, selectedId]);
  const unplaced = tables.filter((t) => t.position_x == null || t.position_y == null || (t.position_x === 0 && t.position_y === 0));
  const placed = tables.filter((t) => !unplaced.includes(t));

  const update = (id: string, patch: Partial<Table>) =>
    setTables((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const place = (id: string) => {
    const t = tables.find((x) => x.id === id);
    if (!t) return;
    const idx = placed.length;
    const cols = 6;
    const x = 120 + (idx % cols) * 130;
    const y = 120 + Math.floor(idx / cols) * 110;
    update(id, { position_x: x, position_y: y, width: t.width ?? DEFAULT_W[t.shape], height: t.height ?? DEFAULT_H[t.shape] });
    setSelectedId(id);
  };

  const autoLayout = () => {
    setTables((arr) => {
      let i = 0;
      return arr.map((t) => {
        const idx = i++;
        const cols = 6;
        return {
          ...t,
          position_x: 120 + (idx % cols) * 130,
          position_y: 120 + Math.floor(idx / cols) * 110,
          width: t.width ?? DEFAULT_W[t.shape],
          height: t.height ?? DEFAULT_H[t.shape],
        };
      });
    });
    toast.success("Auto-laid out all tables — drag to fine-tune, then Save.");
  };

  const startDrag = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setSelectedId(id);
    const t = tables.find((x) => x.id === id);
    if (!t) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = ((t.position_x ?? 0) / CANVAS_W) * rect.width;
    const py = ((t.position_y ?? 0) / CANVAS_H) * rect.height;
    drag.current = { id, offX: e.clientX - rect.left - px, offY: e.clientY - rect.top - py };
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left - drag.current.offX;
    const py = e.clientY - rect.top - drag.current.offY;
    const nx = Math.max(30, Math.min(CANVAS_W - 30, (px / rect.width) * CANVAS_W));
    const ny = Math.max(30, Math.min(CANVAS_H - 30, (py / rect.height) * CANVAS_H));
    update(drag.current.id, { position_x: Math.round(nx), position_y: Math.round(ny) });
  };

  const endDrag = () => { drag.current = null; };

  const save = async () => {
    setSaving(true);
    const updates = tables.map((t) =>
      supabase
        .from("v2_tables")
        .update({
          table_number: t.table_number,
          section: t.section,
          capacity: t.capacity,
          shape: t.shape,
          position_x: t.position_x ?? 0,
          position_y: t.position_y ?? 0,
          width: t.width,
          height: t.height,
        })
        .eq("id", t.id)
    );
    const results = await Promise.all(updates);
    setSaving(false);
    const err = results.find((r) => r.error)?.error;
    if (err) { toast.error(err.message); return; }
    toast.success("Floor plan saved");
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;
  }

  if (tables.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <div className="text-sm text-muted-foreground">No tables yet. Add tables first, then arrange them here.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
      <div>
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <div className="text-xs text-muted-foreground">Drag tables to arrange · click to select</div>
          <div className="flex gap-2">
            <button onClick={autoLayout} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
              <LayoutGrid className="size-3.5" /> Auto layout
            </button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground disabled:opacity-60">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save floor plan
            </button>
          </div>
        </div>
        <div
          ref={canvasRef}
          onPointerMove={onMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className="relative w-full overflow-hidden rounded-lg border border-border bg-[#2a2f36] touch-none select-none"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        >
          {placed.map((t) => {
            const w = t.width ?? DEFAULT_W[t.shape];
            const h = t.height ?? DEFAULT_H[t.shape];
            const isSel = t.id === selectedId;
            return (
              <div
                key={t.id}
                onPointerDown={(e) => startDrag(e, t.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[11px] font-semibold text-zinc-800 bg-zinc-300 shadow cursor-grab active:cursor-grabbing ${t.shape === "round" ? "rounded-full" : "rounded-md"} ${isSel ? "ring-2 ring-success ring-offset-2 ring-offset-[#2a2f36]" : ""}`}
                style={{
                  left: `${((t.position_x ?? 0) / CANVAS_W) * 100}%`,
                  top: `${((t.position_y ?? 0) / CANVAS_H) * 100}%`,
                  width: `${(w / CANVAS_W) * 100}%`,
                  height: `${(h / CANVAS_H) * 100}%`,
                  minWidth: 24, minHeight: 24,
                }}
              >
                {t.table_number}
              </div>
            );
          })}
        </div>
      </div>

      <aside className="space-y-3">
        {unplaced.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Unplaced ({unplaced.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {unplaced.map((t) => (
                <button key={t.id} onClick={() => place(t.id)} className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted">
                  + {t.table_number}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Selected table</div>
          {!selected && <div className="text-sm text-muted-foreground">Click a table on the canvas.</div>}
          {selected && (
            <div className="space-y-2">
              <LabeledInput label="Table #" value={selected.table_number} onChange={(v) => update(selected.id, { table_number: v })} />
              <LabeledSelect label="Section" value={selected.section ?? "Main Floor"} onChange={(v) => update(selected.id, { section: v })} options={SECTIONS} />
              <LabeledSelect label="Shape" value={selected.shape} onChange={(v) => {
                const shape = v as Shape;
                update(selected.id, { shape, width: DEFAULT_W[shape], height: DEFAULT_H[shape] });
              }} options={["round", "square", "rectangle"]} />
              <div className="grid grid-cols-2 gap-2">
                <LabeledNumber label="Capacity" value={selected.capacity} onChange={(v) => update(selected.id, { capacity: v })} min={1} />
                <LabeledNumber label="Width" value={selected.width ?? DEFAULT_W[selected.shape]} onChange={(v) => update(selected.id, { width: v })} min={24} />
              </div>
              {selected.shape !== "round" && (
                <LabeledNumber label="Height" value={selected.height ?? DEFAULT_H[selected.shape]} onChange={(v) => update(selected.id, { height: v })} min={24} />
              )}
              <button
                onClick={() => update(selected.id, { position_x: 0, position_y: 0 })}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" /> Remove from floor
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
    </label>
  );
}
function LabeledNumber({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase text-muted-foreground">{label}</span>
      <input type="number" min={min} value={value} onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || min))} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
    </label>
  );
}
function LabeledSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm capitalize">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
