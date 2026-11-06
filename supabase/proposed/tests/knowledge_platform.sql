-- =============================================================================
-- KNOWLEDGE PLATFORM MIGRATION — DATABASE-LEVEL TESTS (PROPOSED)
-- =============================================================================
-- Run against a Supabase BRANCH or LOCAL stack after applying
-- supabase/proposed/20261106000000_knowledge_platform.sql.
-- Each test prints PASS or FAIL to NOTICE output.
-- Everything runs inside a rolled-back transaction — nothing persists.
--
--   1. Seven educational categories exist with sort_order 1–7
--   2. Pre-existing categories keep their data and default to active, order 100
--   3. Existing articles default to article_type 'educational', no flags, recipe NULL
--   4. Invalid article_type is rejected
--   5. Non-object recipe JSON is rejected
--   6. Valid recipe object is stored and read back
--   7. Deactivating a category keeps its article links
--   8. Anonymous users can read published articles' new columns (RLS unchanged)
--   9. Anonymous users still cannot update categories
-- =============================================================================

BEGIN;

DO $$
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-0000000000a1', 'kp-test-admin@chefpeter.test',
          crypt('test', gen_salt('bf')), NOW(), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (id, role, is_active, display_name)
  VALUES ('00000000-0000-0000-0000-0000000000a1', 'admin', TRUE, 'KP Test Admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = TRUE;

  INSERT INTO public.articles (id, slug, title, excerpt, body, author_id, status, published_at)
  VALUES ('00000000-0000-0000-0000-0000000000b1', 'kp-test-published', 'KP test', 'x', '<p>x</p>',
          '00000000-0000-0000-0000-0000000000a1', 'published', NOW() - INTERVAL '1 day');
END $$;

-- 1
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM public.categories
  WHERE slug IN ('food-history-and-culinary-culture','ingredients-and-food-science','professional-cooking-techniques',
                 'international-cuisines','pastry-and-bakery','food-safety-and-hygiene','professional-kitchen-skills')
    AND sort_order BETWEEN 1 AND 7 AND is_active;
  RAISE NOTICE '1. seven categories seeded: %', CASE WHEN n = 7 THEN 'PASS' ELSE 'FAIL (' || n || ')' END;
END $$;

-- 2
DO $$
DECLARE bad INT;
BEGIN
  SELECT COUNT(*) INTO bad FROM public.categories
  WHERE slug NOT IN ('food-history-and-culinary-culture','ingredients-and-food-science','professional-cooking-techniques',
                     'international-cuisines','pastry-and-bakery','food-safety-and-hygiene','professional-kitchen-skills')
    AND (sort_order <> 100 OR is_active IS NOT TRUE);
  RAISE NOTICE '2. existing categories default active/100: %', CASE WHEN bad = 0 THEN 'PASS' ELSE 'FAIL' END;
END $$;

-- 3
DO $$
DECLARE r RECORD;
BEGIN
  SELECT article_type, is_featured, is_editors_pick, recipe INTO r
  FROM public.articles WHERE id = '00000000-0000-0000-0000-0000000000b1';
  RAISE NOTICE '3. article defaults: %',
    CASE WHEN r.article_type = 'educational' AND NOT r.is_featured AND NOT r.is_editors_pick AND r.recipe IS NULL
         THEN 'PASS' ELSE 'FAIL' END;
END $$;

-- 4
DO $$
BEGIN
  BEGIN
    UPDATE public.articles SET article_type = 'novel' WHERE id = '00000000-0000-0000-0000-0000000000b1';
    RAISE NOTICE '4. invalid article_type rejected: FAIL';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '4. invalid article_type rejected: PASS';
  END;
END $$;

-- 5
DO $$
BEGIN
  BEGIN
    UPDATE public.articles SET recipe = '["not","an","object"]'::jsonb WHERE id = '00000000-0000-0000-0000-0000000000b1';
    RAISE NOTICE '5. non-object recipe rejected: FAIL';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '5. non-object recipe rejected: PASS';
  END;
END $$;

-- 6
DO $$
DECLARE v JSONB;
BEGIN
  UPDATE public.articles
  SET article_type = 'recipe',
      recipe = '{"version":1,"servings":4,"ingredients":[{"quantity":"500","unit":"g","item":"matooke"}],"method":["Peel"]}'::jsonb
  WHERE id = '00000000-0000-0000-0000-0000000000b1';
  SELECT recipe INTO v FROM public.articles WHERE id = '00000000-0000-0000-0000-0000000000b1';
  RAISE NOTICE '6. recipe stored: %', CASE WHEN v->'ingredients'->0->>'item' = 'matooke' THEN 'PASS' ELSE 'FAIL' END;
END $$;

-- 7
DO $$
DECLARE cat UUID; n INT;
BEGIN
  SELECT id INTO cat FROM public.categories WHERE slug = 'pastry-and-bakery';
  INSERT INTO public.article_categories (article_id, category_id, is_primary)
  VALUES ('00000000-0000-0000-0000-0000000000b1', cat, TRUE);
  UPDATE public.categories SET is_active = FALSE WHERE id = cat;
  SELECT COUNT(*) INTO n FROM public.article_categories
  WHERE article_id = '00000000-0000-0000-0000-0000000000b1' AND category_id = cat;
  RAISE NOTICE '7. deactivation keeps article link: %', CASE WHEN n = 1 THEN 'PASS' ELSE 'FAIL' END;
END $$;

-- 8 & 9 — as the anonymous role
SET LOCAL ROLE anon;
DO $$
DECLARE t TEXT; n INT;
BEGIN
  SELECT article_type INTO t FROM public.articles WHERE slug = 'kp-test-published';
  RAISE NOTICE '8. anon reads new columns: %', CASE WHEN t = 'recipe' THEN 'PASS' ELSE 'FAIL' END;

  UPDATE public.categories SET sort_order = 0 WHERE slug = 'pastry-and-bakery';
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '9. anon cannot reorder categories: %', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE '9. anon cannot reorder categories: PASS (permission denied)';
END $$;
RESET ROLE;

ROLLBACK;
