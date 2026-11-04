-- =============================================================================
-- Migration: Scheduled publishing infrastructure (corrected)
-- =============================================================================
-- Replaces the never-applied 20260201000000_scheduler.sql (renamed in Git so
-- the uncorrected version can never be applied by the Supabase CLI).
--
-- Creates
--   * public.scheduler_runs   — one audit row per scheduler execution
--   * public.article_events   — one audit row per article status change
--   * public.publish_scheduled_articles(text) — publishes due articles
--   * public.log_article_event() + trigger articles_log_event on public.articles
--
-- Corrections relative to the original
--   1. EXECUTE on publish_scheduled_articles is revoked from PUBLIC/anon/
--      authenticated (this project's default privileges grant EXECUTE on new
--      public functions to anon and authenticated); only service_role may run it.
--   2. Each status change produces exactly ONE article_events row (written by
--      the trigger). The function no longer inserts a second "published" event.
--   3. published_ids / published_count list only the articles this execution
--      actually updated (UPDATE ... RETURNING), never rows another concurrent
--      run published.
--   4. Invalid or NULL triggered_by is rejected before any article is touched
--      and is logged as an error row (triggered_by = 'manual').
--   5. Policies are dropped-if-exists before creation (safe to re-run).
--   6. SECURITY DEFINER functions use search_path = '' with fully qualified
--      names.
--   7. Client roles get read-only (RLS-filtered) access to the audit tables;
--      writes happen only inside the SECURITY DEFINER functions.
--
-- Unchanged behaviour
--   * Only status='scheduled' AND scheduled_for <= now() articles are published;
--     drafts, archived, already-published and future-dated articles are untouched.
--   * published_at is preserved if already set (COALESCE), scheduled_for cleared.
--   * Existing articles triggers (revisions, publish, updated_at) are untouched.
--   * Vercel Cron (api/cron/publish-scheduled.ts, daily 0 0 * * *) calls the
--     function with p_triggered_by = 'cron'. No pg_cron job is created.
--
-- Depends on: public.articles, public.profiles, public.is_admin(), auth.uid().
-- Re-runnable: yes (IF NOT EXISTS / DROP ... IF EXISTS / CREATE OR REPLACE).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. scheduler_runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduler_runs (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  published_count  INT          NOT NULL DEFAULT 0,
  published_ids    UUID[]       NOT NULL DEFAULT '{}',
  error_message    TEXT,
  run_status       TEXT         NOT NULL DEFAULT 'success'
                                CHECK (run_status IN ('success', 'error', 'partial')),
  triggered_by     TEXT         NOT NULL DEFAULT 'cron'
                                CHECK (triggered_by IN ('cron', 'manual', 'pg_cron'))
);

COMMENT ON TABLE public.scheduler_runs IS
  'Audit log of scheduled-publishing executions. Written only by publish_scheduled_articles(); readable by admins.';

CREATE INDEX IF NOT EXISTS idx_scheduler_runs_at ON public.scheduler_runs (run_at DESC);

ALTER TABLE public.scheduler_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read scheduler runs" ON public.scheduler_runs;
CREATE POLICY "Admins read scheduler runs"
  ON public.scheduler_runs FOR SELECT
  USING (public.is_admin());

REVOKE ALL ON TABLE public.scheduler_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.scheduler_runs TO authenticated;   -- rows filtered by RLS (admins only)

-- ---------------------------------------------------------------------------
-- 2. article_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID         NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  event_type  TEXT         NOT NULL
              CHECK (event_type IN (
                'published', 'unpublished', 'archived', 'scheduled',
                'schedule_cancelled', 'restored', 'deleted'
              )),
  -- Who triggered the event (NULL = scheduler / system)
  actor_id    UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload     JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.article_events IS
  'Audit log of article status changes. Written only by the articles_log_event trigger; readable by admins.';

CREATE INDEX IF NOT EXISTS idx_article_events_article ON public.article_events (article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_events_type    ON public.article_events (event_type);

ALTER TABLE public.article_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read article events" ON public.article_events;
CREATE POLICY "Admins read article events"
  ON public.article_events FOR SELECT
  USING (public.is_admin());

REVOKE ALL ON TABLE public.article_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.article_events TO authenticated;   -- rows filtered by RLS (admins only)

-- ---------------------------------------------------------------------------
-- 3. publish_scheduled_articles(p_triggered_by)
-- ---------------------------------------------------------------------------
-- Idempotent: only articles still in status 'scheduled' with scheduled_for <=
-- now() are updated, so repeated or concurrent calls never publish twice
-- (a concurrent call waits for the row lock, re-checks the WHERE clause and
-- updates 0 rows).
-- Atomic: the UPDATE and the success log run inside one exception block; on
-- any error both are rolled back, an error row is logged and the function
-- returns {"status":"error"} instead of raising.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_scheduled_articles(
  p_triggered_by TEXT DEFAULT 'cron'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ids    UUID[] := '{}';
  v_count  INT    := 0;
  v_run_id UUID;
  v_error  TEXT;
BEGIN
  -- Reject unknown callers' labels before touching any article
  IF p_triggered_by IS NULL OR p_triggered_by NOT IN ('cron', 'manual', 'pg_cron') THEN
    v_error := format('Invalid triggered_by value: %s', coalesce(quote_literal(p_triggered_by), 'NULL'));
    INSERT INTO public.scheduler_runs (published_count, published_ids, run_status, triggered_by, error_message)
    VALUES (0, '{}', 'error', 'manual', v_error)
    RETURNING id INTO v_run_id;
    RETURN jsonb_build_object('run_id', v_run_id, 'status', 'error', 'error', v_error);
  END IF;

  BEGIN
    -- Publish due articles and capture exactly the rows this execution updated
    WITH published AS (
      UPDATE public.articles
         SET status        = 'published',
             published_at  = COALESCE(published_at, NOW()),
             scheduled_for = NULL
       WHERE status = 'scheduled'
         AND scheduled_for <= NOW()
       RETURNING id
    )
    SELECT COALESCE(array_agg(id), '{}'), count(*)
      INTO v_ids, v_count
      FROM published;

    -- One article_events row per published article is written by the
    -- articles_log_event trigger; no separate insert here.

    INSERT INTO public.scheduler_runs (published_count, published_ids, run_status, triggered_by)
    VALUES (v_count, v_ids, 'success', p_triggered_by)
    RETURNING id INTO v_run_id;

    RETURN jsonb_build_object(
      'run_id',          v_run_id,
      'published_count', v_count,
      'published_ids',   to_jsonb(v_ids),
      'status',          'success'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Everything inside this block (including the UPDATE) is rolled back
    v_error := SQLERRM;
    INSERT INTO public.scheduler_runs (published_count, published_ids, run_status, triggered_by, error_message)
    VALUES (0, '{}', 'error', p_triggered_by, v_error)
    RETURNING id INTO v_run_id;
    RETURN jsonb_build_object('run_id', v_run_id, 'status', 'error', 'error', v_error);
  END;
END;
$$;

COMMENT ON FUNCTION public.publish_scheduled_articles(TEXT) IS
  'Publishes all articles with status = scheduled and scheduled_for <= now(). Idempotent. '
  'Logs every run to scheduler_runs; article_events rows come from the articles_log_event trigger. '
  'Executable by service_role only.';

REVOKE EXECUTE ON FUNCTION public.publish_scheduled_articles(TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.publish_scheduled_articles(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. log_article_event() + trigger — one event per status change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_article_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  IF    OLD.status = 'draft'      AND NEW.status = 'published' THEN v_event := 'published';
  ELSIF OLD.status = 'published'  AND NEW.status = 'draft'     THEN v_event := 'unpublished';
  ELSIF OLD.status = 'published'  AND NEW.status = 'archived'  THEN v_event := 'archived';
  ELSIF OLD.status = 'draft'      AND NEW.status = 'archived'  THEN v_event := 'archived';
  ELSIF OLD.status = 'scheduled'  AND NEW.status = 'published' THEN v_event := 'published';
  ELSIF OLD.status = 'scheduled'  AND NEW.status = 'draft'     THEN v_event := 'schedule_cancelled';
  ELSIF OLD.status <> 'scheduled' AND NEW.status = 'scheduled' THEN v_event := 'scheduled';
  ELSE RETURN NEW;
  END IF;

  INSERT INTO public.article_events (article_id, event_type, actor_id, payload)
  VALUES (
    NEW.id,
    v_event,
    auth.uid(),                       -- NULL when run by the scheduler (service role)
    jsonb_build_object(
      'previous_status', OLD.status,
      'new_status',      NEW.status,
      'scheduled_for',   NEW.scheduled_for,
      'published_at',    NEW.published_at
    )
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_article_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS articles_log_event ON public.articles;
CREATE TRIGGER articles_log_event
  AFTER UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.log_article_event();
