-- Phase 2 enrichment: floor_plans, table capacity min/max, booking_rules
-- (turn times, blackouts, per-slot cap), get_availability / create_public_reservation
-- aliases with IP+slug rate limit and normalized guest dedup.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========== floor_plans ==========
CREATE TABLE IF NOT EXISTS public.floor_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Main',
  width int NOT NULL DEFAULT 1000,
  height int NOT NULL DEFAULT 560,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, name)
);

ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS floor_plans_member ON public.floor_plans;
CREATE POLICY floor_plans_member ON public.floor_plans
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.app_user_org_ids()));

-- Seed one floor plan per location missing one
INSERT INTO public.floor_plans (organization_id, location_id, name)
SELECT l.organization_id, l.id, 'Main'
FROM public.locations l
WHERE NOT EXISTS (
  SELECT 1 FROM public.floor_plans fp WHERE fp.location_id = l.id
)
ON CONFLICT DO NOTHING;

-- ========== tables: capacity min/max + floor_plan link ==========
ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS floor_plan_id uuid REFERENCES public.floor_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capacity_min int,
  ADD COLUMN IF NOT EXISTS capacity_max int,
  ADD COLUMN IF NOT EXISTS label text;

UPDATE public.tables
SET
  capacity_min = coalesce(capacity_min, greatest(1, capacity - 1)),
  capacity_max = coalesce(capacity_max, capacity),
  label = coalesce(label, table_number)
WHERE capacity_min IS NULL OR capacity_max IS NULL OR label IS NULL;

ALTER TABLE public.tables
  ALTER COLUMN capacity_min SET DEFAULT 1,
  ALTER COLUMN capacity_max SET DEFAULT 4;

-- ========== booking_rules enrichment ==========
ALTER TABLE public.booking_rules
  ADD COLUMN IF NOT EXISTS turn_time_by_party jsonb NOT NULL DEFAULT '{"1":60,"2":75,"4":90,"6":105,"8":120}'::jsonb,
  ADD COLUMN IF NOT EXISTS per_slot_cover_cap int,
  ADD COLUMN IF NOT EXISTS blackout_dates date[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_duration_minutes int NOT NULL DEFAULT 90;

-- ========== guests: normalize helpers ==========
CREATE OR REPLACE FUNCTION public.normalize_phone(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  IF p IS NULL OR length(trim(p)) = 0 THEN RETURN NULL; END IF;
  digits := regexp_replace(p, '[^0-9+]', '', 'g');
  IF left(digits, 1) = '+' THEN
    RETURN '+' || regexp_replace(substr(digits, 2), '[^0-9]', '', 'g');
  END IF;
  digits := regexp_replace(digits, '[^0-9]', '', 'g');
  -- North America default → E.164
  IF length(digits) = 10 THEN RETURN '+1' || digits; END IF;
  IF length(digits) = 11 AND left(digits, 1) = '1' THEN RETURN '+' || digits; END IF;
  IF length(digits) >= 8 THEN RETURN '+' || digits; END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_email(e text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(lower(trim(e)), '');
$$;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS email_normalized text;

UPDATE public.guests
SET
  phone_e164 = public.normalize_phone(phone),
  email_normalized = public.normalize_email(email)
WHERE phone_e164 IS NULL OR email_normalized IS NULL;

CREATE INDEX IF NOT EXISTS guests_phone_e164_idx ON public.guests (organization_id, phone_e164)
  WHERE phone_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS guests_email_norm_idx ON public.guests (organization_id, email_normalized)
  WHERE email_normalized IS NOT NULL;

-- Align reservation source enum values (keep existing + add public/manual aliases via check drop/recreate)
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_source_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_source_check
  CHECK (source IN ('walk_in','phone','online','app','public','manual'));

-- Map online → public conceptually (keep data as-is; new creates use public/manual)

-- ========== rate limit: also track IP ==========
ALTER TABLE public.public_booking_rate_limits
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS slug text;

CREATE INDEX IF NOT EXISTS public_booking_rate_limits_ip_slug_idx
  ON public.public_booking_rate_limits (ip_hash, slug, created_at DESC);

-- ========== get_availability (canonical name + keep public_get_availability) ==========
CREATE OR REPLACE FUNCTION public.get_availability(
  _slug text,
  _date date,
  _party_size int DEFAULT 2
)
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
  turn_m int := 90;
  cover_cap int;
  blackouts date[];
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
    cover_cap := rules.per_slot_cover_cap;
    blackouts := rules.blackout_dates;
    turn_m := coalesce(rules.default_duration_minutes, 90);
    -- turn time by party size (largest key <= party)
    IF rules.turn_time_by_party IS NOT NULL THEN
      SELECT coalesce((v)::int, turn_m) INTO turn_m
      FROM (
        SELECT value AS v, key::int AS k
        FROM jsonb_each_text(rules.turn_time_by_party)
        WHERE key::int <= greatest(1, coalesce(_party_size, 2))
        ORDER BY key::int DESC
        LIMIT 1
      ) x;
    END IF;
  END IF;

  IF _party_size IS NOT NULL AND _party_size > max_party THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Party size exceeds maximum', 'max_party_size', max_party);
  END IF;

  IF blackouts IS NOT NULL AND _date = ANY (blackouts) THEN
    RETURN jsonb_build_object(
      'ok', true, 'closed', true, 'reason', 'blackout',
      'max_party_size', max_party, 'slot_interval_minutes', interval_m,
      'slots', '[]'::jsonb, 'slug', loc.public_slug
    );
  END IF;

  SELECT * INTO special
  FROM public.location_special_hours
  WHERE location_id = loc.location_id AND on_date = _date
  LIMIT 1;

  IF FOUND THEN
    is_closed := special.is_closed;
    open_t := special.open_time;
    close_t := special.close_time;
  ELSE
    -- location_hours.day_of_week: 0=Mon .. 6=Sun
    day_idx := EXTRACT(ISODOW FROM _date)::int - 1;
    SELECT * INTO hours_row
    FROM public.location_hours
    WHERE location_id = loc.location_id AND day_of_week = day_idx
    LIMIT 1;
    IF FOUND THEN
      is_closed := hours_row.is_closed;
      open_t := hours_row.open_time;
      close_t := hours_row.close_time;
    ELSE
      is_closed := false;
      open_t := '11:00'::time;
      close_t := '22:00'::time;
    END IF;
  END IF;

  IF is_closed OR open_t IS NULL OR close_t IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true, 'closed', true,
      'max_party_size', max_party, 'slot_interval_minutes', interval_m,
      'slots', '[]'::jsonb, 'slug', loc.public_slug
    );
  END IF;

  SELECT coalesce(sum(capacity_max), sum(capacity), 40)::int INTO capacity
  FROM public.tables
  WHERE location_id = loc.location_id AND status <> 'blocked';

  IF cover_cap IS NOT NULL THEN
    capacity := least(capacity, cover_cap);
  END IF;

  t := open_t;
  WHILE t < close_t LOOP
    slot_end := t + (turn_m || ' minutes')::interval;
    -- lead time
    IF (_date + t) < (now() AT TIME ZONE coalesce(loc.timezone, 'America/Toronto') + (lead_h || ' hours')::interval) THEN
      available := false;
      booked := capacity;
    ELSE
      SELECT coalesce(sum(party_size), 0)::int INTO booked
      FROM public.reservations
      WHERE location_id = loc.location_id
        AND reserved_date = _date
        AND status IN ('pending','confirmed','seated')
        AND reserved_time < (t + (turn_m || ' minutes')::interval)::time
        AND (reserved_time + (coalesce(duration_minutes, turn_m) || ' minutes')::interval)::time > t;
      available := (booked + coalesce(_party_size, 2)) <= capacity;
    END IF;

    slots := slots || jsonb_build_array(jsonb_build_object(
      'time', to_char(t, 'HH24:MI'),
      'available', available AND (booked < capacity),
      'remaining_covers', greatest(0, capacity - booked),
      'duration_minutes', turn_m
    ));

    t := t + (interval_m || ' minutes')::interval;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'closed', false,
    'max_party_size', max_party,
    'slot_interval_minutes', interval_m,
    'party_size', coalesce(_party_size, 2),
    'slots', slots,
    'slug', loc.public_slug
  );
END;
$$;

-- Keep old name as wrapper
CREATE OR REPLACE FUNCTION public.public_get_availability(_slug text, _date date)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_availability(_slug, _date, 2);
$$;

-- ========== create_public_reservation (canonical) ==========
CREATE OR REPLACE FUNCTION public.create_public_reservation(
  _slug text,
  _guest_name text,
  _guest_phone text,
  _guest_email text,
  _party_size int,
  _date date,
  _time time,
  _section text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _client_key text DEFAULT NULL,
  _ip text DEFAULT NULL
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
  ip_hash text;
  recent int;
  guest_uuid uuid;
  res_id uuid;
  legacy_booking_id uuid;
  max_party int := 12;
  phone_n text;
  email_n text;
  turn_m int := 90;
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

  phone_n := public.normalize_phone(_guest_phone);
  email_n := public.normalize_email(_guest_email);
  ip_hash := encode(digest(coalesce(nullif(trim(_ip), ''), coalesce(nullif(trim(_client_key), ''), 'anon')), 'sha256'), 'hex');

  -- Rate limit: 5 / 10 min per IP+slug (and client key fallback)
  SELECT count(*)::int INTO recent
  FROM public.public_booking_rate_limits
  WHERE created_at > now() - interval '10 minutes'
    AND (
      (ip_hash IS NOT NULL AND ip_hash = public.public_booking_rate_limits.ip_hash AND slug = _slug)
      OR bucket_key = (coalesce(nullif(trim(_client_key), ''), 'anon') || ':' || _slug)
    );
  IF recent >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Too many booking attempts. Try again later.');
  END IF;
  INSERT INTO public.public_booking_rate_limits (bucket_key, ip_hash, slug)
  VALUES (coalesce(nullif(trim(_client_key), ''), 'anon') || ':' || _slug, ip_hash, _slug);

  SELECT * INTO rules FROM public.booking_rules WHERE location_id = loc.location_id;
  IF FOUND THEN
    max_party := rules.max_party_size;
    turn_m := coalesce(rules.default_duration_minutes, 90);
  END IF;
  IF _party_size > max_party THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Party size exceeds maximum of ' || max_party);
  END IF;

  avail := public.get_availability(_slug, _date, _party_size);
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
      turn_m := coalesce((slot->>'duration_minutes')::int, turn_m);
      EXIT;
    END IF;
  END LOOP;

  IF NOT found_slot THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid time slot');
  END IF;

  -- Dedup guest by normalized phone/email
  IF email_n IS NOT NULL THEN
    SELECT id INTO guest_uuid FROM public.guests
    WHERE organization_id = loc.organization_id AND email_normalized = email_n
    LIMIT 1;
  END IF;
  IF guest_uuid IS NULL AND phone_n IS NOT NULL THEN
    SELECT id INTO guest_uuid FROM public.guests
    WHERE organization_id = loc.organization_id AND phone_e164 = phone_n
    LIMIT 1;
  END IF;

  IF guest_uuid IS NULL THEN
    INSERT INTO public.guests (
      organization_id, full_name, email, phone, phone_e164, email_normalized
    ) VALUES (
      loc.organization_id, trim(_guest_name),
      email_n, phone_n, phone_n, email_n
    )
    RETURNING id INTO guest_uuid;
  ELSE
    UPDATE public.guests
    SET full_name = trim(_guest_name),
        email = coalesce(email_n, email),
        phone = coalesce(phone_n, phone),
        phone_e164 = coalesce(phone_n, phone_e164),
        email_normalized = coalesce(email_n, email_normalized),
        updated_at = now()
    WHERE id = guest_uuid;
  END IF;

  INSERT INTO public.reservations (
    organization_id, location_id, guest_id, guest_name, guest_email, guest_phone,
    party_size, reserved_date, reserved_time, duration_minutes, section, notes, status, source
  ) VALUES (
    loc.organization_id, loc.location_id, guest_uuid, trim(_guest_name), email_n, phone_n,
    _party_size, _date, _time, turn_m, nullif(trim(coalesce(_section, '')), ''),
    nullif(trim(coalesce(_notes, '')), ''), 'confirmed', 'public'
  )
  RETURNING id INTO res_id;

  -- Dual-write legacy when linked
  IF loc.legacy_restaurant_id IS NOT NULL THEN
    INSERT INTO public.v2_bookings (
      restaurant_id, guest_name, party_size, date, time, notes, status, source, guest_phone, guest_email
    ) VALUES (
      loc.legacy_restaurant_id, trim(_guest_name), _party_size, _date, _time,
      nullif(trim(coalesce(_notes, '')), ''), 'confirmed', 'online', phone_n, email_n
    )
    RETURNING id INTO legacy_booking_id;
    UPDATE public.reservations SET legacy_booking_id = legacy_booking_id WHERE id = res_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'reservation_id', res_id,
    'guest_id', guest_uuid,
    'needs_confirmation_email', email_n IS NOT NULL
  );
END;
$$;

-- Wrapper keeping older signature
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
BEGIN
  RETURN public.create_public_reservation(
    _slug, _guest_name, _guest_phone, _guest_email, _party_size,
    _date, _time, _section, _notes, _client_key, NULL
  );
END;
$$;

-- ========== staff manual reservation ==========
CREATE OR REPLACE FUNCTION public.app_create_manual_reservation(
  _organization_id uuid,
  _location_id uuid,
  _guest_name text,
  _party_size int,
  _date date,
  _time time,
  _guest_phone text DEFAULT NULL,
  _guest_email text DEFAULT NULL,
  _table_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guest_uuid uuid;
  res_id uuid;
  phone_n text := public.normalize_phone(_guest_phone);
  email_n text := public.normalize_email(_guest_email);
  tnum text;
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager','host']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.locations WHERE id = _location_id AND organization_id = _organization_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location not found');
  END IF;

  IF email_n IS NOT NULL THEN
    SELECT id INTO guest_uuid FROM public.guests
    WHERE organization_id = _organization_id AND email_normalized = email_n LIMIT 1;
  END IF;
  IF guest_uuid IS NULL AND phone_n IS NOT NULL THEN
    SELECT id INTO guest_uuid FROM public.guests
    WHERE organization_id = _organization_id AND phone_e164 = phone_n LIMIT 1;
  END IF;
  IF guest_uuid IS NULL THEN
    INSERT INTO public.guests (organization_id, full_name, email, phone, phone_e164, email_normalized)
    VALUES (_organization_id, trim(_guest_name), email_n, phone_n, phone_n, email_n)
    RETURNING id INTO guest_uuid;
  END IF;

  IF _table_id IS NOT NULL THEN
    SELECT table_number INTO tnum FROM public.tables
    WHERE id = _table_id AND organization_id = _organization_id;
  END IF;

  INSERT INTO public.reservations (
    organization_id, location_id, guest_id, guest_name, guest_email, guest_phone,
    party_size, reserved_date, reserved_time, table_id, table_number, notes, status, source
  ) VALUES (
    _organization_id, _location_id, guest_uuid, trim(_guest_name), email_n, phone_n,
    _party_size, _date, _time, _table_id, tnum, nullif(trim(coalesce(_notes,'')), ''),
    'confirmed', 'manual'
  )
  RETURNING id INTO res_id;

  RETURN jsonb_build_object('ok', true, 'reservation_id', res_id, 'guest_id', guest_uuid);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_update_reservation_status(
  _organization_id uuid,
  _reservation_id uuid,
  _status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager','host']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;
  IF _status NOT IN ('pending','confirmed','seated','completed','cancelled','no_show') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid status');
  END IF;
  UPDATE public.reservations
  SET status = _status, updated_at = now()
  WHERE id = _reservation_id AND organization_id = _organization_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not found');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_phone(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_email(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_availability(text, date, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_reservation(text, text, text, text, int, date, time, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_manual_reservation(uuid, uuid, text, int, date, time, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_update_reservation_status(uuid, uuid, text) TO authenticated;
