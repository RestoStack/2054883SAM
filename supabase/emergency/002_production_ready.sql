-- EMERGENCY — paste into Supabase SQL Editor
-- Project: taenbelgzntolqzzjsee
-- Dashboard: https://supabase.com/dashboard/project/taenbelgzntolqzzjsee/sql/new
--
-- Makes the live v2 product functional for:
--   1) Public booking link  /book/{slug}  (missing RPC today)
--   2) Super Admin allowlist + claim
--   3) Public signup RPC (idempotent with 001)
--
-- AFTER THIS SCRIPT — still required in Dashboard (cannot be done via SQL):
--   Authentication → Providers → Google
--     Client ID + Client Secret from Google Cloud Console
--   Authentication → URL Configuration — add redirect URLs:
--     https://restostacks.com/auth/callback
--     https://app.restostacks.com/auth/callback
--     http://localhost:5173/auth/callback
--     https://*-vercel.app/auth/callback   (or your preview domain pattern)
--   Project Settings → API — copy service_role key into hosting secrets as
--     SUPABASE_SERVICE_ROLE_KEY (never into the browser / Vite env)

-- ========== 1) Public booking (SECURITY DEFINER — bypasses RLS for guests) ==========
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

  IF _guest_email IS NOT NULL AND btrim(_guest_email) <> '' THEN
    SELECT id INTO _customer_id
    FROM public.v2_customers
    WHERE restaurant_id = _restaurant_id AND lower(email) = lower(btrim(_guest_email))
    LIMIT 1;
  END IF;

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

GRANT EXECUTE ON FUNCTION public.v2_public_create_booking(text, text, text, text, int, date, time, text, text)
  TO anon, authenticated;

-- ========== 2) Super Admin allowlist ==========
CREATE TABLE IF NOT EXISTS public.v2_platform_admin_allowlist (
  email text PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.v2_platform_admins (
  auth_user_id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_platform_admin_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_platform_admins ENABLE ROW LEVEL SECURITY;

-- Owner + dedicated platform inbox (create/login these accounts in Auth, then claim)
INSERT INTO public.v2_platform_admin_allowlist (email) VALUES
  ('info@dreamlabstudios.ca'),
  ('platform@restostack-mail.dev'),
  ('ghassan.owner@restostack-mail.dev')
ON CONFLICT (email) DO NOTHING;

-- Ensure claim / is-admin RPCs exist (safe to re-run)
CREATE OR REPLACE FUNCTION public.v2_is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.v2_platform_admins WHERE auth_user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.v2_is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.v2_is_platform_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.v2_claim_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL OR btrim(_email) = '' THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.v2_platform_admins WHERE auth_user_id = auth.uid()
  ) THEN
    UPDATE public.v2_platform_admins SET email = lower(btrim(_email)) WHERE auth_user_id = auth.uid();
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.v2_platform_admin_allowlist WHERE lower(email) = lower(btrim(_email))
  ) THEN
    INSERT INTO public.v2_platform_admins (auth_user_id, email)
    VALUES (auth.uid(), lower(btrim(_email)))
    ON CONFLICT (auth_user_id) DO UPDATE SET email = EXCLUDED.email;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.v2_claim_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.v2_claim_platform_admin() TO authenticated;

-- ========== 3) Signup RPC (idempotent) ==========
CREATE TABLE IF NOT EXISTS public.v2_platform_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  allow_public_signup boolean NOT NULL DEFAULT true,
  signup_invite_code text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.v2_platform_settings (id, allow_public_signup, signup_invite_code)
VALUES (1, true, null)
ON CONFLICT (id) DO UPDATE
  SET allow_public_signup = true, updated_at = now();

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
    NULL
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

GRANT EXECUTE ON FUNCTION public.v2_signup_create_restaurant(text, text, text, text, text, text)
  TO authenticated;

-- Done. Next:
-- 1) Create Auth user platform@restostack-mail.dev (or use info@dreamlabstudios.ca)
-- 2) Login at /super-admin-login → claims allowlist → /platform shows restaurant counts
-- 3) Enable Google provider with Client Secret
-- 4) Test /book/maison-khalil and /book/italian-bistro
