import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MenuCategory = {
  id: string;
  name: string;
  sort_order?: number;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  prep_time_minutes: number | null;
  tags: string[];
  is_available: boolean;
  is_popular?: boolean;
};

async function getCurrentRestaurantId(): Promise<string> {
  const { data, error } = await supabase.rpc("v2_current_restaurant_id");
  if (error) throw error;
  return data as unknown as string;
}

export function useMenu() {
  return useQuery({
    queryKey: ["v2_menu_full"],
    queryFn: async (): Promise<{ categories: MenuCategory[]; items: MenuItem[] }> => {
      const [catsRes, itemsRes] = await Promise.all([
        supabase.from("v2_menu_categories").select("*").order("sort_order"),
        supabase.from("v2_menu_items").select("*").order("name"),
      ]);
      if (catsRes.error) throw catsRes.error;
      if (itemsRes.error) throw itemsRes.error;

      const categories: MenuCategory[] = (catsRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        sort_order: c.sort_order,
      }));

      // allergens column is reused as free-form tags; prep time is not persisted
      const items: MenuItem[] = (itemsRes.data ?? []).map((it) => ({
        id: it.id,
        name: it.name,
        description: it.description,
        price: Number(it.price ?? 0),
        category_id: it.category_id,
        prep_time_minutes: null,
        tags: it.allergens ?? [],
        is_available: it.is_available ?? true,
        is_popular: it.is_popular ?? false,
      }));

      return { categories, items };
    },
  });
}

export type CreateMenuItemInput = {
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  prep_time_minutes?: number;
  tags?: string[];
  is_available?: boolean;
};

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMenuItemInput) => {
      const restaurant_id = await getCurrentRestaurantId();
      const { error } = await supabase.from("v2_menu_items").insert({
        restaurant_id,
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        category_id: input.category_id || null,
        allergens: input.tags ?? [],
        is_available: input.is_available ?? true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2_menu_full"] });
      qc.invalidateQueries({ queryKey: ["v2_menu"] });
    },
  });
}

export type UpdateMenuItemInput = {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  category_id?: string;
  prep_time_minutes?: number;
  tags?: string[];
  is_available?: boolean;
};

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMenuItemInput) => {
      const patch: {
        name?: string;
        description?: string | null;
        price?: number;
        category_id?: string | null;
        allergens?: string[];
        is_available?: boolean;
      } = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.description !== undefined) patch.description = input.description;
      if (input.price !== undefined) patch.price = input.price;
      if (input.category_id !== undefined) patch.category_id = input.category_id || null;
      if (input.tags !== undefined) patch.allergens = input.tags;
      if (input.is_available !== undefined) patch.is_available = input.is_available;

      const { error } = await supabase.from("v2_menu_items").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2_menu_full"] });
      qc.invalidateQueries({ queryKey: ["v2_menu"] });
    },
  });
}
