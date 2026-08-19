CREATE OR REPLACE FUNCTION public.v2_public_get_menu(_slug text)
RETURNS TABLE(id uuid, name text, description text, price numeric, image_url text, category_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT mi.id, mi.name, mi.description, mi.price, mi.image_url, mc.name
  FROM public.v2_menu_items mi
  JOIN public.v2_restaurants r ON r.id = mi.restaurant_id
  LEFT JOIN public.v2_menu_categories mc ON mc.id = mi.category_id
  WHERE r.slug = _slug AND mi.is_available = true
  ORDER BY mc.sort_order NULLS LAST, mi.name
  LIMIT 8;
$$;

GRANT EXECUTE ON FUNCTION public.v2_public_get_menu(text) TO anon, authenticated;
