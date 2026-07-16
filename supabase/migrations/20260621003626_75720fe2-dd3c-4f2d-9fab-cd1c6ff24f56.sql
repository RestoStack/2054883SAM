
REVOKE EXECUTE ON FUNCTION public.v2_current_restaurant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_current_restaurant_id() TO authenticated, service_role;
