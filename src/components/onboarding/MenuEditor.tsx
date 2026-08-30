import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

type Category = { id: string; name: string; sort_order: number };
type Item = { id: string; name: string; description: string | null; price: number; category_id: string | null; is_available: boolean };

const ITALIAN_PRESET = {
  categories: ["Starters", "Pasta", "Mains", "Desserts"],
  items: [
    { cat: "Starters", name: "Bruschetta", price: 12, desc: "Grilled bread, tomato, basil" },
    { cat: "Pasta", name: "Cacio e Pepe", price: 21, desc: "Pecorino, black pepper" },
    { cat: "Mains", name: "Osso Buco", price: 34, desc: "Braised veal shank" },
    { cat: "Desserts", name: "Tiramisu", price: 11, desc: "Mascarpone, espresso" },
  ],
};
const CAFE_PRESET = {
  categories: ["Coffee", "Pastries", "Sandwiches"],
  items: [
    { cat: "Coffee", name: "Flat White", price: 5, desc: "Double shot, whole milk" },
    { cat: "Pastries", name: "Almond Croissant", price: 6, desc: "" },
    { cat: "Sandwiches", name: "Turkey Club", price: 14, desc: "Sourdough, avocado, tomato" },
  ],
};

export function MenuEditor({ restaurantId }: { restaurantId: string }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newItem, setNewItem] = useState({ name: "", price: "", description: "", category_id: "" });

  const refresh = async () => {
    const [c, i] = await Promise.all([
      supabase.from("v2_menu_categories").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
      supabase.from("v2_menu_items").select("*").eq("restaurant_id", restaurantId).order("name"),
    ]);
    setCats((c.data ?? []) as Category[]);
    setItems(((i.data ?? []) as any[]).map((r) => ({
      id: r.id, name: r.name, description: r.description, price: Number(r.price),
      category_id: r.category_id, is_available: r.is_available,
    })));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [restaurantId]);

  const addCategory = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const { data, error } = await supabase
      .from("v2_menu_categories")
      .insert({ restaurant_id: restaurantId, name: trimmed, sort_order: cats.length })
      .select("*")
      .single();
    if (error) { toast.error(error.message); return null; }
    setCats((c) => [...c, data as Category]);
    return data as Category;
  };

  const removeCategory = async (id: string) => {
    if (!confirm("Delete this category? Items in it will be uncategorized.")) return;
    const { error } = await supabase.from("v2_menu_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setCats((c) => c.filter((x) => x.id !== id));
    setItems((it) => it.map((x) => (x.category_id === id ? { ...x, category_id: null } : x)));
  };

  const addItem = async () => {
    if (!newItem.name.trim() || !newItem.price) { toast.error("Name and price required"); return; }
    const priceNum = parseFloat(newItem.price);
    if (isNaN(priceNum)) { toast.error("Invalid price"); return; }
    const { data, error } = await supabase
      .from("v2_menu_items")
      .insert({
        restaurant_id: restaurantId,
        name: newItem.name.trim(),
        description: newItem.description.trim() || null,
        price: priceNum,
        category_id: newItem.category_id || null,
      })
      .select("*")
      .single();
    if (error) { toast.error(error.message); return; }
    setItems((it) => [...it, {
      id: data.id, name: data.name, description: data.description, price: Number(data.price),
      category_id: data.category_id, is_available: data.is_available,
    }]);
    setNewItem({ name: "", price: "", description: "", category_id: newItem.category_id });
    toast.success("Item added");
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("v2_menu_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems((it) => it.filter((x) => x.id !== id));
  };

  const applyPreset = async (preset: typeof ITALIAN_PRESET) => {
    setLoading(true);
    const catMap: Record<string, string> = {};
    for (let idx = 0; idx < preset.categories.length; idx++) {
      const name = preset.categories[idx];
      const existing = cats.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (existing) { catMap[name] = existing.id; continue; }
      const { data } = await supabase
        .from("v2_menu_categories")
        .insert({ restaurant_id: restaurantId, name, sort_order: cats.length + idx })
        .select("*").single();
      if (data) catMap[name] = data.id;
    }
    const rows = preset.items.map((it) => ({
      restaurant_id: restaurantId,
      name: it.name,
      description: it.desc,
      price: it.price,
      category_id: catMap[it.cat] ?? null,
    }));
    if (rows.length) await supabase.from("v2_menu_items").insert(rows);
    await refresh();
    toast.success("Menu preset added");
  };

  if (loading) return <div className="flex h-40 items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => applyPreset(ITALIAN_PRESET)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">+ Italian starter menu</button>
        <button type="button" onClick={() => applyPreset(CAFE_PRESET)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">+ Café starter menu</button>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Categories</div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <div key={c.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-background pl-3 pr-1 py-1 text-sm">
              {c.name}
              <button onClick={() => removeCategory(c.id)} className="size-6 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
          <div className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background pl-3 pr-1 py-1">
            <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Add category"
              className="bg-transparent text-sm outline-none w-32"
              onKeyDown={async (e) => { if (e.key === "Enter") { const c = await addCategory(newCatName); if (c) setNewCatName(""); } }} />
            <button onClick={async () => { const c = await addCategory(newCatName); if (c) setNewCatName(""); }}
              className="size-6 rounded-full bg-success text-success-foreground flex items-center justify-center"><Plus className="size-3.5" /></button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 bg-muted/20">
        <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Add menu item</div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_1fr_120px] gap-2">
          <input value={newItem.name} onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))}
            placeholder="Name" className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          <input value={newItem.price} onChange={(e) => setNewItem((s) => ({ ...s, price: e.target.value }))}
            placeholder="Price" type="number" step="0.01" className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          <input value={newItem.description} onChange={(e) => setNewItem((s) => ({ ...s, description: e.target.value }))}
            placeholder="Description" className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          <select value={newItem.category_id} onChange={(e) => setNewItem((s) => ({ ...s, category_id: e.target.value }))}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="">— Category —</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={addItem} className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground">
          <Plus className="size-3.5" /> Add item
        </button>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Menu items ({items.length})</div>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No items yet — add one above or apply a preset.</div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {items.map((it, i) => {
              const cat = cats.find((c) => c.id === it.category_id);
              return (
                <div key={it.id} className={`grid grid-cols-[1fr_100px_120px_40px] gap-3 items-center px-3 py-2 ${i > 0 ? "border-t border-border" : ""}`}>
                  <div>
                    <div className="text-sm font-medium">{it.name}</div>
                    {it.description && <div className="text-xs text-muted-foreground truncate">{it.description}</div>}
                  </div>
                  <div className="text-sm font-semibold">${it.price.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{cat?.name ?? "—"}</div>
                  <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
