-- Demo request form: capture preferred contact time
ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS best_time TEXT;

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS source TEXT;

DROP POLICY IF EXISTS "Anyone can join the waitlist" ON public.waitlist_signups;

CREATE POLICY "Anyone can join the waitlist"
ON public.waitlist_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(name) BETWEEN 1 AND 120
  AND length(email) BETWEEN 3 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(restaurant) BETWEEN 1 AND 160
  AND length(phone) BETWEEN 3 AND 40
  AND (best_time IS NULL OR length(best_time) BETWEEN 1 AND 120)
  AND (source IS NULL OR length(source) BETWEEN 1 AND 80)
);
