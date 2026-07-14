-- Extra fields for full operational onboarding.

ALTER TABLE public.v2_restaurants
  ADD COLUMN IF NOT EXISTS google_business_url text,
  ADD COLUMN IF NOT EXISTS seating_plan_url text,
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS menu_source_url text,
  ADD COLUMN IF NOT EXISTS integrations jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.v2_users
  ADD COLUMN IF NOT EXISTS hourly_wage numeric;
