-- =============================================================================
-- MEDIA TABLE — UPDATE policy tests ("Uploader or admin can update media")
-- =============================================================================
-- Verifies the corrected policy (migration *_fix_media_update_policy.sql).
-- Evaluates the real RLS policies as the real database roles:
--   * admin      — role `authenticated`, JWT subject = the active admin's id
--   * non-admin  — role `authenticated`, JWT subject = a random id that is
--                  neither an admin nor the uploader (no account is created)
--   * anonymous  — role `anon`, no subject
--
-- SAFE TO RUN AGAINST PRODUCTION: the block ends with RAISE EXCEPTION, so the
-- two seeded test rows and every change made to them are rolled back.
-- Seeded rows use unique "__policy_test_" paths and the admin as uploader.
--
-- A case counts as "denied" only when Postgres rejects it with SQLSTATE 42501
-- (row-level security); any other error is reported as a failure.
-- Result format: "MEDIA UPDATE POLICY TESTS: <n> passed, <m> failed | ..."
-- =============================================================================

DO $$
DECLARE
  v_admin  uuid;
  v_other  uuid := gen_random_uuid();
  v_tag    text := replace(gen_random_uuid()::text, '-', '');
  v_id1    uuid;
  v_id2    uuid;
  v_n      int;
  v_state  text;
  v_out    text;
  v_pass   int := 0;
  v_fail   int := 0;
  v_report text := '';
BEGIN
  SELECT id INTO v_admin FROM public.profiles WHERE role = 'admin' AND is_active ORDER BY created_at LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'MEDIA UPDATE POLICY TESTS: aborted — no active admin profile found';
  END IF;

  -- Seed two rows as the table owner (rolled back at the end)
  INSERT INTO public.media (storage_path, original_filename, mime_type, file_size_bytes, uploaded_by)
  VALUES ('articles/__policy_test_1_' || v_tag || '.png', 'test1.png', 'image/png', 1, v_admin)
  RETURNING id INTO v_id1;
  INSERT INTO public.media (storage_path, original_filename, mime_type, file_size_bytes, uploaded_by)
  VALUES ('articles/__policy_test_2_' || v_tag || '.png', 'test2.png', 'image/png', 1, v_admin)
  RETURNING id INTO v_id2;

  ---------------------------------------------------------------- admin
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- T1 admin updates alt_text, caption and credit (2 rows exist)
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE public.media SET alt_text = 'Test alt', caption = 'Test caption', credit = 'Test credit' WHERE id = v_id1;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_out := v_n || ' row(s)';
  EXCEPTION WHEN OTHERS THEN v_out := 'error ' || SQLSTATE;
  END;
  RESET ROLE;
  IF v_out = '1 row(s)' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T1 admin edits alt/caption/credit: %s (expect 1 row(s)); ', v_out);

  -- T2 admin cannot change storage_path
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE public.media SET storage_path = 'articles/__policy_test_moved_' || v_tag || '.png' WHERE id = v_id1;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_out := 'allowed (' || v_n || ' row(s))';
  EXCEPTION WHEN OTHERS THEN v_out := CASE WHEN SQLSTATE = '42501' THEN 'denied' ELSE 'error ' || SQLSTATE END;
  END;
  RESET ROLE;
  IF v_out = 'denied' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T2 admin changes storage_path: %s (expect denied); ', v_out);

  -- T3 admin cannot change uploaded_by (RLS WITH CHECK runs before the FK check)
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE public.media SET uploaded_by = v_other WHERE id = v_id1;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_out := 'allowed (' || v_n || ' row(s))';
  EXCEPTION WHEN OTHERS THEN v_out := CASE WHEN SQLSTATE = '42501' THEN 'denied' ELSE 'error ' || SQLSTATE END;
  END;
  RESET ROLE;
  IF v_out = 'denied' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T3 admin changes uploaded_by: %s (expect denied); ', v_out);

  ---------------------------------------------------------------- non-admin, not the uploader
  PERFORM set_config('request.jwt.claim.sub', v_other::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE public.media SET alt_text = 'hijack' WHERE id IN (v_id1, v_id2);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_out := v_n || ' row(s)';
  EXCEPTION WHEN OTHERS THEN v_out := 'error ' || SQLSTATE;
  END;
  RESET ROLE;
  IF v_out = '0 row(s)' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T4 non-admin non-uploader update: %s (expect 0 row(s)); ', v_out);

  ---------------------------------------------------------------- anonymous
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  BEGIN
    SET LOCAL ROLE anon;
    UPDATE public.media SET alt_text = 'anon' WHERE id IN (v_id1, v_id2);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_out := v_n || ' row(s)';
  EXCEPTION WHEN OTHERS THEN v_out := 'error ' || SQLSTATE;
  END;
  RESET ROLE;
  IF v_out = '0 row(s)' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T5 anon update: %s (expect 0 row(s)); ', v_out);

  BEGIN
    SET LOCAL ROLE anon;
    INSERT INTO public.media (storage_path, original_filename, mime_type, file_size_bytes, uploaded_by)
    VALUES ('articles/__policy_test_anon_' || v_tag || '.png', 'anon.png', 'image/png', 1, v_admin);
    v_out := 'allowed';
  EXCEPTION WHEN OTHERS THEN v_out := CASE WHEN SQLSTATE = '42501' THEN 'denied' ELSE 'error ' || SQLSTATE END;
  END;
  RESET ROLE;
  IF v_out = 'denied' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T6 anon insert: %s (expect denied); ', v_out);

  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_n FROM public.media WHERE id IN (v_id1, v_id2);
  RESET ROLE;
  IF v_n = 2 THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T7 anon read: %s rows (expect 2); ', v_n);

  ---------------------------------------------------------------- admin delete (unchanged policy)
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  BEGIN
    SET LOCAL ROLE authenticated;
    DELETE FROM public.media WHERE id = v_id2;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_out := v_n || ' row(s)';
  EXCEPTION WHEN OTHERS THEN v_out := 'error ' || SQLSTATE;
  END;
  RESET ROLE;
  IF v_out = '1 row(s)' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail + 1; END IF;
  v_report := v_report || format('T8 admin delete: %s (expect 1 row(s)); ', v_out);

  -- Final state of row 1 as seen by the owner (proves T2/T3 changed nothing)
  SELECT count(*) INTO v_n FROM public.media
   WHERE id = v_id1 AND storage_path = 'articles/__policy_test_1_' || v_tag || '.png' AND uploaded_by = v_admin;
  v_report := v_report || format('row1 path+uploader intact: %s; ', v_n = 1);

  RAISE EXCEPTION 'MEDIA UPDATE POLICY TESTS: % passed, % failed | %(all changes rolled back)', v_pass, v_fail, v_report;
END $$;
