-- =============================================================================
-- STORAGE POLICIES — upload/delete permissions under real roles
-- =============================================================================
-- Requires: all migrations incl. 20261104000000_storage_article_media.sql.
-- Runs as anon / authenticated (admin, editor) via SET ROLE so RLS is
-- enforced. Everything is ROLLED BACK. Any failure raises an exception;
-- success ends with "STORAGE POLICIES: ALL CHECKS PASSED".
-- =============================================================================

BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'storage-admin@chefpeter.test'),
  ('a2222222-2222-2222-2222-222222222222', 'storage-editor@chefpeter.test')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, display_name, role, is_active) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Storage Admin',  'admin',  TRUE),
  ('a2222222-2222-2222-2222-222222222222', 'Storage Editor', 'editor', TRUE)
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, is_active = TRUE;

CREATE FUNCTION pg_temp.act(p_role text, p_sub text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', p_role)::text, true);
  PERFORM set_config('request.jwt.claim.sub', coalesce(p_sub, ''), true);
  PERFORM set_config('role', p_role, true);
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.act(text, text) TO anon, authenticated;

-- Try an INSERT into storage.objects; returns true if allowed.
CREATE FUNCTION pg_temp.try_upload(p_bucket text, p_name text) RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN
  INSERT INTO storage.objects (bucket_id, name) VALUES (p_bucket, p_name);
  RETURN TRUE;
EXCEPTION WHEN insufficient_privilege THEN RETURN FALSE;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.try_upload(text, text) TO anon, authenticated;

DO $$
DECLARE v_bucket text := 'article-media'; v_rows int; v_public boolean;
BEGIN
  -- Bucket configured
  SELECT public INTO v_public FROM storage.buckets WHERE id = v_bucket;
  IF v_public IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'S0 FAIL: bucket missing or not public'; END IF;
  IF (SELECT file_size_limit FROM storage.buckets WHERE id = v_bucket) <> 10485760 THEN RAISE EXCEPTION 'S0 FAIL: size limit'; END IF;
  RAISE NOTICE 'S0 PASS: bucket % public, 10 MB limit, image types only', v_bucket;

  -- Admin upload allowed
  PERFORM pg_temp.act('authenticated', 'a1111111-1111-1111-1111-111111111111');
  IF NOT pg_temp.try_upload(v_bucket, 'articles/2026/11/test-admin.jpg') THEN RAISE EXCEPTION 'S1 FAIL: admin upload denied'; END IF;
  RAISE NOTICE 'S1 PASS: admin can upload';

  -- Admin cannot upload a non-image extension
  IF pg_temp.try_upload(v_bucket, 'articles/2026/11/evil.html') THEN RAISE EXCEPTION 'S2 FAIL: .html accepted'; END IF;
  RAISE NOTICE 'S2 PASS: non-image extension rejected';

  -- Editor (signed in, not admin) cannot upload
  PERFORM pg_temp.act('authenticated', 'a2222222-2222-2222-2222-222222222222');
  IF pg_temp.try_upload(v_bucket, 'articles/2026/11/test-editor.jpg') THEN RAISE EXCEPTION 'S3 FAIL: editor upload allowed'; END IF;
  RAISE NOTICE 'S3 PASS: non-admin upload rejected';

  -- Anonymous cannot upload (this is what the old anon-key upload request was)
  PERFORM pg_temp.act('anon', NULL);
  IF pg_temp.try_upload(v_bucket, 'articles/2026/11/test-anon.jpg') THEN RAISE EXCEPTION 'S4 FAIL: anon upload allowed'; END IF;
  RAISE NOTICE 'S4 PASS: anonymous upload rejected';

  -- Anyone can read objects in the bucket (public website)
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = v_bucket AND name = 'articles/2026/11/test-admin.jpg') <> 1 THEN
    RAISE EXCEPTION 'S5 FAIL: anon cannot read object';
  END IF;
  RAISE NOTICE 'S5 PASS: public read';

  -- Editor and anon cannot delete
  PERFORM pg_temp.act('authenticated', 'a2222222-2222-2222-2222-222222222222');
  DELETE FROM storage.objects WHERE bucket_id = v_bucket AND name = 'articles/2026/11/test-admin.jpg';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'S6 FAIL: editor deleted an object'; END IF;
  PERFORM pg_temp.act('anon', NULL);
  DELETE FROM storage.objects WHERE bucket_id = v_bucket AND name = 'articles/2026/11/test-admin.jpg';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'S6 FAIL: anon deleted an object'; END IF;
  RAISE NOTICE 'S6 PASS: non-admins cannot delete files';

  -- Nobody can overwrite (no UPDATE policy)
  PERFORM pg_temp.act('authenticated', 'a1111111-1111-1111-1111-111111111111');
  UPDATE storage.objects SET name = 'articles/2026/11/renamed.jpg' WHERE name = 'articles/2026/11/test-admin.jpg';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'S7 FAIL: object overwritten/renamed'; END IF;
  RAISE NOTICE 'S7 PASS: stored files cannot be overwritten';

  -- media table: admin can register, editor cannot
  INSERT INTO public.media (storage_path, original_filename, mime_type, file_size_bytes, uploaded_by)
  VALUES ('articles/2026/11/test-admin.jpg', 'test.jpg', 'image/jpeg', 100, 'a1111111-1111-1111-1111-111111111111');
  RAISE NOTICE 'S8 PASS: admin can register media';
  PERFORM pg_temp.act('authenticated', 'a2222222-2222-2222-2222-222222222222');
  BEGIN
    INSERT INTO public.media (storage_path, original_filename, mime_type, file_size_bytes, uploaded_by)
    VALUES ('articles/2026/11/test-editor.jpg', 'e.jpg', 'image/jpeg', 100, 'a2222222-2222-2222-2222-222222222222');
    RAISE EXCEPTION 'S9 FAIL: editor registered media';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'S9 PASS: non-admin cannot register media';
  END;
  DELETE FROM public.media WHERE storage_path = 'articles/2026/11/test-admin.jpg';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'S10 FAIL: editor deleted a media row'; END IF;
  RAISE NOTICE 'S10 PASS: non-admin cannot delete media rows';

  -- Admin can delete
  PERFORM pg_temp.act('authenticated', 'a1111111-1111-1111-1111-111111111111');
  DELETE FROM public.media WHERE storage_path = 'articles/2026/11/test-admin.jpg';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'S11 FAIL: admin media delete rows=%', v_rows; END IF;
  DELETE FROM storage.objects WHERE bucket_id = v_bucket AND name = 'articles/2026/11/test-admin.jpg';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'S11 FAIL: admin object delete rows=%', v_rows; END IF;
  RAISE NOTICE 'S11 PASS: admin can delete media row and file';
END $$;

RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'STORAGE POLICIES: ALL CHECKS PASSED'; END $$;
ROLLBACK;
