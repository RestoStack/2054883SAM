REVOKE SELECT ON public.waitlist_signups FROM anon, authenticated, PUBLIC;
GRANT INSERT ON public.waitlist_signups TO anon, authenticated;
GRANT ALL ON public.waitlist_signups TO service_role;

DROP POLICY IF EXISTS "No public read of waitlist" ON public.waitlist_signups;
CREATE POLICY "No public read of waitlist"
ON public.waitlist_signups
FOR SELECT
TO anon, authenticated
USING (false);
