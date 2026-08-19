
-- Returns the safe list of active staff for a restaurant slug (for PIN-tile login UI).
CREATE OR REPLACE FUNCTION public.v2_get_staff_tiles(_slug text)
RETURNS TABLE (id uuid, full_name text, role v2_user_role, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.full_name, u.role, u.avatar_url
  FROM public.v2_users u
  JOIN public.v2_restaurants r ON r.id = u.restaurant_id
  WHERE r.slug = _slug AND u.is_active = true AND u.role IN ('hostess','server')
  ORDER BY u.full_name;
$$;
REVOKE EXECUTE ON FUNCTION public.v2_get_staff_tiles(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.v2_get_staff_tiles(text) TO anon, authenticated;

-- Links the currently-signed-in auth user to their v2_users row by matching email.
-- Safe: only updates the row matching auth.email(); only if auth_user_id is still null.
CREATE OR REPLACE FUNCTION public.v2_link_current_user_to_staff()
RETURNS public.v2_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.v2_users;
  my_email text;
BEGIN
  SELECT email INTO my_email FROM auth.users WHERE id = auth.uid();
  IF my_email IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.v2_users
  SET auth_user_id = auth.uid()
  WHERE email = my_email AND (auth_user_id IS NULL OR auth_user_id = auth.uid())
  RETURNING * INTO result;

  RETURN result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.v2_link_current_user_to_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_link_current_user_to_staff() TO authenticated;
