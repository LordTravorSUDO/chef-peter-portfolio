-- =============================================================================
-- Migration 005: categories and tags (no article FKs yet — articles come next)
-- =============================================================================
-- Run order: 5 of 8
-- article_categories and article_tags join tables are in migration 006
-- because they foreign-key into articles which is also created in 006.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CITEXT provides case-insensitive uniqueness enforcement
  slug        CITEXT       NOT NULL UNIQUE,
  name        TEXT         NOT NULL,
  description TEXT,
  -- Optional representative image from the media table (added via FK after media is created)
  image_id    UUID         REFERENCES public.media(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

COMMENT ON TABLE public.categories IS
  'Content categories. Each article may have one primary category.';

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

DROP TRIGGER IF EXISTS categories_updated_at ON public.categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       CITEXT       NOT NULL UNIQUE,
  name       TEXT         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT tags_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

COMMENT ON TABLE public.tags IS
  'Content tags. An article may have many tags.';

CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);

-- ---------------------------------------------------------------------------
-- Row Level Security — categories
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read categories"
  ON public.categories FOR SELECT USING (TRUE);

CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Row Level Security — tags
-- ---------------------------------------------------------------------------
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read tags"
  ON public.tags FOR SELECT USING (TRUE);

CREATE POLICY "Admins manage tags"
  ON public.tags FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
