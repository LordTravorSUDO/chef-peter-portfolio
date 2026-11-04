-- =============================================================================
-- Migration: CMS image storage — bucket settings + admin-only access policies
-- =============================================================================
-- Run AFTER all previous migrations (needs public.is_admin() and public.media).
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run. Safe to re-run.
--
-- What it does
--   1. Ensures the CMS image bucket exists with server-side limits
--      (10 MB, image MIME allow-list). It will NOT create a second bucket:
--      if "article-media" is missing but the project already has other
--      buckets, it stops and lists them so you can point the app at the
--      existing one instead (see v_bucket below and VITE_SUPABASE_MEDIA_BUCKET).
--   2. Keeps the bucket public-read. The website shows article images via
--      public URLs (/storage/v1/object/public/...). A private bucket is never
--      silently made public — the migration stops and asks you to confirm.
--   3. Replaces the broad policies suggested in the old setup docs
--      ("true" for every bucket / every signed-in user) with policies scoped
--      to this bucket: anyone may read, only active CMS admins may upload or
--      delete, nobody may overwrite.
--   4. Restricts inserting/updating rows in public.media to active admins.
--
-- Settings (edit only if needed, then re-run):
--   v_bucket              bucket name; must equal VITE_SUPABASE_MEDIA_BUCKET
--                         (default "article-media")
--   v_create_alongside    set TRUE only if the other buckets listed in the
--                         error are NOT used for CMS images
--   v_confirm_make_public set TRUE to make an existing private bucket public
-- =============================================================================

DO $migration$
DECLARE
  v_bucket              CONSTANT text    := 'article-media';
  v_create_alongside    CONSTANT boolean := FALSE;
  v_confirm_make_public CONSTANT boolean := FALSE;

  v_limit  CONSTANT bigint := 10485760;  -- 10 MB, same as the app
  v_mimes  CONSTANT text[] := ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','image/svg+xml'];
  v_exts   CONSTANT text   := $$ARRAY['jpg','jpeg','png','webp','gif','avif','svg']$$;
  v_public  boolean;
  v_others  text;
BEGIN
  -- ── 1. Bucket ──────────────────────────────────────────────────────────
  SELECT b.public INTO v_public FROM storage.buckets b WHERE b.id = v_bucket;

  IF NOT FOUND THEN
    SELECT string_agg(format('%s (public=%s)', b.id, b.public), ', ' ORDER BY b.id)
      INTO v_others FROM storage.buckets b;

    IF v_others IS NOT NULL AND NOT v_create_alongside THEN
      RAISE EXCEPTION USING
        MESSAGE = format('Storage bucket "%s" does not exist, but this project already has: %s', v_bucket, v_others),
        HINT    = 'If one of those buckets holds the CMS images, do not create a new one: set v_bucket in this file and '
                  'VITE_SUPABASE_MEDIA_BUCKET in Vercel to its name, then re-run. If none of them is for CMS images, '
                  'set v_create_alongside := TRUE and re-run.';
    END IF;

    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (v_bucket, v_bucket, TRUE, v_limit, v_mimes);
    RAISE NOTICE 'Created public bucket "%".', v_bucket;
  ELSE
    IF NOT v_public THEN
      IF NOT v_confirm_make_public THEN
        RAISE EXCEPTION USING
          MESSAGE = format('Bucket "%s" exists but is PRIVATE. The website loads article images from public URLs, so they cannot display.', v_bucket),
          HINT    = 'The CMS is designed for a public-read image bucket (writes stay admin-only). '
                    'Set v_confirm_make_public := TRUE and re-run to make it public.';
      END IF;
      UPDATE storage.buckets SET public = TRUE WHERE id = v_bucket;
      RAISE NOTICE 'Bucket "%" is now public-read.', v_bucket;
    END IF;

    -- Server-side validation: size limit + allowed types (existing files untouched)
    UPDATE storage.buckets
       SET file_size_limit = v_limit, allowed_mime_types = v_mimes
     WHERE id = v_bucket;
    RAISE NOTICE 'Bucket "%" exists; limits set to 10 MB and image types only.', v_bucket;
  END IF;

  -- ── 2. storage.objects policies (scoped to this bucket) ───────────────
  -- Policies suggested by the previous setup docs. "Public read media" and
  -- "Authenticated users upload" applied to EVERY bucket with condition TRUE.
  DROP POLICY IF EXISTS "Public read media"           ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users upload"  ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated upload media"  ON storage.objects;
  DROP POLICY IF EXISTS "Owner or admin delete"       ON storage.objects;
  DROP POLICY IF EXISTS "Admin delete media"          ON storage.objects;
  DROP POLICY IF EXISTS "cms_media_public_read"       ON storage.objects;
  DROP POLICY IF EXISTS "cms_media_admin_insert"      ON storage.objects;
  DROP POLICY IF EXISTS "cms_media_admin_delete"      ON storage.objects;

  EXECUTE format($p$
    CREATE POLICY "cms_media_public_read" ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id = %L)
  $p$, v_bucket);

  -- Uploads: active admins only, image extensions only. No UPDATE policy,
  -- so existing files can never be overwritten.
  EXECUTE format($p$
    CREATE POLICY "cms_media_admin_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = %L
        AND public.is_admin()
        AND lower(storage.extension(name)) = ANY (%s)
      )
  $p$, v_bucket, v_exts);

  EXECUTE format($p$
    CREATE POLICY "cms_media_admin_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = %L AND public.is_admin())
  $p$, v_bucket);
END
$migration$;

-- ── 3. public.media — only active admins may register or edit media ─────
DROP POLICY IF EXISTS "Authenticated users can insert media" ON public.media;
DROP POLICY IF EXISTS "Admins insert media"                  ON public.media;
CREATE POLICY "Admins insert media"
  ON public.media FOR INSERT
  WITH CHECK (public.is_admin() AND uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Uploader or admin can update media" ON public.media;
DROP POLICY IF EXISTS "Admins update media"                ON public.media;
CREATE POLICY "Admins update media"
  ON public.media FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (
    public.is_admin()
    -- storage_path and uploaded_by are immutable after insert
    AND storage_path = (SELECT m.storage_path FROM public.media m WHERE m.id = media.id)
    AND uploaded_by  = (SELECT m.uploaded_by  FROM public.media m WHERE m.id = media.id)
  );
-- "Public can read media" and "Admins can delete media" are unchanged.

-- ── Check the result ────────────────────────────────────────────────────
-- SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets;
-- SELECT policyname, cmd, roles FROM pg_policies
--  WHERE (schemaname, tablename) IN (('storage','objects'), ('public','media'));
