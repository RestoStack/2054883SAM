
-- Enums
CREATE TYPE public.server_role AS ENUM ('server', 'admin');

-- Servers (waiters + admins)
CREATE TABLE public.servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  role public.server_role NOT NULL DEFAULT 'server',
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.servers TO service_role;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
-- No policies: all access goes through service_role in server functions.

-- Session tokens (cookie-based PIN sessions)
CREATE TABLE public.server_sessions (
  token TEXT NOT NULL PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '12 hours')
);
CREATE INDEX server_sessions_server_id_idx ON public.server_sessions(server_id);
GRANT ALL ON public.server_sessions TO service_role;
ALTER TABLE public.server_sessions ENABLE ROW LEVEL SECURITY;

-- Shifts (clock in / out + tips)
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  clock_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out_at TIMESTAMPTZ,
  tips_cents INT NOT NULL DEFAULT 0
);
CREATE INDEX shifts_server_id_idx ON public.shifts(server_id);
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  table_number INT NOT NULL,
  party_size INT NOT NULL,
  total_cents INT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_server_id_sent_idx ON public.orders(server_id, sent_at DESC);
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order items
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT,
  price_cents INT NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  guest_index INT NOT NULL DEFAULT 1,
  was_upsell BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_items_server_id_sent_idx ON public.order_items(server_id, sent_at DESC);
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Upsell popup events (for acceptance rate)
CREATE TABLE public.upsell_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  shown_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX upsell_events_server_id_shown_idx ON public.upsell_events(server_id, shown_at DESC);
GRANT ALL ON public.upsell_events TO service_role;
ALTER TABLE public.upsell_events ENABLE ROW LEVEL SECURITY;

-- Table ratings (1-5 stars)
CREATE TABLE public.table_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  table_number INT,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX table_ratings_server_id_created_idx ON public.table_ratings(server_id, created_at DESC);
GRANT ALL ON public.table_ratings TO service_role;
ALTER TABLE public.table_ratings ENABLE ROW LEVEL SECURITY;
