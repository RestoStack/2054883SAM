-- Super Admin platform overview + richer restaurant directory metrics.

DROP FUNCTION IF EXISTS public.v2_platform_list_restaurants();
DROP FUNCTION IF EXISTS public.v2_platform_overview();

CREATE OR REPLACE FUNCTION public.v2_platform_list_restaurants()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  city text,
  created_at timestamptz,
  owner_email text,
  owner_name text,
  staff_count bigint,
  guest_count bigint,
  booking_count bigint,
  waitlist_count bigint,
  order_count bigint,
  covers_booked bigint,
  revenue numeric,
  last_booking_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.name,
    r.slug,
    r.city,
    r.created_at,
    (
      SELECT u.email
      FROM public.v2_users u
      WHERE u.restaurant_id = r.id
        AND u.role = 'admin'
      ORDER BY u.created_at ASC
      LIMIT 1
    ) AS owner_email,
    (
      SELECT u.full_name
      FROM public.v2_users u
      WHERE u.restaurant_id = r.id
        AND u.role = 'admin'
      ORDER BY u.created_at ASC
      LIMIT 1
    ) AS owner_name,
    (SELECT count(*) FROM public.v2_users u WHERE u.restaurant_id = r.id) AS staff_count,
    (SELECT count(*) FROM public.v2_customers c WHERE c.restaurant_id = r.id) AS guest_count,
    (SELECT count(*) FROM public.v2_bookings b WHERE b.restaurant_id = r.id) AS booking_count,
    (SELECT count(*) FROM public.v2_waitlist w WHERE w.restaurant_id = r.id) AS waitlist_count,
    (SELECT count(*) FROM public.v2_orders o WHERE o.restaurant_id = r.id) AS order_count,
    (
      SELECT coalesce(sum(b.party_size), 0)
      FROM public.v2_bookings b
      WHERE b.restaurant_id = r.id
    ) AS covers_booked,
    (
      SELECT coalesce(sum(o.total), 0)
      FROM public.v2_orders o
      WHERE o.restaurant_id = r.id
    ) AS revenue,
    (
      SELECT max(b.created_at)
      FROM public.v2_bookings b
      WHERE b.restaurant_id = r.id
    ) AS last_booking_at
  FROM public.v2_restaurants r
  WHERE public.v2_is_platform_admin()
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.v2_platform_list_restaurants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.v2_platform_list_restaurants() TO authenticated;

CREATE OR REPLACE FUNCTION public.v2_platform_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.v2_is_platform_admin() THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'restaurants', (SELECT count(*)::int FROM public.v2_restaurants),
      'guests', (SELECT count(*)::int FROM public.v2_customers),
      'bookings', (SELECT count(*)::int FROM public.v2_bookings),
      'waitlist', (SELECT count(*)::int FROM public.v2_waitlist),
      'staff', (SELECT count(*)::int FROM public.v2_users),
      'orders', (SELECT count(*)::int FROM public.v2_orders),
      'covers', (SELECT coalesce(sum(party_size), 0)::int FROM public.v2_bookings),
      'revenue', (SELECT coalesce(sum(total), 0)::numeric FROM public.v2_orders),
      'active_restaurants_7d', (
        SELECT count(DISTINCT restaurant_id)::int
        FROM public.v2_bookings
        WHERE created_at >= now() - interval '7 days'
      )
    ),
    'last_7d', jsonb_build_object(
      'restaurants', (
        SELECT count(*)::int FROM public.v2_restaurants
        WHERE created_at >= now() - interval '7 days'
      ),
      'guests', (
        SELECT count(*)::int FROM public.v2_customers
        WHERE created_at >= now() - interval '7 days'
      ),
      'bookings', (
        SELECT count(*)::int FROM public.v2_bookings
        WHERE created_at >= now() - interval '7 days'
      ),
      'orders', (
        SELECT count(*)::int FROM public.v2_orders
        WHERE created_at >= now() - interval '7 days'
      ),
      'revenue', (
        SELECT coalesce(sum(total), 0)::numeric FROM public.v2_orders
        WHERE created_at >= now() - interval '7 days'
      )
    ),
    'last_30d', jsonb_build_object(
      'restaurants', (
        SELECT count(*)::int FROM public.v2_restaurants
        WHERE created_at >= now() - interval '30 days'
      ),
      'guests', (
        SELECT count(*)::int FROM public.v2_customers
        WHERE created_at >= now() - interval '30 days'
      ),
      'bookings', (
        SELECT count(*)::int FROM public.v2_bookings
        WHERE created_at >= now() - interval '30 days'
      ),
      'orders', (
        SELECT count(*)::int FROM public.v2_orders
        WHERE created_at >= now() - interval '30 days'
      ),
      'revenue', (
        SELECT coalesce(sum(total), 0)::numeric FROM public.v2_orders
        WHERE created_at >= now() - interval '30 days'
      )
    ),
    'booking_health', jsonb_build_object(
      'pending', (SELECT count(*)::int FROM public.v2_bookings WHERE status = 'pending'),
      'confirmed', (SELECT count(*)::int FROM public.v2_bookings WHERE status = 'confirmed'),
      'seated', (SELECT count(*)::int FROM public.v2_bookings WHERE status = 'seated'),
      'completed', (SELECT count(*)::int FROM public.v2_bookings WHERE status = 'completed'),
      'cancelled', (SELECT count(*)::int FROM public.v2_bookings WHERE status = 'cancelled'),
      'no_show', (SELECT count(*)::int FROM public.v2_bookings WHERE status = 'no_show')
    ),
    'booking_sources', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object('source', source, 'count', cnt)
          ORDER BY cnt DESC
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT source::text AS source, count(*)::int AS cnt
        FROM public.v2_bookings
        GROUP BY source
      ) s
    ),
    'signup_trend', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object('day', day, 'count', cnt)
          ORDER BY day
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT d::date AS day, count(r.id)::int AS cnt
        FROM generate_series(
          (current_date - interval '29 days')::date,
          current_date,
          interval '1 day'
        ) AS d
        LEFT JOIN public.v2_restaurants r
          ON r.created_at::date = d::date
        GROUP BY d::date
      ) t
    ),
    'booking_trend', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object('day', day, 'count', cnt)
          ORDER BY day
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT d::date AS day, count(b.id)::int AS cnt
        FROM generate_series(
          (current_date - interval '29 days')::date,
          current_date,
          interval '1 day'
        ) AS d
        LEFT JOIN public.v2_bookings b
          ON b.created_at::date = d::date
        GROUP BY d::date
      ) t
    ),
    'guest_trend', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object('day', day, 'count', cnt)
          ORDER BY day
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT d::date AS day, count(c.id)::int AS cnt
        FROM generate_series(
          (current_date - interval '29 days')::date,
          current_date,
          interval '1 day'
        ) AS d
        LEFT JOIN public.v2_customers c
          ON c.created_at::date = d::date
        GROUP BY d::date
      ) t
    ),
    'top_restaurants', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'slug', slug,
            'guest_count', guest_count,
            'booking_count', booking_count,
            'revenue', revenue,
            'created_at', created_at
          )
          ORDER BY guest_count DESC, booking_count DESC
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT
          r.id,
          r.name,
          r.slug,
          r.created_at,
          (SELECT count(*)::int FROM public.v2_customers c WHERE c.restaurant_id = r.id) AS guest_count,
          (SELECT count(*)::int FROM public.v2_bookings b WHERE b.restaurant_id = r.id) AS booking_count,
          (SELECT coalesce(sum(o.total), 0)::numeric FROM public.v2_orders o WHERE o.restaurant_id = r.id) AS revenue
        FROM public.v2_restaurants r
        ORDER BY guest_count DESC, booking_count DESC
        LIMIT 8
      ) top
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.v2_platform_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.v2_platform_overview() TO authenticated;
