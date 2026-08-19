-- Phase 3: Host Stand staff RPC aliases + realtime publication for location channels.

-- Aliases matching DATA_MODEL staff_* names
CREATE OR REPLACE FUNCTION public.staff_seat_reservation(
  _organization_id uuid,
  _reservation_id uuid,
  _table_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_host_seat(_organization_id, _reservation_id, _table_id);
$$;

CREATE OR REPLACE FUNCTION public.staff_unseat_reservation(
  _organization_id uuid,
  _reservation_id uuid,
  _complete boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_host_unseat(_organization_id, _reservation_id, _complete);
$$;

CREATE OR REPLACE FUNCTION public.staff_create_walk_in(
  _organization_id uuid,
  _location_id uuid,
  _guest_name text,
  _party_size int,
  _table_number text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _table_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_create_walk_in(
    _organization_id, _location_id, _guest_name, _party_size,
    _table_number, _notes, _table_id
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_mark_no_show(
  _organization_id uuid,
  _reservation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations%ROWTYPE;
BEGIN
  PERFORM public.app_host_require(_organization_id);
  SELECT * INTO res FROM public.reservations
  WHERE id = _reservation_id AND organization_id = _organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not found');
  END IF;

  IF res.table_id IS NOT NULL THEN
    UPDATE public.tables
    SET status = 'available', current_reservation_id = NULL, updated_at = now()
    WHERE id = res.table_id AND organization_id = _organization_id;
  END IF;

  UPDATE public.reservations
  SET status = 'no_show', updated_at = now()
  WHERE id = _reservation_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_assign_table(
  _organization_id uuid,
  _reservation_id uuid,
  _table_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations%ROWTYPE;
  tbl public.tables%ROWTYPE;
BEGIN
  PERFORM public.app_host_require(_organization_id);
  SELECT * INTO res FROM public.reservations
  WHERE id = _reservation_id AND organization_id = _organization_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Reservation not found');
  END IF;
  SELECT * INTO tbl FROM public.tables
  WHERE id = _table_id AND organization_id = _organization_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Table not found');
  END IF;
  IF tbl.location_id <> res.location_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location mismatch');
  END IF;

  UPDATE public.reservations
  SET table_id = _table_id, table_number = tbl.table_number, section = coalesce(tbl.section, section), updated_at = now()
  WHERE id = _reservation_id;

  IF tbl.status = 'available' THEN
    UPDATE public.tables SET status = 'reserved', updated_at = now() WHERE id = _table_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'table_number', tbl.table_number);
END;
$$;

-- Dirty synonym for cleaning
-- (status already includes cleaning; UI maps dirty → cleaning)

GRANT EXECUTE ON FUNCTION public.staff_seat_reservation(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_unseat_reservation(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_create_walk_in(uuid, uuid, text, int, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_mark_no_show(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_assign_table(uuid, uuid, uuid) TO authenticated;

-- Realtime: publish tables + reservations (filtered by location_id in client channel)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.tables REPLICA IDENTITY FULL;
ALTER TABLE public.reservations REPLICA IDENTITY FULL;
