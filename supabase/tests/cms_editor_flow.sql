-- =============================================================================
-- CMS EDITOR FLOW — end-to-end database test with real RLS
-- =============================================================================
-- Runs the same statements the admin editor (src/lib/services/articles.ts,
-- taxonomy.ts) sends, under the real database roles:
--   SET ROLE authenticated + JWT sub claim  → the signed-in admin/editor
--   SET ROLE anon                           → the public website
--   SET ROLE service_role                   → the Vercel cron job
-- Unlike tests that run as the postgres superuser, RLS is actually enforced.
--
-- Run in the Supabase SQL Editor (or psql) after all migrations.
-- Everything runs in one transaction and is ROLLED BACK — nothing persists.
-- Any failure raises an exception and aborts; success ends with
-- "CMS EDITOR FLOW: ALL CHECKS PASSED".
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'flow-admin@chefpeter.test'),
  ('22222222-2222-2222-2222-222222222222', 'flow-editor@chefpeter.test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, role, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Flow Admin',  'admin',  TRUE),
  ('22222222-2222-2222-2222-222222222222', 'Flow Editor', 'editor', TRUE)
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, is_active = TRUE;

INSERT INTO public.media (id, storage_path, original_filename, mime_type, file_size_bytes, alt_text, uploaded_by)
VALUES ('33333333-3333-3333-3333-333333333333', 'uploads/flow-test.jpg', 'flow-test.jpg', 'image/jpeg', 1000, 'Flow test image',
        '11111111-1111-1111-1111-111111111111');
INSERT INTO public.categories (id, slug, name) VALUES ('44444444-4444-4444-4444-444444444444', 'flow-test-category', 'Flow Test Category');
INSERT INTO public.tags       (id, slug, name) VALUES ('55555555-5555-5555-5555-555555555555', 'flow-test-tag',      'Flow Test Tag');

CREATE TEMP TABLE flow (k text PRIMARY KEY, v text);
GRANT ALL ON flow TO anon, authenticated, service_role;

-- Helpers to act as a given role/user for the rest of the transaction
CREATE FUNCTION pg_temp.act_as_admin() RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  PERFORM set_config('role', 'authenticated', true);
END $$;
CREATE FUNCTION pg_temp.act_as_editor() RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  PERFORM set_config('role', 'authenticated', true);
END $$;
CREATE FUNCTION pg_temp.act_as_anon() RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('role', 'anon', true);
END $$;
CREATE FUNCTION pg_temp.act_as_service() RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('role', 'service_role', true);
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.act_as_admin(), pg_temp.act_as_editor(), pg_temp.act_as_anon(), pg_temp.act_as_service()
  TO anon, authenticated, service_role;

-- Public website query (getPublishedArticleBySlug filters + RLS)
CREATE FUNCTION pg_temp.public_count(p_slug text) RETURNS int LANGUAGE sql AS $$
  SELECT count(*)::int FROM public.articles
  WHERE slug = p_slug AND status = 'published' AND published_at <= now() $$;
GRANT EXECUTE ON FUNCTION pg_temp.public_count(text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Create a draft (createArticle payload) as the admin
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_id uuid; v_status public.article_status;
BEGIN
  PERFORM pg_temp.act_as_admin();
  INSERT INTO public.articles (title, slug, excerpt, body, featured_image_id, social_image_id,
                               seo_title, meta_description, canonical_url, noindex,
                               status, author_id, author_display_name, published_at, scheduled_for)
  VALUES ('Flow Test Article', 'flow-test-article', 'An excerpt', '<p>First version of the body.</p>',
          '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
          'Flow SEO title', 'Flow meta description', NULL, FALSE,
          'draft', '11111111-1111-1111-1111-111111111111', 'Flow Admin', NULL, NULL)
  RETURNING id, status INTO v_id, v_status;
  IF v_id IS NULL OR v_status <> 'draft' THEN RAISE EXCEPTION '1 FAIL: draft not created'; END IF;
  INSERT INTO flow VALUES ('id', v_id::text);

  -- taxonomy (setArticleCategories / setArticleTags)
  DELETE FROM public.article_categories WHERE article_id = v_id;
  INSERT INTO public.article_categories (article_id, category_id, is_primary) VALUES (v_id, '44444444-4444-4444-4444-444444444444', TRUE);
  DELETE FROM public.article_tags WHERE article_id = v_id;
  INSERT INTO public.article_tags (article_id, tag_id) VALUES (v_id, '55555555-5555-5555-5555-555555555555');
  RAISE NOTICE '1 PASS: admin created draft % with category, tag, featured image', v_id;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Draft is invisible to the public
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  PERFORM pg_temp.act_as_anon();
  IF (SELECT count(*) FROM public.articles WHERE slug = 'flow-test-article') <> 0 THEN
    RAISE EXCEPTION '2 FAIL: anon can read the draft';
  END IF;
  RAISE NOTICE '2 PASS: draft hidden from the public';
END $$;

-- ---------------------------------------------------------------------------
-- 3. Edit the draft (updateArticle content payload — no status column)
--    The same row is updated; nothing is duplicated; a revision is recorded.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_id uuid := (SELECT v::uuid FROM flow WHERE k = 'id'); v_rows int; v_rev int; v_total int;
BEGIN
  PERFORM pg_temp.act_as_admin();
  UPDATE public.articles SET title = 'Flow Test Article (edited)', excerpt = 'Edited excerpt',
         body = '<p>Second version of the body with more words.</p>',
         featured_image_id = '33333333-3333-3333-3333-333333333333', social_image_id = '33333333-3333-3333-3333-333333333333',
         seo_title = 'Flow SEO title', meta_description = 'Flow meta description', canonical_url = NULL, noindex = FALSE,
         slug = 'flow-test-article'
  WHERE id = v_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  SELECT count(*) INTO v_total FROM public.articles WHERE slug = 'flow-test-article';
  SELECT count(*) INTO v_rev FROM public.article_revisions WHERE article_id = v_id;
  IF v_rows <> 1 OR v_total <> 1 THEN RAISE EXCEPTION '3 FAIL: rows=% total=%', v_rows, v_total; END IF;
  IF v_rev < 1 THEN RAISE EXCEPTION '3 FAIL: no revision recorded'; END IF;
  IF (SELECT status FROM public.articles WHERE id = v_id) <> 'draft' THEN RAISE EXCEPTION '3 FAIL: status changed by content save'; END IF;
  RAISE NOTICE '3 PASS: draft updated in place (1 row, % revision(s))', v_rev;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Invalid slug (trailing hyphen) is rejected by the DB constraint
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  PERFORM pg_temp.act_as_admin();
  BEGIN
    UPDATE public.articles SET slug = 'flow-test-' WHERE id = (SELECT v::uuid FROM flow WHERE k = 'id');
    RAISE EXCEPTION '4 FAIL: trailing-hyphen slug accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '4 PASS: slug format enforced (%)', SQLERRM;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- 5. A non-admin cannot change the article (UPDATE matches 0 rows —
--    the app's .select().single() turns this into a visible error)
-- ---------------------------------------------------------------------------
DO $$ DECLARE v_rows int; BEGIN
  PERFORM pg_temp.act_as_editor();
  UPDATE public.articles SET status = 'published' WHERE id = (SELECT v::uuid FROM flow WHERE k = 'id');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN RAISE EXCEPTION '5 FAIL: editor changed % row(s)', v_rows; END IF;
  RAISE NOTICE '5 PASS: non-admin update affected 0 rows';
END $$;

-- ---------------------------------------------------------------------------
-- 6. Publish now (publishArticle: status=published, scheduled_for=null)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_id uuid := (SELECT v::uuid FROM flow WHERE k = 'id'); v_pub timestamptz; v_status public.article_status;
BEGIN
  PERFORM pg_temp.act_as_admin();
  UPDATE public.articles SET status = 'published', scheduled_for = NULL WHERE id = v_id
  RETURNING published_at, status INTO v_pub, v_status;
  IF v_status <> 'published' OR v_pub IS NULL THEN RAISE EXCEPTION '6 FAIL: status=% published_at=%', v_status, v_pub; END IF;
  INSERT INTO flow VALUES ('published_at', v_pub::text);
  RAISE NOTICE '6 PASS: published, published_at=% (UTC)', v_pub;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Public website sees it, with category, tag and featured image
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_id uuid := (SELECT v::uuid FROM flow WHERE k = 'id'); v_cat text; v_tag text; v_img text; v_seo text;
BEGIN
  PERFORM pg_temp.act_as_anon();
  IF pg_temp.public_count('flow-test-article') <> 1 THEN RAISE EXCEPTION '7 FAIL: published article not public'; END IF;
  SELECT c.slug INTO v_cat FROM public.article_categories ac JOIN public.categories c ON c.id = ac.category_id WHERE ac.article_id = v_id AND ac.is_primary;
  SELECT t.slug INTO v_tag FROM public.article_tags at JOIN public.tags t ON t.id = at.tag_id WHERE at.article_id = v_id;
  SELECT m.storage_path INTO v_img FROM public.articles a JOIN public.media m ON m.id = a.featured_image_id WHERE a.id = v_id;
  SELECT seo_title INTO v_seo FROM public.articles WHERE id = v_id;
  IF v_cat IS DISTINCT FROM 'flow-test-category' OR v_tag IS DISTINCT FROM 'flow-test-tag'
     OR v_img IS DISTINCT FROM 'uploads/flow-test.jpg' OR v_seo IS DISTINCT FROM 'Flow SEO title' THEN
    RAISE EXCEPTION '7 FAIL: cat=% tag=% img=% seo=%', v_cat, v_tag, v_img, v_seo;
  END IF;
  RAISE NOTICE '7 PASS: public sees article + category + tag + featured image + SEO title';
END $$;

-- ---------------------------------------------------------------------------
-- 8. Autosave after publishing (content-only payload) keeps it published
-- ---------------------------------------------------------------------------
DO $$ DECLARE v_id uuid := (SELECT v::uuid FROM flow WHERE k = 'id'); BEGIN
  PERFORM pg_temp.act_as_admin();
  UPDATE public.articles SET body = '<p>Edited after publishing.</p>' WHERE id = v_id;
  IF (SELECT status FROM public.articles WHERE id = v_id) <> 'published' THEN RAISE EXCEPTION '8 FAIL: content save unpublished the article'; END IF;
  RAISE NOTICE '8 PASS: content save after publish keeps status=published';
END $$;

-- ---------------------------------------------------------------------------
-- 9. Unpublish (status=draft) — hidden again, published_at preserved
-- ---------------------------------------------------------------------------
DO $$ DECLARE v_id uuid := (SELECT v::uuid FROM flow WHERE k = 'id'); v_pub timestamptz; BEGIN
  PERFORM pg_temp.act_as_admin();
  UPDATE public.articles SET status = 'draft', scheduled_for = NULL WHERE id = v_id RETURNING published_at INTO v_pub;
  IF v_pub IS DISTINCT FROM (SELECT v::timestamptz FROM flow WHERE k = 'published_at') THEN RAISE EXCEPTION '9 FAIL: published_at changed'; END IF;
  PERFORM pg_temp.act_as_anon();
  IF pg_temp.public_count('flow-test-article') <> 0 THEN RAISE EXCEPTION '9 FAIL: unpublished article still public'; END IF;
  RAISE NOTICE '9 PASS: unpublished, hidden from public, published_at preserved';
END $$;

-- ---------------------------------------------------------------------------
-- 10. Schedule (status=scheduled, future UTC time) — still hidden
-- ---------------------------------------------------------------------------
DO $$ DECLARE v_id uuid := (SELECT v::uuid FROM flow WHERE k = 'id'); v_rows int; BEGIN
  PERFORM pg_temp.act_as_admin();
  UPDATE public.articles SET status = 'scheduled', scheduled_for = now() + interval '2 days' WHERE id = v_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION '10 FAIL: schedule update rows=%', v_rows; END IF;
  PERFORM pg_temp.act_as_anon();
  IF pg_temp.public_count('flow-test-article') <> 0 THEN RAISE EXCEPTION '10 FAIL: scheduled article is public'; END IF;
  RAISE NOTICE '10 PASS: scheduled for the future, hidden from public';
END $$;

-- ---------------------------------------------------------------------------
-- 11. Cron before the time: nothing is published
-- ---------------------------------------------------------------------------
DO $$ DECLARE v_res jsonb; BEGIN
  PERFORM pg_temp.act_as_service();
  v_res := public.publish_scheduled_articles('manual');
  IF (v_res->>'published_count')::int <> 0 THEN RAISE EXCEPTION '11 FAIL: published early: %', v_res; END IF;
  RAISE NOTICE '11 PASS: cron run before scheduled time published nothing';
END $$;

-- Simulate the scheduled time passing (as postgres; created_at moved back too
-- so the articles_scheduled_future check still holds)
RESET ROLE;
UPDATE public.articles SET created_at = now() - interval '3 days', scheduled_for = now() - interval '1 minute'
WHERE id = (SELECT v::uuid FROM flow WHERE k = 'id');

-- ---------------------------------------------------------------------------
-- 12. Cron after the time: published exactly once
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_id uuid := (SELECT v::uuid FROM flow WHERE k = 'id'); v1 jsonb; v2 jsonb; v_events int; v_pub timestamptz;
BEGIN
  PERFORM pg_temp.act_as_service();
  v1 := public.publish_scheduled_articles('manual');
  v2 := public.publish_scheduled_articles('manual');
  SELECT count(*) INTO v_events FROM public.article_events
   WHERE article_id = v_id AND event_type = 'published' AND payload->>'previous_status' = 'scheduled';
  SELECT published_at INTO v_pub FROM public.articles WHERE id = v_id;
  IF (v1->>'published_count')::int <> 1 THEN RAISE EXCEPTION '12 FAIL: first run %', v1; END IF;
  IF (v2->>'published_count')::int <> 0 THEN RAISE EXCEPTION '12 FAIL: second run republished %', v2; END IF;
  IF (SELECT status FROM public.articles WHERE id = v_id) <> 'published' THEN RAISE EXCEPTION '12 FAIL: not published'; END IF;
  IF (SELECT scheduled_for FROM public.articles WHERE id = v_id) IS NOT NULL THEN RAISE EXCEPTION '12 FAIL: scheduled_for not cleared'; END IF;
  IF v_pub IS DISTINCT FROM (SELECT v::timestamptz FROM flow WHERE k = 'published_at') THEN RAISE EXCEPTION '12 FAIL: original published_at lost'; END IF;
  -- one event from the scheduler function, one from the status-change trigger; never more
  IF v_events NOT BETWEEN 1 AND 2 THEN RAISE EXCEPTION '12 FAIL: % publish events', v_events; END IF;
  PERFORM pg_temp.act_as_anon();
  IF pg_temp.public_count('flow-test-article') <> 1 THEN RAISE EXCEPTION '12 FAIL: not public after cron'; END IF;
  RAISE NOTICE '12 PASS: cron published once (2nd run: 0), public again, original published_at kept';
END $$;

RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'CMS EDITOR FLOW: ALL CHECKS PASSED'; END $$;
ROLLBACK;
