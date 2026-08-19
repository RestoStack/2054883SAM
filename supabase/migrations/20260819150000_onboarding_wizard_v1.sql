-- Onboarding wizard v1: multi-range hours, enriched booking rules, menu draft,
-- bookable_online on tables, resume helpers.

-- Multi-range open hours (Step 2)
CREATE TABLE IF NOT EXISTS public.location_hour_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon
  open_time time NOT NULL,
  close_time time NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS location_hour_ranges_loc_day_idx
  ON public.location_hour_ranges (location_id, day_of_week, sort_order);

ALTER TABLE public.location_hour_ranges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS location_hour_ranges_member ON public.location_hour_ranges;
CREATE POLICY location_hour_ranges_member ON public.location_hour_ranges
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.app_user_org_ids()));

-- Closed days flag on location_hours remains; ranges replace single open/close when present.

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS cuisine text,
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS cover_url text;

ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS bookable_online boolean NOT NULL DEFAULT true;

ALTER TABLE public.booking_rules
  ADD COLUMN IF NOT EXISTS per_slot_cover_cap int,
  ADD COLUMN IF NOT EXISTS turn_time_by_party jsonb NOT NULL DEFAULT '{"1":75,"2":75,"3":90,"4":90,"5":120}'::jsonb,
  ADD COLUMN IF NOT EXISTS min_party_size int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS advance_days int NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS booking_hours jsonb;

ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS last_step int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS wizard_version text NOT NULL DEFAULT 'v1';

-- ========== bootstrap (keep from prior fix) already exists ==========

-- ========== wizard step advance (numeric 1..7) ==========
CREATE OR REPLACE FUNCTION public.app_onboarding_set_step(
  _organization_id uuid,
  _step int,
  _draft jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  step_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;
  IF _step < 1 OR _step > 7 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid step');
  END IF;

  step_name := CASE _step
    WHEN 1 THEN 'restaurant'
    WHEN 2 THEN 'hours'
    WHEN 3 THEN 'booking'
    WHEN 4 THEN 'tables'
    WHEN 5 THEN 'menu'
    WHEN 6 THEN 'team'
    WHEN 7 THEN 'done'
  END;

  INSERT INTO public.onboarding_progress (
    organization_id, current_step, last_step, draft, wizard_version, updated_at
  ) VALUES (
    _organization_id, step_name, _step, coalesce(_draft, '{}'::jsonb), 'v1', now()
  )
  ON CONFLICT (organization_id) DO UPDATE
    SET current_step = EXCLUDED.current_step,
        last_step = greatest(public.onboarding_progress.last_step, EXCLUDED.last_step),
        draft = coalesce(public.onboarding_progress.draft, '{}'::jsonb) || coalesce(_draft, '{}'::jsonb),
        wizard_version = 'v1',
        updated_at = now(),
        completed_at = CASE WHEN _step = 7 THEN now() ELSE public.onboarding_progress.completed_at END;

  -- Mirror to legacy restaurant onboarding flag when linked
  UPDATE public.v2_restaurants r
  SET onboarding_completed_at = CASE WHEN _step = 7 THEN coalesce(r.onboarding_completed_at, now()) ELSE r.onboarding_completed_at END
  FROM public.organizations o
  WHERE o.id = _organization_id AND o.legacy_restaurant_id = r.id AND _step = 7;

  RETURN jsonb_build_object('ok', true, 'step', _step, 'step_name', step_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_onboarding_get_v1(_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prog public.onboarding_progress%ROWTYPE;
  loc public.locations%ROWTYPE;
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager','host']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;

  SELECT * INTO prog FROM public.onboarding_progress WHERE organization_id = _organization_id;
  SELECT * INTO loc FROM public.locations
  WHERE organization_id = _organization_id AND is_active = true
  ORDER BY created_at LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'step', coalesce(prog.last_step, 1),
    'step_name', coalesce(prog.current_step, 'restaurant'),
    'completed_at', prog.completed_at,
    'draft', coalesce(prog.draft, '{}'::jsonb),
    'location_id', loc.id,
    'public_slug', loc.public_slug,
    'location', CASE WHEN loc.id IS NULL THEN NULL ELSE row_to_json(loc)::jsonb END
  );
END;
$$;

-- Step 1 save restaurant + place fields
CREATE OR REPLACE FUNCTION public.app_onboarding_v1_restaurant(
  _organization_id uuid,
  _name text,
  _location_name text DEFAULT 'Main',
  _address text DEFAULT NULL,
  _city text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _website text DEFAULT NULL,
  _cuisine text DEFAULT NULL,
  _timezone text DEFAULT 'America/Toronto',
  _google_place_id text DEFAULT NULL,
  _logo_url text DEFAULT NULL,
  _slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loc_id uuid;
  slug text;
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Owner only');
  END IF;
  IF nullif(trim(_name), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Restaurant name is required');
  END IF;

  UPDATE public.organizations
  SET name = trim(_name),
      timezone = coalesce(nullif(trim(_timezone), ''), timezone),
      logo_url = coalesce(nullif(trim(_logo_url), ''), logo_url)
  WHERE id = _organization_id;

  slug := nullif(trim(_slug), '');
  IF slug IS NULL THEN
    slug := lower(regexp_replace(trim(_name), '[^a-zA-Z0-9]+', '-', 'g'));
    slug := trim(both '-' from slug);
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.locations
    WHERE public_slug = slug AND organization_id <> _organization_id
  ) THEN
    slug := slug || '-' || substr(_organization_id::text, 1, 4);
  END IF;

  SELECT id INTO loc_id FROM public.locations
  WHERE organization_id = _organization_id
  ORDER BY created_at LIMIT 1;

  IF loc_id IS NULL THEN
    INSERT INTO public.locations (
      organization_id, name, public_slug, timezone, phone, website, cuisine,
      google_place_id, address, city, logo_url, is_active
    ) VALUES (
      _organization_id, coalesce(nullif(trim(_location_name), ''), 'Main'), slug,
      coalesce(nullif(trim(_timezone), ''), 'America/Toronto'),
      nullif(trim(_phone), ''), nullif(trim(_website), ''), nullif(trim(_cuisine), ''),
      nullif(trim(_google_place_id), ''), nullif(trim(_address), ''), nullif(trim(_city), ''),
      nullif(trim(_logo_url), ''), true
    )
    RETURNING id INTO loc_id;
  ELSE
    UPDATE public.locations SET
      name = coalesce(nullif(trim(_location_name), ''), name),
      public_slug = slug,
      timezone = coalesce(nullif(trim(_timezone), ''), timezone),
      phone = coalesce(nullif(trim(_phone), ''), phone),
      website = coalesce(nullif(trim(_website), ''), website),
      cuisine = coalesce(nullif(trim(_cuisine), ''), cuisine),
      google_place_id = coalesce(nullif(trim(_google_place_id), ''), google_place_id),
      address = coalesce(nullif(trim(_address), ''), address),
      city = coalesce(nullif(trim(_city), ''), city),
      logo_url = coalesce(nullif(trim(_logo_url), ''), logo_url)
    WHERE id = loc_id;
  END IF;

  PERFORM public.app_onboarding_set_step(
    _organization_id, 2,
    jsonb_build_object('restaurant_name', trim(_name), 'location_id', loc_id)
  );

  RETURN jsonb_build_object('ok', true, 'location_id', loc_id, 'public_slug', slug, 'step', 2);
END;
$$;

-- Step 2 hours
CREATE OR REPLACE FUNCTION public.app_onboarding_v1_hours(
  _organization_id uuid,
  _location_id uuid,
  _ranges jsonb,
  _closed_days int[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  d int;
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;

  DELETE FROM public.location_hour_ranges WHERE location_id = _location_id;
  DELETE FROM public.location_hours WHERE location_id = _location_id;

  FOR d IN 0..6 LOOP
    INSERT INTO public.location_hours (location_id, organization_id, day_of_week, open_time, close_time, is_closed)
    VALUES (
      _location_id, _organization_id, d,
      '11:00'::time, '22:00'::time,
      d = ANY (coalesce(_closed_days, '{}'))
    )
    ON CONFLICT (location_id, day_of_week) DO UPDATE
      SET is_closed = EXCLUDED.is_closed;
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(_ranges, '[]'::jsonb))
  LOOP
    INSERT INTO public.location_hour_ranges (
      organization_id, location_id, day_of_week, open_time, close_time, sort_order
    ) VALUES (
      _organization_id, _location_id,
      (item->>'day')::int,
      (item->>'open')::time,
      (item->>'close')::time,
      coalesce((item->>'sort')::int, 0)
    );
    UPDATE public.location_hours
    SET is_closed = false,
        open_time = (item->>'open')::time,
        close_time = (item->>'close')::time
    WHERE location_id = _location_id AND day_of_week = (item->>'day')::int;
  END LOOP;

  PERFORM public.app_onboarding_set_step(_organization_id, 3, jsonb_build_object('hours_saved', true));
  RETURN jsonb_build_object('ok', true, 'step', 3);
END;
$$;

-- Step 3 booking rules
CREATE OR REPLACE FUNCTION public.app_onboarding_v1_booking(
  _organization_id uuid,
  _location_id uuid,
  _slot_interval int,
  _max_covers_per_slot int,
  _turn_times jsonb,
  _booking_hours jsonb,
  _min_party int DEFAULT 1,
  _max_party int DEFAULT 12,
  _advance_days int DEFAULT 60,
  _lead_time_hours int DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;
  IF _slot_interval NOT IN (15, 30, 60) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid interval');
  END IF;

  INSERT INTO public.booking_rules (
    location_id, organization_id, slot_interval_minutes, max_party_size, lead_time_hours,
    per_slot_cover_cap, turn_time_by_party, booking_hours, min_party_size, advance_days, updated_at
  ) VALUES (
    _location_id, _organization_id, _slot_interval,
    greatest(1, least(50, _max_party)),
    greatest(0, least(168, _lead_time_hours)),
    nullif(_max_covers_per_slot, 0),
    coalesce(_turn_times, '{"1":75,"2":75,"3":90,"4":90,"5":120}'::jsonb),
    _booking_hours,
    greatest(1, _min_party),
    greatest(1, least(365, _advance_days)),
    now()
  )
  ON CONFLICT (location_id) DO UPDATE SET
    slot_interval_minutes = EXCLUDED.slot_interval_minutes,
    max_party_size = EXCLUDED.max_party_size,
    lead_time_hours = EXCLUDED.lead_time_hours,
    per_slot_cover_cap = EXCLUDED.per_slot_cover_cap,
    turn_time_by_party = EXCLUDED.turn_time_by_party,
    booking_hours = EXCLUDED.booking_hours,
    min_party_size = EXCLUDED.min_party_size,
    advance_days = EXCLUDED.advance_days,
    updated_at = now();

  PERFORM public.app_onboarding_set_step(_organization_id, 4, jsonb_build_object('booking_saved', true));
  RETURN jsonb_build_object('ok', true, 'step', 4);
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_onboarding_set_step(uuid, int, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_onboarding_get_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_onboarding_v1_restaurant(uuid, text, text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_onboarding_v1_hours(uuid, uuid, jsonb, int[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_onboarding_v1_booking(uuid, uuid, int, int, jsonb, jsonb, int, int, int, int) TO authenticated;
