
-- Public: look up a restaurant by slug (returns safe fields only)
CREATE OR REPLACE FUNCTION public.v2_public_get_restaurant(_slug text)
RETURNS TABLE(id uuid, name text, slug text, city text, address text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.name, r.slug, r.city, r.address
  FROM public.v2_restaurants r
  WHERE r.slug = _slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.v2_public_get_restaurant(text) TO anon, authenticated;

-- Public: guest booking creation. Validates slug, upserts customer, inserts booking.
CREATE OR REPLACE FUNCTION public.v2_public_create_booking(
  _slug text,
  _guest_name text,
  _guest_phone text,
  _guest_email text,
  _party_size int,
  _date date,
  _time time,
  _section text,
  _notes text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _restaurant_id uuid;
  _customer_id uuid;
  _booking_id uuid;
BEGIN
  IF _guest_name IS NULL OR btrim(_guest_name) = '' THEN
    RAISE EXCEPTION 'guest name required';
  END IF;
  IF _party_size IS NULL OR _party_size < 1 OR _party_size > 40 THEN
    RAISE EXCEPTION 'invalid party size';
  END IF;

  SELECT id INTO _restaurant_id FROM public.v2_restaurants WHERE slug = _slug LIMIT 1;
  IF _restaurant_id IS NULL THEN
    RAISE EXCEPTION 'restaurant not found';
  END IF;

  -- Match existing customer by email or phone
  IF _guest_email IS NOT NULL AND btrim(_guest_email) <> '' THEN
    SELECT id INTO _customer_id
    FROM public.v2_customers
    WHERE restaurant_id = _restaurant_id AND email = _guest_email
    LIMIT 1;
  END IF;
  IF _customer_id IS NULL AND _guest_phone IS NOT NULL AND btrim(_guest_phone) <> '' THEN
    SELECT id INTO _customer_id
    FROM public.v2_customers
    WHERE restaurant_id = _restaurant_id AND phone = _guest_phone
    LIMIT 1;
  END IF;

  IF _customer_id IS NULL THEN
    INSERT INTO public.v2_customers (restaurant_id, full_name, email, phone)
    VALUES (_restaurant_id, _guest_name, NULLIF(_guest_email, ''), NULLIF(_guest_phone, ''))
    RETURNING id INTO _customer_id;
  END IF;

  INSERT INTO public.v2_bookings (
    restaurant_id, customer_id, guest_name, guest_email, guest_phone,
    party_size, date, time, section, status, source, notes
  ) VALUES (
    _restaurant_id, _customer_id, _guest_name,
    NULLIF(_guest_email, ''), NULLIF(_guest_phone, ''),
    _party_size, _date, _time, NULLIF(_section, ''),
    'confirmed', 'online', NULLIF(_notes, '')
  ) RETURNING id INTO _booking_id;

  RETURN _booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.v2_public_create_booking(text, text, text, text, int, date, time, text, text) TO anon, authenticated;

-- Authenticated: newly signed-up user creates their restaurant + admin staff row.
CREATE OR REPLACE FUNCTION public.v2_signup_create_restaurant(
  _restaurant_name text,
  _slug text,
  _city text,
  _full_name text
) RETURNS TABLE(restaurant_id uuid, slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _slug_final text;
  _n int := 0;
  _rid uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Reject if this auth user is already linked to a restaurant
  IF EXISTS (SELECT 1 FROM public.v2_users WHERE auth_user_id = _uid) THEN
    RAISE EXCEPTION 'user already has a restaurant';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  -- Ensure unique slug
  _slug_final := regexp_replace(lower(coalesce(_slug, _restaurant_name)), '[^a-z0-9]+', '-', 'g');
  _slug_final := regexp_replace(_slug_final, '(^-+|-+$)', '', 'g');
  IF _slug_final = '' THEN _slug_final := 'restaurant'; END IF;
  WHILE EXISTS (SELECT 1 FROM public.v2_restaurants WHERE slug = _slug_final) LOOP
    _n := _n + 1;
    _slug_final := regexp_replace(lower(coalesce(_slug, _restaurant_name)), '[^a-z0-9]+', '-', 'g');
    _slug_final := regexp_replace(_slug_final, '(^-+|-+$)', '', 'g') || '-' || _n::text;
  END LOOP;

  INSERT INTO public.v2_restaurants (name, slug, city, currency, timezone)
  VALUES (_restaurant_name, _slug_final, NULLIF(_city, ''), 'USD', 'America/New_York')
  RETURNING id INTO _rid;

  INSERT INTO public.v2_users (auth_user_id, restaurant_id, full_name, role, email, is_active)
  VALUES (_uid, _rid, coalesce(_full_name, _email, 'Owner'), 'admin', _email, true);

  RETURN QUERY SELECT _rid, _slug_final;
END;
$$;

GRANT EXECUTE ON FUNCTION public.v2_signup_create_restaurant(text, text, text, text) TO authenticated;
