-- Plan fields for soft paywall + signup RPC accepts optional plan.

ALTER TABLE public.v2_restaurants
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

DROP FUNCTION IF EXISTS public.v2_signup_create_restaurant(text, text, text, text);
DROP FUNCTION IF EXISTS public.v2_signup_create_restaurant(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.v2_signup_create_restaurant(
  _restaurant_name text,
  _slug text,
  _city text,
  _full_name text,
  _plan text DEFAULT 'starter'
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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
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

GRANT EXECUTE ON FUNCTION public.v2_signup_create_restaurant(text, text, text, text, text) TO authenticated;

-- Existing restaurants should not be forced back through Typeform onboarding.
UPDATE public.v2_restaurants
SET onboarding_completed_at = coalesce(onboarding_completed_at, created_at, now())
WHERE onboarding_completed_at IS NULL;
