
-- ============ ENUMS ============
CREATE TYPE v2_user_role AS ENUM ('admin','hostess','server');
CREATE TYPE v2_booking_status AS ENUM ('pending','confirmed','seated','completed','cancelled','no_show');
CREATE TYPE v2_booking_source AS ENUM ('walk_in','phone','online','app');
CREATE TYPE v2_table_status AS ENUM ('available','occupied','reserved','cleaning');
CREATE TYPE v2_table_shape AS ENUM ('round','square','rectangle');
CREATE TYPE v2_order_status AS ENUM ('open','sent','ready','delivered','closed','voided');
CREATE TYPE v2_order_item_status AS ENUM ('pending','fired','ready','delivered');

-- ============ RESTAURANTS ============
CREATE TABLE public.v2_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  address text,
  city text,
  timezone text DEFAULT 'America/Toronto',
  currency text NOT NULL DEFAULT 'CAD',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_restaurants TO authenticated;
GRANT ALL ON public.v2_restaurants TO service_role;
ALTER TABLE public.v2_restaurants ENABLE ROW LEVEL SECURITY;

-- ============ USERS (staff) ============
CREATE TABLE public.v2_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  restaurant_id uuid NOT NULL REFERENCES public.v2_restaurants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role v2_user_role NOT NULL,
  pin text,
  email text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX v2_users_restaurant_idx ON public.v2_users(restaurant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_users TO authenticated;
GRANT ALL ON public.v2_users TO service_role;
ALTER TABLE public.v2_users ENABLE ROW LEVEL SECURITY;

-- Helper: current auth user's restaurant_id (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.v2_current_restaurant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.v2_users WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- v2_users policies (use auth_user_id directly to avoid recursion on self-lookup)
CREATE POLICY v2_users_select ON public.v2_users FOR SELECT TO authenticated
  USING (restaurant_id = public.v2_current_restaurant_id() OR auth_user_id = auth.uid());
CREATE POLICY v2_users_modify ON public.v2_users FOR ALL TO authenticated
  USING (restaurant_id = public.v2_current_restaurant_id())
  WITH CHECK (restaurant_id = public.v2_current_restaurant_id());

-- v2_restaurants policies
CREATE POLICY v2_restaurants_select ON public.v2_restaurants FOR SELECT TO authenticated
  USING (id = public.v2_current_restaurant_id());
CREATE POLICY v2_restaurants_modify ON public.v2_restaurants FOR ALL TO authenticated
  USING (id = public.v2_current_restaurant_id())
  WITH CHECK (id = public.v2_current_restaurant_id());

-- ============ CUSTOMERS ============
CREATE TABLE public.v2_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.v2_restaurants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  notes text,
  visit_count int NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  loyalty_points int NOT NULL DEFAULT 0,
  last_visit timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX v2_customers_restaurant_idx ON public.v2_customers(restaurant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_customers TO authenticated;
GRANT ALL ON public.v2_customers TO service_role;
ALTER TABLE public.v2_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY v2_customers_all ON public.v2_customers FOR ALL TO authenticated
  USING (restaurant_id = public.v2_current_restaurant_id())
  WITH CHECK (restaurant_id = public.v2_current_restaurant_id());

-- ============ BOOKINGS ============
CREATE TABLE public.v2_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.v2_restaurants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.v2_customers(id) ON DELETE SET NULL,
  guest_name text,
  guest_email text,
  guest_phone text,
  party_size int NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  duration_minutes int NOT NULL DEFAULT 90,
  section text,
  table_number text,
  status v2_booking_status NOT NULL DEFAULT 'pending',
  notes text,
  source v2_booking_source NOT NULL DEFAULT 'phone',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX v2_bookings_restaurant_date_idx ON public.v2_bookings(restaurant_id, date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_bookings TO authenticated;
GRANT ALL ON public.v2_bookings TO service_role;
ALTER TABLE public.v2_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY v2_bookings_all ON public.v2_bookings FOR ALL TO authenticated
  USING (restaurant_id = public.v2_current_restaurant_id())
  WITH CHECK (restaurant_id = public.v2_current_restaurant_id());

-- ============ TABLES ============
CREATE TABLE public.v2_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.v2_restaurants(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  section text,
  capacity int NOT NULL,
  status v2_table_status NOT NULL DEFAULT 'available',
  current_booking_id uuid REFERENCES public.v2_bookings(id) ON DELETE SET NULL,
  position_x int DEFAULT 0,
  position_y int DEFAULT 0,
  shape v2_table_shape NOT NULL DEFAULT 'square'
);
CREATE INDEX v2_tables_restaurant_idx ON public.v2_tables(restaurant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_tables TO authenticated;
GRANT ALL ON public.v2_tables TO service_role;
ALTER TABLE public.v2_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY v2_tables_all ON public.v2_tables FOR ALL TO authenticated
  USING (restaurant_id = public.v2_current_restaurant_id())
  WITH CHECK (restaurant_id = public.v2_current_restaurant_id());

-- ============ MENU ============
CREATE TABLE public.v2_menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.v2_restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_menu_categories TO authenticated;
GRANT ALL ON public.v2_menu_categories TO service_role;
ALTER TABLE public.v2_menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY v2_menu_cat_all ON public.v2_menu_categories FOR ALL TO authenticated
  USING (restaurant_id = public.v2_current_restaurant_id())
  WITH CHECK (restaurant_id = public.v2_current_restaurant_id());

CREATE TABLE public.v2_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.v2_restaurants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.v2_menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  is_popular boolean NOT NULL DEFAULT false,
  food_cost numeric,
  allergens text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX v2_menu_items_restaurant_idx ON public.v2_menu_items(restaurant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_menu_items TO authenticated;
GRANT ALL ON public.v2_menu_items TO service_role;
ALTER TABLE public.v2_menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY v2_menu_items_all ON public.v2_menu_items FOR ALL TO authenticated
  USING (restaurant_id = public.v2_current_restaurant_id())
  WITH CHECK (restaurant_id = public.v2_current_restaurant_id());

-- ============ ORDERS ============
CREATE TABLE public.v2_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.v2_restaurants(id) ON DELETE CASCADE,
  table_id uuid REFERENCES public.v2_tables(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.v2_bookings(id) ON DELETE SET NULL,
  server_id uuid REFERENCES public.v2_users(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.v2_customers(id) ON DELETE SET NULL,
  status v2_order_status NOT NULL DEFAULT 'open',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  tip numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  party_size int,
  notes text,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX v2_orders_restaurant_idx ON public.v2_orders(restaurant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_orders TO authenticated;
GRANT ALL ON public.v2_orders TO service_role;
ALTER TABLE public.v2_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY v2_orders_all ON public.v2_orders FOR ALL TO authenticated
  USING (restaurant_id = public.v2_current_restaurant_id())
  WITH CHECK (restaurant_id = public.v2_current_restaurant_id());

CREATE TABLE public.v2_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.v2_orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.v2_menu_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  price numeric NOT NULL,
  qty int NOT NULL DEFAULT 1,
  seat_number int,
  notes text,
  was_upsell boolean NOT NULL DEFAULT false,
  status v2_order_item_status NOT NULL DEFAULT 'pending'
);
CREATE INDEX v2_order_items_order_idx ON public.v2_order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_order_items TO authenticated;
GRANT ALL ON public.v2_order_items TO service_role;
ALTER TABLE public.v2_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY v2_order_items_all ON public.v2_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v2_orders o WHERE o.id = order_id AND o.restaurant_id = public.v2_current_restaurant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v2_orders o WHERE o.id = order_id AND o.restaurant_id = public.v2_current_restaurant_id()));

-- ============ SHIFTS ============
CREATE TABLE public.v2_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.v2_restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.v2_users(id) ON DELETE CASCADE,
  clock_in_at timestamptz NOT NULL DEFAULT now(),
  clock_out_at timestamptz,
  tips_total numeric NOT NULL DEFAULT 0,
  sales_total numeric NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_shifts TO authenticated;
GRANT ALL ON public.v2_shifts TO service_role;
ALTER TABLE public.v2_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY v2_shifts_all ON public.v2_shifts FOR ALL TO authenticated
  USING (restaurant_id = public.v2_current_restaurant_id())
  WITH CHECK (restaurant_id = public.v2_current_restaurant_id());

-- ============ LOYALTY ============
CREATE TABLE public.v2_loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.v2_restaurants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.v2_customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.v2_orders(id) ON DELETE SET NULL,
  points_earned int NOT NULL DEFAULT 0,
  points_redeemed int NOT NULL DEFAULT 0,
  balance_after int NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_loyalty_transactions TO authenticated;
GRANT ALL ON public.v2_loyalty_transactions TO service_role;
ALTER TABLE public.v2_loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY v2_loyalty_all ON public.v2_loyalty_transactions FOR ALL TO authenticated
  USING (restaurant_id = public.v2_current_restaurant_id())
  WITH CHECK (restaurant_id = public.v2_current_restaurant_id());

-- ============ SEED: JUKEBOX BURGERS ============
DO $$
DECLARE
  r_id uuid := '11111111-1111-1111-1111-111111111111';
  cat_burgers uuid := gen_random_uuid();
  cat_sides uuid := gen_random_uuid();
  cat_drinks uuid := gen_random_uuid();
  c_marie uuid := gen_random_uuid();
  c_jp uuid := gen_random_uuid();
  c_sarah uuid := gen_random_uuid();
  c_ahmed uuid := gen_random_uuid();
  c_emma uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.v2_restaurants (id, name, slug, logo_url, address, city, timezone, currency)
  VALUES (r_id, 'Jukebox Burgers & Bar', 'jukebox', '/assets/logos/jukebox.png', 'Montreal, QC', 'Montreal', 'America/Toronto', 'CAD');

  INSERT INTO public.v2_users (restaurant_id, full_name, role, email, pin) VALUES
    (r_id, 'Ghassan Khalil', 'admin', 'admin@jukebox.com', NULL),
    (r_id, 'Sophie', 'hostess', NULL, '1234'),
    (r_id, 'Alex', 'server', NULL, '1111'),
    (r_id, 'Marco', 'server', NULL, '2222');

  -- Tables
  INSERT INTO public.v2_tables (restaurant_id, table_number, section, capacity, shape) VALUES
    (r_id,'T1','Main Floor',4,'square'),(r_id,'T2','Main Floor',4,'square'),
    (r_id,'T3','Main Floor',4,'square'),(r_id,'T4','Main Floor',4,'square'),
    (r_id,'T5','Main Floor',4,'square'),(r_id,'T6','Main Floor',4,'square'),
    (r_id,'T7','Bar',2,'round'),(r_id,'T8','Bar',2,'round'),(r_id,'T9','Bar',2,'round'),
    (r_id,'T10','Patio',4,'square'),(r_id,'T11','Patio',4,'square'),(r_id,'T12','Patio',4,'square');

  -- Menu
  INSERT INTO public.v2_menu_categories (id, restaurant_id, name, sort_order) VALUES
    (cat_burgers, r_id, 'Burgers', 1),
    (cat_sides, r_id, 'Sides', 2),
    (cat_drinks, r_id, 'Drinks', 3);

  INSERT INTO public.v2_menu_items (restaurant_id, category_id, name, description, price, is_popular) VALUES
    (r_id, cat_burgers, 'Classic Smash', 'Two smashed beef patties, american cheese, pickles, special sauce', 14.00, true),
    (r_id, cat_burgers, 'BBQ Bacon Stack', 'Smash patty, bacon, cheddar, crispy onions, BBQ sauce', 16.00, true),
    (r_id, cat_burgers, 'Mushroom Swiss', 'Smash patty, sautéed mushrooms, swiss cheese, garlic aioli', 15.00, false),
    (r_id, cat_burgers, 'Spicy Crispy Chicken', 'Fried chicken thigh, hot honey, slaw, pickles', 15.00, false),
    (r_id, cat_sides, 'Hand-Cut Fries', NULL, 5.00, true),
    (r_id, cat_sides, 'Poutine', 'Fries, cheese curds, gravy', 9.00, true),
    (r_id, cat_sides, 'Onion Rings', NULL, 7.00, false),
    (r_id, cat_sides, 'Caesar Salad', NULL, 10.00, false),
    (r_id, cat_drinks, 'Draft Beer', NULL, 8.00, false),
    (r_id, cat_drinks, 'House Wine', NULL, 9.00, false),
    (r_id, cat_drinks, 'Fountain Soda', NULL, 3.00, false),
    (r_id, cat_drinks, 'Milkshake', 'Vanilla, chocolate, or strawberry', 7.00, true);

  -- Customers
  INSERT INTO public.v2_customers (id, restaurant_id, full_name, email, visit_count, notes) VALUES
    (c_marie, r_id, 'Marie Tremblay', 'marie@email.com', 3, 'Loyal regular'),
    (c_jp, r_id, 'Jean-Philippe Côté', 'jp@email.com', 1, NULL),
    (c_sarah, r_id, 'Sarah Johnson', 'sarah@email.com', 5, 'VIP'),
    (c_ahmed, r_id, 'Ahmed Benali', 'ahmed@email.com', 2, NULL),
    (c_emma, r_id, 'Emma Dubois', 'emma@email.com', 1, NULL);

  -- Bookings
  INSERT INTO public.v2_bookings (restaurant_id, customer_id, guest_name, party_size, date, time, status, table_number, section) VALUES
    (r_id, c_marie, 'Marie Tremblay', 4, CURRENT_DATE, '19:00', 'confirmed', 'T3', 'Main Floor'),
    (r_id, c_sarah, 'Sarah Johnson', 2, CURRENT_DATE, '20:00', 'confirmed', 'T7', 'Bar'),
    (r_id, c_jp, 'Jean-Philippe Côté', 6, CURRENT_DATE, '18:30', 'pending', NULL, NULL),
    (r_id, c_ahmed, 'Ahmed Benali', 3, CURRENT_DATE + 1, '19:30', 'confirmed', NULL, NULL),
    (r_id, c_emma, 'Emma Dubois', 2, CURRENT_DATE + 1, '18:00', 'confirmed', NULL, NULL);
END $$;
