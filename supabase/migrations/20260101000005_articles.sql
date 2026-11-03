-- =============================================================================
-- Migration 006: articles table + article_categories + article_tags join tables
-- =============================================================================
-- Run order: 6 of 8
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.articles (
  -- Identity
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  CITEXT            NOT NULL UNIQUE,

  -- Content
  title                 TEXT              NOT NULL CHECK (char_length(title) BETWEEN 1 AND 255),
  excerpt               TEXT              NOT NULL DEFAULT '',
  -- Body is stored as sanitised HTML produced by the rich-text editor
  body                  TEXT              NOT NULL DEFAULT '',
  -- Computed and stored for display; updated by trigger on body change
  reading_time_minutes  SMALLINT          GENERATED ALWAYS AS (
                          GREATEST(1, (array_length(regexp_split_to_array(trim(body), '\s+'), 1) / 200))
                        ) STORED,

  -- Authorship
  author_id             UUID              NOT NULL REFERENCES public.profiles(id)
                                            ON DELETE RESTRICT,
  author_display_name   TEXT              NOT NULL DEFAULT 'Chef Peter the Teacher',

  -- Featured image (references the media table)
  featured_image_id     UUID              REFERENCES public.media(id)
                                            ON DELETE SET NULL,

  -- Publication lifecycle
  status                public.article_status NOT NULL DEFAULT 'draft',
  published_at          TIMESTAMPTZ,
  scheduled_for         TIMESTAMPTZ,

  -- SEO fields
  seo_title             TEXT              CHECK (char_length(seo_title) <= 70),
  meta_description      TEXT              CHECK (char_length(meta_description) <= 160),
  canonical_url         TEXT,
  noindex               BOOLEAN           NOT NULL DEFAULT FALSE,
  -- Social share image (can differ from featured image)
  social_image_id       UUID              REFERENCES public.media(id)
                                            ON DELETE SET NULL,

  -- Counters
  view_count            BIGINT            NOT NULL DEFAULT 0 CHECK (view_count >= 0),

  -- Timestamps
  created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT articles_slug_format      CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- published_at must be set when status is 'published'
  CONSTRAINT articles_published_at_set CHECK (
    status <> 'published' OR published_at IS NOT NULL
  ),
  -- scheduled_for must be set when status is 'scheduled'
  CONSTRAINT articles_scheduled_for_set CHECK (
    status <> 'scheduled' OR scheduled_for IS NOT NULL
  ),
  -- scheduled_for must be in the future relative to creation (soft check via trigger)
  CONSTRAINT articles_scheduled_future CHECK (
    scheduled_for IS NULL OR scheduled_for > created_at
  )
);

COMMENT ON TABLE public.articles IS
  'CMS articles authored by Chef Peter. Body is sanitised HTML.';
COMMENT ON COLUMN public.articles.body IS
  'Rich text body stored as sanitised HTML. Must be sanitised before insert/update.';
COMMENT ON COLUMN public.articles.reading_time_minutes IS
  'Derived from word count at ~200 wpm. Minimum 1. Automatically computed.';
COMMENT ON COLUMN public.articles.noindex IS
  'Set TRUE to inject <meta name="robots" content="noindex"> on the article page.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_articles_slug       ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status     ON public.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_author     ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_published  ON public.articles(published_at DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_articles_scheduled  ON public.articles(scheduled_for)
  WHERE status = 'scheduled';

-- Full-text search index on title + excerpt using pg_trgm
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm   ON public.articles USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_excerpt_trgm ON public.articles USING gin (excerpt gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS articles_updated_at ON public.articles;
CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Automatically set published_at when status flips to 'published'
-- and clear scheduled_for when the article is published or archived.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_article_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Set published_at to now when first published (not if reverting to draft)
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := COALESCE(NEW.published_at, NOW());
    NEW.scheduled_for := NULL;
  END IF;

  -- Clear scheduled_for when archived or returned to draft
  IF NEW.status IN ('archived', 'draft') THEN
    NEW.scheduled_for := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_publish ON public.articles;
CREATE TRIGGER articles_publish
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.handle_article_publish();

-- ---------------------------------------------------------------------------
-- article_categories (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_categories (
  article_id  UUID     NOT NULL REFERENCES public.articles(id)    ON DELETE CASCADE,
  category_id UUID     NOT NULL REFERENCES public.categories(id)  ON DELETE CASCADE,
  -- Marks this as the primary category for breadcrumbs and og:section
  is_primary  BOOLEAN  NOT NULL DEFAULT FALSE,
  PRIMARY KEY (article_id, category_id)
);

COMMENT ON TABLE public.article_categories IS
  'Many-to-many between articles and categories. is_primary=TRUE marks the main category.';

CREATE INDEX IF NOT EXISTS idx_article_categories_cat ON public.article_categories(category_id);

-- Enforce at most one primary category per article
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_category
  ON public.article_categories(article_id)
  WHERE is_primary = TRUE;

-- ---------------------------------------------------------------------------
-- article_tags (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_tags (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES public.tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

COMMENT ON TABLE public.article_tags IS
  'Many-to-many between articles and tags.';

CREATE INDEX IF NOT EXISTS idx_article_tags_tag ON public.article_tags(tag_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — articles
-- ---------------------------------------------------------------------------
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors see only fully published articles whose time has come
CREATE POLICY "Public reads published articles"
  ON public.articles FOR SELECT
  USING (
    status = 'published'
    AND published_at IS NOT NULL
    AND published_at <= NOW()
    AND noindex = FALSE  -- noindex articles are also hidden from anonymous queries
  );

-- Admins can read everything (drafts, scheduled, archived, noindex)
CREATE POLICY "Admins read all articles"
  ON public.articles FOR SELECT
  USING (public.is_admin());

-- Admins can insert new articles
CREATE POLICY "Admins insert articles"
  ON public.articles FOR INSERT
  WITH CHECK (
    public.is_admin()
    AND author_id = auth.uid()  -- author must be the logged-in admin
  );

-- Admins can update articles (publish, edit, schedule, archive)
CREATE POLICY "Admins update articles"
  ON public.articles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete drafts and archived articles
-- Published articles may not be hard-deleted; archive them first
CREATE POLICY "Admins delete non-published articles"
  ON public.articles FOR DELETE
  USING (
    public.is_admin()
    AND status IN ('draft', 'archived')
  );

-- ---------------------------------------------------------------------------
-- Row Level Security — article_categories
-- ---------------------------------------------------------------------------
ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads article_categories"
  ON public.article_categories FOR SELECT USING (TRUE);

CREATE POLICY "Admins manage article_categories"
  ON public.article_categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Row Level Security — article_tags
-- ---------------------------------------------------------------------------
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads article_tags"
  ON public.article_tags FOR SELECT USING (TRUE);

CREATE POLICY "Admins manage article_tags"
  ON public.article_tags FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
