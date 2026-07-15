-- When a returning guest books again, refresh their stored profile name/contact
-- and match phone numbers more loosely (digits-only) to avoid duplicate customers.
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
  _phone_digits text;
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

  _phone_digits := NULLIF(regexp_replace(coalesce(_guest_phone, ''), '\D', '', 'g'), '');

  -- Match existing customer by email first
  IF _guest_email IS NOT NULL AND btrim(_guest_email) <> '' THEN
    SELECT id INTO _customer_id
    FROM public.v2_customers
    WHERE restaurant_id = _restaurant_id AND lower(email) = lower(btrim(_guest_email))
    LIMIT 1;
  END IF;

  -- Then by normalized phone digits
  IF _customer_id IS NULL AND _phone_digits IS NOT NULL THEN
    SELECT id INTO _customer_id
    FROM public.v2_customers
    WHERE restaurant_id = _restaurant_id
      AND NULLIF(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') = _phone_digits
    LIMIT 1;
  END IF;

  IF _customer_id IS NULL THEN
    INSERT INTO public.v2_customers (restaurant_id, full_name, email, phone)
    VALUES (
      _restaurant_id,
      btrim(_guest_name),
      NULLIF(btrim(coalesce(_guest_email, '')), ''),
      NULLIF(btrim(coalesce(_guest_phone, '')), '')
    )
    RETURNING id INTO _customer_id;
  ELSE
    -- Keep the profile name accurate for the latest booking identity
    UPDATE public.v2_customers
    SET
      full_name = btrim(_guest_name),
      email = COALESCE(NULLIF(btrim(coalesce(_guest_email, '')), ''), email),
      phone = COALESCE(NULLIF(btrim(coalesce(_guest_phone, '')), ''), phone)
    WHERE id = _customer_id;
  END IF;

  INSERT INTO public.v2_bookings (
    restaurant_id, customer_id, guest_name, guest_email, guest_phone,
    party_size, date, time, section, status, source, notes
  ) VALUES (
    _restaurant_id, _customer_id, btrim(_guest_name),
    NULLIF(btrim(coalesce(_guest_email, '')), ''),
    NULLIF(btrim(coalesce(_guest_phone, '')), ''),
    _party_size, _date, _time, NULLIF(_section, ''),
    'confirmed', 'online', NULLIF(_notes, '')
  ) RETURNING id INTO _booking_id;

  RETURN _booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.v2_public_create_booking(text, text, text, text, int, date, time, text, text) TO anon, authenticated;
