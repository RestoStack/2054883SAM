CREATE TABLE IF NOT EXISTS public.v2_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.v2_restaurants(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  party_size int NOT NULL DEFAULT 2 CHECK (party_size > 0),
  phone text,
  quoted_wait_minutes int DEFAULT 15,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','notified','seated','cancelled')),
  table_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v2_waitlist_restaurant_idx
  ON public.v2_waitlist(restaurant_id, status, created_at);

ALTER TABLE public.v2_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_waitlist_tenant_all ON public.v2_waitlist;
CREATE POLICY v2_waitlist_tenant_all ON public.v2_waitlist
  FOR ALL TO authenticated
  USING (restaurant_id = public.v2_current_restaurant_id())
  WITH CHECK (restaurant_id = public.v2_current_restaurant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_waitlist TO authenticated;
