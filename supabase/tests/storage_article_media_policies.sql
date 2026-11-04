-- =============================================================================
-- STORAGE POLICIES — `article-media` bucket permission tests
-- =============================================================================
-- Verifies migration 20261104190837_article_media_storage_policies.sql by
-- evaluating the real RLS policies as the real database roles:
--   * admin      — role `authenticated`, JWT subject = the active admin's id
--   * non-admin  — role `authenticated`, JWT subject = a random user id
--   * anonymous  — role `anon`, no subject
--
-- SAFE TO RUN AGAINST PRODUCTION: the whole block ends with RAISE EXCEPTION,
-- so every row it inserts, updates or deletes is rolled back. It never writes
-- to the separate "Article Media" bucket (attempts there are expected to be
-- denied before any row is written). The admin's id is never printed.
--
-- The result is reported in the error message:
--   "STORAGE POLICY TESTS: <n> passed, <m> failed | <details>"
-- Direct deletes are enabled locally with storage.allow_delete_query=true,
-- exactly as the Storage API does, so DELETE is tested through RLS.
-- =============================================================================

DO $$
DECLARE
  v_admin   uuid;
  v_other   uuid := gen_random_uuid();
  v_seed    text := 'articles/__policy_test_seed_' || replace(gen_random_uuid()::text, '-', '') || '.png';
  v_n       int;
  v_outcome text;
  v_pass    int := 0;
  v_fail    int := 0;
  v_report  text := '';
BEGIN
  SELECT id INTO v_admin FROM public.profiles WHERE role = 'admin' AND is_active ORDER BY created_at LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'STORAGE POLICY TESTS: aborted — no active admin profile found';
  END IF;

  -- Seed one object row in article-media as the table owner (rolled back at the end)
  INSERT INTO storage.objects (bucket_id, name, owner, owner_id, metadata)
  VALUES ('article-media', v_seed, v_admin, v_admin::text, '{"mimetype":"image/png","size":1}');

  PERFORM set_config('storage.allow_delete_query', 'true', true);

  -- ---------------------------------------------------------------------------
  -- Helper pattern used below for each case:
  --   set claims → SET LOCAL ROLE → statement → capture outcome → RESET ROLE
  -- ---------------------------------------------------------------------------

  ---------------------------------------------------------------- INSERT
  -- T1 admin can upload to article-media
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  BEGIN
    SET LOCAL ROLE authenticated;
    INSERT INTO storage.objects (bucket_id, name, owner, owner_id) VALUES ('article-media', 'articles/__policy_test_admin.png', v_admin, v_admin::text);
    v_outcome := 'allowed';
  EXCEPTION WHEN OTHERS THEN v_outcome := 'denied';
  END;
  RESET ROLE;
  IF v_outcome = 'allowed' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T1 admin upload article-media: %s (expect allowed); ', v_outcome);

  -- T2 admin cannot upload to another bucket
  BEGIN
    SET LOCAL ROLE authenticated;
    INSERT INTO storage.objects (bucket_id, name, owner, owner_id) VALUES ('Article Media', 'articles/__policy_test_other.png', v_admin, v_admin::text);
    v_outcome := 'allowed';
  EXCEPTION WHEN OTHERS THEN v_outcome := 'denied';
  END;
  RESET ROLE;
  IF v_outcome = 'denied' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T2 admin upload other bucket: %s (expect denied); ', v_outcome);

  -- T3 anonymous visitor cannot upload
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  BEGIN
    SET LOCAL ROLE anon;
    INSERT INTO storage.objects (bucket_id, name) VALUES ('article-media', 'articles/__policy_test_anon.png');
    v_outcome := 'allowed';
  EXCEPTION WHEN OTHERS THEN v_outcome := 'denied';
  END;
  RESET ROLE;
  IF v_outcome = 'denied' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T3 anon upload: %s (expect denied); ', v_outcome);

  -- T4 signed-in non-admin cannot upload
  PERFORM set_config('request.jwt.claim.sub', v_other::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  BEGIN
    SET LOCAL ROLE authenticated;
    INSERT INTO storage.objects (bucket_id, name, owner, owner_id) VALUES ('article-media', 'articles/__policy_test_user.png', v_other, v_other::text);
    v_outcome := 'allowed';
  EXCEPTION WHEN OTHERS THEN v_outcome := 'denied';
  END;
  RESET ROLE;
  IF v_outcome = 'denied' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T4 non-admin upload: %s (expect denied); ', v_outcome);

  ---------------------------------------------------------------- SELECT (API read/list)
  -- T5 non-admin cannot read/list objects through the API
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM storage.objects WHERE name = v_seed;
  RESET ROLE;
  IF v_n = 0 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T5 non-admin API read: %s rows (expect 0); ', v_n);

  -- T6 non-admin cannot update
  SET LOCAL ROLE authenticated;
  UPDATE storage.objects SET name = v_seed || '.x' WHERE name = v_seed;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  IF v_n = 0 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T6 non-admin update: %s rows (expect 0); ', v_n);

  -- T7 non-admin cannot delete
  SET LOCAL ROLE authenticated;
  DELETE FROM storage.objects WHERE name = v_seed;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  IF v_n = 0 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T7 non-admin delete: %s rows (expect 0); ', v_n);

  -- T8–T10 anonymous visitor: read / update / delete
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_n FROM storage.objects WHERE name = v_seed;
  RESET ROLE;
  IF v_n = 0 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T8 anon API read/list: %s rows (expect 0); ', v_n);

  SET LOCAL ROLE anon;
  UPDATE storage.objects SET name = v_seed || '.x' WHERE name = v_seed;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  IF v_n = 0 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T9 anon update: %s rows (expect 0); ', v_n);

  SET LOCAL ROLE anon;
  DELETE FROM storage.objects WHERE name = v_seed;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  IF v_n = 0 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T10 anon delete: %s rows (expect 0); ', v_n);

  ---------------------------------------------------------------- admin read / update / move / delete
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- T11 admin can read the object through the API (needed for delete/move)
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM storage.objects WHERE name = v_seed;
  RESET ROLE;
  IF v_n = 1 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T11 admin API read: %s rows (expect 1); ', v_n);

  -- T12 admin can update (rename within the bucket)
  SET LOCAL ROLE authenticated;
  UPDATE storage.objects SET name = v_seed || '.renamed', metadata = '{"mimetype":"image/png","size":2}' WHERE name = v_seed;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  IF v_n = 1 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T12 admin update in bucket: %s rows (expect 1); ', v_n);

  -- T13 admin cannot move the object into another bucket (WITH CHECK)
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE storage.objects SET bucket_id = 'Article Media' WHERE name = v_seed || '.renamed';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_outcome := CASE WHEN v_n = 0 THEN 'denied' ELSE 'allowed' END;
  EXCEPTION WHEN OTHERS THEN v_outcome := 'denied';
  END;
  RESET ROLE;
  IF v_outcome = 'denied' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T13 admin move to other bucket: %s (expect denied); ', v_outcome);

  -- T14 admin can delete
  SET LOCAL ROLE authenticated;
  DELETE FROM storage.objects WHERE name = v_seed || '.renamed';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  IF v_n = 1 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T14 admin delete: %s rows (expect 1); ', v_n);

  -- Always roll back everything above
  RAISE EXCEPTION 'STORAGE POLICY TESTS: % passed, % failed | %(all changes rolled back)', v_pass, v_fail, v_report;
END $$;
