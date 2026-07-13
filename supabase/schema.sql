-- RestoStack multi-tenant schema (Supabase / Postgres)
-- Ready to apply when you connect a real Supabase project.
-- Prototype currently runs on seeded in-app data that mirrors this model.

create extension if not exists "pgcrypto";

create type public.app_role as enum (
  'super_admin', 'org_admin', 'manager', 'staff', 'host', 'server'
);

create type public.booking_status as enum (
  'pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'
);

create type public.department as enum ('foh', 'boh', 'management');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  city text not null,
  neighborhood text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'staff',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null default 'staff',
  unique (organization_id, user_id)
);

create table public.location_members (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  unique (location_id, user_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  birthday date,
  source text,
  customer_type text not null default 'regular',
  marketing_consent boolean not null default false,
  accepts_delivery boolean not null default false,
  notes text,
  dietary_notes text,
  preferred_seating text,
  preferred_area text,
  time_preference text,
  other_preferences text,
  points_earned int not null default 0,
  points_balance int not null default 0,
  page_visits int not null default 0,
  member_since date not null default current_date,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  label text not null,
  capacity int not null,
  shape text not null default 'rect',
  area text not null default 'indoor',
  pos_x numeric not null,
  pos_y numeric not null,
  width numeric not null,
  height numeric not null
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  guest_name text not null,
  booking_at timestamptz not null,
  party_size int not null,
  source text,
  status public.booking_status not null default 'pending',
  table_id uuid references public.restaurant_tables(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  name text not null,
  category text,
  price numeric(10,2) not null,
  is_active boolean not null default true
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  table_id uuid references public.restaurant_tables(id) on delete set null,
  server_name text,
  ordered_at timestamptz not null default now(),
  total numeric(10,2) not null default 0,
  status text not null default 'paid'
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  quantity int not null,
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  full_name text not null,
  department public.department not null,
  hourly_rate numeric(10,2) not null,
  is_active boolean not null default true
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
);

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  name text not null,
  description text,
  type text not null,
  sent_at timestamptz,
  recipients_count int not null default 0,
  open_rate numeric(5,2) not null default 0
);

create index bookings_location_time_idx on public.bookings (location_id, booking_at);
create index orders_location_time_idx on public.orders (location_id, ordered_at);
create index customers_location_idx on public.customers (location_id);

alter table public.organizations enable row level security;
alter table public.locations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.location_members enable row level security;
alter table public.customers enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.bookings enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.staff enable row level security;
alter table public.shifts enable row level security;
alter table public.marketing_campaigns enable row level security;

create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.organization_members where user_id = auth.uid();
$$;

create policy org_select on public.organizations
  for select using (id in (select public.user_org_ids()));

create policy locations_all on public.locations
  for all using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

create policy customers_all on public.customers
  for all using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

create policy bookings_all on public.bookings
  for all using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

create policy tables_all on public.restaurant_tables
  for all using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

create policy menu_all on public.menu_items
  for all using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

create policy orders_all on public.orders
  for all using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.organization_id in (select public.user_org_ids())
    )
  );

create policy staff_all on public.staff
  for all using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

create policy shifts_all on public.shifts
  for all using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

create policy campaigns_all on public.marketing_campaigns
  for all using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));
