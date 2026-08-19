-- Phase 1 Settings RPCs: profile, hours, locations, team.

CREATE OR REPLACE FUNCTION public.app_settings_require_manager(p_org uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.app_has_org_role(p_org, ARRAY['owner','manager']) THEN
    RAISE EXCEPTION 'Manager or owner required';
  END IF;
END;
$$;

-- ========== profile ==========
CREATE OR REPLACE FUNCTION public.app_settings_update_profile(
  _organization_id uuid,
  _name text,
  _brand_color text DEFAULT NULL,
  _logo_url text DEFAULT NULL,
  _timezone text DEFAULT NULL,
  _currency text DEFAULT NULL,
  _locale text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.app_settings_require_manager(_organization_id);
  IF _name IS NULL OR length(trim(_name)) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Name is required');
  END IF;

  UPDATE public.organizations
  SET name = trim(_name),
      brand_color = coalesce(nullif(trim(_brand_color), ''), brand_color),
      logo_url = CASE WHEN _logo_url IS NULL THEN logo_url ELSE nullif(trim(_logo_url), '') END,
      timezone = coalesce(nullif(trim(_timezone), ''), timezone),
      currency = coalesce(nullif(trim(_currency), ''), currency),
      locale = coalesce(nullif(trim(_locale), ''), locale),
      updated_at = now()
  WHERE id = _organization_id;

  UPDATE public.v2_restaurants r
  SET name = trim(_name),
      logo_url = coalesce(nullif(trim(_logo_url), ''), r.logo_url),
      timezone = coalesce(nullif(trim(_timezone), ''), r.timezone),
      currency = coalesce(nullif(trim(_currency), ''), r.currency)
  FROM public.organizations o
  WHERE o.id = _organization_id AND r.id = o.legacy_restaurant_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ========== locations list ==========
CREATE OR REPLACE FUNCTION public.app_settings_list_locations(_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows jsonb;
BEGIN
  PERFORM public.app_settings_require_manager(_organization_id);
  SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.created_at), '[]'::jsonb)
  INTO rows
  FROM public.locations l
  WHERE l.organization_id = _organization_id;
  RETURN jsonb_build_object('ok', true, 'locations', rows);
END;
$$;

-- ========== location upsert ==========
CREATE OR REPLACE FUNCTION public.app_settings_upsert_location(
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
BEGIN
  PERFORM public.app_settings_require_manager(_organization_id);

  loc_id := nullif(_payload->>'location_id', '')::uuid;
  slug := nullif(trim(_payload->>'public_slug'), '');
  IF slug IS NULL THEN
    slug := regexp_replace(lower(coalesce(_payload->>'name', 'location')), '[^a-z0-9]+', '-', 'g');
    slug := trim(both '-' from slug);
  END IF;
  IF length(slug) < 2 THEN
    slug := 'loc-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;

  -- unique slug excluding self
  WHILE EXISTS (
    SELECT 1 FROM public.locations
    WHERE public_slug = slug AND (loc_id IS NULL OR id <> loc_id)
  ) LOOP
    slug := slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  END LOOP;

  IF loc_id IS NULL THEN
    INSERT INTO public.locations (
      organization_id, name, public_slug, timezone, address, city, phone, is_active
    ) VALUES (
      _organization_id,
      trim(_payload->>'name'),
      slug,
      coalesce(nullif(trim(_payload->>'timezone'), ''), 'America/Toronto'),
      nullif(trim(_payload->>'address'), ''),
      nullif(trim(_payload->>'city'), ''),
      nullif(trim(_payload->>'phone'), ''),
      coalesce((_payload->>'is_active')::boolean, true)
    )
    RETURNING id INTO loc_id;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.locations WHERE id = loc_id AND organization_id = _organization_id
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Location not found');
    END IF;
    UPDATE public.locations
    SET name = trim(_payload->>'name'),
        public_slug = slug,
        timezone = coalesce(nullif(trim(_payload->>'timezone'), ''), timezone),
        address = nullif(trim(_payload->>'address'), ''),
        city = nullif(trim(_payload->>'city'), ''),
        phone = nullif(trim(_payload->>'phone'), ''),
        is_active = coalesce((_payload->>'is_active')::boolean, is_active),
        updated_at = now()
    WHERE id = loc_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'location_id', loc_id, 'public_slug', slug);
END;
$$;

-- ========== hours ==========
CREATE OR REPLACE FUNCTION public.app_settings_update_hours(
  _organization_id uuid,
  _location_id uuid,
  _hours jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  day_keys text[] := ARRAY['mon','tue','wed','thu','fri','sat','sun'];
  i int;
  dk text;
  dh jsonb;
BEGIN
  PERFORM public.app_settings_require_manager(_organization_id);
  IF NOT EXISTS (
    SELECT 1 FROM public.locations WHERE id = _location_id AND organization_id = _organization_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location not found');
  END IF;

  DELETE FROM public.location_hours WHERE location_id = _location_id;
  FOR i IN 0..6 LOOP
    dk := day_keys[i + 1];
    dh := coalesce(_hours->dk, '{}'::jsonb);
    INSERT INTO public.location_hours (
      location_id, organization_id, day_of_week, open_time, close_time, is_closed
    ) VALUES (
      _location_id,
      _organization_id,
      i,
      CASE WHEN coalesce((dh->>'closed')::boolean, false) THEN NULL ELSE nullif(dh->>'open', '')::time END,
      CASE WHEN coalesce((dh->>'closed')::boolean, false) THEN NULL ELSE nullif(dh->>'close', '')::time END,
      coalesce((dh->>'closed')::boolean, false)
    );
  END LOOP;

  UPDATE public.v2_restaurants r
  SET hours = _hours
  FROM public.locations l
  JOIN public.organizations o ON o.id = l.organization_id
  WHERE l.id = _location_id AND r.id = o.legacy_restaurant_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_settings_get_hours(
  _organization_id uuid,
  _location_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  day_keys text[] := ARRAY['mon','tue','wed','thu','fri','sat','sun'];
  result jsonb := '{}'::jsonb;
  r record;
  dk text;
BEGIN
  PERFORM public.app_settings_require_manager(_organization_id);
  FOR r IN
    SELECT * FROM public.location_hours WHERE location_id = _location_id ORDER BY day_of_week
  LOOP
    dk := day_keys[r.day_of_week + 1];
    result := result || jsonb_build_object(
      dk,
      jsonb_build_object(
        'open', coalesce(to_char(r.open_time, 'HH24:MI'), '11:00'),
        'close', coalesce(to_char(r.close_time, 'HH24:MI'), '22:00'),
        'closed', r.is_closed
      )
    );
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'hours', result);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_settings_upsert_special_hours(
  _organization_id uuid,
  _location_id uuid,
  _on_date date,
  _open text DEFAULT NULL,
  _close text DEFAULT NULL,
  _is_closed boolean DEFAULT false,
  _label text DEFAULT NULL
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

  INSERT INTO public.location_special_hours (
    location_id, organization_id, on_date, open_time, close_time, is_closed, label
  ) VALUES (
    _location_id,
    _organization_id,
    _on_date,
    CASE WHEN _is_closed THEN NULL ELSE nullif(_open, '')::time END,
    CASE WHEN _is_closed THEN NULL ELSE nullif(_close, '')::time END,
    _is_closed,
    nullif(trim(_label), '')
  )
  ON CONFLICT (location_id, on_date) DO UPDATE
    SET open_time = EXCLUDED.open_time,
        close_time = EXCLUDED.close_time,
        is_closed = EXCLUDED.is_closed,
        label = EXCLUDED.label;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_settings_list_special_hours(
  _organization_id uuid,
  _location_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows jsonb;
BEGIN
  PERFORM public.app_settings_require_manager(_organization_id);
  SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.on_date), '[]'::jsonb)
  INTO rows
  FROM public.location_special_hours s
  WHERE s.location_id = _location_id AND s.organization_id = _organization_id;
  RETURN jsonb_build_object('ok', true, 'special_hours', rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_settings_delete_special_hours(
  _organization_id uuid,
  _id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.app_settings_require_manager(_organization_id);
  DELETE FROM public.location_special_hours
  WHERE id = _id AND organization_id = _organization_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ========== team ==========
CREATE OR REPLACE FUNCTION public.app_settings_list_team(_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  members jsonb;
  invites jsonb;
BEGIN
  PERFORM public.app_settings_require_manager(_organization_id);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'user_id', m.user_id,
    'role', m.role,
    'is_active', m.is_active,
    'email', u.email,
    'full_name', u.full_name
  ) ORDER BY m.created_at), '[]'::jsonb)
  INTO members
  FROM public.organization_memberships m
  LEFT JOIN public.users u ON u.id = m.user_id
  WHERE m.organization_id = _organization_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'email', i.email,
    'role', i.role,
    'expires_at', i.expires_at,
    'accepted_at', i.accepted_at
  ) ORDER BY i.created_at DESC), '[]'::jsonb)
  INTO invites
  FROM public.invitations i
  WHERE i.organization_id = _organization_id
    AND i.kind = 'team'
    AND i.accepted_at IS NULL;

  RETURN jsonb_build_object('ok', true, 'members', members, 'invites', invites);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_settings_invite_team(
  _organization_id uuid,
  _email text,
  _role text DEFAULT 'host'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_token text;
  email text;
  role text;
BEGIN
  PERFORM public.app_settings_require_manager(_organization_id);
  email := lower(trim(_email));
  role := coalesce(nullif(trim(_role), ''), 'host');
  IF email IS NULL OR position('@' in email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Valid email required');
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

  -- Return raw token once so UI can show/copy invite link (email job later).
  RETURN jsonb_build_object(
    'ok', true,
    'invite_path', '/invite/' || raw_token,
    'email', email,
    'role', role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.app_settings_update_member_role(
  _organization_id uuid,
  _membership_id uuid,
  _role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur text;
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Owner only');
  END IF;
  IF _role NOT IN ('manager', 'host') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid role');
  END IF;

  SELECT role INTO cur FROM public.organization_memberships
  WHERE id = _membership_id AND organization_id = _organization_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Member not found');
  END IF;
  IF cur = 'owner' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot change owner role');
  END IF;

  UPDATE public.organization_memberships
  SET role = _role
  WHERE id = _membership_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_settings_remove_member(
  _organization_id uuid,
  _membership_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur text;
  uid uuid;
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Owner only');
  END IF;

  SELECT role, user_id INTO cur, uid
  FROM public.organization_memberships
  WHERE id = _membership_id AND organization_id = _organization_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Member not found');
  END IF;
  IF cur = 'owner' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot remove owner');
  END IF;
  IF uid = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot remove yourself');
  END IF;

  UPDATE public.organization_memberships
  SET is_active = false
  WHERE id = _membership_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_settings_get_billing(_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub public.subscriptions%ROWTYPE;
  provider text;
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;
  SELECT * INTO sub FROM public.subscriptions WHERE organization_id = _organization_id;
  SELECT billing_provider INTO provider FROM public.v2_platform_settings WHERE id = 1;
  RETURN jsonb_build_object(
    'ok', true,
    'status', sub.status,
    'plan_id', sub.plan_id,
    'activated_via', sub.activated_via,
    'stripe_customer_id', sub.stripe_customer_id,
    'current_period_end', sub.current_period_end,
    'billing_provider', coalesce(provider, 'fake')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_settings_update_profile(uuid, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_list_locations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_upsert_location(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_update_hours(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_get_hours(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_upsert_special_hours(uuid, uuid, date, text, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_list_special_hours(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_delete_special_hours(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_list_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_invite_team(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_update_member_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_remove_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_get_billing(uuid) TO authenticated;
