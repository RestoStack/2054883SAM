-- Platform-level super admins can list every restaurant signup.
-- Kept separate from v2_users (which is always restaurant-scoped).

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

-- No direct table access for clients; SECURITY DEFINER RPCs only.

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

-- Promote the current user if their email is allowlisted.
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

CREATE OR REPLACE FUNCTION public.v2_platform_list_restaurants()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  city text,
  created_at timestamptz,
  owner_email text,
  owner_name text,
  staff_count bigint,
  booking_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.name,
    r.slug,
    r.city,
    r.created_at,
    (
      SELECT u.email
      FROM public.v2_users u
      WHERE u.restaurant_id = r.id
        AND u.role = 'admin'
      ORDER BY u.created_at ASC
      LIMIT 1
    ) AS owner_email,
    (
      SELECT u.full_name
      FROM public.v2_users u
      WHERE u.restaurant_id = r.id
        AND u.role = 'admin'
      ORDER BY u.created_at ASC
      LIMIT 1
    ) AS owner_name,
    (SELECT count(*) FROM public.v2_users u WHERE u.restaurant_id = r.id) AS staff_count,
    (SELECT count(*) FROM public.v2_bookings b WHERE b.restaurant_id = r.id) AS booking_count
  FROM public.v2_restaurants r
  WHERE public.v2_is_platform_admin()
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.v2_platform_list_restaurants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.v2_platform_list_restaurants() TO authenticated;
