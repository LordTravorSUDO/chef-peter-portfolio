-- =============================================================================
-- Migration: Storage access policies for the `article-media` bucket
-- =============================================================================
-- Purpose
--   Allow ACTIVE CMS ADMINISTRATORS to upload, update, read (via the API) and
--   delete objects in the `article-media` bucket. Nobody else can write.
--
-- Background
--   storage.objects has row-level security enabled and, before this migration,
--   had NO policies at all, so every upload was rejected with
--   "new row violates row-level security policy".
--
-- Permission model (bucket `article-media` only)
--   | Operation                         | Public visitors | Non-admin users | Active admins |
--   |-----------------------------------|-----------------|-----------------|---------------|
--   | View images (public URL)          | allowed         | allowed         | allowed       |
--   | Read/list objects via Storage API | denied          | denied          | allowed       |
--   | Upload (INSERT)                   | denied          | denied          | allowed       |
--   | Update / move (UPDATE)            | denied          | denied          | allowed       |
--   | Delete (DELETE)                   | denied          | denied          | allowed       |
--
--   * Public image viewing is unaffected: the bucket is public, and Supabase
--     serves /storage/v1/object/public/... without consulting these policies.
--     No anonymous SELECT policy is added, so the bucket cannot be listed
--     anonymously.
--   * The admin SELECT policy is required because the Storage API reads the
--     row before deleting or moving it (e.g. media deletion and the upload
--     rollback in src/lib/services/media.ts).
--   * Administrator check: public.is_admin() — SECURITY DEFINER, STABLE,
--     search_path pinned; true only when profiles.id = auth.uid() AND
--     role = 'admin' AND is_active. Wrapped in (SELECT ...) so it is
--     evaluated once per statement rather than once per row.
--   * Every policy is restricted to bucket_id = 'article-media'; the UPDATE
--     policy checks the bucket in both USING (rows that may be targeted) and
--     WITH CHECK (the resulting row), so objects cannot be moved into, or
--     modified in, any other bucket (including the separate "Article Media").
--
-- Scope / safety
--   * Creates four new policies on storage.objects. Drops ONLY policies with
--     these exact names (idempotent re-run). No other policy, table, bucket,
--     object, or record is touched. Bucket visibility is not changed.
--
-- Verification: supabase/tests/storage_article_media_policies.sql
-- =============================================================================

DROP POLICY IF EXISTS "article_media_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "article_media_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "article_media_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "article_media_admin_delete" ON storage.objects;

CREATE POLICY "article_media_admin_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'article-media'
    AND (SELECT public.is_admin())
  );

CREATE POLICY "article_media_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'article-media'
    AND (SELECT public.is_admin())
  );

CREATE POLICY "article_media_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'article-media'
    AND (SELECT public.is_admin())
  )
  WITH CHECK (
    bucket_id = 'article-media'
    AND (SELECT public.is_admin())
  );

CREATE POLICY "article_media_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'article-media'
    AND (SELECT public.is_admin())
  );
