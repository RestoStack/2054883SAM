-- Phase 0: private org-scoped storage.
-- Path contract: org/{organization_id}/... (see docs/DATA_MODEL.md).
-- Legacy public bucket `restaurant-media` remains for cutover; new uploads should use `org-media`.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-media',
  'org-media',
  false,
  20971520, -- 20MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Helpers: first path segment after bucket is "org", second is organization_id uuid.
CREATE OR REPLACE FUNCTION public.app_storage_org_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  parts text[];
  org_text text;
BEGIN
  parts := string_to_array(object_name, '/');
  IF array_length(parts, 1) < 2 THEN
    RETURN NULL;
  END IF;
  IF parts[1] <> 'org' THEN
    RETURN NULL;
  END IF;
  org_text := parts[2];
  BEGIN
    RETURN org_text::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

DROP POLICY IF EXISTS "org-media member select" ON storage.objects;
CREATE POLICY "org-media member select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'org-media'
    AND public.app_storage_org_id(name) IS NOT NULL
    AND public.app_storage_org_id(name) IN (SELECT public.app_user_org_ids())
  );

DROP POLICY IF EXISTS "org-media member insert" ON storage.objects;
CREATE POLICY "org-media member insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'org-media'
    AND public.app_storage_org_id(name) IS NOT NULL
    AND public.app_has_org_role(
      public.app_storage_org_id(name),
      ARRAY['owner', 'manager']
    )
  );

DROP POLICY IF EXISTS "org-media member update" ON storage.objects;
CREATE POLICY "org-media member update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'org-media'
    AND public.app_storage_org_id(name) IS NOT NULL
    AND public.app_has_org_role(
      public.app_storage_org_id(name),
      ARRAY['owner', 'manager']
    )
  )
  WITH CHECK (
    bucket_id = 'org-media'
    AND public.app_storage_org_id(name) IS NOT NULL
    AND public.app_has_org_role(
      public.app_storage_org_id(name),
      ARRAY['owner', 'manager']
    )
  );

DROP POLICY IF EXISTS "org-media member delete" ON storage.objects;
CREATE POLICY "org-media member delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'org-media'
    AND public.app_storage_org_id(name) IS NOT NULL
    AND public.app_has_org_role(
      public.app_storage_org_id(name),
      ARRAY['owner', 'manager']
    )
  );

-- No anon/public policies on org-media — use signed URLs from the app.
GRANT EXECUTE ON FUNCTION public.app_storage_org_id(text) TO authenticated;
