-- =============================================================================
-- Migration 008: redirects — store old article paths → new destinations
-- =============================================================================
-- Run order: 8 of 8
--
-- When an article slug changes or an article is archived/deleted, a redirect
-- row should be created so that old bookmarks and inbound links still resolve.
--
-- The frontend reads this table on 404 to attempt a lookup and redirect
-- automatically. A Vercel Edge Middleware approach is an alternative for
-- performance-critical cases (deferred to Milestone 4).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.redirects (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The old path the user arrived at, e.g. /articles/old-slug
  from_path    TEXT         NOT NULL UNIQUE
                              CHECK (from_path ~ '^/'),
  -- The new destination path or full URL
  to_path      TEXT         NOT NULL
                              CHECK (char_length(to_path) >= 1),
  -- HTTP status code: 301 (permanent) or 302 (temporary)
  status_code  SMALLINT     NOT NULL DEFAULT 301
                              CHECK (status_code IN (301, 302)),
  -- Optional: the article this redirect was generated from
  article_id   UUID         REFERENCES public.articles(id) ON DELETE SET NULL,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.redirects IS
  'Maps old article paths to new destinations. Read by the frontend on 404.';
COMMENT ON COLUMN public.redirects.from_path IS
  'Must start with /. Example: /articles/old-sourdough-guide';
COMMENT ON COLUMN public.redirects.to_path IS
  'New path or full URL. Example: /articles/sourdough-bread-guide';

CREATE INDEX IF NOT EXISTS idx_redirects_from_path  ON public.redirects(from_path);
CREATE INDEX IF NOT EXISTS idx_redirects_active      ON public.redirects(is_active) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS redirects_updated_at ON public.redirects;
CREATE TRIGGER redirects_updated_at
  BEFORE UPDATE ON public.redirects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

-- Public reads active redirects (needed for 404 → redirect lookups in the SPA)
CREATE POLICY "Public reads active redirects"
  ON public.redirects FOR SELECT
  USING (is_active = TRUE);

-- Admins can read all (including inactive)
CREATE POLICY "Admins read all redirects"
  ON public.redirects FOR SELECT
  USING (public.is_admin());

-- Only admins can create, update or delete redirect rules
CREATE POLICY "Admins manage redirects"
  ON public.redirects FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
