-- =============================================================================
-- PROPOSED MIGRATION — CULINARY KNOWLEDGE PLATFORM  (NOT YET APPLIED)
-- =============================================================================
-- Status: awaiting the site owner's approval. This file lives in
-- supabase/proposed/ so that no tool applies it automatically. When approved,
-- move it to supabase/migrations/ and apply it to a Supabase branch or local
-- stack first, run supabase/proposed/tests/knowledge_platform.sql, then apply
-- it to production. See docs/knowledge-platform.md.
--
-- What it does (additive only — no data is deleted or rewritten):
--   1. categories.sort_order, categories.is_active
--        Lets admins reorder categories and hide (deactivate) a category from
--        public navigation without deleting it or unlinking its articles.
--   2. articles.article_type
--        One of eight formats. Existing articles default to 'educational'.
--   3. articles.is_featured, articles.is_editors_pick
--        Editorial control of the featured article and "Editor's selection".
--   4. articles.recipe (JSONB, nullable)
--        Optional structured recipe/tutorial data (ingredients, times,
--        equipment, steps, notes, storage, allergens). NULL for every
--        existing article.
--   5. Seeds the seven educational categories (skipped if a slug exists).
--
-- What it does NOT do:
--   - No RLS policy, grant, function, trigger, auth or storage change.
--     Existing policies already cover the new columns: the public can read
--     published articles and all categories; only admins can write.
--   - No change to article IDs, slugs, dates, authors, images or SEO fields.
--   - No reassignment of existing articles to the new categories (an
--     editorial task done in the CMS).
--
-- Performance: ADD COLUMN with a constant default is a metadata-only change
-- in PostgreSQL 11+ (no table rewrite, no long lock).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Categories: ordering and activation
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.categories.sort_order IS
  'Display order in public navigation (ascending). Existing categories default to 100.';
COMMENT ON COLUMN public.categories.is_active IS
  'FALSE hides the category from public navigation. Articles and links are kept.';

CREATE INDEX IF NOT EXISTS idx_categories_active_order
  ON public.categories (is_active, sort_order, name);

-- ---------------------------------------------------------------------------
-- 2–4. Articles: type, editorial flags, structured recipe data
-- ---------------------------------------------------------------------------
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS article_type    TEXT    NOT NULL DEFAULT 'educational',
  ADD COLUMN IF NOT EXISTS is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_editors_pick BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recipe          JSONB;

DO $$ BEGIN
  ALTER TABLE public.articles
    ADD CONSTRAINT articles_article_type_check CHECK (article_type IN (
      'educational',        -- Educational article
      'cooking_tutorial',   -- Cooking tutorial
      'recipe',             -- Recipe
      'kitchen_guide',      -- Professional kitchen guide
      'food_history',       -- Food history feature
      'ingredient_guide',   -- Ingredient guide
      'baking_tutorial',    -- Baking and pastry tutorial
      'food_safety_guide'   -- Food safety guide
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.articles
    ADD CONSTRAINT articles_recipe_is_object
    CHECK (recipe IS NULL OR jsonb_typeof(recipe) = 'object');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.articles.article_type IS
  'Editorial format. Controls which structured fields the CMS offers and the public layout.';
COMMENT ON COLUMN public.articles.is_featured IS
  'Shown as the featured article on /articles (most recent featured wins).';
COMMENT ON COLUMN public.articles.is_editors_pick IS
  'Listed in the Editor''s selection on /articles.';
COMMENT ON COLUMN public.articles.recipe IS
  'Optional structured data for recipes and tutorials. Shape documented in src/lib/knowledge/recipe.ts.';

CREATE INDEX IF NOT EXISTS idx_articles_type
  ON public.articles (article_type);
CREATE INDEX IF NOT EXISTS idx_articles_featured
  ON public.articles (published_at DESC) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_articles_editors_pick
  ON public.articles (published_at DESC) WHERE is_editors_pick = TRUE;

-- ---------------------------------------------------------------------------
-- 5. Seed the seven educational categories (never overwrites existing rows)
-- ---------------------------------------------------------------------------
INSERT INTO public.categories (slug, name, description, sort_order, is_active)
VALUES
  ('food-history-and-culinary-culture', 'Food History and Culinary Culture',
   'Where dishes and food traditions come from, and the people, places and customs that shaped them — in Uganda, across Africa and around the world.', 1, TRUE),
  ('ingredients-and-food-science', 'Ingredients and Food Science',
   'How ingredients behave and why: selection, seasonality, storage and the science behind cooking and baking results.', 2, TRUE),
  ('professional-cooking-techniques', 'Professional Cooking Techniques',
   'Core methods explained step by step — knife work, stocks and sauces, heat control and the techniques used in professional kitchens.', 3, TRUE),
  ('international-cuisines', 'International Cuisines',
   'Dishes and cooking styles from around the world, with guidance on preparing them in African kitchens with locally available ingredients.', 4, TRUE),
  ('pastry-and-bakery', 'Pastry and Bakery',
   'Breads, pastry, cakes and confectionery — formulas, methods, troubleshooting and bakery production.', 5, TRUE),
  ('food-safety-and-hygiene', 'Food Safety and Hygiene',
   'Safe handling, storage, cleaning and temperature control for home and professional kitchens.', 6, TRUE),
  ('professional-kitchen-skills', 'Professional Kitchen Skills',
   'Organisation, costing, menu planning, teamwork and the working habits of a professional kitchen.', 7, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- ROLLBACK (manual — run only if the change must be reversed)
-- -----------------------------------------------------------------------------
-- Dropping the columns removes article types, flags and recipe data entered
-- after the migration. Take a backup first. Seeded categories are NOT removed
-- automatically because articles may already be linked to them.
--
--   DROP INDEX IF EXISTS public.idx_articles_editors_pick;
--   DROP INDEX IF EXISTS public.idx_articles_featured;
--   DROP INDEX IF EXISTS public.idx_articles_type;
--   ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_recipe_is_object;
--   ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_article_type_check;
--   ALTER TABLE public.articles
--     DROP COLUMN IF EXISTS recipe,
--     DROP COLUMN IF EXISTS is_editors_pick,
--     DROP COLUMN IF EXISTS is_featured,
--     DROP COLUMN IF EXISTS article_type;
--   DROP INDEX IF EXISTS public.idx_categories_active_order;
--   ALTER TABLE public.categories
--     DROP COLUMN IF EXISTS is_active,
--     DROP COLUMN IF EXISTS sort_order;
-- =============================================================================
