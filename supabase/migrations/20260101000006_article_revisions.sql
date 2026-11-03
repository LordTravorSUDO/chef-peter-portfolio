-- =============================================================================
-- Migration 007: article_revisions — version history and restore capability
-- =============================================================================
-- Run order: 7 of 8
--
-- A revision is created automatically whenever an article's title or body
-- changes. The trigger captures the state BEFORE the update so you always
-- have the previous version available for restore.
--
-- Restoration: copy a revision's content back into articles and mark it
-- as a new revision. Hard-delete of revisions is admin-only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.article_revisions (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id   UUID         NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  -- Revision number — incremented per article
  revision_no  INT          NOT NULL,
  -- Snapshot of the article body at this point in time
  title        TEXT         NOT NULL,
  body         TEXT         NOT NULL,
  excerpt      TEXT         NOT NULL DEFAULT '',
  -- Who saved this version
  saved_by     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  -- Human-readable change summary (optional, set by the editor)
  change_note  TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (article_id, revision_no)
);

COMMENT ON TABLE public.article_revisions IS
  'Immutable snapshots of article title/body before each save. Admin-restorable.';
COMMENT ON COLUMN public.article_revisions.revision_no IS
  'Monotonically increasing per article. Determined by trigger.';

CREATE INDEX IF NOT EXISTS idx_revisions_article   ON public.article_revisions(article_id, revision_no DESC);
CREATE INDEX IF NOT EXISTS idx_revisions_saved_by  ON public.article_revisions(saved_by);

-- ---------------------------------------------------------------------------
-- Trigger: create a revision before every title/body UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_article_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_revision INT;
  v_saver         UUID;
BEGIN
  -- Only snapshot when content actually changed
  IF (OLD.title IS NOT DISTINCT FROM NEW.title)
     AND (OLD.body IS NOT DISTINCT FROM NEW.body)
     AND (OLD.excerpt IS NOT DISTINCT FROM NEW.excerpt)
  THEN
    RETURN NEW;
  END IF;

  -- Determine the next revision number for this article
  SELECT COALESCE(MAX(revision_no), 0) + 1
  INTO   v_next_revision
  FROM   public.article_revisions
  WHERE  article_id = OLD.id;

  -- Identify the user performing the update
  v_saver := COALESCE(auth.uid(), OLD.author_id);

  INSERT INTO public.article_revisions (
    article_id, revision_no, title, body, excerpt, saved_by
  ) VALUES (
    OLD.id, v_next_revision, OLD.title, OLD.body, OLD.excerpt, v_saver
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_create_revision ON public.articles;
CREATE TRIGGER articles_create_revision
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.create_article_revision();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;

-- Anonymous users must never see revision history
CREATE POLICY "Admins read revisions"
  ON public.article_revisions FOR SELECT
  USING (public.is_admin());

-- Revisions are insert-only via trigger (SECURITY DEFINER, runs as postgres)
-- Block direct client inserts
CREATE POLICY "No direct client inserts on revisions"
  ON public.article_revisions FOR INSERT
  WITH CHECK (FALSE);  -- trigger runs as owner, bypasses RLS

-- Admins may hard-delete old revisions (e.g. for GDPR / storage cleanup)
CREATE POLICY "Admins delete revisions"
  ON public.article_revisions FOR DELETE
  USING (public.is_admin());
