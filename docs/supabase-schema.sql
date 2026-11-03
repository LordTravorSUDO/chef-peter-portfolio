-- =============================================================================
-- CHEF PETER PORTFOLIO — SUPABASE DATABASE SCHEMA
-- =============================================================================
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- Or via Supabase CLI: supabase db push
--
-- Tables: articles, categories, tags, article_tags
-- Auth:   Supabase Auth (email + password, single admin user)
-- Storage bucket: article-media (defined separately in Supabase dashboard)
-- =============================================================================

-- Enable the pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUM: article publication status
-- =============================================================================
CREATE TYPE article_status AS ENUM ('draft', 'published', 'scheduled', 'archived');

-- =============================================================================
-- TABLE: categories
-- =============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT,                          -- hex colour for badge display
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: articles
-- =============================================================================
CREATE TABLE IF NOT EXISTS articles (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT           NOT NULL UNIQUE,
  title                 TEXT           NOT NULL,
  excerpt               TEXT           NOT NULL DEFAULT '',
  content               TEXT           NOT NULL DEFAULT '',  -- stored as HTML
  cover_image_url       TEXT,
  cover_image_alt       TEXT,
  category_id           UUID           REFERENCES categories(id) ON DELETE SET NULL,
  author_name           TEXT           NOT NULL DEFAULT 'Chef Peter the Teacher',
  status                article_status NOT NULL DEFAULT 'draft',
  published_at          TIMESTAMPTZ,
  scheduled_for         TIMESTAMPTZ,
  meta_title            TEXT,
  meta_description      TEXT,
  og_image_url          TEXT,
  reading_time_minutes  INT,
  view_count            INT            NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: tags
-- =============================================================================
CREATE TABLE IF NOT EXISTS tags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT        NOT NULL UNIQUE,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: article_tags  (many-to-many join)
-- =============================================================================
CREATE TABLE IF NOT EXISTS article_tags (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_articles_slug        ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status      ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published   ON articles(published_at DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_articles_category    ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_tag     ON article_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug      ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_tags_slug            ON tags(slug);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Public readers can see published articles and all categories/tags.
-- Only authenticated users (the admin) can insert, update or delete.

ALTER TABLE articles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;

-- Public: read published articles only
CREATE POLICY "Public can read published articles"
  ON articles FOR SELECT
  USING (status = 'published' AND published_at <= NOW());

-- Authenticated admin: full access to articles
CREATE POLICY "Authenticated users have full article access"
  ON articles FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Public: read all categories
CREATE POLICY "Public can read categories"
  ON categories FOR SELECT USING (TRUE);

-- Authenticated admin: manage categories
CREATE POLICY "Authenticated users manage categories"
  ON categories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Public: read all tags
CREATE POLICY "Public can read tags"
  ON tags FOR SELECT USING (TRUE);

-- Authenticated admin: manage tags
CREATE POLICY "Authenticated users manage tags"
  ON tags FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Public: read article_tags
CREATE POLICY "Public can read article_tags"
  ON article_tags FOR SELECT USING (TRUE);

-- Authenticated admin: manage article_tags
CREATE POLICY "Authenticated users manage article_tags"
  ON article_tags FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- INITIAL CATEGORIES (optional seed — delete if not needed)
-- =============================================================================
-- INSERT INTO categories (slug, name, color) VALUES
--   ('recipes',          'Recipes',            '#C5A059'),
--   ('food-history',     'Food History',        '#4A777A'),
--   ('kitchen-tips',     'Kitchen Tips',        '#1B365D'),
--   ('hospitality',      'Hospitality',         '#D99B26'),
--   ('baking',           'Baking & Pastry',     '#8C6B2D');
