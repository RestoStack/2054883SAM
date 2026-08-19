-- Phase 3: Host Stand — table status/layout + seat/unseat/complete RPCs.
-- Dual-writes to v2_tables / v2_bookings when legacy_restaurant_id is set.

-- ========== tables: layout + live status ==========
ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'square'
    CHECK (shape IN ('round', 'square', 'rectangle')),
  ADD COLUMN IF NOT EXISTS position_x int,
  ADD COLUMN IF NOT EXISTS position_y int,
  ADD COLUMN IF NOT EXISTS width int,
  ADD COLUMN IF NOT EXISTS height int,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning', 'blocked')),
  ADD COLUMN IF NOT EXISTS current_reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS tables_location_status_idx
  ON public.tables (location_id, status);

-- Best-effort layout backfill from v2_tables
UPDATE public.tables t
SET
  shape = coalesce(vt.shape::text, t.shape),
  position_x = vt.position_x,
  position_y = vt.position_y,
  width = vt.width,
  height = vt.height,
  status = CASE
    WHEN vt.status::text = 'occupied' THEN 'occupied'
    WHEN vt.status::text = 'cleaning' THEN 'cleaning'
    WHEN vt.status::text = 'reserved' THEN 'reserved'
    ELSE 'available'
  END,
  updated_at = now()
FROM public.locations l
JOIN public.v2_tables vt ON vt.restaurant_id = l.legacy_restaurant_id
WHERE t.location_id = l.id
  AND t.table_number = vt.table_number
  AND l.legacy_restaurant_id IS NOT NULL;

-- ========== host role helper ==========
CREATE OR REPLACE FUNCTION public.app_host_require(_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager','host']) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
END;
$$;

-- ========== list floor snapshot ==========
CREATE OR REPLACE FUNCTION public.app_host_list_floor(
  _organization_id uuid,
  _location_id uuid,
  _date date DEFAULT (now() AT TIME ZONE 'America/Toronto')::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tables_json jsonb;
  reservations_json jsonb;
BEGIN
  PERFORM public.app_host_require(_organization_id);
  IF NOT EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = _location_id AND organization_id = _organization_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location not found');
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.sort_order, t.table_number), '[]'::jsonb)
  INTO tables_json
  FROM (
    SELECT
      id, table_number, section, capacity, shape,
      position_x, position_y, width, height,
      status, current_reservation_id, sort_order
    FROM public.tables
    WHERE organization_id = _organization_id AND location_id = _location_id
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.reserved_time), '[]'::jsonb)
  INTO reservations_json
  FROM (
    SELECT
      id, guest_name, guest_phone, guest_email, party_size,
      reserved_date, reserved_time, duration_minutes,
      section, table_id, table_number, status, source, notes
    FROM public.reservations
    WHERE organization_id = _organization_id
      AND location_id = _location_id
      AND reserved_date = _date
      AND status IN ('pending','confirmed','seated')
  ) r;

  RETURN jsonb_build_object(
    'ok', true,
    'date', _date,
    'tables', tables_json,
    'reservations', reservations_json
  );
END;
$$;

-- ========== seat reservation at table ==========
CREATE OR REPLACE FUNCTION public.app_host_seat(
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
  rid uuid;
BEGIN
  PERFORM public.app_host_require(_organization_id);

  SELECT * INTO res FROM public.reservations
  WHERE id = _reservation_id AND organization_id = _organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Reservation not found');
  END IF;
  IF res.status IN ('completed','cancelled','no_show') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Reservation is closed');
  END IF;

  SELECT * INTO tbl FROM public.tables
  WHERE id = _table_id AND organization_id = _organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Table not found');
  END IF;
  IF tbl.location_id <> res.location_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Table location mismatch');
  END IF;
  IF tbl.status = 'blocked' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Table is blocked');
  END IF;
  IF tbl.status = 'occupied'
     AND tbl.current_reservation_id IS NOT NULL
     AND tbl.current_reservation_id <> _reservation_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Table is occupied');
  END IF;

  -- Free previous table if moving
  IF res.table_id IS NOT NULL AND res.table_id <> _table_id THEN
    UPDATE public.tables
    SET status = 'available', current_reservation_id = NULL, updated_at = now()
    WHERE id = res.table_id
      AND organization_id = _organization_id
      AND (current_reservation_id = _reservation_id OR current_reservation_id IS NULL);
  END IF;

  UPDATE public.reservations
  SET
    status = 'seated',
    table_id = _table_id,
    table_number = tbl.table_number,
    section = coalesce(tbl.section, section),
    updated_at = now()
  WHERE id = _reservation_id;

  UPDATE public.tables
  SET
    status = 'occupied',
    current_reservation_id = _reservation_id,
    updated_at = now()
  WHERE id = _table_id;

  -- Dual-write legacy
  SELECT legacy_restaurant_id INTO rid FROM public.locations WHERE id = res.location_id;
  IF rid IS NOT NULL THEN
    IF res.legacy_booking_id IS NOT NULL THEN
      UPDATE public.v2_bookings
      SET status = 'seated', table_number = tbl.table_number
      WHERE id = res.legacy_booking_id AND restaurant_id = rid;
    END IF;
    UPDATE public.v2_tables
    SET status = 'occupied', current_booking_id = res.legacy_booking_id
    WHERE restaurant_id = rid AND table_number = tbl.table_number;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'reservation_id', _reservation_id,
    'table_id', _table_id,
    'table_number', tbl.table_number
  );
END;
$$;

-- ========== unseat / clear table (reservation stays confirmed unless completing) ==========
CREATE OR REPLACE FUNCTION public.app_host_unseat(
  _organization_id uuid,
  _reservation_id uuid,
  _complete boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations%ROWTYPE;
  rid uuid;
  tnum text;
BEGIN
  PERFORM public.app_host_require(_organization_id);

  SELECT * INTO res FROM public.reservations
  WHERE id = _reservation_id AND organization_id = _organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Reservation not found');
  END IF;

  tnum := res.table_number;

  IF res.table_id IS NOT NULL THEN
    UPDATE public.tables
    SET
      status = CASE WHEN _complete THEN 'cleaning' ELSE 'available' END,
      current_reservation_id = NULL,
      updated_at = now()
    WHERE id = res.table_id AND organization_id = _organization_id;
  END IF;

  UPDATE public.reservations
  SET
    status = CASE WHEN _complete THEN 'completed' ELSE 'confirmed' END,
    table_id = CASE WHEN _complete THEN table_id ELSE NULL END,
    table_number = CASE WHEN _complete THEN table_number ELSE NULL END,
    updated_at = now()
  WHERE id = _reservation_id;

  SELECT legacy_restaurant_id INTO rid FROM public.locations WHERE id = res.location_id;
  IF rid IS NOT NULL THEN
    IF res.legacy_booking_id IS NOT NULL THEN
      UPDATE public.v2_bookings
      SET
        status = CASE WHEN _complete THEN 'completed' ELSE 'confirmed' END,
        table_number = CASE WHEN _complete THEN table_number ELSE NULL END
      WHERE id = res.legacy_booking_id AND restaurant_id = rid;
    END IF;
    IF tnum IS NOT NULL THEN
      UPDATE public.v2_tables
      SET
        status = CASE WHEN _complete THEN 'cleaning' ELSE 'available' END,
        current_booking_id = NULL
      WHERE restaurant_id = rid AND table_number = tnum;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'reservation_id', _reservation_id, 'completed', _complete);
END;
$$;

-- ========== set table status (cleaning / available / blocked) ==========
CREATE OR REPLACE FUNCTION public.app_host_set_table_status(
  _organization_id uuid,
  _table_id uuid,
  _status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tbl public.tables%ROWTYPE;
  rid uuid;
BEGIN
  PERFORM public.app_host_require(_organization_id);
  IF _status NOT IN ('available', 'cleaning', 'blocked') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid status');
  END IF;

  SELECT * INTO tbl FROM public.tables
  WHERE id = _table_id AND organization_id = _organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Table not found');
  END IF;

  IF tbl.status = 'occupied' AND _status <> 'available' THEN
    -- Allow force-clear to cleaning after complete; block only when occupied with active guest
    IF _status = 'blocked' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Unseat guests before blocking');
    END IF;
  END IF;

  UPDATE public.tables
  SET
    status = _status,
    current_reservation_id = CASE WHEN _status = 'available' THEN NULL ELSE current_reservation_id END,
    updated_at = now()
  WHERE id = _table_id;

  SELECT legacy_restaurant_id INTO rid FROM public.locations WHERE id = tbl.location_id;
  IF rid IS NOT NULL THEN
    UPDATE public.v2_tables
    SET
      status = CASE
        WHEN _status = 'blocked' THEN 'cleaning'
        ELSE _status::public.v2_table_status
      END,
      current_booking_id = CASE WHEN _status = 'available' THEN NULL ELSE current_booking_id END
    WHERE restaurant_id = rid AND table_number = tbl.table_number;
  END IF;

  RETURN jsonb_build_object('ok', true, 'table_id', _table_id, 'status', _status);
END;
$$;

-- ========== save table layout positions ==========
CREATE OR REPLACE FUNCTION public.app_host_save_table_layout(
  _organization_id uuid,
  _location_id uuid,
  _items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  tid uuid;
BEGIN
  PERFORM public.app_host_require(_organization_id);
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Manager only');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = _location_id AND organization_id = _organization_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location not found');
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    tid := (item->>'id')::uuid;
    UPDATE public.tables
    SET
      position_x = (item->>'position_x')::int,
      position_y = (item->>'position_y')::int,
      width = coalesce((item->>'width')::int, width),
      height = coalesce((item->>'height')::int, height),
      shape = coalesce(nullif(item->>'shape', ''), shape),
      updated_at = now()
    WHERE id = tid
      AND organization_id = _organization_id
      AND location_id = _location_id;
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ========== walk-in: accept table_id and mark occupied ==========
DROP FUNCTION IF EXISTS public.app_create_walk_in(uuid, uuid, text, int, text, text);

CREATE OR REPLACE FUNCTION public.app_create_walk_in(
  _organization_id uuid,
  _location_id uuid,
  _guest_name text,
  _party_size int,
  _table_number text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _table_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res_id uuid;
  legacy_id uuid;
  rid uuid;
  tbl public.tables%ROWTYPE;
  tnum text := nullif(trim(coalesce(_table_number, '')), '');
BEGIN
  IF NOT public.app_has_org_role(_organization_id, ARRAY['owner','manager','host']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.locations WHERE id = _location_id AND organization_id = _organization_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location not found');
  END IF;

  IF _table_id IS NOT NULL THEN
    SELECT * INTO tbl FROM public.tables
    WHERE id = _table_id AND organization_id = _organization_id AND location_id = _location_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Table not found');
    END IF;
    IF tbl.status IN ('occupied', 'blocked') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Table unavailable');
    END IF;
    tnum := tbl.table_number;
  ELSIF tnum IS NOT NULL THEN
    SELECT * INTO tbl FROM public.tables
    WHERE organization_id = _organization_id
      AND location_id = _location_id
      AND table_number = tnum
    LIMIT 1;
  END IF;

  INSERT INTO public.reservations (
    organization_id, location_id, guest_name, party_size,
    reserved_date, reserved_time, table_id, table_number, notes, status, source
  ) VALUES (
    _organization_id, _location_id, trim(_guest_name), _party_size,
    (now() AT TIME ZONE 'America/Toronto')::date,
    (now() AT TIME ZONE 'America/Toronto')::time,
    tbl.id, tnum, nullif(trim(coalesce(_notes, '')), ''),
    'seated', 'walk_in'
  )
  RETURNING id INTO res_id;

  IF tbl.id IS NOT NULL THEN
    UPDATE public.tables
    SET status = 'occupied', current_reservation_id = res_id, updated_at = now()
    WHERE id = tbl.id;
  END IF;

  SELECT legacy_restaurant_id INTO rid FROM public.locations WHERE id = _location_id;
  IF rid IS NOT NULL THEN
    INSERT INTO public.v2_bookings (
      restaurant_id, guest_name, party_size, date, time, table_number, notes, status, source
    ) VALUES (
      rid, trim(_guest_name), _party_size,
      (now() AT TIME ZONE 'America/Toronto')::date,
      (now() AT TIME ZONE 'America/Toronto')::time,
      tnum, nullif(trim(coalesce(_notes, '')), ''),
      'seated', 'walk_in'
    )
    RETURNING id INTO legacy_id;
    UPDATE public.reservations SET legacy_booking_id = legacy_id WHERE id = res_id;
    IF tnum IS NOT NULL THEN
      UPDATE public.v2_tables
      SET status = 'occupied', current_booking_id = legacy_id
      WHERE restaurant_id = rid AND table_number = tnum;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'reservation_id', res_id, 'table_id', tbl.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_host_require(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_host_list_floor(uuid, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_host_seat(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_host_unseat(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_host_set_table_status(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_host_save_table_layout(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_walk_in(uuid, uuid, text, int, text, text, uuid) TO authenticated;
