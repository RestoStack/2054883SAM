-- Phase 1: onboarding progress + transaction-safe step RPCs + booking_rules / location_hours.
-- Complements 20260819020000_phase0_orgs_locations_invites.sql

-- ========== progress ==========
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'welcome'
    CHECK (current_step IN ('welcome','organization','location','tables','booking','team','done')),
  completed_steps text[] NOT NULL DEFAULT '{}',
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_progress_member ON public.onboarding_progress;
CREATE POLICY onboarding_progress_member ON public.onboarding_progress
  FOR ALL TO authenticated
  USING (public.app_has_org_role(organization_id, ARRAY['owner','manager']))
  WITH CHECK (public.app_has_org_role(organization_id, ARRAY['owner','manager']));

-- ========== location hours ==========
CREATE TABLE IF NOT EXISTS public.location_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon .. 6=Sun (app convention)
  open_time time,
  close_time time,
  is_closed boolean NOT NULL DEFAULT false,
  UNIQUE (location_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.location_special_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  on_date date NOT NULL,
  open_time time,
  close_time time,
  is_closed boolean NOT NULL DEFAULT false,
  label text,
  UNIQUE (location_id, on_date)
);

ALTER TABLE public.location_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_special_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS location_hours_member ON public.location_hours;
CREATE POLICY location_hours_member ON public.location_hours
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (public.app_has_org_role(organization_id, ARRAY['owner','manager']));

DROP POLICY IF EXISTS location_special_hours_member ON public.location_special_hours;
CREATE POLICY location_special_hours_member ON public.location_special_hours
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (public.app_has_org_role(organization_id, ARRAY['owner','manager']));

-- ========== booking rules ==========
CREATE TABLE IF NOT EXISTS public.booking_rules (
  location_id uuid PRIMARY KEY REFERENCES public.locations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slot_interval_minutes int NOT NULL DEFAULT 30 CHECK (slot_interval_minutes IN (15, 30, 60)),
  max_party_size int NOT NULL DEFAULT 12 CHECK (max_party_size BETWEEN 1 AND 50),
  lead_time_hours int NOT NULL DEFAULT 2 CHECK (lead_time_hours BETWEEN 0 AND 168),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_rules_member ON public.booking_rules;
CREATE POLICY booking_rules_member ON public.booking_rules
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (public.app_has_org_role(organization_id, ARRAY['owner','manager']));

-- ========== org brand fields ==========
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#059669',
  ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS place_id text;

-- ========== tables (MVP org-scoped; coexist with v2_tables during cutover) ==========
CREATE TABLE IF NOT EXISTS public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  section text NOT NULL DEFAULT 'Main Floor',
  capacity int NOT NULL DEFAULT 4 CHECK (capacity BETWEEN 1 AND 24),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, table_number)
);

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tables_member ON public.tables;
CREATE POLICY tables_member ON public.tables
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.app_user_org_ids()));

-- ========== helpers ==========
CREATE OR REPLACE FUNCTION public.app_onboarding_require_owner(p_org uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.app_has_org_role(p_org, ARRAY['owner']) THEN
    RAISE EXCEPTION 'Owner only';
  END IF;
  IF NOT public.app_active_subscription(p_org) THEN
    RAISE EXCEPTION 'Subscription inactive';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_onboarding_advance(
  p_org uuid,
  p_from text,
  p_to text,
  p_draft jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.onboarding_progress (organization_id, current_step, completed_steps, draft, updated_at)
  VALUES (
    p_org,
    p_to,
    ARRAY[p_from]::text[],
    coalesce(p_draft, '{}'::jsonb),
    now()
  )
  ON CONFLICT (organization_id) DO UPDATE
    SET current_step = EXCLUDED.current_step,
        completed_steps = (
          SELECT ARRAY(
            SELECT DISTINCT x FROM unnest(
              public.onboarding_progress.completed_steps || EXCLUDED.completed_steps
            ) AS t(x)
          )
        ),
        draft = coalesce(public.onboarding_progress.draft, '{}'::jsonb) || coalesce(p_draft, '{}'::jsonb),
        updated_at = now(),
        completed_at = CASE WHEN p_to = 'done' THEN now() ELSE public.onboarding_progress.completed_at END;
END;
$$;

-- ========== get progress ==========
CREATE OR REPLACE FUNCTION public.app_onboarding_get(_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prog public.onboarding_progress%ROWTYPE;
  loc_id uuid;
  slug text;
BEGIN
  PERFORM public.app_onboarding_require_owner(_organization_id);

  SELECT * INTO prog FROM public.onboarding_progress WHERE organization_id = _organization_id;
  SELECT id, public_slug INTO loc_id, slug
  FROM public.locations
  WHERE organization_id = _organization_id
  ORDER BY created_at
  LIMIT 1;

  IF NOT FOUND AND prog.organization_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'current_step', 'welcome',
      'completed_steps', '[]'::jsonb,
      'draft', '{}'::jsonb,
      'location_id', null,
      'public_slug', null
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'current_step', coalesce(prog.current_step, 'welcome'),
    'completed_steps', to_jsonb(coalesce(prog.completed_steps, '{}')),
    'draft', coalesce(prog.draft, '{}'::jsonb),
    'location_id', loc_id,
    'public_slug', slug,
    'completed_at', prog.completed_at
  );
END;
$$;

-- ========== step 1 welcome ==========
CREATE OR REPLACE FUNCTION public.app_onboarding_step_welcome(
  _organization_id uuid,
  _full_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.app_onboarding_require_owner(_organization_id);
  IF _full_name IS NULL OR length(trim(_full_name)) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Name is required');
  END IF;

  UPDATE public.users
  SET full_name = trim(_full_name), updated_at = now()
  WHERE id = auth.uid();

  PERFORM public.app_onboarding_advance(
    _organization_id, 'welcome', 'organization',
    jsonb_build_object('full_name', trim(_full_name))
  );

  RETURN jsonb_build_object('ok', true, 'step', 'welcome', 'next_step', 'organization');
END;
$$;

-- ========== step 2 organization ==========
CREATE OR REPLACE FUNCTION public.app_onboarding_step_organization(
  _organization_id uuid,
  _organization_name text,
  _brand_color text DEFAULT '#059669',
  _logo_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.app_onboarding_require_owner(_organization_id);
  IF _organization_name IS NULL OR length(trim(_organization_name)) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Restaurant name is required');
  END IF;

  UPDATE public.organizations
  SET name = trim(_organization_name),
      brand_color = coalesce(nullif(trim(_brand_color), ''), '#059669'),
      logo_url = nullif(trim(_logo_url), ''),
      updated_at = now()
  WHERE id = _organization_id;

  -- Keep legacy restaurant in sync when present
  UPDATE public.v2_restaurants r
  SET name = trim(_organization_name),
      logo_url = coalesce(nullif(trim(_logo_url), ''), r.logo_url)
  FROM public.organizations o
  WHERE o.id = _organization_id AND r.id = o.legacy_restaurant_id;

  PERFORM public.app_onboarding_advance(
    _organization_id, 'organization', 'location',
    jsonb_build_object(
      'organization_name', trim(_organization_name),
      'brand_color', coalesce(nullif(trim(_brand_color), ''), '#059669')
    )
  );

  RETURN jsonb_build_object('ok', true, 'step', 'organization', 'next_step', 'location');
END;
$$;

-- ========== step 3 location + hours ==========
CREATE OR REPLACE FUNCTION public.app_onboarding_step_location(
  _organization_id uuid,
  _payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loc_id uuid;
  slug text;
  hours jsonb;
  day_keys text[] := ARRAY['mon','tue','wed','thu','fri','sat','sun'];
  i int;
  dk text;
  dh jsonb;
  day_name text;
BEGIN
  PERFORM public.app_onboarding_require_owner(_organization_id);

  slug := coalesce(
    nullif(trim(_payload->>'public_slug'), ''),
    regexp_replace(lower(coalesce(_payload->>'location_name', 'main')), '[^a-z0-9]+', '-', 'g')
  );
  slug := trim(both '-' from slug);
  IF length(slug) < 2 THEN
    slug := 'loc-' || substr(_organization_id::text, 1, 8);
  END IF;

  -- Ensure unique slug
  WHILE EXISTS (SELECT 1 FROM public.locations WHERE public_slug = slug) LOOP
    slug := slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  END LOOP;

  SELECT id INTO loc_id
  FROM public.locations
  WHERE organization_id = _organization_id
  ORDER BY created_at
  LIMIT 1;

  IF loc_id IS NULL THEN
    INSERT INTO public.locations (
      organization_id, name, public_slug, timezone, address, city, phone
    ) VALUES (
      _organization_id,
      coalesce(nullif(trim(_payload->>'location_name'), ''), 'Main'),
      slug,
      coalesce(nullif(trim(_payload->>'timezone'), ''), 'America/Toronto'),
      nullif(trim(_payload->>'address'), ''),
      nullif(trim(_payload->>'city'), ''),
      nullif(trim(_payload->>'phone'), '')
    )
    RETURNING id INTO loc_id;
  ELSE
    UPDATE public.locations
    SET name = coalesce(nullif(trim(_payload->>'location_name'), ''), name),
        public_slug = slug,
        timezone = coalesce(nullif(trim(_payload->>'timezone'), ''), timezone),
        address = nullif(trim(_payload->>'address'), ''),
        city = nullif(trim(_payload->>'city'), ''),
        phone = nullif(trim(_payload->>'phone'), ''),
        updated_at = now()
    WHERE id = loc_id;
  END IF;

  hours := coalesce(_payload->'hours', '{}'::jsonb);
  DELETE FROM public.location_hours WHERE location_id = loc_id;
  FOR i IN 0..6 LOOP
    dk := day_keys[i + 1];
    dh := hours->dk;
    INSERT INTO public.location_hours (
      location_id, organization_id, day_of_week, open_time, close_time, is_closed
    ) VALUES (
      loc_id,
      _organization_id,
      i,
      CASE WHEN coalesce((dh->>'closed')::boolean, false) THEN NULL ELSE nullif(dh->>'open', '')::time END,
      CASE WHEN coalesce((dh->>'closed')::boolean, false) THEN NULL ELSE nullif(dh->>'close', '')::time END,
      coalesce((dh->>'closed')::boolean, false)
    );
  END LOOP;

  -- Sync legacy restaurant hours/slug when linked
  UPDATE public.v2_restaurants r
  SET slug = slug,
      address = coalesce(_payload->>'address', r.address),
      city = coalesce(_payload->>'city', r.city),
      phone = coalesce(_payload->>'phone', r.phone),
      hours = hours
  FROM public.organizations o
  WHERE o.id = _organization_id AND r.id = o.legacy_restaurant_id;

  UPDATE public.user_active_context
  SET location_id = loc_id, updated_at = now()
  WHERE user_id = auth.uid();

  PERFORM public.app_onboarding_advance(
    _organization_id, 'location', 'tables',
    jsonb_build_object('location_id', loc_id, 'public_slug', slug)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'step', 'location',
    'next_step', 'tables',
    'location_id', loc_id,
    'public_slug', slug
  );
END;
$$;

-- ========== step 4 tables ==========
CREATE OR REPLACE FUNCTION public.app_onboarding_step_tables(
  _organization_id uuid,
  _location_id uuid,
  _groups jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g jsonb;
  n int;
  cap int;
  sec text;
  i int;
  tnum int := 1;
BEGIN
  PERFORM public.app_onboarding_require_owner(_organization_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = _location_id AND organization_id = _organization_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location not found');
  END IF;

  IF _groups IS NULL OR jsonb_typeof(_groups) <> 'array' OR jsonb_array_length(_groups) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Add at least one table group');
  END IF;

  DELETE FROM public.tables WHERE location_id = _location_id;

  FOR g IN SELECT * FROM jsonb_array_elements(_groups)
  LOOP
    n := greatest(1, least(200, coalesce((g->>'count')::int, 1)));
    cap := greatest(1, least(24, coalesce((g->>'capacity')::int, 4)));
    sec := coalesce(nullif(trim(g->>'section'), ''), 'Main Floor');
    FOR i IN 1..n LOOP
      INSERT INTO public.tables (
        organization_id, location_id, table_number, section, capacity, sort_order
      ) VALUES (
        _organization_id, _location_id, tnum::text, sec, cap, tnum
      );
      -- Legacy mirror
      INSERT INTO public.v2_tables (restaurant_id, table_number, section, capacity)
      SELECT o.legacy_restaurant_id, tnum::text, sec, cap
      FROM public.organizations o
      WHERE o.id = _organization_id AND o.legacy_restaurant_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.v2_tables vt
          WHERE vt.restaurant_id = o.legacy_restaurant_id
            AND vt.table_number = tnum::text
        );
      tnum := tnum + 1;
    END LOOP;
  END LOOP;

  PERFORM public.app_onboarding_advance(_organization_id, 'tables', 'booking', jsonb_build_object('tables', tnum - 1));

  RETURN jsonb_build_object('ok', true, 'step', 'tables', 'next_step', 'booking');
END;
$$;

-- ========== step 5 booking ==========
CREATE OR REPLACE FUNCTION public.app_onboarding_step_booking(
  _organization_id uuid,
  _location_id uuid,
  _slot_interval_minutes int DEFAULT 30,
  _max_party_size int DEFAULT 12,
  _lead_time_hours int DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.app_onboarding_require_owner(_organization_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.locations WHERE id = _location_id AND organization_id = _organization_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location not found');
  END IF;

  IF _slot_interval_minutes NOT IN (15, 30, 60) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid slot interval');
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

  PERFORM public.app_onboarding_advance(
    _organization_id, 'booking', 'team',
    jsonb_build_object(
      'slot_interval_minutes', _slot_interval_minutes,
      'max_party_size', _max_party_size,
      'lead_time_hours', _lead_time_hours
    )
  );

  RETURN jsonb_build_object('ok', true, 'step', 'booking', 'next_step', 'team');
END;
$$;

-- ========== step 6 team invites ==========
CREATE OR REPLACE FUNCTION public.app_onboarding_step_team(
  _organization_id uuid,
  _invites jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv jsonb;
  raw_token text;
  email text;
  role text;
BEGIN
  PERFORM public.app_onboarding_require_owner(_organization_id);

  IF _invites IS NOT NULL AND jsonb_typeof(_invites) = 'array' THEN
    FOR inv IN SELECT * FROM jsonb_array_elements(_invites)
    LOOP
      email := lower(trim(inv->>'email'));
      role := coalesce(nullif(trim(inv->>'role'), ''), 'host');
      IF email IS NULL OR email = '' OR position('@' in email) = 0 THEN
        CONTINUE;
      END IF;
      IF role NOT IN ('manager', 'host') THEN
        role := 'host';
      END IF;
      raw_token := encode(gen_random_bytes(24), 'hex');
      INSERT INTO public.invitations (
        organization_id, email, role, kind, token_hash, expires_at, created_by
      ) VALUES (
        _organization_id,
        email,
        role,
        'team',
        encode(digest(raw_token, 'sha256'), 'hex'),
        now() + interval '14 days',
        auth.uid()
      );
      -- Token is not returned in bulk for security; platform email job sends links.
    END LOOP;
  END IF;

  PERFORM public.app_onboarding_advance(_organization_id, 'team', 'done', jsonb_build_object('team_queued', true));

  RETURN jsonb_build_object('ok', true, 'step', 'team', 'next_step', 'done');
END;
$$;

-- ========== step 7 done ==========
CREATE OR REPLACE FUNCTION public.app_onboarding_step_done(_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slug text;
  loc_id uuid;
BEGIN
  PERFORM public.app_onboarding_require_owner(_organization_id);

  SELECT id, public_slug INTO loc_id, slug
  FROM public.locations
  WHERE organization_id = _organization_id
  ORDER BY created_at
  LIMIT 1;

  UPDATE public.onboarding_progress
  SET current_step = 'done',
      completed_at = now(),
      updated_at = now(),
      completed_steps = (
        SELECT ARRAY(SELECT DISTINCT x FROM unnest(completed_steps || ARRAY['done']) AS t(x))
      )
  WHERE organization_id = _organization_id;

  UPDATE public.v2_restaurants r
  SET onboarding_completed_at = now()
  FROM public.organizations o
  WHERE o.id = _organization_id AND r.id = o.legacy_restaurant_id;

  RETURN jsonb_build_object(
    'ok', true,
    'step', 'done',
    'next_step', null,
    'location_id', loc_id,
    'public_slug', slug,
    'booking_url', CASE WHEN slug IS NOT NULL THEN '/book/' || slug ELSE null END
  );
END;
$$;

-- ========== verify subscription (never trust client claim) ==========
CREATE OR REPLACE FUNCTION public.app_billing_verify_subscription(_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st text;
  plan text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;

  SELECT status, plan_id INTO st, plan
  FROM public.subscriptions
  WHERE organization_id = _organization_id;

  RETURN jsonb_build_object(
    'ok', true,
    'live', st IN ('trialing', 'active'),
    'status', st,
    'plan_id', plan
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_onboarding_get(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_onboarding_step_welcome(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_onboarding_step_organization(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_onboarding_step_location(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_onboarding_step_tables(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_onboarding_step_booking(uuid, uuid, int, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_onboarding_step_team(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_onboarding_step_done(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_billing_verify_subscription(uuid) TO authenticated;
