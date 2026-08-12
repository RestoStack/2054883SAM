-- Launch hardenings: platform settings + signup kill-switch.

CREATE TABLE IF NOT EXISTS public.v2_platform_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  allow_public_signup boolean NOT NULL DEFAULT false,
  signup_invite_code text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.v2_platform_settings (id, allow_public_signup, signup_invite_code)
VALUES (1, false, null)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.v2_platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_platform_settings_read ON public.v2_platform_settings;
CREATE POLICY v2_platform_settings_read ON public.v2_platform_settings
  FOR SELECT TO authenticated
  USING (true);

DROP FUNCTION IF EXISTS public.v2_signup_create_restaurant(text, text, text, text);
DROP FUNCTION IF EXISTS public.v2_signup_create_restaurant(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.v2_signup_create_restaurant(text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.v2_signup_create_restaurant(
  _restaurant_name text,
  _slug text,
  _city text,
  _full_name text,
  _plan text DEFAULT 'starter',
  _invite_code text DEFAULT NULL
) RETURNS TABLE(out_restaurant_id uuid, out_slug text)
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
  _plan_final text;
  _allow boolean;
  _required_code text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT s.allow_public_signup, s.signup_invite_code
    INTO _allow, _required_code
  FROM public.v2_platform_settings s
  WHERE s.id = 1;

  IF NOT coalesce(_allow, false) THEN
    IF _required_code IS NULL OR btrim(_required_code) = '' THEN
      RAISE EXCEPTION 'public signup is closed — request a demo';
    END IF;
    IF coalesce(nullif(btrim(_invite_code), ''), '') <> btrim(_required_code) THEN
      RAISE EXCEPTION 'invalid or missing invite code';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.v2_users WHERE auth_user_id = _uid) THEN
    RAISE EXCEPTION 'user already has a restaurant';
  END IF;

  SELECT u.email INTO _email FROM auth.users u WHERE u.id = _uid;

  _plan_final := lower(coalesce(nullif(btrim(_plan), ''), 'starter'));
  IF _plan_final NOT IN ('starter', 'growth', 'group') THEN
    _plan_final := 'starter';
  END IF;

  _slug_final := regexp_replace(lower(coalesce(_slug, _restaurant_name)), '[^a-z0-9]+', '-', 'g');
  _slug_final := regexp_replace(_slug_final, '(^-+|-+$)', '', 'g');
  IF _slug_final = '' THEN _slug_final := 'restaurant'; END IF;

  WHILE EXISTS (SELECT 1 FROM public.v2_restaurants r WHERE r.slug = _slug_final) LOOP
    _n := _n + 1;
    _slug_final := regexp_replace(lower(coalesce(_slug, _restaurant_name)), '[^a-z0-9]+', '-', 'g');
    _slug_final := regexp_replace(_slug_final, '(^-+|-+$)', '', 'g') || '-' || _n::text;
  END LOOP;

  INSERT INTO public.v2_restaurants (name, slug, city, currency, timezone, plan, trial_started_at)
  VALUES (
    _restaurant_name,
    _slug_final,
    NULLIF(_city, ''),
    'USD',
    'America/New_York',
    _plan_final,
    now()
  )
  RETURNING id INTO _rid;

  INSERT INTO public.v2_users (auth_user_id, restaurant_id, full_name, role, email, is_active)
  VALUES (_uid, _rid, coalesce(NULLIF(btrim(_full_name), ''), _email, 'Owner'), 'admin', _email, true);

  RETURN QUERY SELECT _rid, _slug_final;
END;
$$;

GRANT EXECUTE ON FUNCTION public.v2_signup_create_restaurant(text, text, text, text, text, text) TO authenticated;
