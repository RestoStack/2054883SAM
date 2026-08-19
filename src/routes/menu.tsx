import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { UtensilsCrossed, Plus, Search, Pencil, MoreHorizontal, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useMenu, type MenuItemRow } from "@/lib/v2-data";
import { useUpdateMenuItem } from "@/hooks/use-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/menu")({
  head: () => ({ meta: [{ title: "Menu — RestoStack" }] }),
  component: MenuPage,
});

type Category = { id: string; name: string };

function MenuPage() {
  const { staff } = useAuth();
  const qc = useQueryClient();
  const [cat, setCat] = useState(0);
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItemRow | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const { data, isLoading } = useMenu();
  const updateItem = useUpdateMenuItem();
  const categories = data?.categories ?? ["All"];
  const items = data?.items ?? [];
  const filtered = items
    .filter((i) => cat === 0 || i.cat === categories[cat])
    .filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    if (!staff) return;
    supabase.from("v2_menu_categories").select("id,name").eq("restaurant_id", staff.restaurant_id).order("sort_order")
      .then(({ data }) => setCats((data ?? []) as Category[]));
  }, [staff, addOpen, editItem]);

  return (
    <AppShell>
      <PageHeader
        title="Menu"
        description="Organize categories, items and availability."
        icon={UtensilsCrossed}
        actions={
          <>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search menu..."
                className="rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm w-56"
              />
            </div>
            <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground">
              <Plus className="size-4" /> Add Item
            </button>
          </>
        }
      />
      <div className="p-4 lg:p-5 space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((c, i) => (
            <button
              key={c}
              onClick={() => setCat(i)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                cat === i
                  ? "bg-success text-success-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" /> Loading menu…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <div className="inline-flex size-12 items-center justify-center rounded-full bg-muted mb-3"><UtensilsCrossed className="size-5 text-muted-foreground" /></div>
            <h3 className="font-semibold">Your menu is empty</h3>
            <p className="text-sm text-muted-foreground mt-1">Add a first item — you can also generate a starter menu from Onboarding → Menu.</p>
            <button onClick={() => setAddOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground">
              <Plus className="size-4" /> Add your first item
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">No items match your filters.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((it) => (
              <div key={it.id} className="rounded-xl border border-border bg-card p-4 flex gap-4">
                <div className="size-20 shrink-0 rounded-lg bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-4xl">🍽️</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold truncate">{it.name}</div>
                      <div className="text-xs text-muted-foreground">{it.cat}</div>
                    </div>
                    <button
                      type="button"
                      title={it.available ? "Mark unavailable" : "Mark available"}
                      onClick={async () => {
                        try {
                          await updateItem.mutateAsync({ id: it.id, is_available: !it.available });
                          toast.success(it.available ? "Item marked unavailable" : "Item marked available");
                        } catch (e: unknown) {
                          toast.error(e instanceof Error ? e.message : "Failed to update availability");
                        }
                      }}
                      className="size-7 rounded-md hover:bg-muted flex items-center justify-center shrink-0"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="font-bold text-success">{it.price}</div>
                    <div className="flex items-center gap-2">
                      {it.popular && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-warning/20 text-warning">Popular</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${it.available ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        {it.available ? "Available" : "86'd"}
                      </span>
                      <button
                        type="button"
                        title="Edit item"
                        onClick={() => setEditItem(it)}
                        className="size-6 rounded hover:bg-muted flex items-center justify-center"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(addOpen || editItem) && staff && (
        <ItemDialog
          restaurantId={staff.restaurant_id}
          cats={cats}
          item={editItem}
          onClose={() => { setAddOpen(false); setEditItem(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["v2_menu"] }); setAddOpen(false); setEditItem(null); }}
        />
      )}
    </AppShell>
  );
}

function ItemDialog({
  restaurantId,
  cats,
  item,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  cats: Category[];
  item: MenuItemRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const updateItem = useUpdateMenuItem();
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item ? String(item.priceRaw) : "");
  const [description, setDescription] = useState(item?.desc ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    item ? (cats.find((c) => c.name === item.cat)?.id ?? "") : (cats[0]?.id ?? ""),
  );
  const [isAvailable, setIsAvailable] = useState(item?.available ?? true);
  const [newCat, setNewCat] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) { toast.error("Enter a valid price"); return; }
    setBusy(true);
    let catId: string | null = categoryId || null;
    if (!isEdit && !catId && newCat.trim()) {
      const { data } = await supabase.from("v2_menu_categories")
        .insert({ restaurant_id: restaurantId, name: newCat.trim(), sort_order: cats.length })
        .select("id").single();
      catId = data?.id ?? null;
    }
    if (isEdit && item) {
      try {
        await updateItem.mutateAsync({
          id: item.id,
          name: name.trim(),
          description: description.trim(),
          price: p,
          category_id: catId ?? undefined,
          is_available: isAvailable,
        });
        toast.success("Item updated");
        onSaved();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to update item");
      } finally {
        setBusy(false);
      }
      return;
    }
    const { error } = await supabase.from("v2_menu_items").insert({
      restaurant_id: restaurantId,
      name: name.trim(),
      description: description.trim() || null,
      price: p,
      category_id: catId,
      is_available: isAvailable,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Item added");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-background border border-border shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">{isEdit ? "Edit menu item" : "Add menu item"}</h2>
          <button type="button" onClick={onClose} className="size-8 rounded-md hover:bg-muted flex items-center justify-center"><X className="size-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Name *"><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price *"><input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="input" placeholder="12.00" /></Field>
            <Field label="Category">
              {cats.length > 0 ? (
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
                  <option value="">Uncategorized</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <input value={newCat} onChange={(e) => setNewCat(e.target.value)} className="input" placeholder="e.g. Mains" disabled={isEdit} />
              )}
            </Field>
          </div>
          <Field label="Description"><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-none" /></Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="rounded border-border"
            />
            <span>Available on menu</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
          <button type="button" onClick={submit} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:opacity-60">
            {busy && <Loader2 className="size-4 animate-spin" />} {isEdit ? "Save changes" : "Add item"}
          </button>
        </div>
        <style>{`.input{width:100%;border:1px solid hsl(var(--border));border-radius:0.5rem;background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
