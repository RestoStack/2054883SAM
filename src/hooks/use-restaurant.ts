import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Restaurant = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  cuisine_type: string | null;
  timezone: string | null;
  currency: string;
  city: string | null;
  slug: string;
  logo_url: string | null;
};

async function getCurrentRestaurantId(): Promise<string> {
  const { data, error } = await supabase.rpc("v2_current_restaurant_id");
  if (error) throw error;
  return data as unknown as string;
}

export function useRestaurant() {
  const { staff } = useAuth();
  const restaurantId = staff?.restaurant_id;

  return useQuery({
    queryKey: ["v2_restaurant", restaurantId ?? "current"],
    enabled: true,
    queryFn: async (): Promise<Restaurant | null> => {
      const id = restaurantId ?? (await getCurrentRestaurantId());
      const { data, error } = await supabase
        .from("v2_restaurants")
        .select("id,name,phone,address,cuisine,timezone,currency,city,slug,logo_url,website")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.website,
        address: data.address,
        cuisine_type: data.cuisine,
        timezone: data.timezone,
        currency: data.currency,
        city: data.city,
        slug: data.slug,
        logo_url: data.logo_url,
      };
    },
  });
}

export type UpdateRestaurantInput = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  cuisine_type?: string;
  timezone?: string;
  currency?: string;
};

export function useUpdateRestaurant() {
  const qc = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateRestaurantInput) => {
      const id = staff?.restaurant_id ?? (await getCurrentRestaurantId());
      const patch: {
        name?: string;
        phone?: string | null;
        address?: string | null;
        cuisine?: string | null;
        timezone?: string | null;
        currency?: string;
        website?: string | null;
      } = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.phone !== undefined) patch.phone = input.phone;
      if (input.address !== undefined) patch.address = input.address;
      if (input.cuisine_type !== undefined) patch.cuisine = input.cuisine_type;
      if (input.timezone !== undefined) patch.timezone = input.timezone;
      if (input.currency !== undefined) patch.currency = input.currency;
      // No dedicated email column — store on website when provided
      if (input.email !== undefined) patch.website = input.email;

      const { error } = await supabase.from("v2_restaurants").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2_restaurant"] });
    },
  });
}
