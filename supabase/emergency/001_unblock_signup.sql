-- EMERGENCY UNBLOCK — paste into Supabase SQL Editor for project taenbelgzntolqzzjsee
-- Dashboard: https://supabase.com/dashboard/project/taenbelgzntolqzzjsee/sql/new
--
-- Fixes:
-- 1) Missing v2_signup_create_restaurant (email/Google auth users cannot create a restaurant — RLS blocks inserts)
-- 2) Opens public signup for demo
--
-- After running:
--   • Email signup at https://restostacks.com/signup works
--   • Google still needs Client ID + Client Secret under
--     Authentication → Providers → Google
--     (error without secret: "Unsupported provider: missing OAuth secret")

CREATE TABLE IF NOT EXISTS public.v2_platform_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  allow_public_signup boolean NOT NULL DEFAULT true,
  signup_invite_code text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.v2_platform_settings (id, allow_public_signup, signup_invite_code)
VALUES (1, true, null)
ON CONFLICT (id) DO UPDATE
  SET allow_public_signup = true,
      updated_at = now();

ALTER TABLE public.v2_platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS v2_platform_settings_read ON public.v2_platform_settings;
CREATE POLICY v2_platform_settings_read ON public.v2_platform_settings
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY v2_platform_settings_read_anon ON public.v2_platform_settings
  FOR SELECT TO anon
  USING (true);

-- Drop all known signatures, then create one open signup RPC.
DROP FUNCTION IF EXISTS public.v2_signup_create_restaurant(text, text, text, text);
DROP FUNCTION IF EXISTS public.v2_signup_create_restaurant(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.v2_signup_create_restaurant(text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.v2_signup_create_restaurant(
  _restaurant_name text,
  _slug text DEFAULT NULL,
  _city text DEFAULT NULL,
  _full_name text DEFAULT NULL,
  _plan text DEFAULT 'starter',
  _invite_code text DEFAULT NULL
)
RETURNS jsonb
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
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.v2_users WHERE auth_user_id = _uid) THEN
    SELECT restaurant_id INTO _rid FROM public.v2_users WHERE auth_user_id = _uid LIMIT 1;
    RETURN jsonb_build_object('ok', true, 'restaurant_id', _rid, 'created', false);
  END IF;

  SELECT u.email INTO _email FROM auth.users u WHERE u.id = _uid;

  _plan_final := lower(coalesce(nullif(btrim(_plan), ''), 'starter'));
  IF _plan_final NOT IN ('starter', 'growth', 'group') THEN
    _plan_final := 'starter';
  END IF;

  _slug_final := regexp_replace(
    lower(coalesce(nullif(btrim(_slug), ''), nullif(btrim(_restaurant_name), ''), 'restaurant')),
    '[^a-z0-9]+', '-', 'g'
  );
  _slug_final := trim(both '-' from _slug_final);
  IF _slug_final = '' THEN _slug_final := 'restaurant'; END IF;

  WHILE EXISTS (SELECT 1 FROM public.v2_restaurants r WHERE r.slug = _slug_final) LOOP
    _n := _n + 1;
    _slug_final := trim(both '-' from regexp_replace(
      lower(coalesce(nullif(btrim(_restaurant_name), ''), 'restaurant')),
      '[^a-z0-9]+', '-', 'g'
    )) || '-' || _n::text;
  END LOOP;

  INSERT INTO public.v2_restaurants (
    name, slug, city, currency, timezone, plan, trial_started_at, onboarding_completed_at
  ) VALUES (
    coalesce(nullif(btrim(_restaurant_name), ''), 'My restaurant'),
    _slug_final,
    nullif(btrim(coalesce(_city, '')), ''),
    'CAD',
    'America/Toronto',
    _plan_final,
    now(),
    NULL  -- leave incomplete so the owner sees /onboarding
  )
  RETURNING id INTO _rid;

  INSERT INTO public.v2_users (auth_user_id, restaurant_id, full_name, role, email, is_active)
  VALUES (
    _uid,
    _rid,
    coalesce(nullif(btrim(_full_name), ''), split_part(_email, '@', 1), 'Owner'),
    'admin',
    _email,
    true
  );

  RETURN jsonb_build_object(
    'ok', true,
    'created', true,
    'restaurant_id', _rid,
    'slug', _slug_final
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.v2_signup_create_restaurant(text, text, text, text, text, text) TO authenticated;

-- Helpful: allow authenticated users to read their own restaurant after signup
-- (existing policies already do this via v2_current_restaurant_id).
