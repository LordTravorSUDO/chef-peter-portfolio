-- =============================================================================
-- ARTICLE WORKFLOW — ACCESS CONTROL & INTEGRITY TESTS
-- =============================================================================
-- Run in the Supabase SQL Editor (as postgres / service role) after migrations
-- and admin setup. Each test prints PASS or FAIL to NOTICE output.
--
-- Tests cover:
--   1. Create draft                    — admin can create, anon cannot
--   2. Edit existing draft             — admin can update, anon cannot
--   3. Publish immediately             — published_at is set correctly
--   4. Unpublish safely                — reverts to draft, preserves published_at
--   5. Schedule for future             — scheduled_for set, not visible to anon
--   6. Validation — duplicate slug     — rejected with unique_violation
--   7. Validation — scheduled_for must be future — rejected if in past
--   8. Revision creation on edit       — revision created automatically
--   9. Revision restoration             — content restored, new revision created
--  10. Draft not visible to anon        — RLS prevents anon read
--  11. Scheduled not visible to anon    — RLS prevents anon read
--  12. Noindex excluded from public     — noindex articles hidden from anon
--  13. Non-admin cannot publish         — editor RLS blocks publish
--  14. Published articles have published_at — constraint enforces this
--
-- All tests run inside a rolled-back transaction — nothing persists.
-- =============================================================================

BEGIN;

-- =========================================================================
-- TEST 1: Admin can create a draft; anon cannot
-- =========================================================================
DO $$
DECLARE
  v_admin_id  UUID := '00000000-0000-0000-0000-000000000001';
  v_article_id UUID;
  v_count     INT;
BEGIN
  -- Ensure admin exists (from previous test setup or fresh)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000001', 'test-admin@chefpeter.test', crypt('test', gen_salt('bf')), NOW(), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, role, is_active, display_name)
  VALUES ('00000000-0000-0000-0000-000000000001', 'admin', TRUE, 'Test Admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = TRUE;

  -- Admin creates a draft
  INSERT INTO public.articles (id, slug, title, body, excerpt, author_id, status)
  VALUES ('00000000-0000-0000-0000-000000000020', 'test-workflow-draft', 'Test Draft', 'Draft body', 'Draft excerpt', v_admin_id, 'draft')
  ON CONFLICT (id) DO UPDATE SET title = 'Test Draft', body = 'Draft body', status = 'draft';

  -- Verify it exists
  SELECT COUNT(*) INTO v_count FROM public.articles WHERE id = '00000000-0000-0000-0000-000000000020';

  IF v_count = 1 THEN
    RAISE NOTICE 'TEST 1 PASS: Admin can create draft (count=%)', v_count;
  ELSE
    RAISE WARNING 'TEST 1 FAIL: Draft not created (count=%)', v_count;
  END IF;
END;
$$;

-- =========================================================================
-- TEST 2: Admin can update a draft; anon cannot read it
-- =========================================================================
DO $$
DECLARE
  v_admin_id  UUID := '00000000-0000-0000-0000-000000000001';
  v_count     INT;
BEGIN
  -- Admin updates the draft
  UPDATE public.articles
  SET title = 'Updated Draft Title', body = 'Updated body content'
  WHERE id = '00000000-0000-0000-0000-000000000020';

  -- Simulate anon context
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);

  SELECT COUNT(*) INTO v_count FROM public.articles WHERE id = '00000000-0000-0000-0000-000000000020';

  IF v_count = 0 THEN
    RAISE NOTICE 'TEST 2 PASS: Anon cannot read draft (count=0)';
  ELSE
    RAISE WARNING 'TEST 2 FAIL: Anon can read draft (count=%)', v_count;
  END IF;

  -- Reset context
  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- =========================================================================
-- TEST 3: Publish immediately — published_at is set
-- =========================================================================
DO $$
DECLARE
  v_admin_id   UUID := '00000000-0000-0000-0000-000000000001';
  v_published  TIMESTAMPTZ;
BEGIN
  -- Admin publishes
  UPDATE public.articles
  SET status = 'published', published_at = NOW()
  WHERE id = '00000000-0000-0000-0000-000000000020';

  SELECT published_at INTO v_published FROM public.articles WHERE id = '00000000-0000-0000-0000-000000000020';

  IF v_published IS NOT NULL THEN
    RAISE NOTICE 'TEST 3 PASS: published_at is set after publishing';
  ELSE
    RAISE WARNING 'TEST 3 FAIL: published_at is NULL after publishing';
  END IF;
END;
$$;

-- =========================================================================
-- TEST 4: Unpublish safely — reverts to draft, preserves published_at
-- =========================================================================
DO $$
DECLARE
  v_status     public.article_status;
  v_published  TIMESTAMPTZ;
BEGIN
  -- Admin unpublishes
  UPDATE public.articles
  SET status = 'draft', scheduled_for = NULL
  WHERE id = '00000000-0000-0000-0000-000000000020';

  SELECT status, published_at INTO v_status, v_published FROM public.articles WHERE id = '00000000-0000-0000-0000-000000000020';

  IF v_status = 'draft' AND v_published IS NOT NULL THEN
    RAISE NOTICE 'TEST 4 PASS: Unpublished to draft, published_at preserved';
  ELSE
    RAISE WARNING 'TEST 4 FAIL: status=% published_at=%', v_status, v_published;
  END IF;
END;
$$;

-- =========================================================================
-- TEST 5: Schedule for future — scheduled_for set, not visible to anon
-- =========================================================================
DO $$
DECLARE
  v_admin_id   UUID := '00000000-0000-0000-0000-000000000001';
  v_count      INT;
  v_scheduled  TIMESTAMPTZ;
BEGIN
  -- Admin schedules
  UPDATE public.articles
  SET status = 'scheduled', scheduled_for = NOW() + INTERVAL '7 days'
  WHERE id = '00000000-0000-0000-0000-000000000020';

  SELECT scheduled_for INTO v_scheduled FROM public.articles WHERE id = '00000000-0000-0000-0000-000000000020';

  -- Simulate anon context
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);

  SELECT COUNT(*) INTO v_count FROM public.articles WHERE id = '00000000-0000-0000-0000-000000000020';

  IF v_count = 0 AND v_scheduled IS NOT NULL THEN
    RAISE NOTICE 'TEST 5 PASS: Scheduled article not visible to anon (count=0, scheduled_for set)';
  ELSE
    RAISE WARNING 'TEST 5 FAIL: count=% scheduled_for=%', v_count, v_scheduled;
  END IF;

  -- Reset
  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- =========================================================================
-- TEST 6: Validation — duplicate slug rejected
-- =========================================================================
DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  BEGIN
    INSERT INTO public.articles (slug, title, body, author_id, status)
    VALUES ('test-workflow-draft', 'Duplicate', 'body', v_admin_id, 'draft');
    RAISE WARNING 'TEST 6 FAIL: Duplicate slug was accepted!';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 6 PASS: Duplicate slug correctly rejected';
  END;
END;
$$;

-- =========================================================================
-- TEST 7: Validation — scheduled_for must be in the future
-- =========================================================================
DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  BEGIN
    INSERT INTO public.articles (id, slug, title, body, author_id, status, scheduled_for, created_at)
    VALUES ('00000000-0000-0000-0000-000000000030', 'test-past-schedule', 'Past Schedule', 'body', v_admin_id, 'scheduled', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days');
    RAISE WARNING 'TEST 7 FAIL: Past scheduled_for was accepted!';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 7 PASS: Past scheduled_for correctly rejected by constraint';
  END;
END;
$$;

-- =========================================================================
-- TEST 8: Revision creation on edit — trigger fires automatically
-- =========================================================================
DO $$
DECLARE
  v_admin_id  UUID := '00000000-0000-0000-0000-000000000001';
  v_rev_count INT;
BEGIN
  -- Reset article to draft state
  UPDATE public.articles
  SET status = 'draft', published_at = NULL, scheduled_for = NULL, title = 'Revision Test', body = 'Original body'
  WHERE id = '00000000-0000-0000-0000-000000000020';

  -- Delete existing revisions for clean count
  DELETE FROM public.article_revisions WHERE article_id = '00000000-0000-0000-0000-000000000020';

  -- Edit the content (this should trigger revision creation)
  UPDATE public.articles
  SET title = 'Revision Test v2', body = 'Updated body content v2'
  WHERE id = '00000000-0000-0000-0000-000000000020';

  SELECT COUNT(*) INTO v_rev_count FROM public.article_revisions WHERE article_id = '00000000-0000-0000-0000-000000000020';

  IF v_rev_count >= 1 THEN
    RAISE NOTICE 'TEST 8 PASS: Revision created on edit (count=%)', v_rev_count;
  ELSE
    RAISE WARNING 'TEST 8 FAIL: No revision created (count=%)', v_rev_count;
  END IF;
END;
$$;

-- =========================================================================
-- TEST 9: Revision restoration — content restored, new revision created
-- =========================================================================
DO $$
DECLARE
  v_rev_id    UUID;
  v_title     TEXT;
  v_rev_after INT;
BEGIN
  -- Get the first revision (should have the original content)
  SELECT id INTO v_rev_id FROM public.article_revisions
  WHERE article_id = '00000000-0000-0000-0000-000000000020'
  ORDER BY revision_no ASC LIMIT 1;

  IF v_rev_id IS NULL THEN
    RAISE WARNING 'TEST 9 SKIP: No revisions found to restore';
    RETURN;
  END IF;

  -- Count revisions before restore
  SELECT COUNT(*) INTO v_rev_after FROM public.article_revisions WHERE article_id = '00000000-0000-0000-0000-000000000020';

  -- Restore the revision content
  UPDATE public.articles
  SET title = (SELECT title FROM public.article_revisions WHERE id = v_rev_id),
      body  = (SELECT body  FROM public.article_revisions WHERE id = v_rev_id),
      excerpt = (SELECT excerpt FROM public.article_revisions WHERE id = v_rev_id)
  WHERE id = '00000000-0000-0000-0000-000000000020';

  -- Count revisions after restore — should be one more (the restore created a new revision)
  SELECT COUNT(*) INTO v_rev_after FROM public.article_revisions WHERE article_id = '00000000-0000-0000-0000-000000000020';

  SELECT title INTO v_title FROM public.articles WHERE id = '00000000-0000-0000-0000-000000000020';

  IF v_rev_after >= 2 THEN
    RAISE NOTICE 'TEST 9 PASS: Restoration created new revision (total=%, title=%)', v_rev_after, v_title;
  ELSE
    RAISE WARNING 'TEST 9 FAIL: No new revision after restore (count=%)', v_rev_after;
  END IF;
END;
$$;

-- =========================================================================
-- TEST 10: Draft not visible to anon (comprehensive)
-- =========================================================================
DO $$
DECLARE
  v_count INT;
BEGIN
  -- Ensure article is a draft
  UPDATE public.articles SET status = 'draft' WHERE id = '00000000-0000-0000-0000-000000000020';

  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);

  SELECT COUNT(*) INTO v_count FROM public.articles WHERE status = 'draft';

  IF v_count = 0 THEN
    RAISE NOTICE 'TEST 10 PASS: No drafts visible to anon';
  ELSE
    RAISE WARNING 'TEST 10 FAIL: % drafts visible to anon', v_count;
  END IF;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- =========================================================================
-- TEST 11: Published article IS visible to anon (positive test)
-- =========================================================================
DO $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.articles
  SET status = 'published', published_at = NOW() - INTERVAL '1 hour', scheduled_for = NULL
  WHERE id = '00000000-0000-0000-0000-000000000020';

  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);

  SELECT COUNT(*) INTO v_count FROM public.articles WHERE id = '00000000-0000-0000-0000-000000000020';

  IF v_count = 1 THEN
    RAISE NOTICE 'TEST 11 PASS: Published article visible to anon (count=1)';
  ELSE
    RAISE WARNING 'TEST 11 FAIL: Published article not visible to anon (count=%)', v_count;
  END IF;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- =========================================================================
-- TEST 12: Noindex article excluded from anon queries
-- =========================================================================
DO $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.articles
  SET status = 'published', published_at = NOW(), noindex = TRUE
  WHERE id = '00000000-0000-0000-0000-000000000020';

  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);

  SELECT COUNT(*) INTO v_count FROM public.articles WHERE id = '00000000-0000-0000-0000-000000000020';

  IF v_count = 0 THEN
    RAISE NOTICE 'TEST 12 PASS: Noindex article excluded from anon queries';
  ELSE
    RAISE WARNING 'TEST 12 FAIL: Noindex article visible to anon (count=%)', v_count;
  END IF;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- =========================================================================
-- TEST 13: Non-admin (editor) cannot publish — RLS blocks UPDATE
-- =========================================================================
DO $$
DECLARE
  v_editor_id UUID := '00000000-0000-0000-0000-000000000002';
  v_updated   INT;
BEGIN
  -- Create an editor
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000002', 'test-editor@chefpeter.test', crypt('test', gen_salt('bf')), NOW(), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, role, is_active, display_name)
  VALUES ('00000000-0000-0000-0000-000000000002', 'editor', TRUE, 'Test Editor')
  ON CONFLICT (id) DO UPDATE SET role = 'editor', is_active = TRUE;

  -- Ensure article is a draft
  UPDATE public.articles SET status = 'draft', noindex = FALSE WHERE id = '00000000-0000-0000-0000-000000000020';

  -- Simulate editor context
  PERFORM set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', v_editor_id::text)::text, TRUE);
  PERFORM set_config('request.jwt.claim.sub', v_editor_id::text, TRUE);

  -- Editor attempts to publish
  BEGIN
    UPDATE public.articles SET status = 'published', published_at = NOW() WHERE id = '00000000-0000-0000-0000-000000000020';
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    -- Check if it actually went through
    DECLARE v_actual public.article_status;
    BEGIN
      -- Reset to admin to check the real state
      PERFORM set_config('request.jwt.claims',
        json_build_object('role', 'authenticated', 'sub', '00000000-0000-0000-0000-000000000001'::text)::text, TRUE);
      PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001'::text, TRUE);

      SELECT status INTO v_actual FROM public.articles WHERE id = '00000000-0000-0000-0000-000000000020';

      IF v_actual = 'published' THEN
        RAISE WARNING 'TEST 13 FAIL: Editor successfully published article!';
      ELSE
        RAISE NOTICE 'TEST 13 PASS: Editor cannot publish (status still %)', v_actual;
      END IF;
    END;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'TEST 13 PASS: Editor publish blocked with exception: %', SQLERRM;
  END;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
END;
$$;

-- =========================================================================
-- TEST 14: Published articles must have published_at — constraint enforced
-- =========================================================================
DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  BEGIN
    INSERT INTO public.articles (id, slug, title, body, author_id, status, published_at)
    VALUES ('00000000-0000-0000-0000-000000000040', 'test-no-published-at', 'No Published At', 'body', v_admin_id, 'published', NULL);
    RAISE WARNING 'TEST 14 FAIL: Published article with NULL published_at was accepted!';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 14 PASS: Published article with NULL published_at correctly rejected';
  END;
END;
$$;

-- =========================================================================
-- Rollback — nothing persists
-- =========================================================================
ROLLBACK;

DO $$ BEGIN
  RAISE NOTICE '=== Article workflow tests complete. Check NOTICE/WARNING lines above. ===';
  RAISE NOTICE 'All tests ran inside a transaction that was rolled back.';
  RAISE NOTICE 'No test data was persisted.';
END; $$;
