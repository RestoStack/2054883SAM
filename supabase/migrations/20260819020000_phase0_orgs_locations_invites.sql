-- Phase 0 foundation: organizations / locations / memberships / invites / subscriptions
-- Additive + backfill from v2_restaurants / v2_users. Does not drop v2_* yet.
-- See docs/DATA_MODEL.md ADR-001 and docs/DECISIONS.md.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========== platform settings extensions ==========
ALTER TABLE public.v2_platform_settings
  ADD COLUMN IF NOT EXISTS signup_mode text NOT NULL DEFAULT 'invite_only'
    CHECK (signup_mode IN ('invite_only', 'open')),
  ADD COLUMN IF NOT EXISTS billing_provider text NOT NULL DEFAULT 'fake'
    CHECK (billing_provider IN ('fake', 'stripe'));

UPDATE public.v2_platform_settings
SET signup_mode = 'invite_only',
    billing_provider = 'fake'
WHERE id = 1;

-- ========== core identity ==========
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Toronto',
  currency text NOT NULL DEFAULT 'CAD',
  locale text NOT NULL DEFAULT 'en-CA',
  stripe_customer_id text,
  legacy_restaurant_id uuid UNIQUE REFERENCES public.v2_restaurants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  public_slug text NOT NULL,
  timezone text,
  address text,
  city text,
  is_active boolean NOT NULL DEFAULT true,
  legacy_restaurant_id uuid UNIQUE REFERENCES public.v2_restaurants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT locations_public_slug_format CHECK (public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX IF NOT EXISTS locations_public_slug_uidx ON public.locations (public_slug);
CREATE INDEX IF NOT EXISTS locations_organization_id_idx ON public.locations (organization_id);

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'host')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS organization_memberships_user_id_idx
  ON public.organization_memberships (user_id);

CREATE TABLE IF NOT EXISTS public.user_active_context (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid')),
  price_id text,
  plan_id text,
  trial_end timestamptz,
  current_period_end timestamptz,
  activated_via text NOT NULL DEFAULT 'platform_grant'
    CHECK (activated_via IN ('fake_checkout', 'stripe', 'platform_grant')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  email text,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'host')),
  kind text NOT NULL CHECK (kind IN ('owner_onboarding', 'team')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  plan_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS invitations_token_hash_idx ON public.invitations (token_hash);

-- ========== helpers ==========
CREATE OR REPLACE FUNCTION public.app_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_memberships
  WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.app_has_org_role(p_org uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships m
    WHERE m.user_id = auth.uid()
      AND m.organization_id = p_org
      AND m.is_active = true
      AND m.role = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.app_can_access_location(p_location uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.locations l
    JOIN public.organization_memberships m
      ON m.organization_id = l.organization_id
    WHERE l.id = p_location
      AND m.user_id = auth.uid()
      AND m.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.app_active_subscription(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.organization_id = p_org
      AND s.status IN ('trialing', 'active')
  );
$$;

-- ========== backfill from v2 ==========
INSERT INTO public.organizations (id, name, timezone, currency, locale, legacy_restaurant_id, created_at)
SELECT gen_random_uuid(), r.name, 'America/Toronto', 'CAD', 'en-CA', r.id, r.created_at
FROM public.v2_restaurants r
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations o WHERE o.legacy_restaurant_id = r.id
);

INSERT INTO public.locations (
  organization_id, name, public_slug, timezone, address, city, legacy_restaurant_id, created_at
)
SELECT
  o.id,
  r.name,
  COALESCE(NULLIF(r.slug, ''), 'restaurant-' || substr(r.id::text, 1, 8)),
  'America/Toronto',
  r.address,
  r.city,
  r.id,
  r.created_at
FROM public.v2_restaurants r
JOIN public.organizations o ON o.legacy_restaurant_id = r.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.locations l WHERE l.legacy_restaurant_id = r.id
)
ON CONFLICT (public_slug) DO NOTHING;

-- Ensure slug uniqueness fallback for conflicts
UPDATE public.locations l
SET public_slug = public_slug || '-' || substr(l.id::text, 1, 4)
WHERE l.legacy_restaurant_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.locations x
    WHERE x.public_slug = l.public_slug AND x.id <> l.id
  );

INSERT INTO public.users (id, email, full_name)
SELECT u.auth_user_id, u.email, u.full_name
FROM public.v2_users u
WHERE u.auth_user_id IS NOT NULL
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);

INSERT INTO public.organization_memberships (organization_id, user_id, role, is_active)
SELECT
  o.id,
  u.auth_user_id,
  CASE
    WHEN u.role = 'admin' THEN 'owner'
    WHEN u.role = 'hostess' THEN 'host'
    ELSE 'host'
  END,
  COALESCE(u.is_active, true)
FROM public.v2_users u
JOIN public.organizations o ON o.legacy_restaurant_id = u.restaurant_id
WHERE u.auth_user_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO public.subscriptions (organization_id, status, plan_id, activated_via)
SELECT o.id, 'active', COALESCE(r.plan, 'starter'), 'platform_grant'
FROM public.organizations o
JOIN public.v2_restaurants r ON r.id = o.legacy_restaurant_id
ON CONFLICT (organization_id) DO NOTHING;

-- ========== RLS ==========
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_active_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_self ON public.users;
CREATE POLICY users_self ON public.users
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS organizations_member_select ON public.organizations;
CREATE POLICY organizations_member_select ON public.organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.app_user_org_ids()));

DROP POLICY IF EXISTS organizations_owner_modify ON public.organizations;
CREATE POLICY organizations_owner_modify ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.app_has_org_role(id, ARRAY['owner']))
  WITH CHECK (public.app_has_org_role(id, ARRAY['owner']));

DROP POLICY IF EXISTS locations_member_all ON public.locations;
CREATE POLICY locations_member_select ON public.locations
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()));

CREATE POLICY locations_manager_write ON public.locations
  FOR ALL TO authenticated
  USING (public.app_has_org_role(organization_id, ARRAY['owner', 'manager']))
  WITH CHECK (public.app_has_org_role(organization_id, ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS memberships_select ON public.organization_memberships;
CREATE POLICY memberships_select ON public.organization_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.app_has_org_role(organization_id, ARRAY['owner', 'manager'])
  );

CREATE POLICY memberships_owner_write ON public.organization_memberships
  FOR ALL TO authenticated
  USING (public.app_has_org_role(organization_id, ARRAY['owner']))
  WITH CHECK (public.app_has_org_role(organization_id, ARRAY['owner']));

DROP POLICY IF EXISTS active_context_self ON public.user_active_context;
CREATE POLICY active_context_self ON public.user_active_context
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS subscriptions_member_select ON public.subscriptions;
CREATE POLICY subscriptions_member_select ON public.subscriptions
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()));

CREATE POLICY subscriptions_owner_readwrite ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (public.app_has_org_role(organization_id, ARRAY['owner']))
  WITH CHECK (public.app_has_org_role(organization_id, ARRAY['owner']));

DROP POLICY IF EXISTS invitations_manager_all ON public.invitations;
CREATE POLICY invitations_manager_all ON public.invitations
  FOR ALL TO authenticated
  USING (
    organization_id IS NULL
    OR public.app_has_org_role(organization_id, ARRAY['owner', 'manager'])
  )
  WITH CHECK (
    organization_id IS NULL
    OR public.app_has_org_role(organization_id, ARRAY['owner', 'manager'])
  );

-- ========== invite RPCs ==========
CREATE OR REPLACE FUNCTION public.app_peek_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invitations%ROWTYPE;
  org_name text;
BEGIN
  IF _token IS NULL OR length(trim(_token)) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid token');
  END IF;

  SELECT * INTO inv
  FROM public.invitations
  WHERE token_hash = encode(digest(_token, 'sha256'), 'hex')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invite not found');
  END IF;
  IF inv.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invite already used');
  END IF;
  IF inv.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invite expired');
  END IF;

  IF inv.organization_id IS NOT NULL THEN
    SELECT name INTO org_name FROM public.organizations WHERE id = inv.organization_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'kind', inv.kind,
    'role', inv.role,
    'organization_name', org_name,
    'email', inv.email
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.app_accept_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invitations%ROWTYPE;
  uid uuid := auth.uid();
  org_id uuid;
  needs_payment boolean := false;
  needs_onboarding boolean := false;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO inv
  FROM public.invitations
  WHERE token_hash = encode(digest(_token, 'sha256'), 'hex')
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invite not found');
  END IF;
  IF inv.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invite already used');
  END IF;
  IF inv.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invite expired');
  END IF;

  INSERT INTO public.users (id, email)
  VALUES (uid, coalesce((SELECT email FROM auth.users WHERE id = uid), inv.email))
  ON CONFLICT (id) DO NOTHING;

  IF inv.kind = 'owner_onboarding' THEN
    -- Owner invite may create org at accept if not pre-created.
    IF inv.organization_id IS NULL THEN
      INSERT INTO public.organizations (name)
      VALUES (coalesce(inv.metadata->>'organization_name', 'New restaurant'))
      RETURNING id INTO org_id;

      INSERT INTO public.locations (organization_id, name, public_slug)
      VALUES (
        org_id,
        coalesce(inv.metadata->>'location_name', 'Main'),
        coalesce(inv.metadata->>'slug', 'org-' || substr(org_id::text, 1, 8))
      );

      INSERT INTO public.subscriptions (organization_id, status, activated_via, plan_id)
      VALUES (org_id, 'incomplete', 'platform_grant', coalesce(inv.plan_id, 'starter'));

      needs_payment := true;
      needs_onboarding := true;
    ELSE
      org_id := inv.organization_id;
      needs_payment := NOT public.app_active_subscription(org_id);
      needs_onboarding := needs_payment;
    END IF;

    INSERT INTO public.organization_memberships (organization_id, user_id, role)
    VALUES (org_id, uid, 'owner')
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = 'owner', is_active = true;
  ELSE
    org_id := inv.organization_id;
    IF org_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Team invite missing organization');
    END IF;
    INSERT INTO public.organization_memberships (organization_id, user_id, role)
    VALUES (org_id, uid, inv.role)
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = EXCLUDED.role, is_active = true;
  END IF;

  UPDATE public.invitations
  SET accepted_at = now(), accepted_by = uid
  WHERE id = inv.id;

  INSERT INTO public.user_active_context (user_id, organization_id, location_id)
  SELECT uid, org_id, l.id
  FROM public.locations l
  WHERE l.organization_id = org_id
  ORDER BY l.created_at
  LIMIT 1
  ON CONFLICT (user_id) DO UPDATE
    SET organization_id = EXCLUDED.organization_id,
        location_id = EXCLUDED.location_id,
        updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'organization_id', org_id,
    'needs_payment', needs_payment,
    'needs_onboarding', needs_onboarding
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.app_activate_fake_subscription(_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Owner only');
  END IF;

  SELECT billing_provider INTO provider FROM public.v2_platform_settings WHERE id = 1;
  IF coalesce(provider, 'fake') <> 'fake' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Fake billing disabled');
  END IF;

  INSERT INTO public.subscriptions (organization_id, status, activated_via, plan_id)
  VALUES (_organization_id, 'active', 'fake_checkout', 'starter')
  ON CONFLICT (organization_id) DO UPDATE
    SET status = 'active',
        activated_via = 'fake_checkout',
        updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_peek_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_accept_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_activate_fake_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_user_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_has_org_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_access_location(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_active_subscription(uuid) TO authenticated;
