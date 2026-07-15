
ALTER TABLE public.v2_restaurants
  ADD COLUMN IF NOT EXISTS hours jsonb,
  ADD COLUMN IF NOT EXISTS brand_primary text DEFAULT '#059669',
  ADD COLUMN IF NOT EXISTS brand_accent text DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS booking_headline text,
  ADD COLUMN IF NOT EXISTS booking_welcome text,
  ADD COLUMN IF NOT EXISTS cuisine text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

DROP FUNCTION IF EXISTS public.v2_public_get_restaurant(text);

CREATE OR REPLACE FUNCTION public.v2_public_get_restaurant(_slug text)
RETURNS TABLE (
  id uuid, name text, slug text, city text, address text,
  phone text, logo_url text, cover_url text, cuisine text,
  hours jsonb, brand_primary text, brand_accent text,
  booking_headline text, booking_welcome text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.name, r.slug, r.city, r.address,
         r.phone, r.logo_url, r.cover_url, r.cuisine,
         r.hours, r.brand_primary, r.brand_accent,
         r.booking_headline, r.booking_welcome
  FROM public.v2_restaurants r
  WHERE r.slug = _slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.v2_public_get_restaurant(text) TO anon, authenticated;
