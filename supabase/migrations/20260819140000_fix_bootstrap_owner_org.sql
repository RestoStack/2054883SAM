-- Fix: authenticated users with no membership could reach /onboarding and
-- hit "Missing organization". Allow bootstrap of an owner org while
-- billing_provider=fake (invite-only production still uses invites).

CREATE OR REPLACE FUNCTION public.app_bootstrap_owner_org(
  _full_name text DEFAULT NULL,
  _organization_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  provider text;
  existing uuid;
  org_id uuid;
  loc_id uuid;
  email text;
  display_name text;
  org_name text;
  slug text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT billing_provider INTO provider FROM public.v2_platform_settings WHERE id = 1;
  IF coalesce(provider, 'fake') <> 'fake' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Self-serve setup is closed. Use your invite link.'
    );
  END IF;

  -- Already a member? Return active org.
  SELECT organization_id INTO existing
  FROM public.organization_memberships
  WHERE user_id = uid AND is_active = true
  ORDER BY created_at
  LIMIT 1;

  IF existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'organization_id', existing,
      'created', false
    );
  END IF;

  SELECT u.email INTO email FROM auth.users u WHERE u.id = uid;
  display_name := nullif(trim(coalesce(_full_name, '')), '');
  IF display_name IS NULL THEN
    display_name := split_part(coalesce(email, 'Owner'), '@', 1);
  END IF;

  org_name := nullif(trim(coalesce(_organization_name, '')), '');
  IF org_name IS NULL THEN
    org_name := display_name || '''s restaurant';
  END IF;

  slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  slug := trim(both '-' from slug);
  IF slug IS NULL OR length(slug) < 2 THEN
    slug := 'org-' || substr(uid::text, 1, 8);
  END IF;
  -- Ensure unique slug
  IF EXISTS (SELECT 1 FROM public.locations WHERE public_slug = slug) THEN
    slug := slug || '-' || substr(uid::text, 1, 4);
  END IF;

  INSERT INTO public.users (id, email, full_name)
  VALUES (uid, email, display_name)
  ON CONFLICT (id) DO UPDATE
    SET full_name = coalesce(EXCLUDED.full_name, public.users.full_name),
        email = coalesce(EXCLUDED.email, public.users.email);

  INSERT INTO public.organizations (name, timezone, currency, locale)
  VALUES (org_name, 'America/Toronto', 'CAD', 'fr-CA')
  RETURNING id INTO org_id;

  INSERT INTO public.locations (organization_id, name, public_slug, timezone, is_active)
  VALUES (org_id, 'Main', slug, 'America/Toronto', true)
  RETURNING id INTO loc_id;

  INSERT INTO public.organization_memberships (organization_id, user_id, role, is_active)
  VALUES (org_id, uid, 'owner', true);

  -- Fake wall default: active so wizard can run (billing_provider=fake).
  INSERT INTO public.subscriptions (organization_id, status, activated_via, plan_id)
  VALUES (org_id, 'active', 'fake_checkout', 'starter')
  ON CONFLICT (organization_id) DO UPDATE
    SET status = 'active', activated_via = 'fake_checkout', updated_at = now();

  INSERT INTO public.onboarding_progress (organization_id, current_step, completed_steps, draft)
  VALUES (org_id, 'welcome', ARRAY[]::text[], jsonb_build_object('full_name', display_name))
  ON CONFLICT (organization_id) DO NOTHING;

  INSERT INTO public.user_active_context (user_id, organization_id, location_id)
  VALUES (uid, org_id, loc_id)
  ON CONFLICT (user_id) DO UPDATE
    SET organization_id = EXCLUDED.organization_id,
        location_id = EXCLUDED.location_id,
        updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'created', true,
    'organization_id', org_id,
    'location_id', loc_id,
    'public_slug', slug
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_bootstrap_owner_org(text, text) TO authenticated;
