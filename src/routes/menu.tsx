import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  useMenu,
  useCreateMenuItem,
  useUpdateMenuItem,
  type MenuCategory,
  type MenuItem,
} from "@/hooks/use-menu";

export const Route = createFileRoute("/menu")({
  head: () => ({ meta: [{ title: "Menu — RestoStack" }] }),
  component: MenuPage,
});

function MenuPage() {
  const { data, isLoading } = useMenu();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();

  const categories = data?.categories ?? [];
  const items = data?.items ?? [];

  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [tags, setTags] = useState("");

  const filtered = items.filter((item) => {
    if (activeCat !== "all" && item.category_id !== activeCat) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => {
    setEditItem(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategoryId(categories[0]?.id || "");
    setPrepTime("");
    setTags("");
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setPrice(String(item.price));
    setCategoryId(item.category_id || "");
    setPrepTime(item.prep_time_minutes ? String(item.prep_time_minutes) : "");
    setTags((item.tags || []).join(", "));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !price) return;
    const payload = {
      name: name.trim(),
      description: description || undefined,
      price: parseFloat(price) || 0,
      category_id: categoryId || undefined,
      prep_time_minutes: prepTime ? parseInt(prepTime) : undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    if (editItem) {
      updateItem.mutate(
        { id: editItem.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Menu item updated");
            setDialogOpen(false);
          },
        }
      );
    } else {
      createItem.mutate(payload, {
        onSuccess: () => {
          toast.success("Menu item created");
          setDialogOpen(false);
        },
      });
    }
  };

  const toggleAvailable = (item: MenuItem) => {
    updateItem.mutate(
      { id: item.id, is_available: !item.is_available },
      { onSuccess: () => toast.success(`${item.name} ${item.is_available ? "marked unavailable" : "now available"}`) }
    );
  };

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name || "Uncategorized";

  return (
    <div>
      <PageHeader
        title="Menu"
        description="Manage your restaurant menu items and categories"
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search menu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button variant={activeCat === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveCat("all")}>
            All
          </Button>
          {categories.map((cat) => (
            <Button key={cat.id} variant={activeCat === cat.id ? "default" : "outline"} size="sm" onClick={() => setActiveCat(cat.id)}>
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No menu items found</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>Add First Item</Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium p-3">Name</th>
                <th className="text-left font-medium p-3 hidden sm:table-cell">Category</th>
                <th className="text-right font-medium p-3">Price</th>
                <th className="text-left font-medium p-3 hidden md:table-cell">Tags</th>
                <th className="text-center font-medium p-3">Available</th>
                <th className="text-right font-medium p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <p className="font-medium">{item.name}</p>
                    {item.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>}
                  </td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{catName(item.category_id)}</td>
                  <td className="p-3 text-right font-medium">${Number(item.price).toFixed(2)}</td>
                  <td className="p-3 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {(item.tags || []).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Switch checked={item.is_available} onCheckedChange={() => toggleAvailable(item)} />
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
            <DialogDescription>
              {editItem ? "Update the details of this menu item." : "Create a new item for your restaurant menu."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Prep Time (min)</Label>
                <Input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="15" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vegetarian, spicy, gluten-free" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !price || createItem.isPending || updateItem.isPending}>
              {(createItem.isPending || updateItem.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editItem ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
