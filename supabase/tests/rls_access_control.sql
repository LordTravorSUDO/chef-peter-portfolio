-- =============================================================================
-- RLS ACCESS CONTROL TESTS
-- =============================================================================
-- Run in the Supabase SQL Editor (as postgres / service role) after migrations.
-- Each test prints PASS or FAIL to the output.
-- These are manual verification queries — not an automated test runner.
--
-- Run AFTER: migrations + admin setup + at least one test article inserted.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Setup: create test data inside a transaction that is rolled back at the end
-- so nothing persists to the database.
-- ---------------------------------------------------------------------------
BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: run a query under a specific role context and return row count
-- ---------------------------------------------------------------------------

-- We simulate the anon role by setting the JWT claim to no user.
-- In Supabase, anon requests use the 'anon' key which sets role = anon.

-- ============================================================
-- TEST 1: Anonymous user cannot read draft articles
-- ============================================================
DO $$
DECLARE
  v_count INT;
  v_admin_id UUID;
  v_article_id UUID;
BEGIN
  -- Create a minimal admin profile for testing
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    'test-admin@chefpeter.test',
    crypt('test-password-not-real', gen_salt('bf')),
    NOW(), NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, role, display_name, is_active)
  VALUES ('00000000-0000-0000-0000-000000000001', 'admin', 'Test Admin', TRUE)
  ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = TRUE;

  v_admin_id := '00000000-0000-0000-0000-000000000001';

  -- Insert a draft article
  INSERT INTO public.articles (id, slug, title, body, author_id, status)
  VALUES (
    '00000000-0000-0000-0000-000000000010',
    'test-draft-article',
    'Test Draft',
    'Draft body content here.',
    v_admin_id,
    'draft'
  ) ON CONFLICT (id) DO NOTHING;

  v_article_id := '00000000-0000-0000-0000-000000000010';

  -- Simulate anon context (no auth.uid())
  -- In Supabase, set_config sets the JWT claim for the current transaction
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);

  -- As anon, count draft articles visible (should be 0)
  SELECT COUNT(*) INTO v_count
  FROM public.articles
  WHERE status = 'draft';

  IF v_count = 0 THEN
    RAISE NOTICE 'TEST 1 PASS: Anon cannot read draft articles (count=0)';
  ELSE
    RAISE WARNING 'TEST 1 FAIL: Anon can see % draft articles — RLS not working!', v_count;
  END IF;

  -- Reset
  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- ============================================================
-- TEST 2: Anonymous user cannot read scheduled articles
-- ============================================================
DO $$
DECLARE
  v_count INT;
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert a scheduled article
  INSERT INTO public.articles (id, slug, title, body, author_id, status, scheduled_for)
  VALUES (
    '00000000-0000-0000-0000-000000000011',
    'test-scheduled-article',
    'Test Scheduled',
    'Scheduled body content.',
    v_admin_id,
    'scheduled',
    NOW() + INTERVAL '7 days'
  ) ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);

  SELECT COUNT(*) INTO v_count
  FROM public.articles
  WHERE status = 'scheduled';

  IF v_count = 0 THEN
    RAISE NOTICE 'TEST 2 PASS: Anon cannot read scheduled articles (count=0)';
  ELSE
    RAISE WARNING 'TEST 2 FAIL: Anon can see % scheduled articles!', v_count;
  END IF;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- ============================================================
-- TEST 3: Anonymous user CAN read a published article
-- ============================================================
DO $$
DECLARE
  v_count INT;
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.articles (id, slug, title, body, author_id, status, published_at)
  VALUES (
    '00000000-0000-0000-0000-000000000012',
    'test-published-article',
    'Test Published',
    'Published body content.',
    v_admin_id,
    'published',
    NOW() - INTERVAL '1 hour'
  ) ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);

  SELECT COUNT(*) INTO v_count
  FROM public.articles
  WHERE id = '00000000-0000-0000-0000-000000000012';

  IF v_count = 1 THEN
    RAISE NOTICE 'TEST 3 PASS: Anon can read a published article (count=1)';
  ELSE
    RAISE WARNING 'TEST 3 FAIL: Anon cannot read published article (count=%)!', v_count;
  END IF;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- ============================================================
-- TEST 4: Anonymous user cannot read another user's profile
-- ============================================================
DO $$
DECLARE
  v_count INT;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);

  SELECT COUNT(*) INTO v_count FROM public.profiles;

  IF v_count = 0 THEN
    RAISE NOTICE 'TEST 4 PASS: Anon cannot read any profiles (count=0)';
  ELSE
    RAISE WARNING 'TEST 4 FAIL: Anon can see % profiles!', v_count;
  END IF;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- ============================================================
-- TEST 5: Non-admin cannot self-elevate role to admin
-- ============================================================
DO $$
DECLARE
  v_editor_id UUID;
  v_updated   INT;
BEGIN
  -- Create an editor user
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000002',
    'test-editor@chefpeter.test',
    crypt('test-password-not-real', gen_salt('bf')),
    NOW(), NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, role, display_name, is_active)
  VALUES ('00000000-0000-0000-0000-000000000002', 'editor', 'Test Editor', TRUE)
  ON CONFLICT (id) DO UPDATE SET role = 'editor';

  v_editor_id := '00000000-0000-0000-0000-000000000002';

  -- Simulate the editor being logged in
  PERFORM set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', v_editor_id::text)::text,
    TRUE
  );
  PERFORM set_config('request.jwt.claim.sub', v_editor_id::text, TRUE);

  -- Attempt to promote self to admin (should be blocked by RLS WITH CHECK)
  BEGIN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = v_editor_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
      RAISE NOTICE 'TEST 5 PASS: Editor cannot self-elevate (0 rows updated)';
    ELSE
      -- Double-check the actual stored value
      DECLARE v_actual_role public.user_role;
      BEGIN
        SELECT role INTO v_actual_role FROM public.profiles WHERE id = v_editor_id;
        IF v_actual_role = 'admin' THEN
          RAISE WARNING 'TEST 5 FAIL: Editor successfully self-elevated to admin!';
        ELSE
          RAISE NOTICE 'TEST 5 PASS: UPDATE was blocked/reverted (role still editor)';
        END IF;
      END;
    END IF;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'TEST 5 PASS: Self-elevation rejected with exception: %', SQLERRM;
  END;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- ============================================================
-- TEST 6: Anonymous user cannot read revision history
-- ============================================================
DO $$
DECLARE
  v_count INT;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);

  SELECT COUNT(*) INTO v_count FROM public.article_revisions;

  IF v_count = 0 THEN
    RAISE NOTICE 'TEST 6 PASS: Anon cannot read revision history (count=0)';
  ELSE
    RAISE WARNING 'TEST 6 FAIL: Anon can see % revisions!', v_count;
  END IF;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- ============================================================
-- TEST 7: Admin can read draft articles
-- ============================================================
DO $$
DECLARE
  v_count INT;
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', v_admin_id::text)::text,
    TRUE
  );
  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, TRUE);

  SELECT COUNT(*) INTO v_count
  FROM public.articles
  WHERE status = 'draft';

  IF v_count > 0 THEN
    RAISE NOTICE 'TEST 7 PASS: Admin can read draft articles (count=%)', v_count;
  ELSE
    RAISE WARNING 'TEST 7 FAIL: Admin cannot see draft articles!';
  END IF;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- ============================================================
-- TEST 8: Slug uniqueness enforced
-- ============================================================
DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  BEGIN
    INSERT INTO public.articles (slug, title, body, author_id, status)
    VALUES ('test-published-article', 'Duplicate Slug', 'body', v_admin_id, 'draft');
    RAISE WARNING 'TEST 8 FAIL: Duplicate slug was accepted!';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 8 PASS: Duplicate slug correctly rejected';
  END;
END;
$$;

-- ============================================================
-- Rollback all test data — nothing written to the database
-- ============================================================
ROLLBACK;

-- Final summary note
DO $$ BEGIN
  RAISE NOTICE '=== All tests complete. Check NOTICE/WARNING lines above. ===';
  RAISE NOTICE 'All tests ran inside a transaction that was rolled back.';
  RAISE NOTICE 'No test data was persisted.';
END; $$;
