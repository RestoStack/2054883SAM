-- Phase 4: Guest CRM — stats triggers, notes, tags, merge, anonymize, segments.

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS marketing_opt_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- ========== guest_location_stats ==========
CREATE TABLE IF NOT EXISTS public.guest_location_stats (
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  visits int NOT NULL DEFAULT 0,
  no_shows int NOT NULL DEFAULT 0,
  cancellations int NOT NULL DEFAULT 0,
  first_visit date,
  last_visit date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, location_id)
);

ALTER TABLE public.guest_location_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS guest_location_stats_member ON public.guest_location_stats;
CREATE POLICY guest_location_stats_member ON public.guest_location_stats
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.app_user_org_ids()));

-- ========== guest_notes ==========
CREATE TABLE IF NOT EXISTS public.guest_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  author_user_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS guest_notes_member ON public.guest_notes;
CREATE POLICY guest_notes_member ON public.guest_notes
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.app_user_org_ids()));

-- ========== tag_catalog + guest_tags ==========
CREATE TABLE IF NOT EXISTS public.tag_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#64748b',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

ALTER TABLE public.tag_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tag_catalog_member ON public.tag_catalog;
CREATE POLICY tag_catalog_member ON public.tag_catalog
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (public.app_has_org_role(organization_id, ARRAY['owner','manager']));

CREATE TABLE IF NOT EXISTS public.guest_tags (
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tag_catalog(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, tag_id)
);

ALTER TABLE public.guest_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS guest_tags_member ON public.guest_tags;
CREATE POLICY guest_tags_member ON public.guest_tags
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.app_user_org_ids()));

-- ========== saved segments ==========
CREATE TABLE IF NOT EXISTS public.guest_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, name)
);

ALTER TABLE public.guest_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS guest_segments_owner ON public.guest_segments;
CREATE POLICY guest_segments_owner ON public.guest_segments
  FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT public.app_user_org_ids())
    AND user_id = auth.uid()
  )
  WITH CHECK (
    organization_id IN (SELECT public.app_user_org_ids())
    AND user_id = auth.uid()
  );

-- ========== stats trigger on reservations ==========
CREATE OR REPLACE FUNCTION public.trg_guest_stats_from_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gid uuid;
  lid uuid;
  oid uuid;
BEGIN
  gid := coalesce(NEW.guest_id, OLD.guest_id);
  lid := coalesce(NEW.location_id, OLD.location_id);
  oid := coalesce(NEW.organization_id, OLD.organization_id);
  IF gid IS NULL OR lid IS NULL THEN
    RETURN coalesce(NEW, OLD);
  END IF;

  INSERT INTO public.guest_location_stats (guest_id, location_id, organization_id)
  VALUES (gid, lid, oid)
  ON CONFLICT (guest_id, location_id) DO NOTHING;

  UPDATE public.guest_location_stats s
  SET
    visits = (
      SELECT count(*)::int FROM public.reservations r
      WHERE r.guest_id = gid AND r.location_id = lid
        AND r.status IN ('completed','seated','confirmed')
        AND r.anonymized IS DISTINCT FROM true
    ),
    no_shows = (
      SELECT count(*)::int FROM public.reservations r
      WHERE r.guest_id = gid AND r.location_id = lid AND r.status = 'no_show'
    ),
    cancellations = (
      SELECT count(*)::int FROM public.reservations r
      WHERE r.guest_id = gid AND r.location_id = lid AND r.status = 'cancelled'
    ),
    first_visit = (
      SELECT min(reserved_date) FROM public.reservations r
      WHERE r.guest_id = gid AND r.location_id = lid
        AND r.status IN ('completed','seated','confirmed')
    ),
    last_visit = (
      SELECT max(reserved_date) FROM public.reservations r
      WHERE r.guest_id = gid AND r.location_id = lid
        AND r.status IN ('completed','seated','confirmed')
    ),
    updated_at = now()
  WHERE s.guest_id = gid AND s.location_id = lid;

  RETURN coalesce(NEW, OLD);
END;
$$;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS anonymized boolean NOT NULL DEFAULT false;

DROP TRIGGER IF EXISTS reservations_guest_stats ON public.reservations;
CREATE TRIGGER reservations_guest_stats
  AFTER INSERT OR UPDATE OF status, guest_id, location_id OR DELETE
  ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.trg_guest_stats_from_reservation();

-- ========== merge duplicates (owner/manager) ==========
CREATE OR REPLACE FUNCTION public.app_merge_guests(
  _organization_id uuid,
  _keep_guest_id uuid,
  _merge_guest_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;
  IF _keep_guest_id = _merge_guest_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Same guest');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guests WHERE id = _keep_guest_id AND organization_id = _organization_id AND anonymized_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.guests WHERE id = _merge_guest_id AND organization_id = _organization_id AND anonymized_at IS NULL
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Guest not found');
  END IF;

  UPDATE public.reservations SET guest_id = _keep_guest_id WHERE guest_id = _merge_guest_id AND organization_id = _organization_id;
  UPDATE public.guest_notes SET guest_id = _keep_guest_id WHERE guest_id = _merge_guest_id AND organization_id = _organization_id;
  INSERT INTO public.guest_tags (guest_id, tag_id, organization_id)
  SELECT _keep_guest_id, tag_id, organization_id FROM public.guest_tags
  WHERE guest_id = _merge_guest_id
  ON CONFLICT DO NOTHING;
  DELETE FROM public.guest_tags WHERE guest_id = _merge_guest_id;
  DELETE FROM public.guest_location_stats WHERE guest_id = _merge_guest_id;
  DELETE FROM public.guests WHERE id = _merge_guest_id AND organization_id = _organization_id;

  -- Refresh keep stats via noop update
  UPDATE public.reservations SET updated_at = now()
  WHERE guest_id = _keep_guest_id AND organization_id = _organization_id;

  RETURN jsonb_build_object('ok', true, 'keep_guest_id', _keep_guest_id);
END;
$$;

-- ========== owner-only anonymize ==========
CREATE OR REPLACE FUNCTION public.app_anonymize_guest(
  _organization_id uuid,
  _guest_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Owner only');
  END IF;

  UPDATE public.guests
  SET
    full_name = 'Deleted Guest',
    email = NULL,
    phone = NULL,
    phone_e164 = NULL,
    email_normalized = NULL,
    notes = NULL,
    marketing_opt_in = false,
    marketing_opt_in_at = NULL,
    marketing_opt_out_at = now(),
    anonymized_at = now(),
    updated_at = now()
  WHERE id = _guest_id AND organization_id = _organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not found');
  END IF;

  UPDATE public.reservations
  SET
    guest_name = 'Deleted Guest',
    guest_email = NULL,
    guest_phone = NULL,
    notes = NULL,
    anonymized = true,
    updated_at = now()
  WHERE guest_id = _guest_id AND organization_id = _organization_id;

  DELETE FROM public.guest_notes WHERE guest_id = _guest_id AND organization_id = _organization_id;
  DELETE FROM public.guest_tags WHERE guest_id = _guest_id AND organization_id = _organization_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_merge_guests(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_anonymize_guest(uuid, uuid) TO authenticated;
