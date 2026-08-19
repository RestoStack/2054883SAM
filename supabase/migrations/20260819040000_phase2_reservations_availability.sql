-- Phase 2: guests, reservations, slug redirects, public availability + create (rate-limited).
-- Dual-writes to v2_bookings / v2_customers when legacy_restaurant_id is set.

-- ========== guests ==========
CREATE TABLE IF NOT EXISTS public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  notes text,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  marketing_opt_in_at timestamptz,
  marketing_opt_in_source text,
  legacy_customer_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guests_organization_id_idx ON public.guests (organization_id);
CREATE INDEX IF NOT EXISTS guests_email_idx ON public.guests (organization_id, lower(email));
CREATE INDEX IF NOT EXISTS guests_phone_idx ON public.guests (organization_id, phone);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guests_member ON public.guests;
CREATE POLICY guests_member ON public.guests
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.app_user_org_ids()));

-- ========== reservations ==========
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  guest_name text NOT NULL,
  guest_email text,
  guest_phone text,
  party_size int NOT NULL CHECK (party_size BETWEEN 1 AND 50),
  reserved_date date NOT NULL,
  reserved_time time NOT NULL,
  duration_minutes int NOT NULL DEFAULT 90,
  section text,
  table_id uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  table_number text,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending','confirmed','seated','completed','cancelled','no_show')),
  source text NOT NULL DEFAULT 'online'
    CHECK (source IN ('walk_in','phone','online','app')),
  notes text,
  legacy_booking_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservations_org_date_idx
  ON public.reservations (organization_id, reserved_date);
CREATE INDEX IF NOT EXISTS reservations_location_date_idx
  ON public.reservations (location_id, reserved_date, reserved_time);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reservations_member ON public.reservations;
CREATE POLICY reservations_member ON public.reservations
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.app_user_org_ids()));

-- ========== slug redirects ==========
CREATE TABLE IF NOT EXISTS public.slug_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  from_slug text NOT NULL UNIQUE,
  to_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slug_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS slug_redirects_manager ON public.slug_redirects;
CREATE POLICY slug_redirects_manager ON public.slug_redirects
  FOR ALL TO authenticated
  USING (public.app_has_org_role(organization_id, ARRAY['owner','manager']))
  WITH CHECK (public.app_has_org_role(organization_id, ARRAY['owner','manager']));

-- ========== rate limit ==========
CREATE TABLE IF NOT EXISTS public.public_booking_rate_limits (
  id bigserial PRIMARY KEY,
  bucket_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_booking_rate_limits_bucket_idx
  ON public.public_booking_rate_limits (bucket_key, created_at DESC);

-- ========== resolve location by slug (locations → redirects → v2) ==========
CREATE OR REPLACE FUNCTION public.app_resolve_bookable_slug(_slug text)
RETURNS TABLE (
  organization_id uuid,
  location_id uuid,
  legacy_restaurant_id uuid,
  public_slug text,
  location_name text,
  timezone text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  redir text;
BEGIN
  RETURN QUERY
  SELECT l.organization_id, l.id, l.legacy_restaurant_id, l.public_slug, l.name, coalesce(l.timezone, o.timezone)
  FROM public.locations l
  JOIN public.organizations o ON o.id = l.organization_id
  WHERE l.public_slug = _slug AND l.is_active = true
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  SELECT sr.to_slug INTO redir FROM public.slug_redirects sr WHERE sr.from_slug = _slug LIMIT 1;
  IF redir IS NOT NULL THEN
    RETURN QUERY
    SELECT l.organization_id, l.id, l.legacy_restaurant_id, l.public_slug, l.name, coalesce(l.timezone, o.timezone)
    FROM public.locations l
    JOIN public.organizations o ON o.id = l.organization_id
    WHERE l.public_slug = redir AND l.is_active = true
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Legacy v2 restaurant slug → org/location backfill link
  RETURN QUERY
  SELECT o.id, l.id, r.id, l.public_slug, l.name, coalesce(l.timezone, o.timezone)
  FROM public.v2_restaurants r
  JOIN public.organizations o ON o.legacy_restaurant_id = r.id
  JOIN public.locations l ON l.legacy_restaurant_id = r.id
  WHERE r.slug = _slug AND l.is_active = true
  LIMIT 1;
END;
$$;

-- ========== public availability ==========
CREATE OR REPLACE FUNCTION public.public_get_availability(_slug text, _date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loc RECORD;
  rules public.booking_rules%ROWTYPE;
  day_idx int;
  hours_row public.location_hours%ROWTYPE;
  interval_m int := 30;
  max_party int := 12;
  lead_h int := 2;
  open_t time;
  close_t time;
  is_closed boolean := true;
  slots jsonb := '[]'::jsonb;
  t time;
  slot_end time;
  booked int;
  capacity int;
  available boolean;
  special public.location_special_hours%ROWTYPE;
  day_keys text[] := ARRAY['mon','tue','wed','thu','fri','sat','sun'];
  legacy_hours jsonb;
  dk text;
  dh jsonb;
BEGIN
  SELECT * INTO loc FROM public.app_resolve_bookable_slug(_slug) LIMIT 1;
  IF loc.location_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location not found');
  END IF;

  SELECT * INTO rules FROM public.booking_rules WHERE location_id = loc.location_id;
  IF FOUND THEN
    interval_m := rules.slot_interval_minutes;
    max_party := rules.max_party_size;
    lead_h := rules.lead_time_hours;
  END IF;

  -- Special hours override
  SELECT * INTO special
  FROM public.location_special_hours
  WHERE location_id = loc.location_id AND on_date = _date
  LIMIT 1;

  IF FOUND THEN
    is_closed := special.is_closed;
    open_t := special.open_time;
    close_t := special.close_time;
  ELSE
    -- location_hours: 0=Mon … 6=Sun; extract(dow) is 0=Sun
    day_idx := ((EXTRACT(DOW FROM _date)::int + 6) % 7);
    SELECT * INTO hours_row
    FROM public.location_hours
    WHERE location_id = loc.location_id AND day_of_week = day_idx
    LIMIT 1;

    IF FOUND THEN
      is_closed := hours_row.is_closed;
      open_t := hours_row.open_time;
      close_t := hours_row.close_time;
    ELSIF loc.legacy_restaurant_id IS NOT NULL THEN
      SELECT hours INTO legacy_hours FROM public.v2_restaurants WHERE id = loc.legacy_restaurant_id;
      dk := day_keys[day_idx + 1];
      dh := legacy_hours->dk;
      IF dh IS NOT NULL THEN
        is_closed := coalesce((dh->>'closed')::boolean, false);
        open_t := nullif(dh->>'open', '')::time;
        close_t := nullif(dh->>'close', '')::time;
      END IF;
    END IF;
  END IF;

  SELECT coalesce(sum(capacity), 0)::int INTO capacity
  FROM public.tables
  WHERE location_id = loc.location_id;

  IF capacity = 0 AND loc.legacy_restaurant_id IS NOT NULL THEN
    SELECT coalesce(sum(capacity), 40)::int INTO capacity
    FROM public.v2_tables
    WHERE restaurant_id = loc.legacy_restaurant_id;
  END IF;
  IF capacity = 0 THEN capacity := 40; END IF;

  IF NOT is_closed AND open_t IS NOT NULL AND close_t IS NOT NULL THEN
    t := open_t;
    WHILE (t + make_interval(mins => 60)) <= close_t LOOP
      -- lead time
      IF (_date::timestamp + t) < (now() AT TIME ZONE coalesce(loc.timezone, 'UTC') + make_interval(hours => lead_h)) THEN
        t := t + make_interval(mins => interval_m);
        CONTINUE;
      END IF;

      SELECT coalesce(sum(party_size), 0)::int INTO booked
      FROM public.reservations
      WHERE location_id = loc.location_id
        AND reserved_date = _date
        AND reserved_time = t
        AND status IN ('pending','confirmed','seated');

      IF booked = 0 AND loc.legacy_restaurant_id IS NOT NULL THEN
        SELECT coalesce(sum(party_size), 0)::int INTO booked
        FROM public.v2_bookings
        WHERE restaurant_id = loc.legacy_restaurant_id
          AND date = _date
          AND time = t
          AND status IN ('pending','confirmed','seated');
      END IF;

      available := (booked < capacity);
      slots := slots || jsonb_build_array(jsonb_build_object(
        'time', to_char(t, 'HH24:MI'),
        'available', available,
        'remaining_covers', greatest(capacity - booked, 0)
      ));
      t := t + make_interval(mins => interval_m);
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'slug', loc.public_slug,
    'location_id', loc.location_id,
    'organization_id', loc.organization_id,
    'date', _date,
    'closed', is_closed,
    'max_party_size', max_party,
    'slot_interval_minutes', interval_m,
    'lead_time_hours', lead_h,
    'slots', slots
  );
END;
$$;

-- ========== public create (rate-limited) ==========
CREATE OR REPLACE FUNCTION public.public_create_reservation(
  _slug text,
  _guest_name text,
  _guest_phone text,
  _guest_email text,
  _party_size int,
  _date date,
  _time time,
  _section text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _client_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loc RECORD;
  rules public.booking_rules%ROWTYPE;
  avail jsonb;
  slot jsonb;
  found_slot boolean := false;
  rate_key text;
  recent int;
  guest_id uuid;
  res_id uuid;
  legacy_booking_id uuid;
  legacy_customer_id uuid;
  max_party int := 12;
BEGIN
  IF _guest_name IS NULL OR length(trim(_guest_name)) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Name is required');
  END IF;
  IF _party_size IS NULL OR _party_size < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid party size');
  END IF;

  SELECT * INTO loc FROM public.app_resolve_bookable_slug(_slug) LIMIT 1;
  IF loc.location_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location not found');
  END IF;

  -- Rate limit: 5 creates / 10 min per client key + slug
  rate_key := coalesce(nullif(trim(_client_key), ''), 'anon') || ':' || _slug;
  SELECT count(*)::int INTO recent
  FROM public.public_booking_rate_limits
  WHERE bucket_key = rate_key AND created_at > now() - interval '10 minutes';
  IF recent >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Too many booking attempts. Try again later.');
  END IF;
  INSERT INTO public.public_booking_rate_limits (bucket_key) VALUES (rate_key);

  SELECT * INTO rules FROM public.booking_rules WHERE location_id = loc.location_id;
  IF FOUND THEN max_party := rules.max_party_size; END IF;
  IF _party_size > max_party THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Party size exceeds maximum of ' || max_party);
  END IF;

  avail := public.public_get_availability(_slug, _date);
  IF coalesce((avail->>'ok')::boolean, false) IS NOT TRUE THEN
    RETURN avail;
  END IF;
  IF coalesce((avail->>'closed')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Closed on this date');
  END IF;

  FOR slot IN SELECT * FROM jsonb_array_elements(avail->'slots')
  LOOP
    IF (slot->>'time') = to_char(_time, 'HH24:MI') THEN
      found_slot := true;
      IF coalesce((slot->>'available')::boolean, false) IS NOT TRUE THEN
        RETURN jsonb_build_object('ok', false, 'error', 'That time is no longer available');
      END IF;
      IF _party_size > coalesce((slot->>'remaining_covers')::int, 0) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Not enough capacity for that party size');
      END IF;
      EXIT;
    END IF;
  END LOOP;

  IF NOT found_slot THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid time slot');
  END IF;

  -- Guest upsert by email/phone within org
  IF _guest_email IS NOT NULL AND length(trim(_guest_email)) > 0 THEN
    SELECT id INTO guest_id FROM public.guests
    WHERE organization_id = loc.organization_id AND lower(email) = lower(trim(_guest_email))
    LIMIT 1;
  END IF;
  IF guest_id IS NULL AND _guest_phone IS NOT NULL AND length(trim(_guest_phone)) > 0 THEN
    SELECT id INTO guest_id FROM public.guests
    WHERE organization_id = loc.organization_id AND phone = trim(_guest_phone)
    LIMIT 1;
  END IF;

  IF guest_id IS NULL THEN
    INSERT INTO public.guests (organization_id, full_name, email, phone)
    VALUES (loc.organization_id, trim(_guest_name), nullif(trim(_guest_email), ''), nullif(trim(_guest_phone), ''))
    RETURNING id INTO guest_id;
  ELSE
    UPDATE public.guests
    SET full_name = trim(_guest_name),
        email = coalesce(nullif(trim(_guest_email), ''), email),
        phone = coalesce(nullif(trim(_guest_phone), ''), phone),
        updated_at = now()
    WHERE id = guest_id;
  END IF;

  INSERT INTO public.reservations (
    organization_id, location_id, guest_id, guest_name, guest_email, guest_phone,
    party_size, reserved_date, reserved_time, section, notes, status, source
  ) VALUES (
    loc.organization_id, loc.location_id, guest_id, trim(_guest_name),
    nullif(trim(_guest_email), ''), nullif(trim(_guest_phone), ''),
    _party_size, _date, _time, nullif(trim(_section), ''), nullif(trim(_notes), ''),
    'confirmed', 'online'
  )
  RETURNING id INTO res_id;

  -- Dual-write legacy
  IF loc.legacy_restaurant_id IS NOT NULL THEN
    IF _guest_email IS NOT NULL AND length(trim(_guest_email)) > 0 THEN
      SELECT id INTO legacy_customer_id FROM public.v2_customers
      WHERE restaurant_id = loc.legacy_restaurant_id AND lower(email) = lower(trim(_guest_email))
      LIMIT 1;
    END IF;
    IF legacy_customer_id IS NULL THEN
      INSERT INTO public.v2_customers (restaurant_id, full_name, email, phone)
      VALUES (loc.legacy_restaurant_id, trim(_guest_name), nullif(trim(_guest_email), ''), nullif(trim(_guest_phone), ''))
      RETURNING id INTO legacy_customer_id;
    ELSE
      UPDATE public.v2_customers
      SET full_name = trim(_guest_name),
          phone = coalesce(nullif(trim(_guest_phone), ''), phone)
      WHERE id = legacy_customer_id;
    END IF;

    INSERT INTO public.v2_bookings (
      restaurant_id, customer_id, guest_name, guest_email, guest_phone,
      party_size, date, time, section, notes, status, source
    ) VALUES (
      loc.legacy_restaurant_id, legacy_customer_id, trim(_guest_name),
      nullif(trim(_guest_email), ''), nullif(trim(_guest_phone), ''),
      _party_size, _date, _time, nullif(trim(_section), ''), nullif(trim(_notes), ''),
      'confirmed', 'online'
    )
    RETURNING id INTO legacy_booking_id;

    UPDATE public.reservations SET legacy_booking_id = legacy_booking_id WHERE id = res_id;
    UPDATE public.guests SET legacy_customer_id = legacy_customer_id WHERE id = guest_id AND legacy_customer_id IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'reservation_id', res_id,
    'legacy_booking_id', legacy_booking_id
  );
END;
$$;

-- ========== staff walk-in ==========
CREATE OR REPLACE FUNCTION public.app_create_walk_in(
  _organization_id uuid,
  _location_id uuid,
  _guest_name text,
  _party_size int,
  _table_number text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res_id uuid;
  legacy_id uuid;
  rid uuid;
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager','host']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.locations WHERE id = _location_id AND organization_id = _organization_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location not found');
  END IF;

  INSERT INTO public.reservations (
    organization_id, location_id, guest_name, party_size,
    reserved_date, reserved_time, table_number, notes, status, source
  ) VALUES (
    _organization_id, _location_id, trim(_guest_name), _party_size,
    (now() AT TIME ZONE 'America/Toronto')::date,
    (now() AT TIME ZONE 'America/Toronto')::time,
    nullif(trim(_table_number), ''), nullif(trim(_notes), ''),
    'seated', 'walk_in'
  )
  RETURNING id INTO res_id;

  SELECT legacy_restaurant_id INTO rid FROM public.locations WHERE id = _location_id;
  IF rid IS NOT NULL THEN
    INSERT INTO public.v2_bookings (
      restaurant_id, guest_name, party_size, date, time, table_number, notes, status, source
    ) VALUES (
      rid, trim(_guest_name), _party_size,
      (now() AT TIME ZONE 'America/Toronto')::date,
      (now() AT TIME ZONE 'America/Toronto')::time,
      nullif(trim(_table_number), ''), nullif(trim(_notes), ''),
      'seated', 'walk_in'
    )
    RETURNING id INTO legacy_id;
    UPDATE public.reservations SET legacy_booking_id = legacy_id WHERE id = res_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'reservation_id', res_id);
END;
$$;

-- ========== booking rules upsert (settings) ==========
CREATE OR REPLACE FUNCTION public.app_settings_upsert_booking_rules(
  _organization_id uuid,
  _location_id uuid,
  _slot_interval_minutes int,
  _max_party_size int,
  _lead_time_hours int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.app_settings_require_manager(_organization_id);
  IF NOT EXISTS (
    SELECT 1 FROM public.locations WHERE id = _location_id AND organization_id = _organization_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location not found');
  END IF;
  IF _slot_interval_minutes NOT IN (15, 30, 60) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid interval');
  END IF;

  INSERT INTO public.booking_rules (
    location_id, organization_id, slot_interval_minutes, max_party_size, lead_time_hours, updated_at
  ) VALUES (
    _location_id, _organization_id, _slot_interval_minutes,
    greatest(1, least(50, _max_party_size)),
    greatest(0, least(168, _lead_time_hours)),
    now()
  )
  ON CONFLICT (location_id) DO UPDATE
    SET slot_interval_minutes = EXCLUDED.slot_interval_minutes,
        max_party_size = EXCLUDED.max_party_size,
        lead_time_hours = EXCLUDED.lead_time_hours,
        updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_settings_get_booking_rules(
  _organization_id uuid,
  _location_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.booking_rules%ROWTYPE;
BEGIN
  PERFORM public.app_settings_require_manager(_organization_id);
  SELECT * INTO r FROM public.booking_rules WHERE location_id = _location_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'slot_interval_minutes', 30,
      'max_party_size', 12,
      'lead_time_hours', 2
    );
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'slot_interval_minutes', r.slot_interval_minutes,
    'max_party_size', r.max_party_size,
    'lead_time_hours', r.lead_time_hours
  );
END;
$$;

-- ========== backfill guests/reservations from v2 (best-effort) ==========
INSERT INTO public.guests (organization_id, full_name, email, phone, legacy_customer_id, created_at)
SELECT o.id, c.full_name, c.email, c.phone, c.id, c.created_at
FROM public.v2_customers c
JOIN public.organizations o ON o.legacy_restaurant_id = c.restaurant_id
WHERE NOT EXISTS (SELECT 1 FROM public.guests g WHERE g.legacy_customer_id = c.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.reservations (
  organization_id, location_id, guest_id, guest_name, guest_email, guest_phone,
  party_size, reserved_date, reserved_time, duration_minutes, section, table_number,
  status, source, notes, legacy_booking_id, created_at
)
SELECT
  o.id,
  l.id,
  g.id,
  coalesce(b.guest_name, 'Guest'),
  b.guest_email,
  b.guest_phone,
  b.party_size,
  b.date,
  b.time,
  coalesce(b.duration_minutes, 90),
  b.section,
  b.table_number,
  b.status::text,
  b.source::text,
  b.notes,
  b.id,
  b.created_at
FROM public.v2_bookings b
JOIN public.organizations o ON o.legacy_restaurant_id = b.restaurant_id
JOIN public.locations l ON l.legacy_restaurant_id = b.restaurant_id
LEFT JOIN public.guests g ON g.legacy_customer_id = b.customer_id
WHERE NOT EXISTS (SELECT 1 FROM public.reservations r WHERE r.legacy_booking_id = b.id)
ON CONFLICT DO NOTHING;

GRANT EXECUTE ON FUNCTION public.app_resolve_bookable_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_availability(text, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_create_reservation(text, text, text, text, int, date, time, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_walk_in(uuid, uuid, text, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_upsert_booking_rules(uuid, uuid, int, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_get_booking_rules(uuid, uuid) TO authenticated;
