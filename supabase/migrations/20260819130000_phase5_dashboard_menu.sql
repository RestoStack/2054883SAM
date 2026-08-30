-- Phase 5: reservation_daily_stats rollup, get_dashboard, menu_assets, reports presets.

CREATE TABLE IF NOT EXISTS public.reservation_daily_stats (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  on_date date NOT NULL,
  source text NOT NULL DEFAULT 'public',
  reservations_count int NOT NULL DEFAULT 0,
  covers int NOT NULL DEFAULT 0,
  seated_count int NOT NULL DEFAULT 0,
  completed_count int NOT NULL DEFAULT 0,
  cancelled_count int NOT NULL DEFAULT 0,
  no_show_count int NOT NULL DEFAULT 0,
  walk_in_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (location_id, on_date, source)
);

CREATE INDEX IF NOT EXISTS reservation_daily_stats_org_date_idx
  ON public.reservation_daily_stats (organization_id, on_date);

ALTER TABLE public.reservation_daily_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reservation_daily_stats_member ON public.reservation_daily_stats;
CREATE POLICY reservation_daily_stats_member ON public.reservation_daily_stats
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()));

CREATE OR REPLACE FUNCTION public.refresh_reservation_daily_stats(
  _organization_id uuid,
  _location_id uuid,
  _date date,
  _source text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.reservation_daily_stats AS s (
    organization_id, location_id, on_date, source,
    reservations_count, covers, seated_count, completed_count,
    cancelled_count, no_show_count, walk_in_count, updated_at
  )
  SELECT
    _organization_id, _location_id, _date, _source,
    count(*)::int,
    coalesce(sum(party_size), 0)::int,
    count(*) FILTER (WHERE status = 'seated')::int,
    count(*) FILTER (WHERE status = 'completed')::int,
    count(*) FILTER (WHERE status = 'cancelled')::int,
    count(*) FILTER (WHERE status = 'no_show')::int,
    count(*) FILTER (WHERE source = 'walk_in')::int,
    now()
  FROM public.reservations
  WHERE organization_id = _organization_id
    AND location_id = _location_id
    AND reserved_date = _date
    AND source = _source
  ON CONFLICT (location_id, on_date, source) DO UPDATE
  SET
    reservations_count = EXCLUDED.reservations_count,
    covers = EXCLUDED.covers,
    seated_count = EXCLUDED.seated_count,
    completed_count = EXCLUDED.completed_count,
    cancelled_count = EXCLUDED.cancelled_count,
    no_show_count = EXCLUDED.no_show_count,
    walk_in_count = EXCLUDED.walk_in_count,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_refresh_daily_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_reservation_daily_stats(OLD.organization_id, OLD.location_id, OLD.reserved_date, OLD.source);
    RETURN OLD;
  END IF;
  PERFORM public.refresh_reservation_daily_stats(NEW.organization_id, NEW.location_id, NEW.reserved_date, NEW.source);
  IF TG_OP = 'UPDATE' AND (
    OLD.reserved_date IS DISTINCT FROM NEW.reserved_date
    OR OLD.source IS DISTINCT FROM NEW.source
    OR OLD.location_id IS DISTINCT FROM NEW.location_id
  ) THEN
    PERFORM public.refresh_reservation_daily_stats(OLD.organization_id, OLD.location_id, OLD.reserved_date, OLD.source);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_daily_stats ON public.reservations;
CREATE TRIGGER reservations_daily_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_daily_stats();

-- ========== get_dashboard ==========
CREATE OR REPLACE FUNCTION public.get_dashboard(
  _organization_id uuid,
  _location_id uuid,
  _from date,
  _to date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_res int := 0;
  total_covers int := 0;
  no_shows int := 0;
  cancels int := 0;
  walk_ins int := 0;
  booked int := 0;
  seats_per numeric := 0;
  no_show_rate numeric := 0;
  occupancy numeric := 0;
  capacity int := 0;
  trend jsonb := '[]'::jsonb;
  source_mix jsonb := '[]'::jsonb;
  by_hour jsonb := '[]'::jsonb;
  daypart_cap int;
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager','host']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;

  SELECT
    coalesce(sum(reservations_count), 0),
    coalesce(sum(covers), 0),
    coalesce(sum(no_show_count), 0),
    coalesce(sum(cancelled_count), 0),
    coalesce(sum(walk_in_count), 0)
  INTO total_res, total_covers, no_shows, cancels, walk_ins
  FROM public.reservation_daily_stats
  WHERE organization_id = _organization_id
    AND (_location_id IS NULL OR location_id = _location_id)
    AND on_date BETWEEN _from AND _to;

  booked := greatest(0, total_res - walk_ins);
  seats_per := CASE WHEN total_res > 0 THEN round(total_covers::numeric / total_res, 2) ELSE 0 END;
  no_show_rate := CASE WHEN total_res > 0 THEN round(100.0 * no_shows / total_res, 1) ELSE 0 END;

  SELECT coalesce(sum(coalesce(capacity_max, capacity)), 40) INTO capacity
  FROM public.tables
  WHERE organization_id = _organization_id
    AND (_location_id IS NULL OR location_id = _location_id)
    AND status <> 'blocked';

  -- Occupancy next service ≈ today's confirmed+seated covers / capacity
  SELECT coalesce(sum(party_size), 0) INTO daypart_cap
  FROM public.reservations
  WHERE organization_id = _organization_id
    AND (_location_id IS NULL OR location_id = _location_id)
    AND reserved_date = (now() AT TIME ZONE 'America/Toronto')::date
    AND status IN ('pending','confirmed','seated');
  occupancy := CASE WHEN capacity > 0 THEN round(100.0 * least(daypart_cap, capacity) / capacity, 1) ELSE 0 END;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.on_date), '[]'::jsonb)
  INTO trend
  FROM (
    SELECT on_date,
      sum(reservations_count)::int AS reservations,
      sum(covers)::int AS covers
    FROM public.reservation_daily_stats
    WHERE organization_id = _organization_id
      AND (_location_id IS NULL OR location_id = _location_id)
      AND on_date BETWEEN _from AND _to
    GROUP BY on_date
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO source_mix
  FROM (
    SELECT source, sum(reservations_count)::int AS count, sum(covers)::int AS covers
    FROM public.reservation_daily_stats
    WHERE organization_id = _organization_id
      AND (_location_id IS NULL OR location_id = _location_id)
      AND on_date BETWEEN _from AND _to
    GROUP BY source
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.hour), '[]'::jsonb)
  INTO by_hour
  FROM (
    SELECT EXTRACT(HOUR FROM reserved_time)::int AS hour,
      count(*)::int AS reservations,
      sum(party_size)::int AS covers
    FROM public.reservations
    WHERE organization_id = _organization_id
      AND (_location_id IS NULL OR location_id = _location_id)
      AND reserved_date BETWEEN _from AND _to
      AND status NOT IN ('cancelled')
    GROUP BY 1
  ) t;

  RETURN jsonb_build_object(
    'ok', true,
    'kpis', jsonb_build_object(
      'reservations', total_res,
      'seats', total_covers,
      'seats_per_reservation', seats_per,
      'no_show_rate', no_show_rate,
      'cancellations', cancels,
      'occupancy_next_service', occupancy,
      'walk_ins', walk_ins,
      'booked', booked
    ),
    'trend', trend,
    'source_mix', source_mix,
    'by_hour', by_hour,
    'from', _from,
    'to', _to
  );
END;
$$;

-- ========== report_presets ==========
CREATE TABLE IF NOT EXISTS public.report_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, name)
);

ALTER TABLE public.report_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_presets_owner ON public.report_presets;
CREATE POLICY report_presets_owner ON public.report_presets
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()) AND user_id = auth.uid())
  WITH CHECK (organization_id IN (SELECT public.app_user_org_ids()) AND user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.reports_reservation_metrics(
  _organization_id uuid,
  _location_id uuid,
  _from date,
  _to date,
  _group_by text DEFAULT 'day'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows jsonb;
  prev_from date;
  prev_to date;
  span int;
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;

  span := greatest(1, (_to - _from));
  prev_to := _from - 1;
  prev_from := prev_to - span;

  IF _group_by = 'source' THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO rows FROM (
      SELECT source AS bucket,
        sum(reservations_count)::int AS reservations,
        sum(covers)::int AS covers,
        sum(no_show_count)::int AS no_shows
      FROM public.reservation_daily_stats
      WHERE organization_id = _organization_id
        AND (_location_id IS NULL OR location_id = _location_id)
        AND on_date BETWEEN _from AND _to
      GROUP BY source
    ) t;
  ELSIF _group_by = 'location' THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO rows FROM (
      SELECT location_id::text AS bucket,
        sum(reservations_count)::int AS reservations,
        sum(covers)::int AS covers,
        sum(no_show_count)::int AS no_shows
      FROM public.reservation_daily_stats
      WHERE organization_id = _organization_id
        AND (_location_id IS NULL OR location_id = _location_id)
        AND on_date BETWEEN _from AND _to
      GROUP BY location_id
    ) t;
  ELSIF _group_by = 'week' THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.bucket), '[]'::jsonb) INTO rows FROM (
      SELECT to_char(date_trunc('week', on_date), 'YYYY-MM-DD') AS bucket,
        sum(reservations_count)::int AS reservations,
        sum(covers)::int AS covers,
        sum(no_show_count)::int AS no_shows
      FROM public.reservation_daily_stats
      WHERE organization_id = _organization_id
        AND (_location_id IS NULL OR location_id = _location_id)
        AND on_date BETWEEN _from AND _to
      GROUP BY 1
    ) t;
  ELSIF _group_by = 'month' THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.bucket), '[]'::jsonb) INTO rows FROM (
      SELECT to_char(date_trunc('month', on_date), 'YYYY-MM') AS bucket,
        sum(reservations_count)::int AS reservations,
        sum(covers)::int AS covers,
        sum(no_show_count)::int AS no_shows
      FROM public.reservation_daily_stats
      WHERE organization_id = _organization_id
        AND (_location_id IS NULL OR location_id = _location_id)
        AND on_date BETWEEN _from AND _to
      GROUP BY 1
    ) t;
  ELSE
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.bucket), '[]'::jsonb) INTO rows FROM (
      SELECT on_date::text AS bucket,
        sum(reservations_count)::int AS reservations,
        sum(covers)::int AS covers,
        sum(no_show_count)::int AS no_shows
      FROM public.reservation_daily_stats
      WHERE organization_id = _organization_id
        AND (_location_id IS NULL OR location_id = _location_id)
        AND on_date BETWEEN _from AND _to
      GROUP BY on_date
    ) t;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'rows', rows,
    'prior_from', prev_from,
    'prior_to', prev_to,
    'group_by', _group_by
  );
END;
$$;

-- ========== menu_assets ==========
CREATE TABLE IF NOT EXISTS public.menu_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  byte_size int NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_assets_location_idx ON public.menu_assets (location_id, sort_order);

ALTER TABLE public.menu_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS menu_assets_member ON public.menu_assets;
CREATE POLICY menu_assets_member ON public.menu_assets
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.app_user_org_ids()))
  WITH CHECK (public.app_has_org_role(organization_id, ARRAY['owner','manager']));

-- Storage bucket menus (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menus', 'menus', false, 10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/jpg']
)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 10485760;

DROP POLICY IF EXISTS menus_select ON storage.objects;
CREATE POLICY menus_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'menus'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM public.organization_memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS menus_insert ON storage.objects;
CREATE POLICY menus_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'menus'
    AND (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.is_active
        AND om.role IN ('owner','manager')
    )
  );

DROP POLICY IF EXISTS menus_delete ON storage.objects;
CREATE POLICY menus_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'menus'
    AND (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.is_active
        AND om.role IN ('owner','manager')
    )
  );

CREATE OR REPLACE FUNCTION public.public_get_menu_assets(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loc RECORD;
  assets jsonb;
BEGIN
  SELECT * INTO loc FROM public.app_resolve_bookable_slug(_slug) LIMIT 1;
  IF loc.location_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not found');
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'file_name', file_name,
    'mime_type', mime_type,
    'storage_path', storage_path,
    'is_active', is_active,
    'sort_order', sort_order
  ) ORDER BY sort_order, created_at), '[]'::jsonb)
  INTO assets
  FROM public.menu_assets
  WHERE location_id = loc.location_id AND is_active = true;
  RETURN jsonb_build_object('ok', true, 'assets', assets);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard(uuid, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reports_reservation_metrics(uuid, uuid, date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_menu_assets(text) TO anon, authenticated;
